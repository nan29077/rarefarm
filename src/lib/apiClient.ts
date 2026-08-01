"use client";

// API 요청에 세션 정보를 실어 보내는 클라이언트 헬퍼.
// 계정 저장소가 localStorage 기반 mock이라 쿠키 세션이 없어 헤더로 전달한다.
// 서버 검증은 lib/apiAuth.ts 참고.

import { authService } from "./auth";

/** 현재 로그인 사용자 기준 인증 헤더 (미로그인 시 빈 객체) */
export function authHeaders(): Record<string, string> {
  const user = authService.getCurrentUser();
  if (!user) return {};
  return { "X-User-Id": user.id, "X-User-Role": user.role };
}

/** JSON 요청용 헤더 (Content-Type + 세션) */
export function jsonAuthHeaders(): Record<string, string> {
  return { "Content-Type": "application/json", ...authHeaders() };
}

/** 세션 헤더가 자동으로 붙는 fetch */
export function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  return fetch(input, {
    ...init,
    headers: { ...authHeaders(), ...(init.headers as Record<string, string> | undefined) },
  });
}
