import { NextRequest, NextResponse } from "next/server";
import { userStore } from "@/lib/userStore";
import {
  OAUTH_STATE_COOKIE,
  OAUTH_USER_COOKIE,
  exchangeCodeForToken,
  expiryFromNow,
  fetchMyChannel,
  getOAuthConfig,
  originFromHeaders,
} from "@/lib/youtubeOAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 연동 완료 후 돌아갈 판매자 페이지 (레어팜에는 /seller/live 대신 라이브 경매 관리 페이지가 있다)
const RETURN_PATH = "/seller/live-auction";

function redirectWithResult(origin: string, params: Record<string, string>) {
  const url = new URL(RETURN_PATH, origin);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = NextResponse.redirect(url.toString());
  // 일회용 OAuth 쿠키 정리
  res.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(OAUTH_USER_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}

// GET: Google OAuth 콜백 — state 검증 → 토큰 교환 → 채널 조회 → users.json 저장
export async function GET(req: NextRequest) {
  const origin = originFromHeaders(req.headers);
  const cfg = getOAuthConfig(origin);
  if (!cfg) {
    return redirectWithResult(origin, { youtube: "error", reason: "config" });
  }

  const q = req.nextUrl.searchParams;
  const error = q.get("error");
  if (error) {
    // 사용자가 동의 화면에서 취소한 경우 등
    return redirectWithResult(origin, { youtube: "error", reason: error });
  }

  const code = q.get("code");
  const state = q.get("state");
  const cookieState = req.cookies.get(OAUTH_STATE_COOKIE)?.value;
  const userId = req.cookies.get(OAUTH_USER_COOKIE)?.value;

  // CSRF 검증 — 쿠키의 state와 쿼리의 state가 정확히 일치해야 한다
  if (!code || !state || !cookieState || state !== cookieState) {
    return redirectWithResult(origin, { youtube: "error", reason: "state" });
  }
  if (!userId) {
    return redirectWithResult(origin, { youtube: "error", reason: "session" });
  }

  try {
    const token = await exchangeCodeForToken(cfg, code);
    if (!token.access_token) {
      console.error("[YT-OAUTH] 토큰 교환 실패:", token.error, token.error_description);
      return redirectWithResult(origin, { youtube: "error", reason: "token" });
    }

    const channel = await fetchMyChannel(token.access_token);

    userStore.saveYoutubeAuth(userId, {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiryDate: expiryFromNow(token.expires_in),
      channelId: channel?.channelId,
      channelTitle: channel?.channelTitle,
    });

    console.log("[YT-OAUTH] 연동 완료:", userId, channel?.channelTitle ?? "(채널 정보 없음)");
    return redirectWithResult(origin, { youtube: "connected" });
  } catch (err) {
    console.error("[YT-OAUTH] 콜백 처리 오류:", err);
    return redirectWithResult(origin, { youtube: "error", reason: "unknown" });
  }
}
