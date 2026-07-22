"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, User as UserIcon, ShieldCheck } from "lucide-react";
import { Button } from "@/components/common/Button";
import Image from "next/image";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { socialProviders, SocialProvider } from "@/lib/auth";

const socialStyle: Record<SocialProvider, string> = {
  kakao: "bg-[#FEE500] text-[#3C1E1E] hover:brightness-95",
  naver: "bg-[#03C75A] text-white hover:brightness-95",
  google: "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50",
};

export function LoginForm() {
  const router = useRouter();
  const { loginEmail, signup, loginSocial, loginSocialBuyer, loginTest } =
    useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  // 구매자 회원가입 폼
  const [buyerFormOpen, setBuyerFormOpen] = useState(false);
  const [bEmail, setBEmail] = useState("");
  const [bPw, setBPw] = useState("");
  const [bNickname, setBNickname] = useState("");

  function go(role: string) {
    router.push(role === "admin" ? "/admin" : "/");
  }

  async function handleEmail() {
    setLoading(true);
    try {
      if (mode === "login") {
        const u = await loginEmail(email, pw);
        toast("로그인되었습니다.");
        go(u.role);
      } else {
        const u = await signup(email, pw, nickname);
        toast("회원가입이 완료되었습니다.");
        go(u.role);
      }
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSocial(p: SocialProvider) {
    setLoading(true);
    try {
      const u = await loginSocial(p);
      toast(`${p} 계정으로 로그인되었습니다.`);
      go(u.role);
    } finally {
      setLoading(false);
    }
  }

  async function handleTest(role: "admin" | "user" | "buyer") {
    setLoading(true);
    try {
      await loginTest(role);
      toast(
        role === "admin"
          ? "관리자로 로그인합니다."
          : role === "buyer"
            ? "구매자 테스트 계정으로 로그인합니다."
            : "판매자 테스트 계정으로 로그인합니다."
      );
      go(role);
    } finally {
      setLoading(false);
    }
  }

  async function handleBuyerSocial(p: SocialProvider) {
    setLoading(true);
    try {
      const u = await loginSocialBuyer(p);
      toast(`${p} 구매자 계정으로 로그인되었습니다.`);
      go(u.role);
    } finally {
      setLoading(false);
    }
  }

  async function handleBuyerSignup() {
    setLoading(true);
    try {
      const u = await signup(bEmail, bPw, bNickname, "buyer");
      toast("구매자 회원가입이 완료되었습니다.");
      go(u.role);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="honeycomb-gold mx-auto flex min-h-screen w-full max-w-app flex-col justify-center px-6 py-10">
      {/* 로고 */}
      <div className="mb-8 text-center">
        <Image src="/logo-rarefarm-new.png" alt="레어팜" width={200} height={60} className="mx-auto mb-2 h-14 w-auto object-contain" priority />
        <p className="mt-1 text-sm text-neutral-500">
          희귀 동식물 전문 라이브 경매 플랫폼
        </p>
      </div>

      {/* 이메일 폼 */}
      <div className="space-y-2.5">
        {mode === "signup" && (
          <Field
            icon={UserIcon}
            placeholder="닉네임"
            value={nickname}
            onChange={setNickname}
          />
        )}
        <Field
          icon={Mail}
          placeholder="이메일"
          type="email"
          value={email}
          onChange={setEmail}
        />
        <Field
          icon={Lock}
          placeholder="비밀번호"
          type="password"
          value={pw}
          onChange={setPw}
        />
      </div>

      <Button
        fullWidth
        size="lg"
        className="mt-4"
        onClick={handleEmail}
        disabled={loading}
      >
        {mode === "login" ? "이메일로 로그인" : "이메일로 회원가입"}
      </Button>

      <button
        onClick={() => setMode(mode === "login" ? "signup" : "login")}
        className="mt-3 text-center text-sm text-neutral-500"
      >
        {mode === "login" ? (
          <>
            아직 회원이 아니신가요?{" "}
            <span className="font-semibold text-brand-600">회원가입</span>
          </>
        ) : (
          <>
            이미 계정이 있으신가요?{" "}
            <span className="font-semibold text-brand-600">로그인</span>
          </>
        )}
      </button>

      {/* 구분선 */}
      <div className="my-6 flex items-center gap-3 text-xs text-neutral-300">
        <span className="h-px flex-1 bg-neutral-200" />
        간편 로그인
        <span className="h-px flex-1 bg-neutral-200" />
      </div>

      {/* 소셜 로그인 */}
      <div className="space-y-2">
        {socialProviders.map((p) => (
          <button
            key={p.id}
            onClick={() => handleSocial(p.id)}
            disabled={loading}
            className={
              "flex h-12 w-full items-center justify-center rounded-xl text-[15px] font-semibold transition " +
              socialStyle[p.id]
            }
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* 구매자로 시작하기 */}
      <div className="mt-7 rounded-2xl border border-neutral-200 bg-white p-4">
        <p className="text-sm font-bold text-neutral-900">구매자로 시작하기</p>
        <p className="mt-0.5 text-xs text-neutral-400">
          라이브 경매 참여, 득템 쇼핑은 구매자 계정으로!
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => handleBuyerSocial("google")}
            disabled={loading}
            className="flex h-11 items-center justify-center rounded-xl border border-neutral-300 bg-white text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
          >
            Google로 시작
          </button>
          <button
            onClick={() => handleBuyerSocial("kakao")}
            disabled={loading}
            className="flex h-11 items-center justify-center rounded-xl bg-[#FEE500] text-sm font-semibold text-[#3C1E1E] transition hover:brightness-95"
          >
            카카오로 시작
          </button>
        </div>

        {buyerFormOpen ? (
          <div className="mt-3 space-y-2">
            <Field
              icon={UserIcon}
              placeholder="닉네임"
              value={bNickname}
              onChange={setBNickname}
            />
            <Field
              icon={Mail}
              placeholder="이메일"
              type="email"
              value={bEmail}
              onChange={setBEmail}
            />
            <Field
              icon={Lock}
              placeholder="비밀번호"
              type="password"
              value={bPw}
              onChange={setBPw}
            />
            <Button fullWidth onClick={handleBuyerSignup} disabled={loading}>
              구매자 이메일 회원가입
            </Button>
          </div>
        ) : (
          <button
            onClick={() => setBuyerFormOpen(true)}
            className="mt-2 w-full rounded-xl border border-dashed border-neutral-300 py-2.5 text-sm font-semibold text-neutral-500 transition hover:border-brand-400 hover:text-brand-700"
          >
            이메일로 구매자 회원가입
          </button>
        )}

        <Button
          fullWidth
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={() => handleTest("buyer")}
          disabled={loading}
        >
          구매자 테스트 로그인
        </Button>
      </div>

      {/* 테스트 계정 */}
      <div className="mt-4 rounded-xl border border-dashed border-brand-300 bg-brand-50/60 p-3">
        <p className="mb-2 flex items-center gap-1 text-xs font-semibold text-brand-800">
          <ShieldCheck className="h-3.5 w-3.5" /> 테스트 계정 바로 로그인
        </p>
        <div className="grid grid-cols-3 gap-2">
          <Button variant="secondary" size="sm" onClick={() => handleTest("admin")}>
            관리자 계정
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleTest("user")}>
            판매자 계정
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleTest("buyer")}>
            구매자 계정
          </Button>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-neutral-400">
          관리자: admin@rarefarm.kr / Admin1234!
          <br />
          판매자: user@rarefarm.kr / User1234!
          <br />
          구매자: buyer@rarefarm.kr / Buyer1234!
        </p>
      </div>
    </div>
  );
}

function Field({
  icon: Icon,
  ...props
}: {
  icon: typeof Mail;
  placeholder: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-neutral-300 px-3 focus-within:border-brand-500">
      <Icon className="h-5 w-5 text-neutral-400" strokeWidth={1.75} />
      <input
        type={props.type ?? "text"}
        placeholder={props.placeholder}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="h-12 flex-1 bg-transparent text-[15px] outline-none"
      />
    </div>
  );
}
