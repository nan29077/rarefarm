import { NextRequest, NextResponse } from "next/server";
import { authStore, SESSION_COOKIE } from "@/lib/authStore";
import { getRequester } from "@/lib/apiAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

declare global {
  // eslint-disable-next-line no-var
  var __rf_login_attempts: Map<string, number[]>;
}
if (!global.__rf_login_attempts) global.__rf_login_attempts = new Map();

function setSession(response: NextResponse, userId: string, req: NextRequest) {
  const secure = req.headers.get("x-forwarded-proto") === "https" || process.env.NODE_ENV === "production";
  response.cookies.set(SESSION_COOKIE, authStore.createSession(userId), {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
}

function rateLimited(req: NextRequest): boolean {
  const key = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const now = Date.now();
  const attempts = (global.__rf_login_attempts.get(key) ?? []).filter((time) => now - time < 60_000);
  attempts.push(now);
  global.__rf_login_attempts.set(key, attempts);
  return attempts.length > 10;
}

export async function GET(req: NextRequest) {
  // 세션 복원용 — restoreSession()이 완전한 User로 캐시하므로
  // id/email/avatar 등을 모두 포함한 전체 User 객체를 반환해야 한다.
  const user = authStore.verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user });
}

export async function POST(req: NextRequest) {
  if (rateLimited(req)) return NextResponse.json({ error: "로그인 요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
  try {
    const body = await req.json() as Record<string, unknown>;
    const action = String(body.action ?? "login");
    let user;

    if (action === "login") {
      user = authStore.authenticate(String(body.email ?? ""), String(body.password ?? ""));
      if (!user) return NextResponse.json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
    } else if (action === "signup") {
      const email = String(body.email ?? "").trim();
      const password = String(body.password ?? "");
      const nickname = String(body.nickname ?? "").trim();
      const role = body.role === "buyer" ? "buyer" : "user";
      if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8 || !nickname || nickname.length > 30) {
        return NextResponse.json({ error: "이메일, 8자 이상 비밀번호, 30자 이하 닉네임을 확인해주세요." }, { status: 400 });
      }
      user = authStore.signup({ email, password, nickname, role });
    } else if (action === "change_password") {
      const requester = getRequester(req);
      const currentPassword = String(body.currentPassword ?? "");
      const newPassword = String(body.newPassword ?? "");
      if (!requester) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
      if (newPassword.length < 8 || newPassword.length > 128) {
        return NextResponse.json({ error: "새 비밀번호는 8~128자로 입력해 주세요." }, { status: 400 });
      }
      if (!authStore.changePassword(requester.userId, currentPassword, newPassword)) {
        return NextResponse.json({ error: "현재 비밀번호가 일치하지 않습니다." }, { status: 401 });
      }
      return NextResponse.json({ ok: true });
    } else if (action === "test") {
      if (process.env.NODE_ENV === "production" && process.env.ENABLE_TEST_LOGIN !== "true") {
        return NextResponse.json({ error: "운영 환경에서는 테스트 로그인을 사용할 수 없습니다." }, { status: 403 });
      }
      const role = body.role === "admin" ? "admin" : body.role === "buyer" ? "buyer" : "user";
      const email = role === "admin" ? "admin@rarefarm.kr" : role === "buyer" ? "buyer@rarefarm.kr" : "user@rarefarm.kr";
      const password = role === "admin" ? "Admin1234!" : role === "buyer" ? "Buyer1234!" : "User1234!";
      user = authStore.authenticate(email, password);
    } else if (action === "social") {
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "소셜 로그인 공급자 연동이 필요합니다." }, { status: 501 });
      }
      const role = body.role === "buyer" ? "buyer" : "user";
      const provider = ["kakao", "naver", "google"].includes(String(body.provider)) ? String(body.provider) : "google";
      const email = `${provider}-${role}@rarefarm.local`;
      user = authStore.authenticate(email, "LocalSocial123!");
      if (!user) {
        user = authStore.signup({ email, password: "LocalSocial123!", nickname: `${provider} 사용자`, role });
      }
    } else {
      return NextResponse.json({ error: "지원하지 않는 인증 요청입니다." }, { status: 400 });
    }

    if (!user) return NextResponse.json({ error: "로그인할 수 없습니다." }, { status: 401 });
    const response = NextResponse.json({ user });
    setSession(response, user.id, req);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "인증 요청을 처리할 수 없습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
