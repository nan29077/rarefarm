"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { BellOff } from "lucide-react";
import { CustomIcon } from "@/components/common/CustomIcon";
import { useAuth } from "@/components/providers/AuthProvider";
import { cn } from "@/lib/utils";

// compact: MobileShell 상단 헤더 한 줄에 로고와 나란히 들어가는 모드.
// 자체 여백 없이 남은 폭을 채우고 입력 높이를 조금 줄인다.
export function SearchBar({
  withBell = true,
  compact = false,
}: {
  withBell?: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const { isLoggedIn, ready } = useAuth();
  const [q, setQ] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!notifOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notifOpen]);

  return (
    <div
      className={cn(
        "flex items-center gap-2",
        compact ? "min-w-0 flex-1" : "px-4 py-3"
      )}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          router.push(`/market?q=${encodeURIComponent(q)}`);
        }}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 transition-colors focus-within:border-brand-500 focus-within:bg-brand-50/50",
          compact ? "py-1.5" : "py-2.5"
        )}
      >
        <CustomIcon name="rf-nav-search" size={20} className="h-5 w-5 shrink-0" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="브랜드, 상품명 검색"
          className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
        />
      </form>
      {/* 비로그인 시에만 로그인 버튼 노출 (하이드레이션 완료 후, 벨 버튼 왼쪽) */}
      {ready && !isLoggedIn && (
        <Link
          href="/login"
          className="shrink-0 px-2 text-sm font-medium text-neutral-700 hover:text-brand-600"
        >
          로그인
        </Link>
      )}
      {withBell && (
        <div ref={notifRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setNotifOpen((prev) => !prev)}
            className="relative rounded-xl p-1 text-neutral-700"
            aria-label="알림"
            aria-expanded={notifOpen}
          >
            <CustomIcon name="rf-alarm" size={24} className="h-6 w-6" />
            <span className="absolute right-1.5 top-1 h-2 w-2 rounded-full border border-white bg-brand-500" />
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-neutral-100 bg-white shadow-lg">
              <div className="border-b border-neutral-100 px-4 py-3">
                <span className="text-sm font-semibold text-neutral-800">알림</span>
              </div>
              <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-neutral-400">
                <BellOff size={32} strokeWidth={1.5} />
                <span className="text-sm">알림이 없습니다</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
