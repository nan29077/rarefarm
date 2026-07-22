"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Radio, LogIn, LogOut, LucideIcon } from "lucide-react";
import { CustomIcon } from "@/components/common/CustomIcon";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";

type NavItem = {
  href: string;
  label: string;
  icon: string | LucideIcon;
  match: (path: string) => boolean;
};

const items: NavItem[] = [
  { href: "/", label: "\ud648", icon: "rf-nav-home", match: (p) => p === "/" },
  { href: "/market", label: "\uacbd\ub9e4\ub9c8\ucf13", icon: "rf-nav-market", match: (p) => p.startsWith("/market") || p.startsWith("/product") },
  { href: "/sell", label: "\ub0b4\uacbd\ub9e4", icon: "rf-cat-plant-reg", match: (p) => p.startsWith("/sell") },
  { href: "/community", label: "\ucee4\ubba4\ub2c8\ud2f0", icon: "rf-nav-community", match: (p) => p.startsWith("/community") },
  { href: "/mypage", label: "\ub9c8\uc774\ud398\uc774\uc9c0", icon: "rf-growth", match: (p) => p.startsWith("/mypage") },
];

const sideItems: NavItem[] = [
  { href: "/", label: "\ud648", icon: "rf-nav-home", match: (p) => p === "/" },
  { href: "/market", label: "\uacbd\ub9e4\ub9c8\ucf13", icon: "rf-nav-market", match: (p) => p.startsWith("/market") || p.startsWith("/product") },
  { href: "/sell", label: "\ub0b4\uacbd\ub9e4\ub9cc\ub4e4\uae30", icon: "rf-cat-plant-reg", match: (p) => p.startsWith("/sell") },
  { href: "/community", label: "\ucee4\ubba4\ub2c8\ud2f0", icon: "rf-nav-community", match: (p) => p.startsWith("/community") },
  { href: "/live-auction", label: "\ub77c\uc774\ube0c \uacbd\ub9e4", icon: Radio, match: (p) => p.startsWith("/live-auction") },
  { href: "/mypage", label: "\ub9c8\uc774\ud398\uc774\uc9c0", icon: "rf-growth", match: (p) => p.startsWith("/mypage") },
];

export function BottomNav() {
  const path = usePathname();
  const isLivePage = path.startsWith("/live-auction");
  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-app border-t border-neutral-200 bg-white/95 backdrop-blur md:hidden">
        {items.map((it) => {
          const active = it.match(path);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium",
                active ? "text-neutral-900" : "text-neutral-400"
              )}
            >
              {active && (
                <span className="absolute top-0 h-0.5 w-8 rounded-full bg-brand-500" />
              )}
              {typeof it.icon === "string" ? (
                <CustomIcon
                  name={it.icon}
                  size={24}
                  className={cn("h-6 w-6", !active && "grayscale opacity-55")}
                />
              ) : (
                <it.icon
                  className={cn("h-6 w-6", !active && "opacity-55")}
                  strokeWidth={1.75}
                />
              )}
              {it.label}
            </Link>
          );
        })}
      </nav>
      {!isLivePage && <LiveFloatingButton />}
    </>
  );
}

function LiveFloatingButton() {
  return (
    <Link
      href="/live-auction"
      className="fixed bottom-20 right-4 z-50 flex h-14 w-14 flex-col items-center justify-center rounded-full bg-red-500 shadow-lg shadow-red-500/40 md:hidden"
      aria-label="\ub77c\uc774\ube0c \uacbd\ub9e4"
    >
      <Radio className="h-5 w-5 text-white" strokeWidth={1.75} />
      <span className="text-[9px] font-extrabold tracking-wider text-white">LIVE</span>
    </Link>
  );
}

export function SideNav() {
  const path = usePathname();
  const { user, isLoggedIn, logout } = useAuth();
  return (
    <aside className="hidden w-52 shrink-0 md:flex md:flex-col">
      <div className="sticky top-8 flex h-[calc(100vh-4rem)] flex-col pt-4">
        {/* 로고 */}
        <Link href="/" className="mb-4 flex shrink-0 items-center px-2">
          <Image
            src="/레어팜_로고_2a_가로.png"
            alt="레어팜"
            width={132}
            height={40}
            className="h-9 w-auto object-contain"
            priority
          />
        </Link>

        {/* 메뉴 항목 (스크롤 영역) */}
        <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto">
          {sideItems.map((it) => {
            const active = it.match(path);
            return (
              <Link
                key={it.href}
                href={it.href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-sm transition-all",
                  active
                    ? "border-brand-400 bg-brand-500 text-neutral-900 shadow-brand-200"
                    : "border-neutral-200 bg-white text-neutral-600 hover:border-brand-300 hover:bg-brand-50 hover:text-neutral-900"
                )}
              >
                {typeof it.icon === "string" ? (
                  <CustomIcon
                    name={it.icon}
                    size={20}
                    className={cn("h-5 w-5", !active && "grayscale opacity-55")}
                  />
                ) : (
                  <it.icon
                    className={cn("h-5 w-5", active ? "text-neutral-900" : "text-neutral-400")}
                    strokeWidth={active ? 2 : 1.75}
                  />
                )}
                {it.label}
              </Link>
            );
          })}
        </div>

        {/* 로그인/로그아웃 — 하단 고정 */}
        <div className="shrink-0 pt-2">
          {isLoggedIn ? (
            <button
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-500 shadow-sm transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="h-5 w-5" strokeWidth={1.75} />
              로그아웃
            </button>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-600 shadow-sm transition-all hover:border-brand-300 hover:bg-brand-50 hover:text-neutral-900"
            >
              <LogIn className="h-5 w-5 text-neutral-400" strokeWidth={1.75} />
              로그인
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}
