"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  ShieldAlert,
  LogOut,
  Gavel,
  Radio,
  LayoutDashboard,
  Menu,
  X,
  Home,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/common/Button";
import { Spinner } from "@/components/common/EmptyState";
import { CustomIcon } from "@/components/common/CustomIcon";
import { Avatar } from "@/components/common/Avatar";

interface Item {
  href: string;
  label: string;
  icon: LucideIcon | string;
}

const items: Item[] = [
  { href: "/seller", label: "판매자 대시보드", icon: LayoutDashboard },
  { href: "/seller/auction-items", label: "경매 상품 등록", icon: Gavel },
  { href: "/seller/live-auction", label: "라이브 경매 관리", icon: Radio },
];

// 사이드바 내부 공용 콘텐츠 (PC 좌측 고정 / 모바일 드로어 공용)
function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  const { logout, user } = useAuth();
  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 px-2">
        <Link href="/seller" onClick={onNavigate} className="inline-flex">
          <Image
            src="/logo-rarefarm-new.png"
            alt="레어팜"
            width={160}
            height={48}
            className="h-10 w-auto object-contain"
            priority
          />
        </Link>
        <p className="mt-2 px-1 text-xs text-neutral-500">판매자 센터</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {items.map((it) => {
          const active =
            it.href === "/seller"
              ? path === "/seller"
              : path === it.href || path.startsWith(it.href + "/");
          const I = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-500 font-bold text-neutral-900"
                  : "text-neutral-400 hover:bg-white/5 hover:text-brand-400"
              )}
            >
              {typeof I === "string" ? (
                <CustomIcon
                  name={I}
                  size={20}
                  className={cn(
                    "h-5 w-5",
                    active ? "brightness-0" : "brightness-0 invert opacity-60"
                  )}
                />
              ) : (
                <I className="h-5 w-5" strokeWidth={active ? 2 : 1.75} />
              )}
              {it.label}
            </Link>
          );
        })}
      </nav>

      {/* 하단 고정 영역 */}
      <div className="mt-auto space-y-1 border-t border-neutral-800 pt-3">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-400 transition-colors hover:bg-white/5 hover:text-brand-400"
        >
          <Home className="h-5 w-5" strokeWidth={1.75} />
          메인으로
        </Link>
        <div className="mt-1 border-t border-neutral-800 pt-3">
          <div className="mb-1 flex items-center gap-2 px-3">
            <Avatar seed={user?.avatar ?? ""} name={user?.nickname ?? user?.email} size={28} />
            <div className="min-w-0 flex-1">
              {user?.nickname && (
                <p className="truncate text-xs font-semibold text-neutral-300">{user.nickname}</p>
              )}
              <p className="truncate text-[11px] text-neutral-500">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-400 transition-colors hover:bg-white/5 hover:text-red-400"
          >
            <LogOut className="h-5 w-5" strokeWidth={1.75} />
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}

// 판매자 세로 메뉴 (PC 좌측 고정) — 관리자 콘솔과 동일한 블랙 & 허니 옐로 테마
export function SellerSidebar() {
  return (
    <aside className="honeycomb-light hidden w-60 shrink-0 flex-col border-r border-neutral-800 bg-[#111111] p-4 lg:flex" style={{ minHeight: "100vh" }}>
      <SidebarContent />
    </aside>
  );
}

// 모바일 드로어 사이드바 — 햄버거 버튼으로 왼쪽에서 슬라이드인
export function SellerMobileSidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <div
      className={cn("fixed inset-0 z-50 lg:hidden", !open && "pointer-events-none")}
      aria-hidden={!open}
    >
      {/* 배경 오버레이 */}
      <div
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-black/50 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0"
        )}
      />
      {/* 드로어 본체 */}
      <aside
        className={cn(
          "honeycomb-light absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-[#111111] p-4 transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          onClick={onClose}
          aria-label="메뉴 닫기"
          className="absolute right-3 top-3 rounded-full p-1.5 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <SidebarContent onNavigate={onClose} />
      </aside>
    </div>
  );
}

// 판매자 대시보드 레이아웃. role=user/seller(판매자) 또는 admin만 접근.
export function SellerLayout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const { user, ready, isSeller, isAdmin } = useAuth();
  const router = useRouter();
  const path = usePathname();
  const allowed = isSeller || isAdmin;
  // 모바일 드로어 사이드바 열림 상태
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  // 페이지 이동 시 드로어 자동 닫기
  useEffect(() => {
    setDrawerOpen(false);
  }, [path]);

  if (!ready) return <Spinner />;

  if (!allowed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-6 text-center">
        <ShieldAlert className="mb-4 h-12 w-12 text-red-400" strokeWidth={1.5} />
        <h1 className="text-xl font-bold text-neutral-900">
          판매자 전용 페이지입니다
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          판매자 계정으로 로그인하거나, 마이페이지에서 판매자 전환을 신청해주세요.
        </p>
        <div className="mt-5 flex gap-2">
          <Button variant="outline" onClick={() => router.push("/")}>
            홈으로
          </Button>
          <Button onClick={() => router.push("/mypage")}>마이페이지</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-neutral-50">
      {/* PC: 좌측 고정 사이드바 */}
      <SellerSidebar />
      <main className="min-w-0 flex-1 overflow-x-auto">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-2 border-b-2 border-brand-500 bg-white px-4 md:px-8">
          <div className="flex min-w-0 items-center gap-2">
            {/* 모바일: 햄버거 버튼 → 드로어 사이드바 */}
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="판매자 메뉴 열기"
              className="-ml-1 rounded-lg p-1.5 text-neutral-700 transition-colors hover:bg-neutral-100 lg:hidden"
            >
              <Menu className="h-5 w-5" strokeWidth={1.75} />
            </button>
            <h1 className="flex min-w-0 items-center gap-2.5 text-lg font-bold text-neutral-900 md:text-xl">
              <span className="hidden h-5 w-1.5 shrink-0 rounded-full bg-brand-500 md:block" />
              <span className="truncate">{title}</span>
            </h1>
          </div>
        </header>
        <div className="honeycomb-gold min-h-[calc(100vh-4rem)] px-3 py-4 md:px-6 md:py-6">
          {children}
        </div>
      </main>
      {/* 모바일 드로어 사이드바 */}
      <SellerMobileSidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
