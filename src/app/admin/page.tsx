"use client";

import {
  Users,
  UserPlus,
  Package,
  Gavel,
  CheckCircle2,
  Images,
  Flag,
  Hexagon,
} from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { StatCard, Panel, Table, StatusPill } from "@/components/admin/AdminUI";
import { BeeIcon, Icon } from "@/components/common/Icon";
import { adminService } from "@/lib/adminService";
import { marketService } from "@/lib/marketService";
import { useStoreVersion } from "@/lib/useStore";
import { useAuth } from "@/components/providers/AuthProvider";
import { formatPrice, timeAgo, formatNumber } from "@/lib/utils";

export default function AdminDashboard() {
  useStoreVersion();
  const { user } = useAuth();
  const s = adminService.getStats();
  const recentTrades = adminService.getRecentTrades(6);
  const recentReports = adminService.getReports().slice(0, 5);

  // 카테고리별 상품 분포 (UI 시각화용)
  const allProducts = marketService.getProducts({ includeHidden: true });
  const catCounts = marketService.categories
    .map((c) => ({
      ...c,
      count: allProducts.filter((p) => p.categoryId === c.id).length,
    }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  const maxCount = Math.max(...catCounts.map((c) => c.count), 1);

  // 인기 상품 TOP 5
  const topProducts = marketService
    .getProducts({ sort: "popular" })
    .slice(0, 5);

  return (
    <AdminLayout title="대시보드">
      {/* 웰컴 배너 */}
      <div className="honeycomb-dark relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-[#FFD700] to-brand-500 px-6 py-5">
        <p className="text-xs font-bold text-neutral-900/60">
          KIDEUK MARKET ADMIN
        </p>
        <p className="mt-1 text-lg font-extrabold text-neutral-900">
          {user?.nickname ?? "관리자"}님, 오늘도 부지런한 하루 되세요
        </p>
        <p className="mt-0.5 text-sm text-neutral-900/70">
          신고 대기 {s.pendingReports}건 · 진행 중 입찰 {s.openBids}건을 확인해
          주세요.
        </p>
        <BeeIcon className="absolute -right-3 -top-3 h-24 w-24 rotate-12 text-neutral-900/15" />
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          icon={Users}
          label="전체 회원 수"
          value={s.totalMembers}
          accent
          sub="관리자 포함"
        />
        <StatCard icon={UserPlus} label="오늘 가입자" value={s.todaySignups} />
        <StatCard icon={Package} label="등록 상품 수" value={s.totalProducts} />
        <StatCard icon={Gavel} label="진행 중 입찰" value={s.openBids} />
        <StatCard
          icon={CheckCircle2}
          label="체결 거래"
          value={s.completedTrades}
        />
        <StatCard icon={Images} label="커뮤니티 게시물" value={s.totalPosts} />
        <StatCard
          icon={Flag}
          label="신고 대기"
          value={s.pendingReports}
          accent={s.pendingReports > 0}
          sub={s.pendingReports > 0 ? "처리가 필요합니다" : "모두 처리됨"}
        />
        <StatCard
          icon={Hexagon}
          label="활성 카테고리"
          value={catCounts.length}
        />
      </div>

      {/* 카테고리 분포 + 인기 상품 */}
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="카테고리별 상품 분포">
          <div className="space-y-3 p-3">
            {catCounts.map((c) => (
              <div key={c.id} className="flex items-center gap-3">
                <span className="hex-clip flex h-8 w-8 shrink-0 items-center justify-center bg-brand-100">
                  <Icon name={c.icon} className="h-4 w-4 text-brand-800" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-semibold text-neutral-700">
                      {c.name}
                    </span>
                    <span className="font-bold text-neutral-900">
                      {c.count}개
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
                      style={{ width: `${(c.count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="인기 상품 TOP 5">
          {/* PC 테이블 */}
          <div className="hidden md:block">
            <Table head={["순위", "상품", "관심", "최저 판매가"]}>
              {topProducts.map((p, i) => (
                <tr key={p.id}>
                  <td className="px-3 py-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-neutral-900 text-xs font-extrabold text-brand-400">
                      {i + 1}
                    </span>
                  </td>
                  <td className="max-w-[220px] px-3 py-3">
                    <span className="line-clamp-1 font-medium text-neutral-800">
                      {p.name}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-neutral-500">
                    {formatNumber(p.likeCount)}
                  </td>
                  <td className="px-3 py-3 font-bold text-neutral-900">
                    {formatPrice(p.lowestAsk)}
                  </td>
                </tr>
              ))}
            </Table>
          </div>
          {/* 모바일 카드 */}
          <div className="space-y-2 p-3 md:hidden">
            {topProducts.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-neutral-900 text-xs font-extrabold text-brand-400">
                  {i + 1}
                </span>
                <p className="min-w-0 flex-1 line-clamp-1 text-sm font-medium text-neutral-800">{p.name}</p>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-neutral-400">관심 {formatNumber(p.likeCount)}</p>
                  <p className="text-sm font-bold text-neutral-900">{formatPrice(p.lowestAsk)}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* 테이블 */}
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="최근 거래">
          {/* PC 테이블 */}
          <div className="hidden md:block">
            <Table head={["상품", "체결가", "시각"]}>
              {recentTrades.map((t) => (
                <tr key={t.id}>
                  <td className="px-3 py-3 font-medium text-neutral-800">
                    {t.productName}
                  </td>
                  <td className="px-3 py-3 font-bold text-neutral-900">
                    {formatPrice(t.price)}
                  </td>
                  <td className="px-3 py-3 text-neutral-400">
                    {timeAgo(t.createdAt)}
                  </td>
                </tr>
              ))}
            </Table>
          </div>
          {/* 모바일 카드 */}
          <div className="space-y-2 p-3 md:hidden">
            {recentTrades.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-xl border border-neutral-200 p-3">
                <p className="min-w-0 flex-1 line-clamp-1 text-sm font-medium text-neutral-800">{t.productName}</p>
                <div className="ml-3 shrink-0 text-right">
                  <p className="text-sm font-bold text-neutral-900">{formatPrice(t.price)}</p>
                  <p className="text-xs text-neutral-400">{timeAgo(t.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="최근 신고">
          {/* PC 테이블 */}
          <div className="hidden md:block">
            <Table head={["대상", "사유", "상태"]}>
              {recentReports.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-3 font-medium text-neutral-800">
                    {r.targetLabel}
                  </td>
                  <td className="px-3 py-3 text-neutral-500">{r.reason}</td>
                  <td className="px-3 py-3">
                    <StatusPill tone={r.status === "pending" ? "amber" : "green"}>
                      {r.status === "pending" ? "대기" : "처리 완료"}
                    </StatusPill>
                  </td>
                </tr>
              ))}
            </Table>
          </div>
          {/* 모바일 카드 */}
          <div className="space-y-2 p-3 md:hidden">
            {recentReports.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3">
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-medium text-neutral-800">{r.targetLabel}</p>
                  <p className="line-clamp-1 text-xs text-neutral-500">{r.reason}</p>
                </div>
                <StatusPill tone={r.status === "pending" ? "amber" : "green"}>
                  {r.status === "pending" ? "대기" : "처리 완료"}
                </StatusPill>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </AdminLayout>
  );
}
