"use client";

// 인증 service layer. 현재는 mock + localStorage.
// 실제 API 연동 시 authService 내부 구현만 교체하면 됩니다.

import type { User } from "@/types";
import { getState, update, uid } from "./store";
import { getCharacterAvatar } from "./avatarUtils";

const SESSION_KEY = "rarefarm:session";

// ---- 소셜 로그인 provider adapter ----
// TODO: 실제 카카오/네이버/Google SDK 연동 시 각 adapter의 signIn을 구현.
export type SocialProvider = "kakao" | "naver" | "google";

interface AuthProviderAdapter {
  id: SocialProvider;
  label: string;
  // TODO: 실제 OAuth redirect / SDK 호출로 교체
  signIn: () => Promise<User>;
}

function mockSocialUser(provider: SocialProvider, role: "user" | "buyer" = "user"): User {
  const s = getState();
  const email =
    role === "buyer"
      ? `${provider}-buyer@rarefarm.kr`
      : `${provider}-user@rarefarm.kr`;
  let user = s.users.find((u) => u.email === email);
  if (!user) {
    const newId = uid("u");
    const created: User = {
      id: newId,
      email,
      nickname: role === "buyer" ? `${provider}구매자` : `${provider}유저`,
      avatar: getCharacterAvatar(newId),
      role,
      status: "active",
      bio: `${provider} 소셜 로그인 계정`,
      createdAt: new Date().toISOString(),
      followers: 0,
      following: 0,
    };
    update((st) => st.users.push(created));
    user = created;
  }
  return user;
}

export const socialProviders: AuthProviderAdapter[] = [
  {
    id: "kakao",
    label: "카카오로 시작하기",
    // TODO: Kakao.Auth.login(...) 연동
    signIn: async () => mockSocialUser("kakao"),
  },
  {
    id: "naver",
    label: "네이버로 시작하기",
    // TODO: naver.LoginWithNaverId 연동
    signIn: async () => mockSocialUser("naver"),
  },
  {
    id: "google",
    label: "Google로 시작하기",
    // TODO: Google Identity Services 연동
    signIn: async () => mockSocialUser("google"),
  },
];

function saveSession(userId: string) {
  if (typeof window !== "undefined")
    window.localStorage.setItem(SESSION_KEY, userId);
}

export const authService = {
  getCurrentUser(): User | null {
    if (typeof window === "undefined") return null;
    const id = window.localStorage.getItem(SESSION_KEY);
    if (!id) return null;
    return getState().users.find((u) => u.id === id) ?? null;
  },

  async loginWithEmail(email: string, password: string): Promise<User> {
    // TODO: 실제 서버 인증 API 호출로 교체
    const user = getState().users.find((u) => u.email === email.trim());
    if (!user || user.password !== password) {
      throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
    }
    if (user.status === "suspended") {
      throw new Error("정지된 계정입니다. 고객센터에 문의해주세요.");
    }
    saveSession(user.id);
    return user;
  },

  async signupWithEmail(
    email: string,
    password: string,
    nickname: string,
    role: "user" | "buyer" = "user"
  ): Promise<User> {
    const exists = getState().users.some((u) => u.email === email.trim());
    if (exists) throw new Error("이미 가입된 이메일입니다.");
    const newId = uid("u");
    const user: User = {
      id: newId,
      email: email.trim(),
      password,
      nickname: nickname.trim() || "새로운 레어파머",
      avatar: getCharacterAvatar(newId),
      role,
      status: "active",
      createdAt: new Date().toISOString(),
      followers: 0,
      following: 0,
    };
    update((s) => s.users.push(user));
    saveSession(user.id);
    return user;
  },

  async loginWithSocial(provider: SocialProvider): Promise<User> {
    const adapter = socialProviders.find((p) => p.id === provider)!;
    const user = await adapter.signIn();
    saveSession(user.id);
    return user;
  },

  // 구매자용 소셜 로그인 (mock — UI 데모용)
  async loginWithSocialAsBuyer(provider: SocialProvider): Promise<User> {
    const user = mockSocialUser(provider, "buyer");
    saveSession(user.id);
    return user;
  },

  // 테스트 계정 즉시 로그인
  async loginTestAccount(role: "admin" | "user" | "buyer"): Promise<User> {
    const email =
      role === "admin"
        ? "admin@rarefarm.kr"
        : role === "buyer"
          ? "buyer@rarefarm.kr"
          : "user@rarefarm.kr";
    const pw =
      role === "admin" ? "Admin1234!" : role === "buyer" ? "Buyer1234!" : "User1234!";
    // 저장된 상태에 계정이 없으면 초기 데이터에서 재생성
    if (!getState().users.some((u) => u.email === email)) {
      const defaults: Record<string, Omit<import("@/types").User, "id">> = {
        "admin@rarefarm.kr": { email, password: pw, nickname: "레어팜관리자", avatar: getCharacterAvatar("u-admin"), role: "admin", status: "active", bio: "레어팜 운영팀", createdAt: new Date().toISOString(), followers: 0, following: 0 },
        "user@rarefarm.kr":  { email, password: pw, nickname: "식물사냥꾼",   avatar: getCharacterAvatar("u-user"),  role: "user",  status: "active", bio: "몬스테라 · 희귀식물 수집 중", createdAt: new Date().toISOString(), followers: 128, following: 74 },
        "buyer@rarefarm.kr": { email, password: pw, nickname: "희귀생물수집가", avatar: getCharacterAvatar("u-buyer"), role: "buyer", status: "active", bio: "라이브 경매로 희귀 동식물 득템", createdAt: new Date().toISOString(), followers: 12, following: 48 },
      };
      const def = defaults[email];
      if (def) {
        const id = email === "admin@rarefarm.kr" ? "u-admin" : email === "buyer@rarefarm.kr" ? "u-buyer" : "u-user";
        update((s) => s.users.push({ id, ...def }));
      }
    }
    return this.loginWithEmail(email, pw);
  },

  logout() {
    if (typeof window !== "undefined")
      window.localStorage.removeItem(SESSION_KEY);
  },
};
