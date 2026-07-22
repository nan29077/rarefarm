"use client";

import { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { BottomNav, SideNav } from "./ResponsiveNav";
import { SearchBar } from "@/components/common/SearchBar";
import { cn } from "@/lib/utils";

// 일반 사용자 레이아웃.
// - 모바일: 전체 폭 + 상단 헤더 + 하단 고정 네비게이션
// - PC: 중앙 430px 앱 프레임 + 오른쪽 세로 네비게이션 (투어비/바이브포터 스타일)
//
// search: 검색이 필요한 목록형 페이지(홈/마켓)는 상단 헤더 한 줄에
// [로고][검색바][알림]을 함께 넣는다. 상세/서브 페이지는 로고만 있는 슬림 바를 쓰고
// 페이지 자체 헤더(PageHeader 등)를 그 아래 top-12에 붙인다.
export function MobileShell({
  children,
  search = false,
}: {
  children: ReactNode;
  search?: boolean;
}) {
  return (
    <div className="honeycomb-gold min-h-screen bg-neutral-50 md:bg-neutral-100">
      {/* 데스크톱 배경 헤더 영역 */}
      <div className="mx-auto flex w-full justify-center md:gap-4 md:py-8">
        <div className="relative w-full max-w-app bg-white md:min-h-[900px] md:overflow-clip md:rounded-[28px] md:border md:border-neutral-200 md:shadow-xl">
          {/* 모바일 상단 헤더 (PC는 SideNav 로고를 쓰므로 md 이상에서 숨김).
              로고만: h-12 = 48px → 페이지 자체 헤더는 top-12에 고정된다.
              검색 포함: h-14로 한 줄에 [로고][검색바][알림]. */}
          <header
            className={cn(
              "sticky top-0 z-50 flex items-center gap-3 border-b border-neutral-100 bg-white/95 px-4 backdrop-blur md:hidden",
              search ? "h-14" : "h-12"
            )}
          >
            <Link href="/" aria-label="레어팜 홈" className="inline-flex shrink-0">
              <Image
                src="/레어팜_로고_2a_가로.png"
                alt="레어팜"
                width={120}
                height={36}
                className="h-9 w-auto object-contain"
                priority
              />
            </Link>
            {search && <SearchBar compact />}
          </header>
          {/* PC는 위 헤더가 숨겨지고 로고도 SideNav에 있으므로, 검색바만 콘텐츠 상단에 둔다 */}
          {search && (
            <div className="hidden md:block">
              <SearchBar />
            </div>
          )}
          {/* 콘텐츠: 하단 네비에 가려지지 않도록 pb 적용.
              검색 헤더가 있는 페이지는 모바일에서 헤더와 첫 콘텐츠가 붙지 않도록 pt 보정
              (PC는 위 검색바의 py-3가 이미 간격을 만든다) */}
          <div className={cn("pb-20 md:pb-6", search && "pt-3 md:pt-0")}>
            {children}
          </div>
          <BottomNav />
        </div>
        {/* PC 전용 오른쪽 세로 네비게이션 */}
        <div className="sticky top-8 hidden h-fit md:block">
          <SideNav />
        </div>
      </div>
    </div>
  );
}
