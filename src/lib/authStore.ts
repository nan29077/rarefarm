import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { Role, User, UserStatus } from "@/types";
import { getCharacterAvatar } from "./avatarUtils";

const DATA_DIR = path.join(process.cwd(), ".live-data");
const ACCOUNTS_FILE = path.join(DATA_DIR, "accounts.json");
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const SESSION_COOKIE = "rf_session";

interface StoredAccount {
  id: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  nickname: string;
  avatar: string;
  role: Role;
  status: UserStatus;
  bio?: string;
  createdAt: string;
}

interface SessionPayload {
  sub: string;
  exp: number;
}

const demoAccounts: Array<Omit<StoredAccount, "passwordHash" | "passwordSalt"> & { password: string }> = [
  { id: "u-admin", email: "admin@rarefarm.kr", password: "Admin1234!", nickname: "레어팜 관리자", avatar: getCharacterAvatar("u-admin"), role: "admin", status: "active", createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "u-user", email: "user@rarefarm.kr", password: "User1234!", nickname: "레어팜브리더", avatar: getCharacterAvatar("u-user"), role: "user", status: "active", createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "u-buyer", email: "buyer@rarefarm.kr", password: "Buyer1234!", nickname: "희귀생물수집가", avatar: getCharacterAvatar("u-buyer"), role: "buyer", status: "active", createdAt: "2026-01-01T00:00:00.000Z" },
];

function writeAtomic(file: string, value: unknown) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const temp = `${file}.${process.pid}.${crypto.randomBytes(6).toString("hex")}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(value, null, 2), { encoding: "utf8", mode: 0o600 });
  fs.renameSync(temp, file);
}

function hashPassword(password: string, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

function readAccounts(): StoredAccount[] {
  // 파일이 존재하는데 읽기/파싱에 실패한 경우, 시드로 덮어쓰면 기존 계정이 전부 소실된다.
  // → 원본 파일은 그대로 보존하고(쓰기 금지) 빈 배열만 반환한다.
  if (fs.existsSync(ACCOUNTS_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, "utf8"));
      if (Array.isArray(parsed)) return parsed as StoredAccount[];
      console.error("[auth] account store malformed — preserving original file, returning empty list");
    } catch (error) {
      console.error("[auth] account store read failed — preserving original file, returning empty list", error);
    }
    return [];
  }

  const allowDemoAccounts =
    process.env.NODE_ENV !== "production" || process.env.ENABLE_TEST_LOGIN === "true";
  const accounts = (allowDemoAccounts ? demoAccounts : []).map(({ password, ...account }) => {
    const { salt, hash } = hashPassword(password);
    return { ...account, passwordSalt: salt, passwordHash: hash };
  });
  writeAtomic(ACCOUNTS_FILE, accounts);
  return accounts;
}

function saveAccounts(accounts: StoredAccount[]) {
  writeAtomic(ACCOUNTS_FILE, accounts);
}

function sessionSecret(): string {
  const configured = process.env.AUTH_SESSION_SECRET;
  if (configured && configured.length >= 32) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SESSION_SECRET must contain at least 32 characters in production");
  }
  return "rarefarm-local-development-session-secret-change-me";
}

function encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function sign(encodedPayload: string): string {
  return crypto.createHmac("sha256", sessionSecret()).update(encodedPayload).digest("base64url");
}

function toPublicUser(account: StoredAccount): User {
  return {
    id: account.id,
    email: account.email,
    nickname: account.nickname,
    avatar: account.avatar,
    role: account.role,
    status: account.status,
    bio: account.bio,
    createdAt: account.createdAt,
    followers: 0,
    following: 0,
  };
}

export const authStore = {
  getById(id: string): User | null {
    const account = readAccounts().find((candidate) => candidate.id === id);
    return account ? toPublicUser(account) : null;
  },

  authenticate(email: string, password: string): User | null {
    const account = readAccounts().find((candidate) => candidate.email.toLowerCase() === email.trim().toLowerCase());
    if (!account || account.status !== "active") return null;
    const actual = Buffer.from(hashPassword(password, account.passwordSalt).hash, "hex");
    const expected = Buffer.from(account.passwordHash, "hex");
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
    return toPublicUser(account);
  },

  signup(input: { email: string; password: string; nickname: string; role: "user" | "buyer" }): User {
    const accounts = readAccounts();
    const email = input.email.trim().toLowerCase();
    if (accounts.some((account) => account.email.toLowerCase() === email)) throw new Error("이미 가입된 이메일입니다.");
    const { salt, hash } = hashPassword(input.password);
    const id = `u-${crypto.randomUUID()}`;
    const account: StoredAccount = {
      id,
      email,
      passwordHash: hash,
      passwordSalt: salt,
      nickname: input.nickname.trim(),
      avatar: getCharacterAvatar(id),
      role: input.role,
      status: "active",
      createdAt: new Date().toISOString(),
    };
    accounts.push(account);
    saveAccounts(accounts);
    return toPublicUser(account);
  },

  changePassword(userId: string, currentPassword: string, newPassword: string): boolean {
    const accounts = readAccounts();
    const account = accounts.find((candidate) => candidate.id === userId);
    if (!account || account.status !== "active") return false;
    const actual = Buffer.from(hashPassword(currentPassword, account.passwordSalt).hash, "hex");
    const expected = Buffer.from(account.passwordHash, "hex");
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return false;
    const { salt, hash } = hashPassword(newPassword);
    account.passwordSalt = salt;
    account.passwordHash = hash;
    saveAccounts(accounts);
    return true;
  },

  createSession(userId: string): string {
    const payload: SessionPayload = { sub: userId, exp: Date.now() + SESSION_TTL_MS };
    const encoded = encode(JSON.stringify(payload));
    return `${encoded}.${sign(encoded)}`;
  },

  verifySession(token: string | undefined): User | null {
    if (!token) return null;
    const [encoded, signature] = token.split(".");
    if (!encoded || !signature) return null;
    const actual = Buffer.from(signature);
    const expected = Buffer.from(sign(encoded));
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
    try {
      const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SessionPayload;
      if (!payload.sub || !payload.exp || payload.exp <= Date.now()) return null;
      const user = this.getById(payload.sub);
      return user?.status === "active" ? user : null;
    } catch {
      return null;
    }
  },
};
