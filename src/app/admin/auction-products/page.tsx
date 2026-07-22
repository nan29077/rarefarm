"use client";

import { useState } from "react";
import { Package, Clock, Radio, Trophy, XCircle } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  StatCard,
  Panel,
  Table,
  StatusPill,
  ActionButton,
  AdminSearch,
  FilterChip,
} from "@/components/admin/AdminUI";
import { Placeholder } from "@/components/common/Placeholder";
import { marketService } from "@/lib/marketService";
import {
  auctionService,
  auctionItemStatusLabels,
  auctionCategoryName,
} from "@/lib/auctionService";
import { useStoreVersion } from "@/lib/useStore";
import { useToast } from "@/components/providers/ToastProvider";
import { formatPrice, formatDate, cn } from "@/lib/utils";
import type { AuctionItemStatus } from "@/types";

const statusTone: Record<AuctionItemStatus, "green" | "red" | "amber" | "neutral"> = {
  waiting: "neutral",
  live: "amber",
  sold: "green",
  failed: "red",
};

const statusList: AuctionItemStatus[] = ["waiting", "live", "sold", "failed"];

export default function AdminAuctionProductsPage() {
  useStoreVersion();
  const { toast } = useToast();
  const items = auctionService.getItems();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AuctionItemStatus | "all">("all");

  const counts = {
    all: items.length,
    waiting: items.filter((i) => i.status === "waiting").length,
    live: items.filter((i) => i.status === "live").length,
    sold: items.filter((i) => i.status === "sold").length,
    failed: items.filter((i) => i.status === "failed").length,
    suspended: items.filter((i) => i.suspended).length,
  };

  const filtered = items.filter((it) => {
    if (statusFilter !== "all" && it.status !== statusFilter) return false;
    if (query.trim()) return it.name.toLowerCase().includes(query.trim().toLowerCase());
    return true;
  });

  function toggleSuspend(id: string, current: boolean) {
    auctionService.setItemSuspended(id, !current);
    toast(!current ? "상품을 판매 중지 처리했습니다." : "판매 중지를 해제했습니다.");
  }

  return (
    <AdminLayout title="경매 상품 목록">
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Package} label="전체 경매 상품" value={counts.all} accent />
        <StatCard icon={Clock} label="대기중" value={counts.waiting} />
        <StatCard icon={Radio} label="진행중" value={counts.live} />
        <StatCard icon={Trophy} label="낙찰 완료" value={counts.sold} />
      </div>

      {counts.suspended > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <XCircle className="h-4 w-4 shrink-0 text-red-500" strokeWidth={2} />
          <p className="text-sm text-red-700">
            현재 <span className="font-bold">{counts.suspended}개</span>의 상품이 판매 중지 처리되어 있습니다.
          </p>
        </div>
      )}

      <Panel
        title={`경매 상품 (${filtered.length}개)`}
        action={
          <AdminSearch value={query} onChange={setQuery} placeholder="상품명 검색..." />
        }
      >
        <div className="flex flex-wrap gap-2 px-3 pt-2">
          <FilterChip active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>
            전체 ({counts.all})
          </FilterChip>
          {statusList.map((s) => (
            <FilterChip
              key={s}
              active={statusFilter === s}
              onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
            >
              {auctionItemStatusLabels[s]} ({counts[s]})
            </FilterChip>
          ))}
        </div>

        {/* PC 테이블 */}
        <div className="hidden md:block">
          <Table head={["상품", "카테고리", "판매자", "시작가", "현재/낙찰가", "상태", "판매중지"]}>
            {filtered.map((it) => {
              const seller = marketService.getUser(it.sellerId);
              return (
                <tr key={it.id} className={it.suspended ? "opacity-50" : undefined}>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Placeholder seed={it.image} className="h-10 w-10 rounded-lg" showIcon={false} />
                      <div>
                        <p className="line-clamp-1 font-medium text-neutral-800">{it.name}</p>
                        <p className="text-xs text-neutral-400">{formatDate(it.createdAt)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-neutral-500">{auctionCategoryName(it.categoryId)}</td>
                  <td className="px-3 py-2.5 text-neutral-600">{seller?.nickname ?? "-"}</td>
                  <td className="px-3 py-2.5 text-neutral-500">{formatPrice(it.startPrice)}</td>
                  <td className="px-3 py-2.5 font-semibold text-neutral-900">
                    {formatPrice(it.finalPrice ?? it.currentPrice)}
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusPill tone={statusTone[it.status]}>
                      {auctionItemStatusLabels[it.status]}
                    </StatusPill>
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      role="switch"
                      aria-checked={it.suspended}
                      onClick={() => toggleSuspend(it.id, it.suspended)}
                      className={cn(
                        "relative h-6 w-11 rounded-full transition-colors",
                        it.suspended ? "bg-red-500" : "bg-neutral-200"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                          it.suspended ? "left-[22px]" : "left-0.5"
                        )}
                      />
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-sm text-neutral-400">
                  조건에 맞는 경매 상품이 없습니다.
                </td>
              </tr>
            )}
          </Table>
        </div>
        {/* 모바일 카드 */}
        <div className="space-y-3 p-3 md:hidden">
          {filtered.map((it) => {
            const seller = marketService.getUser(it.sellerId);
            return (
              <div key={it.id} className={cn("rounded-xl border border-neutral-200 p-3", it.suspended && "opacity-50")}>
                <div className="flex items-start gap-3">
                  <Placeholder seed={it.image} className="h-12 w-12 shrink-0 rounded-lg" showIcon={false} />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-bold text-neutral-900">{it.name}</p>
                    <p className="text-xs text-neutral-400">{auctionCategoryName(it.categoryId)} · {seller?.nickname}</p>
                    <p className="text-xs font-semibold text-neutral-700">{formatPrice(it.finalPrice ?? it.currentPrice)}</p>
                  </div>
                  <StatusPill tone={statusTone[it.status]}>{auctionItemStatusLabels[it.status]}</StatusPill>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-neutral-400">시작가 {formatPrice(it.startPrice)}</span>
                  <ActionButton onClick={() => toggleSuspend(it.id, it.suspended)}>
                    {it.suspended ? "중지 해제" : "판매 중지"}
                  </ActionButton>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-neutral-400">조건에 맞는 경매 상품이 없습니다.</p>
          )}
        </div>
      </Panel>
    </AdminLayout>
  );
}
