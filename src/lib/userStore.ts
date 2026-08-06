import crypto from "crypto";
import fs from "fs";
import path from "path";
import { decryptSensitive, encryptSensitive } from "./sensitiveData";

// 유저별 YouTube 설정 저장소 (서버 전용).
// 이 프로젝트는 DB가 없고 .live-data/*.json 파일로 데이터를 관리하므로
// 유저 프로필(YouTube API 키 / OAuth 토큰)도 같은 방식으로 저장한다.
//
// ⚠️ youtubeApiKey / youtubeAccessToken / youtubeRefreshToken 은 서버 전용 비밀값이다.
//    클라이언트 응답에는 반드시 toPublicYoutubeSettings() 를 거쳐 마스킹된 값만 내보낼 것.

const DATA_DIR = path.join(process.cwd(), ".live-data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

export interface UserProfile {
  userId: string;
  youtubeApiKey?: string;
  youtubeAccessToken?: string;
  youtubeRefreshToken?: string;
  youtubeTokenExpiry?: string; // ISO
  youtubeChannelId?: string;
  youtubeChannelTitle?: string;
  youtubeApiKeyEncrypted?: string;
  youtubeAccessTokenEncrypted?: string;
  youtubeRefreshTokenEncrypted?: string;
}

/** 클라이언트로 내려보낼 안전한 형태 (비밀값은 마스킹/불리언으로 변환) */
export interface PublicYoutubeSettings {
  userId: string;
  hasApiKey: boolean;
  apiKeyMasked: string; // 예: "AIza••••••••4f2c"
  connected: boolean; // OAuth 연동 여부
  channelId: string | null;
  channelTitle: string | null;
  tokenExpiry: string | null;
}

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function readUsers(): UserProfile[] {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
      if (Array.isArray(parsed)) return parsed as UserProfile[];
    }
  } catch {
    /* noop — 파일이 깨졌으면 빈 목록으로 시작 */
  }
  return [];
}

function writeUsers(users: UserProfile[]) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const temp = `${USERS_FILE}.${process.pid}.${crypto.randomBytes(6).toString("hex")}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(users, null, 2), { encoding: "utf-8", mode: 0o600 });
  fs.renameSync(temp, USERS_FILE);
}

/** API 키 마스킹 — 앞 4자 + 뒤 4자만 노출 */
function maskKey(key?: string): string {
  if (!key) return "";
  if (key.length <= 8) return "•".repeat(key.length);
  return `${key.slice(0, 4)}${"•".repeat(8)}${key.slice(-4)}`;
}

export function toPublicYoutubeSettings(
  userId: string,
  profile?: UserProfile | null
): PublicYoutubeSettings {
  const apiKey =
    profile?.youtubeApiKey ?? decryptSensitive<string>(profile?.youtubeApiKeyEncrypted);
  const accessToken =
    profile?.youtubeAccessToken ?? decryptSensitive<string>(profile?.youtubeAccessTokenEncrypted);
  return {
    userId,
    hasApiKey: !!apiKey,
    apiKeyMasked: maskKey(apiKey),
    connected: !!accessToken && !!profile?.youtubeChannelId,
    channelId: profile?.youtubeChannelId ?? null,
    channelTitle: profile?.youtubeChannelTitle ?? null,
    tokenExpiry: profile?.youtubeTokenExpiry ?? null,
  };
}

export const userStore = {
  getAll(): UserProfile[] {
    return readUsers();
  },

  get(userId: string): UserProfile | undefined {
    const stored = readUsers().find((u) => u.userId === userId);
    if (!stored) return undefined;
    return {
      ...stored,
      youtubeApiKey: decryptSensitive<string>(stored.youtubeApiKeyEncrypted) ?? stored.youtubeApiKey,
      youtubeAccessToken: decryptSensitive<string>(stored.youtubeAccessTokenEncrypted) ?? stored.youtubeAccessToken,
      youtubeRefreshToken: decryptSensitive<string>(stored.youtubeRefreshTokenEncrypted) ?? stored.youtubeRefreshToken,
    };
  },

  /** 부분 갱신 (없으면 새로 생성) */
  upsert(userId: string, updates: Partial<Omit<UserProfile, "userId">>): UserProfile {
    const users = readUsers();
    const idx = users.findIndex((u) => u.userId === userId);
    const next: UserProfile =
      idx >= 0 ? { ...users[idx], ...updates, userId } : { userId, ...updates };
    if (idx >= 0) users[idx] = next;
    else users.push(next);
    writeUsers(users);
    return next;
  },

  /** YouTube Data API 키 저장 (빈 문자열이면 삭제) */
  saveApiKey(userId: string, apiKey: string): UserProfile {
    return this.upsert(userId, {
      youtubeApiKey: undefined,
      youtubeApiKeyEncrypted: apiKey ? encryptSensitive(apiKey) : undefined,
    });
  },

  /** OAuth 토큰 + 채널 정보 저장 */
  saveYoutubeAuth(
    userId: string,
    auth: {
      accessToken: string;
      refreshToken?: string;
      expiryDate: string;
      channelId?: string;
      channelTitle?: string;
    }
  ): UserProfile {
    const prev = this.get(userId);
    return this.upsert(userId, {
      youtubeAccessToken: undefined,
      youtubeAccessTokenEncrypted: encryptSensitive(auth.accessToken),
      // 재연동 시 Google이 refresh_token을 다시 안 주는 경우가 있어 기존 값을 유지한다
      youtubeRefreshToken: undefined,
      youtubeRefreshTokenEncrypted: auth.refreshToken
        ? encryptSensitive(auth.refreshToken)
        : prev?.youtubeRefreshToken
          ? encryptSensitive(prev.youtubeRefreshToken)
          : undefined,
      youtubeTokenExpiry: auth.expiryDate,
      youtubeChannelId: auth.channelId ?? prev?.youtubeChannelId,
      youtubeChannelTitle: auth.channelTitle ?? prev?.youtubeChannelTitle,
    });
  },

  /** OAuth 연동 해제 — 토큰/채널 정보만 삭제하고 API 키는 유지 */
  disconnectYoutube(userId: string): UserProfile {
    return this.upsert(userId, {
      youtubeAccessToken: undefined,
      youtubeRefreshToken: undefined,
      youtubeAccessTokenEncrypted: undefined,
      youtubeRefreshTokenEncrypted: undefined,
      youtubeTokenExpiry: undefined,
      youtubeChannelId: undefined,
      youtubeChannelTitle: undefined,
    });
  },

  /** 해당 유저의 YouTube API 키 (없으면 서버 공용 env 키로 폴백) */
  resolveApiKey(userId?: string | null): string | undefined {
    const own = userId ? this.get(userId)?.youtubeApiKey : undefined;
    return own || process.env.YOUTUBE_API_KEY || undefined;
  },
};
