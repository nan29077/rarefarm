"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LogOut,
  Home,
  LayoutDashboard,
  Users,
  UserCheck,
  ShoppingBag,
  Gavel,
  Radio,
  Package,
  CreditCard,
  FileText,
  Settings,
  ChevronDown,
  X,
  Flag,
  Tag,
  Bell,
  ScrollText,
  GalleryHorizontalEnd,
  MessageSquare,
  HelpCircle,
  BarChart3,
  ShieldCheck,
  Layers,
  RefreshCcw,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";
import { Avatar } from "@/components/common/Avatar";

interface SubItem {
  href: string;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
}

interface NavSection {
  id: string;
  label: string;
  icon: LucideIcon;
  /** true이면 하위 항목 없이 바로 링크로 처리 */
  direct?: boolean;
  items: SubItem[];
}

const navSections: NavSection[] = [
  {
    id: "dashboard",
    label: "대시보드",
    icon: LayoutDashboard,
    direct: true,
    items: [{ href: "/admin", label: "전체 현황", icon: BarChart3 }],
  },
  {
    id: "members",
    label: "회원 관리",
    icon: Users,
    items: [
      { href: "/admin/members", label: "전체 회원", icon: Users },
      { href: "/admin/seller-requests", label: "판매자 관리", icon: UserCheck },
      { href: "/admin/buyers", label: "구매자 관리", icon: ShoppingBag },
      { href: "/admin/roles", label: "등급/권한 관리", icon: ShieldCheck },
    ],
  },
  {
    id: "auction",
    label: "경매 관리",
    icon: Gavel,
    items: [
      { href: "/admin/auction", label: "진행 중 경매", icon: Gavel },
      { href: "/admin/auction-products", label: "경매 상품 목록", icon: Package },
      { href: "/admin/trades", label: "입찰 내역", icon: Layers },
      { href: "/admin/winning-bids", label: "낙찰 관리", icon: CreditCard },
    ],
  },
  {
    id: "live",
    label: "라이브 관리",
    icon: Radio,
    items: [
      { href: "/admin/lives", label: "라이브 목록", icon: Radio },
      { href: "/admin/broadcast", label: "방송 설정", icon: Settings },
    ],
  },
  {
    id: "products",
    label: "상품 관리",
    icon: Package,
    items: [
      { href: "/admin/products", label: "상품 목록", icon: Package },
      { href: "/admin/categories", label: "카테고리 관리", icon: Tag },
      { href: "/admin/product-approval", label: "상품 승인", icon: ShieldCheck },
    ],
  },
  {
    id: "orders",
    label: "주문/정산",
    icon: CreditCard,
    items: [
      { href: "/admin/orders", label: "주문 내역", icon: FileText },
      { href: "/admin/settlements", label: "정산 관리", icon: CreditCard },
      { href: "/admin/refunds", label: "환불/취소", icon: RefreshCcw },
    ],
  },
  {
    id: "content",
    label: "콘텐츠 관리",
    icon: FileText,
    items: [
      { href: "/admin/community", label: "공지사항", icon: MessageSquare },
      { href: "/admin/banners", label: "배너/이벤트", icon: GalleryHorizontalEnd },
      { href: "/admin/reports", label: "신고 관리", icon: Flag },
      { href: "/admin/faq", label: "FAQ", icon: HelpCircle },
    ],
  },
  {
    id: "system",
    label: "시스템 설정",
    icon: Settings,
    items: [
      { href: "/admin/settings", label: "앱 기본 설정", icon: Settings },
      { href: "/admin/notifications", label: "알림 설정", icon: Bell },
      { href: "/admin/policies", label: "약관/정책", icon: ScrollText },
    ],
  },
];

function isItemActive(href: string, pathname: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname.startsWith(href);
}

function getInitialExpanded(pathname: string): Set<string> {
  const set = new Set<string>();
  for (const section of navSections) {
    if (section.direct) continue;
    if (section.items.some((item) => isItemActive(item.href, pathname))) {
      set.add(section.id);
    }
  }
  return set;
}

// ─── 사이드바 공용 콘텐츠 ───────────────────────────────────────────────────
function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { logout, user } = useAuth();

  const [expanded, setExpanded] = useState<Set<string>>(() =>
    getInitialExpanded(pathname)
  );

  // 페이지 이동 시 해당 섹션 자동 펼치기
  useEffect(() => {
    setExpanded((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const section of navSections) {
        if (section.direct) continue;
        if (
          !next.has(section.id) &&
          section.items.some((item) => isItemActive(item.href, pathname))
        ) {
          next.add(section.id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [pathname]);

  const toggleSection = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="flex h-full flex-col">
      {/* 로고 */}
      <div className="mb-4 shrink-0 px-2">
        <Link href="/admin" onClick={onNavigate} className="inline-flex">
          <Image
            src="/logo-rarefarm-new.png"
            alt="레어팜"
            width={160}
            height={48}
            className="h-10 w-auto object-contain"
            priority
          />
        </Link>
        <p className="mt-1 px-1 text-[11px] text-neutral-500">관리자 콘솔</p>
      </div>

      {/* 아코디언 네비게이션 */}
      <nav className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-0.5 pb-2">
          {navSections.map((section) => {
            const SectionIcon = section.icon;
            const sectionActive = section.items.some((item) =>
              isItemActive(item.href, pathname)
            );

            // direct 모드: 하위 항목 없이 바로 링크
            if (section.direct) {
              const item = section.items[0];
              if (!item) return null;
              const active = isItemActive(item.href, pathname);
              return (
                <Link
                  key={section.id}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors",
                    active
                      ? "bg-brand-500 text-neutral-900"
                      : "text-neutral-300 hover:bg-white/5 hover:text-brand-400"
                  )}
                >
                  <SectionIcon
                    className="h-4 w-4 shrink-0"
                    strokeWidth={active ? 2.5 : 1.75}
                  />
                  {section.label}
                </Link>
              );
            }

            const isOpen = expanded.has(section.id);

            return (
              <div key={section.id}>
                {/* 1차 메뉴 헤더 */}
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors",
                    sectionActive
                      ? "text-brand-400"
                      : "text-neutral-300 hover:bg-white/5 hover:text-brand-400"
                  )}
                >
                  <SectionIcon
                    className="h-4 w-4 shrink-0"
                    strokeWidth={sectionActive ? 2.5 : 1.75}
                  />
                  <span className="flex-1 text-left">{section.label}</span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 text-neutral-600 transition-transform duration-200",
                      isOpen && "rotate-180"
                    )}
                    strokeWidth={2}
                  />
                </button>

                {/* 2차 메뉴 */}
                {isOpen && (
                  <div className="mb-1 ml-3 mt-0.5 flex flex-col gap-0.5 border-l border-neutral-800 pl-3">
                    {section.items.map((item) => {
                      const ItemIcon = item.icon;

                      if (item.disabled) {
                        return (
                          <div
                            key={item.href}
                            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-neutral-600"
                          >
                            <ItemIcon
                              className="h-3.5 w-3.5 shrink-0"
                              strokeWidth={1.5}
                            />
                            <span className="flex-1">{item.label}</span>
                            <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500">
                              준비중
                            </span>
                          </div>
                        );
                      }

                      const active = isItemActive(item.href, pathname);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={onNavigate}
                          className={cn(
                            "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                            active
                              ? "bg-brand-500/20 font-semibold text-brand-400"
                              : "text-neutral-400 hover:bg-white/5 hover:text-brand-300"
                          )}
                        >
                          <ItemIcon
                            className={cn(
                              "h-3.5 w-3.5 shrink-0",
                              active ? "text-brand-400" : "text-neutral-500"
                            )}
                            strokeWidth={active ? 2.5 : 1.75}
                          />
                          <span className="flex-1">{item.label}</span>
                          {active && (
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* 하단 영역 */}
      <div className="mt-2 shrink-0 border-t border-neutral-800 pt-3">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-neutral-400 transition-colors hover:bg-white/5 hover:text-brand-400"
        >
          <Home className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          메인으로
        </Link>
        <div className="mb-1 mt-1 flex items-center gap-2 rounded-lg px-2 py-1.5">
          <Avatar seed={user?.avatar ?? ""} name={user?.nickname ?? user?.email} size={28} />
          <div className="min-w-0 flex-1">
            {user?.nickname && <p className="truncate text-xs font-semibold text-neutral-300">{user.nickname}</p>}
            <p className="truncate text-[11px] text-neutral-600">{user?.email}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-neutral-400 transition-colors hover:bg-white/5 hover:text-red-400"
        >
          <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          로그아웃
        </button>
      </div>
    </div>
  );
}

// ─── PC 좌측 고정 사이드바 ────────────────────────────────────────────────────
export function AdminSidebar() {
  return (
    <aside className="honeycomb-light sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-neutral-800 bg-[#111111] p-4 lg:flex">
      <SidebarContent />
    </aside>
  );
}

// ─── 모바일 드로어 사이드바 (왼쪽에서 슬라이드인) ────────────────────────────
export function AdminMobileSidebar({
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
          "honeycomb-light absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto bg-[#111111] p-4 transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          type="button"
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
