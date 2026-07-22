"use client";

import { useState } from "react";
import Link from "next/link";
import { Gavel, Radio, Ban, Trophy, Eye, ExternalLink } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  StatCard,
  Panel,
  Table,
  StatusPill,
  AdminSearch,
  FilterChip,
} from "@/components/admin/AdminUI";
import { Placeholder } from "@/components/common/Placeholder";
import { marketService } from "@/lib/marketService";
import {
  auctionService,
  auctionItemStatusLabels,
  auctionCategoryName,
  maskNickname,
} from "@/lib/auctionService";
import { useStoreVersion } from "@/lib/useStore";
import { useToast } from "@/components/providers/ToastProvider";
import { formatPrice, formatNumber, cn } from "@/lib/utils";
import type { AuctionItemStatus } from "@/types";

const itemTone: Record<AuctionItemStatus, "green" | "red" | "amber" | "neutral"> = {
  waiting: "neutral",
  live: "amber",
  sold: "green",
  failed: "red",
};

export default function AdminAuctionPage() {
  useStoreVersion();
  const { toast } = useToast();
  const items = auctionService.getItems();
  const liveNow = auctionService.getLives("live");

  const [query, setQuery] = useState("");
  const [sellerFilter, setSellerFilter] = useState("");

  const sellers = Array.from(new Set(items.map((i) => i.sellerId))).map(
    (id) => ({ id, nickname: marketService.getUser(id)?.nickname ?? id })
  );

  const filtered = items.filter((it) => {
    if (sellerFilter && it.sellerId !== sellerFilter) return false;
    if (query.trim())
      return it.name.toLowerCase().includes(query.trim().toLowerCase());
    return true;
  });

  const suspendedCount = items.filter((i) => i.suspended).length;
  const soldCount = items.filter((i) => i.status === "sold").length;

  function toggleSuspend(id: string, current: boolean) {
    auctionService.setItemSuspended(id, !current);
    toast(
      !current
        ? "상품을 판매 중지 처리했습니다."
        : "상품 판매 중지를 해제했습니다."
    );
  }

  return (
    <AdminLayout title="경매 관리">
      {/* 통계 카드 */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon={Gavel} label="전체 경매 상품" value={items.length} accent />
        <StatCard icon={Radio} label="진행중 라이브" value={liveNow.length} />
        <StatCard icon={Trophy} label="낙찰 완료" value={soldCount} />
        <StatCard icon={Ban} label="판매 중지" value={suspendedCount} />
      </div>

      {/* 진행중 라이브 모니터링 */}
      <div className="mb-6">
        <Panel title="진행중인 라이브 모니터링">
          {liveNow.length ? (
            <div className="grid gap-3 p-3 lg:grid-cols-2">
              {liveNow.map((l) => {
                const seller = marketService.getUser(l.sellerId);
                const cur = auctionService.getItem(l.itemIds[l.currentItemIndex]);
                return (
                  <div
                    key={l.id}
                    className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3"
                  >
                    <div className="relative shrink-0">
                      <Placeholder seed={cur?.image ?? l.id} className="h-14 w-14 rounded-lg" showIcon={false} />
                      <span className="absolute -left-1 -top-1 rounded bg-red-500 px-1 py-0.5 text-[9px] font-extrabold text-white">
                        LIVE
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-bold text-neutral-900">
                        {l.title}
                      </p>
                      <p className="text-xs text-neutral-400">
                        {seller?.nickname} ·{" "}
                        <Eye className="inline h-3 w-3" strokeWidth={2} />{" "}
                        {formatNumber(l.viewers)}명 · 상품 {l.currentItemIndex + 1}/
                        {l.itemIds.length}
                      </p>
                      {cur && (
                        <p className="line-clamp-1 text-xs text-neutral-500">
                          현재: {cur.name} ·{" "}
                          <span className="font-bold text-neutral-800">
                            {formatPrice(cur.currentPrice)}
                          </span>
                        </p>
                      )}
                    </div>
                    <Link
                      href={`/live-auction/${l.id}`}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:border-brand-400 hover:bg-brand-50"
                    >
                      <ExternalLink className="h-3 w-3" strokeWidth={2} /> 보기
                    </Link>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="px-3 py-8 text-center text-sm text-neutral-400">
              현재 진행중인 라이브가 없습니다.
            </p>
          )}
        </Panel>
      </div>

      {/* 전체 경매 상품 */}
      <Panel
        title={`전체 경매 상품 (${filtered.length})`}
        action={
          <AdminSearch value={query} onChange={setQuery} placeholder="상품명 검색..." />
        }
      >
        <div className="flex flex-wrap gap-2 px-3 pt-2">
          <FilterChip active={!sellerFilter} onClick={() => setSellerFilter("")}>
            전체 판매자
          </FilterChip>
          {sellers.map((s) => (
            <FilterChip
              key={s.id}
              active={sellerFilter === s.id}
              onClick={() => setSellerFilter(sellerFilter === s.id ? "" : s.id)}
            >
              {s.nickname}
            </FilterChip>
          ))}
        </div>
        {/* PC 테이블 */}
        <div className="hidden md:block">
        <Table head={["상품", "판매자", "시작가", "현재가/낙찰가", "상태", "낙찰자", "판매중지"]}>
          {filtered.map((it) => {
            const seller = marketService.getUser(it.sellerId);
            return (
              <tr key={it.id} className={it.suspended ? "opacity-60" : undefined}>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <Placeholder seed={it.image} className="h-10 w-10 rounded-lg" showIcon={false} />
                    <div>
                      <p className="line-clamp-1 font-medium text-neutral-800">
                        {it.name}
                      </p>
                      <p className="text-xs text-neutral-400">
                        {auctionCategoryName(it.categoryId)}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-neutral-600">
                  {seller?.nickname ?? "-"}
                </td>
                <td className="px-3 py-2.5 text-neutral-500">
                  {formatPrice(it.startPrice)}
                </td>
                <td className="px-3 py-2.5 font-semibold text-neutral-900">
                  {formatPrice(it.finalPrice ?? it.currentPrice)}
                </td>
                <td className="px-3 py-2.5">
                  <StatusPill tone={itemTone[it.status]}>
                    {auctionItemStatusLabels[it.status]}
                  </StatusPill>
                </td>
                <td className="px-3 py-2.5 text-neutral-500">
                  {it.winnerName ? maskNickname(it.winnerName) : "-"}
                </td>
                <td className="px-3 py-2.5">
                  {/* 판매중지 토글 스위치 */}
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
              <div key={it.id} className={cn("rounded-xl border border-neutral-200 p-3", it.suspended && "opacity-60")}>
                <div className="flex items-start gap-3">
                  <Placeholder seed={it.image} className="h-12 w-12 shrink-0 rounded-lg" showIcon={false} />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-bold text-neutral-900">{it.name}</p>
                    <p className="text-xs text-neutral-400">{auctionCategoryName(it.categoryId)} · {seller?.nickname ?? "-"}</p>
                  </div>
                  <StatusPill tone={itemTone[it.status]}>
                    {auctionItemStatusLabels[it.status]}
                  </StatusPill>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                  <div className="flex gap-3 text-neutral-500">
                    <span>시작가 {formatPrice(it.startPrice)}</span>
                    <span className="font-semibold text-neutral-800">{formatPrice(it.finalPrice ?? it.currentPrice)}</span>
                  </div>
                  <button
                    role="switch"
                    aria-checked={it.suspended}
                    onClick={() => toggleSuspend(it.id, it.suspended)}
                    className={cn(
                      "relative h-6 w-11 shrink-0 rounded-full transition-colors",
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
