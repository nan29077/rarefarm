"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, ShieldAlert } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { AdminSidebar, AdminMobileSidebar } from "@/components/admin/AdminSidebar";
import { Button } from "@/components/common/Button";
import { Spinner } from "@/components/common/EmptyState";

// PC 대시보드 레이아웃. 오른쪽 세로 관리자 메뉴 고정. role=admin만 접근.
export function AdminLayout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const { user, ready, isAdmin } = useAuth();
  const router = useRouter();
  const path = usePathname();
  // 모바일 드로어 사이드바 열림 상태
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (ready && !isAdmin && !user) router.replace("/login");
  }, [ready, isAdmin, user, router]);

  // 페이지 이동 시 드로어 자동 닫기
  useEffect(() => {
    setDrawerOpen(false);
  }, [path]);

  if (!ready) return <Spinner />;

  // 접근 제한 화면
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-6 text-center">
        <ShieldAlert className="mb-4 h-12 w-12 text-red-400" strokeWidth={1.5} />
        <h1 className="text-xl font-bold text-neutral-900">
          접근 권한이 없습니다
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          관리자 계정으로 로그인해야 이용할 수 있습니다.
        </p>
        <div className="mt-5 flex gap-2">
          <Button variant="outline" onClick={() => router.push("/")}>
            홈으로
          </Button>
          <Button onClick={() => router.push("/login")}>로그인</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-neutral-50">
      {/* 좌측 고정 사이드바 (PC) */}
      <AdminSidebar />
      <main className="min-w-0 flex-1 overflow-x-auto">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-2 border-b-2 border-brand-500 bg-white px-4 md:px-8">
          <div className="flex min-w-0 items-center gap-2">
            {/* 모바일: 햄버거 버튼 → 드로어 사이드바 */}
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="관리자 메뉴 열기"
              className="-ml-1 rounded-lg p-1.5 text-neutral-700 transition-colors hover:bg-neutral-100 lg:hidden"
            >
              <Menu className="h-5 w-5" strokeWidth={1.75} />
            </button>
            <h1 className="flex min-w-0 items-center gap-2.5 text-lg font-bold text-neutral-900 md:text-xl">
              <span className="hidden h-5 w-1.5 shrink-0 rounded-full bg-brand-500 md:block" />
              <span className="truncate">{title}</span>
            </h1>
          </div>
          <span className="hidden shrink-0 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-sm text-neutral-500 sm:inline-block">
            {new Date().toLocaleDateString("ko-KR", {
              year: "numeric",
              month: "long",
              day: "numeric",
              weekday: "short",
            })}
          </span>
        </header>
        <div className="honeycomb-gold min-h-[calc(100vh-4rem)] px-3 py-4 md:px-6 md:py-6">
          {children}
        </div>
      </main>
      <AdminMobileSidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
