import { NextRequest, NextResponse } from "next/server";

// API 라우트 세션 검증 (서버 전용).
// 현재 계정 저장소가 localStorage 기반 mock이라 서버에 유저 테이블이 없다.
// 따라서 클라이언트가 보낸 X-User-Id / X-User-Role 헤더를 세션으로 취급한다.
// TODO: 실제 인증 서버 연동 시 이 파일의 getRequester만 세션 쿠키 검증으로 교체하면 된다.

export interface Requester {
  userId: string;
  role: string;
}

/** 요청 헤더에서 세션 정보 추출 (없으면 null) */
export function getRequester(req: NextRequest): Requester | null {
  const userId = req.headers.get("x-user-id")?.trim();
  if (!userId) return null;
  return { userId, role: req.headers.get("x-user-role")?.trim() || "user" };
}

export function unauthorized(message = "로그인이 필요합니다.") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "권한이 없습니다.") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export const isAdmin = (requester: Requester | null): boolean =>
  requester?.role === "admin";

/**
 * 로그인 필수 라우트용 가드.
 * 성공 시 { requester }, 실패 시 { response } 를 반환한다.
 */
export function requireUser(
  req: NextRequest
): { requester: Requester; response?: never } | { requester?: never; response: NextResponse } {
  const requester = getRequester(req);
  if (!requester) return { response: unauthorized() };
  return { requester };
}

/**
 * 본인(userId) 또는 관리자만 허용하는 가드.
 * body/query의 userId 위조를 막기 위해 세션 userId와 대조한다.
 */
export function requireSelf(
  req: NextRequest,
  targetUserId: string | null | undefined
): { requester: Requester; response?: never } | { requester?: never; response: NextResponse } {
  const auth = requireUser(req);
  if (auth.response) return auth;
  if (!targetUserId) return { response: forbidden("대상 사용자 정보가 없습니다.") };
  if (auth.requester.userId !== targetUserId && !isAdmin(auth.requester)) {
    return { response: forbidden() };
  }
  return { requester: auth.requester };
}

/** 관리자 전용 가드 */
export function requireAdmin(
  req: NextRequest
): { requester: Requester; response?: never } | { requester?: never; response: NextResponse } {
  const auth = requireUser(req);
  if (auth.response) return auth;
  if (!isAdmin(auth.requester)) return { response: forbidden("관리자 전용 기능입니다.") };
  return { requester: auth.requester };
}
