"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/types";
import { authService, SocialProvider } from "@/lib/auth";

interface AuthContextValue {
  user: User | null;
  ready: boolean; // 하이드레이션 완료 여부
  isLoggedIn: boolean;
  isAdmin: boolean;
  isSeller: boolean; // 판매자 계정 (user/seller role)
  isBuyer: boolean; // 구매자 계정
  loginEmail: (email: string, pw: string) => Promise<User>;
  signup: (
    email: string,
    pw: string,
    nickname: string,
    role?: "user" | "buyer"
  ) => Promise<User>;
  loginSocial: (provider: SocialProvider) => Promise<User>;
  loginSocialBuyer: (provider: SocialProvider) => Promise<User>;
  loginTest: (role: "admin" | "user" | "buyer") => Promise<User>;
  logout: () => void;
  // role 변경(판매자 전환 승인 등) 후 세션 유저 갱신
  refreshUser: () => void;
  // 로그인 필요 액션 가드. 미로그인 시 /login 이동 후 false 반환.
  requireAuth: () => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setUser(authService.getCurrentUser());
    setReady(true);
  }, []);

  const loginEmail = useCallback(async (email: string, pw: string) => {
    const u = await authService.loginWithEmail(email, pw);
    setUser(u);
    return u;
  }, []);

  const signup = useCallback(
    async (
      email: string,
      pw: string,
      nickname: string,
      role: "user" | "buyer" = "user"
    ) => {
      const u = await authService.signupWithEmail(email, pw, nickname, role);
      setUser(u);
      return u;
    },
    []
  );

  const loginSocial = useCallback(async (provider: SocialProvider) => {
    const u = await authService.loginWithSocial(provider);
    setUser(u);
    return u;
  }, []);

  const loginSocialBuyer = useCallback(async (provider: SocialProvider) => {
    const u = await authService.loginWithSocialAsBuyer(provider);
    setUser(u);
    return u;
  }, []);

  const loginTest = useCallback(async (role: "admin" | "user" | "buyer") => {
    const u = await authService.loginTestAccount(role);
    setUser(u);
    return u;
  }, []);

  const refreshUser = useCallback(() => {
    setUser(authService.getCurrentUser());
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    router.push("/login");
  }, [router]);

  const requireAuth = useCallback(() => {
    if (!user) {
      router.push("/login");
      return false;
    }
    return true;
  }, [user, router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        ready,
        isLoggedIn: !!user,
        isAdmin: user?.role === "admin",
        isSeller: user?.role === "user" || user?.role === "seller",
        isBuyer: user?.role === "buyer",
        loginEmail,
        signup,
        loginSocial,
        loginSocialBuyer,
        loginTest,
        logout,
        refreshUser,
        requireAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
