"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
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
      {withBell && (
        <button
          type="button"
          onClick={() => router.push("/mypage/settings")}
          className="relative shrink-0 rounded-xl p-1 text-neutral-700"
          aria-label="알림"
        >
          <CustomIcon name="rf-alarm" size={24} className="h-6 w-6" />
          <span className="absolute right-1.5 top-1 h-2 w-2 rounded-full border border-white bg-brand-500" />
        </button>
      )}
      {/* 비로그인 시에만 로그인 버튼 노출 (하이드레이션 완료 후) */}
      {ready && !isLoggedIn && (
        <Link
          href="/login"
          className="shrink-0 px-2 text-sm font-medium text-neutral-700 hover:text-brand-600"
        >
          로그인
        </Link>
      )}
    </div>
  );
}
