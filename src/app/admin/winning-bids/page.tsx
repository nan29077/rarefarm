"use client";

import { useState } from "react";
import { Trophy, CreditCard, AlertCircle, CheckCircle2 } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  StatCard,
  Panel,
  Table,
  StatusPill,
  FilterChip,
  AdminSearch,
} from "@/components/admin/AdminUI";
import { Placeholder } from "@/components/common/Placeholder";
import { marketService } from "@/lib/marketService";
import { auctionService, maskNickname } from "@/lib/auctionService";
import { useStoreVersion } from "@/lib/useStore";
import { formatPrice } from "@/lib/utils";

export default function AdminWinningBidsPage() {
  useStoreVersion();
  const soldItems = auctionService.getItems().filter((i) => i.status === "sold");

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "unpaid" | "cancelled">("all");

  const paidCount = soldItems.filter((i) => i.finalPrice && i.finalPrice > 0).length;
  const totalAmount = soldItems.reduce((sum, i) => sum + (i.finalPrice ?? 0), 0);

  const filtered = soldItems.filter((it) => {
    if (query.trim()) return it.name.toLowerCase().includes(query.trim().toLowerCase());
    return true;
  });

  return (
    <AdminLayout title="낙찰 관리">
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Trophy} label="전체 낙찰" value={soldItems.length} accent />
        <StatCard icon={CheckCircle2} label="결제 완료" value={paidCount} />
        <StatCard icon={AlertCircle} label="미결제 (데모)" value={0} />
        <StatCard
          icon={CreditCard}
          label="총 낙찰 금액"
          value={formatPrice(totalAmount)}
          sub="플랫폼 수수료 11% 포함"
        />
      </div>

      <Panel
        title={`낙찰 목록 (${filtered.length}건)`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <FilterChip active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>전체</FilterChip>
            <FilterChip active={statusFilter === "paid"} onClick={() => setStatusFilter("paid")}>결제 완료</FilterChip>
            <FilterChip active={statusFilter === "unpaid"} onClick={() => setStatusFilter("unpaid")}>미결제</FilterChip>
            <FilterChip active={statusFilter === "cancelled"} onClick={() => setStatusFilter("cancelled")}>취소</FilterChip>
            <AdminSearch value={query} onChange={setQuery} placeholder="상품명 검색..." />
          </div>
        }
      >
        {/* PC 테이블 */}
        <div className="hidden md:block">
          <Table head={["상품", "판매자", "낙찰자", "낙찰가", "플랫폼 수수료", "정산 금액", "상태"]}>
            {filtered.map((it) => {
              const seller = marketService.getUser(it.sellerId);
              const platformFee = Math.round((it.finalPrice ?? 0) * 0.11);
              const settlementAmount = (it.finalPrice ?? 0) - platformFee;
              return (
                <tr key={it.id}>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Placeholder seed={it.image} className="h-10 w-10 rounded-lg" showIcon={false} />
                      <p className="line-clamp-1 font-medium text-neutral-800">{it.name}</p>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-neutral-600">{seller?.nickname ?? "-"}</td>
                  <td className="px-3 py-2.5 text-neutral-600">
                    {it.winnerName ? maskNickname(it.winnerName) : "-"}
                  </td>
                  <td className="px-3 py-2.5 font-bold text-neutral-900">
                    {formatPrice(it.finalPrice)}
                  </td>
                  <td className="px-3 py-2.5 text-neutral-500">{formatPrice(platformFee)}</td>
                  <td className="px-3 py-2.5 font-semibold text-brand-600">
                    {formatPrice(settlementAmount)}
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusPill tone="green">결제 완료</StatusPill>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-sm text-neutral-400">
                  낙찰 내역이 없습니다.
                </td>
              </tr>
            )}
          </Table>
        </div>
        {/* 모바일 카드 */}
        <div className="space-y-3 p-3 md:hidden">
          {filtered.map((it) => {
            const platformFee = Math.round((it.finalPrice ?? 0) * 0.11);
            const settlementAmount = (it.finalPrice ?? 0) - platformFee;
            return (
              <div key={it.id} className="rounded-xl border border-neutral-200 p-3">
                <div className="flex items-start gap-3">
                  <Placeholder seed={it.image} className="h-12 w-12 shrink-0 rounded-lg" showIcon={false} />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-bold text-neutral-900">{it.name}</p>
                    <p className="text-xs text-neutral-500">낙찰자: {it.winnerName ? maskNickname(it.winnerName) : "-"}</p>
                    <p className="text-sm font-bold text-neutral-900">{formatPrice(it.finalPrice)}</p>
                  </div>
                  <StatusPill tone="green">결제 완료</StatusPill>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-neutral-500">
                  <span>수수료 {formatPrice(platformFee)}</span>
                  <span className="font-semibold text-brand-600">정산 {formatPrice(settlementAmount)}</span>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-neutral-400">낙찰 내역이 없습니다.</p>
          )}
        </div>
      </Panel>

      <p className="mt-3 text-xs text-neutral-400">
        * 플랫폼 수수료는 낙찰가의 11%입니다. 실제 정산 시스템 연동 시 결제 대기 / 미결제 처리 기능이 활성화됩니다.
      </p>
    </AdminLayout>
  );
}
