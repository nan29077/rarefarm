"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Bell,
  CreditCard,
  ShieldCheck,
  Headphones,
  LogOut,
  ChevronDown,
  ChevronRight,
  Plus,
  Camera,
  Ban,
  LucideIcon,
} from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Avatar } from "@/components/common/Avatar";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { update } from "@/lib/store";
import { useStoreVersion } from "@/lib/useStore";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { cn } from "@/lib/utils";

// 알림 설정 항목
interface NotifState {
  bid: boolean; // 입찰/낙찰
  live: boolean; // 라이브 시작
  chat: boolean; // 채팅
  marketing: boolean; // 마케팅
}

// 등록 카드 (UI mock)
const MOCK_CARDS = [
  { id: "card-1", name: "허니카드 체크", number: "**** **** **** 1234", main: true },
  { id: "card-2", name: "키득 신용카드", number: "**** **** **** 5678", main: false },
];

// 차단 사용자 (UI mock)
const INITIAL_BLOCKED = ["매너없는거래러", "스팸계정123"];

// FAQ (UI mock)
const FAQS = [
  {
    q: "낙찰 후 결제는 어떻게 하나요?",
    a: "낙찰 확정 후 24시간 이내에 마이페이지 > 경매참여 내역에서 결제를 완료해주세요. 기한 내 미결제 시 낙찰이 취소될 수 있습니다.",
  },
  {
    q: "라이브 방송 중 입찰을 취소할 수 있나요?",
    a: "라이브 경매 특성상 입찰 후 취소는 불가합니다. 신중하게 입찰해주세요.",
  },
  {
    q: "판매자 전환은 어떻게 신청하나요?",
    a: "마이페이지의 '라이브커머스 판매자로 전환 신청' 버튼으로 신청할 수 있으며, 관리자 심사 후 영업일 기준 1~3일 내 결과를 알려드립니다.",
  },
  {
    q: "배송비는 누가 부담하나요?",
    a: "상품별로 판매자가 설정한 배송 정책을 따릅니다. 경매 상품 상세에서 배송비를 확인해주세요.",
  },
];

export default function SettingsPage() {
  useStoreVersion();
  const router = useRouter();
  const { user, ready, logout, refreshUser } = useAuth();
  const { toast } = useToast();

  // 계정 설정
  const [nickname, setNickname] = useState("");
  const [pwCur, setPwCur] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwNew2, setPwNew2] = useState("");

  // 알림 설정
  const [notif, setNotif] = useState<NotifState>({
    bid: true,
    live: true,
    chat: true,
    marketing: false,
  });

  // 개인정보 보호 — 차단 사용자 (UI mock)
  const [blocked, setBlocked] = useState<string[]>(INITIAL_BLOCKED);

  // FAQ 아코디언 — 한 번에 하나만 열림
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  useEffect(() => {
    if (user) setNickname(user.nickname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (!user) return <MobileShell><div className="p-10" /></MobileShell>;

  function saveNickname() {
    if (!user) return;
    if (!nickname.trim()) return toast("닉네임을 입력해주세요.", "error");
    update((s) => {
      const u = s.users.find((x) => x.id === user.id);
      if (u) u.nickname = nickname.trim();
    });
    refreshUser();
    toast("닉네임이 변경되었습니다.");
  }

  function changePassword() {
    if (!user) return;
    if (!pwCur) return toast("현재 비밀번호를 입력해주세요.", "error");
    if (user.password && pwCur !== user.password)
      return toast("현재 비밀번호가 일치하지 않습니다.", "error");
    if (pwNew.length < 4)
      return toast("새 비밀번호는 4자 이상 입력해주세요.", "error");
    if (pwNew !== pwNew2)
      return toast("새 비밀번호가 서로 일치하지 않습니다.", "error");
    update((s) => {
      const u = s.users.find((x) => x.id === user.id);
      if (u) u.password = pwNew;
    });
    setPwCur("");
    setPwNew("");
    setPwNew2("");
    toast("비밀번호가 변경되었습니다.");
  }

  function toggleNotif(key: keyof NotifState, label: string) {
    setNotif((n) => {
      const next = !n[key];
      toast(next ? `${label} 알림을 켰습니다.` : `${label} 알림을 껐습니다.`);
      return { ...n, [key]: next };
    });
  }

  return (
    <MobileShell>
      <PageHeader title="설정" />
      <div className="space-y-6 px-4 py-4">
        {/* ==== 계정 설정 ==== */}
        <Section icon={User} title="계정 설정">
          {/* 프로필 이미지 */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar seed={user.avatar} name={user.nickname} size={56} />
              <button
                onClick={() => toast("프로필 이미지 변경은 준비 중입니다.", "info")}
                aria-label="프로필 이미지 변경"
                className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-neutral-900 text-brand-400"
              >
                <Camera className="h-3 w-3" strokeWidth={2} />
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-neutral-900">{user.nickname}</p>
              <p className="text-xs text-neutral-400">{user.email}</p>
            </div>
          </div>

          {/* 닉네임 */}
          <div className="mt-4">
            <label className="mb-1.5 block text-sm font-semibold text-neutral-700">닉네임</label>
            <div className="flex gap-2">
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="h-11 min-w-0 flex-1 rounded-xl border border-neutral-300 px-3 text-sm outline-none focus:border-brand-500"
              />
              <Button onClick={saveNickname}>저장</Button>
            </div>
          </div>

          {/* 비밀번호 변경 */}
          <div className="mt-4 border-t border-neutral-100 pt-4">
            <p className="mb-3 text-sm font-semibold text-neutral-700">비밀번호 변경</p>
            <div className="space-y-2.5">
              <input
                type="password"
                value={pwCur}
                onChange={(e) => setPwCur(e.target.value)}
                placeholder="현재 비밀번호"
                className="w-full rounded-xl border border-neutral-300 px-3 py-3 text-sm outline-none focus:border-brand-500"
              />
              <input
                type="password"
                value={pwNew}
                onChange={(e) => setPwNew(e.target.value)}
                placeholder="새 비밀번호 (4자 이상)"
                className="w-full rounded-xl border border-neutral-300 px-3 py-3 text-sm outline-none focus:border-brand-500"
              />
              <input
                type="password"
                value={pwNew2}
                onChange={(e) => setPwNew2(e.target.value)}
                placeholder="새 비밀번호 확인"
                className="w-full rounded-xl border border-neutral-300 px-3 py-3 text-sm outline-none focus:border-brand-500"
              />
              <Button fullWidth variant="outline" onClick={changePassword}>
                비밀번호 변경하기
              </Button>
            </div>
          </div>
        </Section>

        {/* ==== 알림 설정 ==== */}
        <Section icon={Bell} title="알림 설정">
          <div className="space-y-1">
            <ToggleRow
              label="입찰/낙찰 알림"
              desc="내가 참여한 경매의 입찰·낙찰 소식"
              checked={notif.bid}
              onToggle={() => toggleNotif("bid", "입찰/낙찰")}
            />
            <ToggleRow
              label="라이브 시작 알림"
              desc="알림 신청한 라이브 경매 시작 소식"
              checked={notif.live}
              onToggle={() => toggleNotif("live", "라이브 시작")}
            />
            <ToggleRow
              label="채팅 알림"
              desc="거래 채팅·라이브 채팅 멘션 알림"
              checked={notif.chat}
              onToggle={() => toggleNotif("chat", "채팅")}
            />
            <ToggleRow
              label="마케팅/이벤트 알림"
              desc="할인 쿠폰, 기획전 등 혜택 소식"
              checked={notif.marketing}
              onToggle={() => toggleNotif("marketing", "마케팅")}
            />
          </div>
        </Section>

        {/* ==== 결제 설정 (UI mock) ==== */}
        <Section icon={CreditCard} title="결제 설정">
          <div className="space-y-2">
            {MOCK_CARDS.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-xl border border-neutral-100 p-3"
              >
                <div className="flex h-9 w-12 shrink-0 items-center justify-center rounded-lg bg-neutral-900">
                  <CreditCard className="h-4 w-4 text-brand-400" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-neutral-900">
                    {c.name}
                    {c.main && <Badge tone="brand">주카드</Badge>}
                  </p>
                  <p className="text-xs text-neutral-400">{c.number}</p>
                </div>
                <button
                  onClick={() => toast("카드 관리 기능은 준비 중입니다.", "info")}
                  className="shrink-0 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[11px] font-semibold text-neutral-600 transition-colors hover:border-brand-400 hover:bg-brand-50"
                >
                  관리
                </button>
              </div>
            ))}
            <button
              onClick={() => toast("카드 등록 기능은 준비 중입니다.", "info")}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-neutral-200 py-3 text-sm font-semibold text-neutral-500 transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-neutral-800"
            >
              <Plus className="h-4 w-4" strokeWidth={2} /> 새 카드 등록
            </button>
          </div>
        </Section>

        {/* ==== 개인정보 보호 ==== */}
        <Section icon={ShieldCheck} title="개인정보 보호">
          <p className="mb-2 text-xs font-bold text-neutral-500">
            차단한 사용자 ({blocked.length})
          </p>
          {blocked.length ? (
            <div className="space-y-2">
              {blocked.map((name) => (
                <div
                  key={name}
                  className="flex items-center gap-3 rounded-xl border border-neutral-100 px-3 py-2.5"
                >
                  <Ban className="h-4 w-4 shrink-0 text-red-400" strokeWidth={1.75} />
                  <p className="min-w-0 flex-1 text-sm font-semibold text-neutral-800">{name}</p>
                  <button
                    onClick={() => {
                      setBlocked((prev) => prev.filter((b) => b !== name));
                      toast(`${name}님 차단을 해제했습니다.`);
                    }}
                    className="shrink-0 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[11px] font-semibold text-neutral-600 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-500"
                  >
                    차단 해제
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-neutral-200 py-6 text-center text-xs text-neutral-400">
              차단한 사용자가 없어요.
            </p>
          )}
        </Section>

        {/* ==== 고객센터 ==== */}
        <Section icon={Headphones} title="고객센터">
          <p className="mb-2 text-xs font-bold text-neutral-500">자주 묻는 질문</p>
          <div className="space-y-2">
            {FAQS.map((f, i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-neutral-100">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between gap-2 px-3.5 py-3 text-left"
                >
                  <span className="text-sm font-semibold text-neutral-800">{f.q}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-neutral-400 transition-transform",
                      openFaq === i && "rotate-180"
                    )}
                    strokeWidth={2}
                  />
                </button>
                {openFaq === i && (
                  <p className="border-t border-neutral-100 bg-neutral-50 px-3.5 py-3 text-xs leading-relaxed text-neutral-600">
                    {f.a}
                  </p>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={() => toast("1:1 문의는 준비 중입니다.", "info")}
            className="mt-3 flex w-full items-center justify-between rounded-xl bg-neutral-900 px-4 py-3.5 text-sm font-bold text-brand-400 transition-colors hover:bg-neutral-800"
          >
            1:1 문의하기
            <ChevronRight className="h-4 w-4" strokeWidth={2} />
          </button>
        </Section>

        {/* ==== 로그아웃 ==== */}
        <Button fullWidth variant="outline" className="text-red-500" onClick={logout}>
          <LogOut className="h-4 w-4" strokeWidth={1.75} /> 로그아웃
        </Button>
      </div>
    </MobileShell>
  );
}

// 설정 섹션 카드
function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-neutral-100 bg-white p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-bold text-neutral-900">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50">
          <Icon className="h-4 w-4 text-brand-700" strokeWidth={1.75} />
        </span>
        {title}
      </p>
      {children}
    </section>
  );
}

// 알림 토글 행
function ToggleRow({
  label,
  desc,
  checked,
  onToggle,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-neutral-100 px-3 py-2.5">
      <div className="min-w-0 flex-1 pr-3">
        <p className="text-sm font-semibold text-neutral-800">{label}</p>
        <p className="text-[11px] text-neutral-400">{desc}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onToggle}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-brand-500" : "bg-neutral-300"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
            checked ? "left-[22px]" : "left-0.5"
          )}
        />
      </button>
    </div>
  );
}
