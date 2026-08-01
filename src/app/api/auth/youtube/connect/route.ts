import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  OAUTH_STATE_COOKIE,
  OAUTH_USER_COOKIE,
  buildAuthUrl,
  getOAuthConfig,
  originFromHeaders,
} from "@/lib/youtubeOAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET: Google OAuth 동의 화면으로 리다이렉트.
// state(CSRF 토큰)와 연동 대상 userId를 httpOnly 쿠키에 저장한 뒤 이동한다.
//
// ⚠️ 이 프로젝트의 세션은 localStorage 기반 mock이라 브라우저 최상위 이동(리다이렉트)에는
//    X-User-Id 헤더를 실을 수 없다. 그래서 userId를 쿼리로 받아 쿠키에 넣는다.
//    TODO: 실제 세션 쿠키 도입 시 쿼리 파라미터 대신 세션에서 userId를 읽도록 교체할 것.
export async function GET(req: NextRequest) {
  const origin = originFromHeaders(req.headers);
  const cfg = getOAuthConfig(origin);
  if (!cfg) {
    return NextResponse.json(
      { error: "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET 환경변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const userId =
    req.nextUrl.searchParams.get("userId")?.trim() ||
    req.headers.get("x-user-id")?.trim() ||
    "";
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const state = crypto.randomBytes(24).toString("hex");
  const res = NextResponse.redirect(buildAuthUrl(cfg, state));

  const cookieOpts = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: origin.startsWith("https://"),
    path: "/",
    maxAge: 60 * 10, // 10분
  };
  res.cookies.set(OAUTH_STATE_COOKIE, state, cookieOpts);
  res.cookies.set(OAUTH_USER_COOKIE, userId, cookieOpts);
  return res;
}
