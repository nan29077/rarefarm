"use client";

import type { User } from "@/types";
import { getState, update } from "./store";

const SESSION_HINT_KEY = "rarefarm:session";

export type SocialProvider = "kakao" | "naver" | "google";

export const socialProviders: Array<{ id: SocialProvider; label: string }> = [
  { id: "kakao", label: "카카오로 시작하기" },
  { id: "naver", label: "네이버로 시작하기" },
  { id: "google", label: "Google로 시작하기" },
];

function cacheUser(user: User): User {
  const safeUser = { ...user, password: undefined };
  update((state) => {
    const index = state.users.findIndex((candidate) => candidate.id === safeUser.id);
    if (index >= 0) state.users[index] = { ...state.users[index], ...safeUser, password: undefined };
    else state.users.push(safeUser);
  });
  window.localStorage.setItem(SESSION_HINT_KEY, safeUser.id);
  return safeUser;
}

async function sessionRequest(body: Record<string, unknown>): Promise<User> {
  const response = await fetch("/api/auth/session", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({})) as { user?: User; error?: string };
  if (!response.ok || !data.user) throw new Error(data.error ?? "인증 요청을 처리할 수 없습니다.");
  return cacheUser(data.user);
}

export const authService = {
  getCurrentUser(): User | null {
    if (typeof window === "undefined") return null;
    const id = window.localStorage.getItem(SESSION_HINT_KEY);
    if (!id) return null;
    return getState().users.find((user) => user.id === id) ?? null;
  },

  async restoreSession(): Promise<User | null> {
    try {
      const response = await fetch("/api/auth/session", { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw new Error("no session");
      const data = await response.json() as { user?: User };
      return data.user ? cacheUser(data.user) : null;
    } catch {
      if (typeof window !== "undefined") window.localStorage.removeItem(SESSION_HINT_KEY);
      return null;
    }
  },

  loginWithEmail(email: string, password: string): Promise<User> {
    return sessionRequest({ action: "login", email, password });
  },

  signupWithEmail(email: string, password: string, nickname: string, role: "user" | "buyer" = "user"): Promise<User> {
    return sessionRequest({ action: "signup", email, password, nickname, role });
  },

  loginWithSocial(provider: SocialProvider): Promise<User> {
    return sessionRequest({ action: "social", provider, role: "user" });
  },

  loginWithSocialAsBuyer(provider: SocialProvider): Promise<User> {
    return sessionRequest({ action: "social", provider, role: "buyer" });
  },

  loginTestAccount(role: "admin" | "user" | "buyer"): Promise<User> {
    return sessionRequest({ action: "test", role });
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const response = await fetch("/api/auth/session", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "change_password", currentPassword, newPassword }),
    });
    const data = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) throw new Error(data.error ?? "비밀번호를 변경할 수 없습니다.");
  },

  logout() {
    if (typeof window !== "undefined") window.localStorage.removeItem(SESSION_HINT_KEY);
    void fetch("/api/auth/session", { method: "DELETE", credentials: "same-origin" });
  },
};
