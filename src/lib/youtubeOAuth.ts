// Google / YouTube OAuth 헬퍼 (서버 전용).
// GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / NEXTAUTH_URL 환경변수를 사용한다.
// 클라이언트 번들에 절대 import 하지 말 것 (NEXT_PUBLIC_ 접두사 없는 env는 서버에서만 읽힘).

export const YOUTUBE_OAUTH_SCOPE = "https://www.googleapis.com/auth/youtube.readonly";

export const OAUTH_STATE_COOKIE = "rf_yt_oauth_state";
export const OAUTH_USER_COOKIE = "rf_yt_oauth_uid";

export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
}

export interface YoutubeChannelInfo {
  channelId: string;
  channelTitle: string;
}

/** 환경변수 기반 OAuth 설정 (미설정 시 null) */
export function getOAuthConfig(origin?: string): {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  baseUrl: string;
} | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  // NEXTAUTH_URL 우선, 없으면 요청 origin 사용 (로컬 개발 편의)
  const baseUrl = (process.env.NEXTAUTH_URL || origin || "").replace(/\/$/, "");
  return {
    clientId,
    clientSecret,
    redirectUri: `${baseUrl}/api/auth/youtube/callback`,
    baseUrl,
  };
}

/** Google 동의 화면 URL 생성 */
export function buildAuthUrl(
  cfg: { clientId: string; redirectUri: string },
  state: string
): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", cfg.clientId);
  url.searchParams.set("redirect_uri", cfg.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", YOUTUBE_OAUTH_SCOPE);
  // refresh_token 을 받기 위해 offline + consent 강제
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", state);
  return url.toString();
}

/** authorization code → 토큰 교환 */
export async function exchangeCodeForToken(
  cfg: { clientId: string; clientSecret: string; redirectUri: string },
  code: string
): Promise<GoogleTokenResponse> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      redirect_uri: cfg.redirectUri,
      grant_type: "authorization_code",
    }),
  });
  return (await res.json()) as GoogleTokenResponse;
}

/** refresh_token 으로 access_token 재발급 */
export async function refreshAccessToken(
  cfg: { clientId: string; clientSecret: string },
  refreshToken: string
): Promise<GoogleTokenResponse> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      grant_type: "refresh_token",
    }),
  });
  return (await res.json()) as GoogleTokenResponse;
}

/** access_token 으로 내 채널 정보 조회 */
export async function fetchMyChannel(accessToken: string): Promise<YoutubeChannelInfo | null> {
  try {
    const res = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data = await res.json();
    const item = data?.items?.[0];
    if (!item?.id) return null;
    return {
      channelId: item.id as string,
      channelTitle: (item.snippet?.title as string) ?? "내 채널",
    };
  } catch {
    return null;
  }
}

/** expires_in(초) → ISO 만료 시각 */
export function expiryFromNow(expiresInSec: number): string {
  return new Date(Date.now() + (expiresInSec || 3600) * 1000).toISOString();
}

/** 요청에서 origin 추출 (프록시 환경 고려) */
export function originFromHeaders(headers: Headers): string {
  const configured = process.env.SITE_URL || process.env.NEXTAUTH_URL;
  if (configured) return new URL(configured).origin;
  const host = headers.get("host") ?? "localhost:3014";
  const proto =
    headers.get("x-forwarded-proto") ??
    (/^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}
