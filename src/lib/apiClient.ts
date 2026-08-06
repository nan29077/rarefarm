"use client";

// API 요청에 세션 정보를 실어 보내는 클라이언트 헬퍼.
// 계정 저장소가 localStorage 기반 mock이라 쿠키 세션이 없어 헤더로 전달한다.
// 서버 검증은 lib/apiAuth.ts 참고.

export function authHeaders(): Record<string, string> {
  return {};
}

/** JSON 요청용 헤더 (Content-Type + 세션) */
export function jsonAuthHeaders(): Record<string, string> {
  return { "Content-Type": "application/json", ...authHeaders() };
}

/** 세션 헤더가 자동으로 붙는 fetch */
export function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  return fetch(input, {
    ...init,
    credentials: "same-origin",
    headers: { ...authHeaders(), ...(init.headers as Record<string, string> | undefined) },
  });
}
