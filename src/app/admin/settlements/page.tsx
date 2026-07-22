"use client";

import { useState } from "react";
import {
  CreditCard,
  Clock,
  CheckCircle2,
  TrendingUp,
  Banknote,
} from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  StatCard,
  Panel,
  Table,
  StatusPill,
  FilterChip,
} from "@/components/admin/AdminUI";
import { auctionService } from "@/lib/auctionService";
import { marketService } from "@/lib/marketService";
import { settlementStatusLabels } from "@/lib/settlementService";
import { useStoreVersion } from "@/lib/useStore";
import { getState } from "@/lib/store";
import { formatPrice } from "@/lib/utils";
import type { SettlementStatus } from "@/types";

const statusTone: Record<SettlementStatus, "green" | "amber" | "neutral" | "red"> = {
  pending_payment: "amber",
  payment_done: "green",
  shipping: "amber",
  withdrawable: "green",
  withdrawn: "neutral",
  cancelled: "red",
};

const statusList: SettlementStatus[] = [
  "pending_payment",
  "payment_done",
  "shipping",
  "withdrawable",
  "withdrawn",
  "cancelled",
];

export default function AdminSettlementsPage() {
  useStoreVersion();
  const settlements = getState().settlements;
  const [statusFilter, setStatusFilter] = useState<SettlementStatus | "all">("all");

  // 통계 계산
  const totalSaleAmount = settlements.reduce((sum, s) => sum + s.salePrice, 0);
  const totalFeeAmount = settlements.reduce((sum, s) => sum + s.platformFee, 0);
  const totalSettlement = settlements.reduce((sum, s) => sum + s.settlementAmount, 0);
  const pendingCount = settlements.filter(
    (s) => s.status === "pending_payment" || s.status === "payment_done"
  ).length;

  const filtered =
    statusFilter === "all"
      ? settlements
      : settlements.filter((s) => s.status === statusFilter);

  // 경매 낙찰 기반 예상 정산 (settlements가 비어 있을 때 표시)
  const soldItems = auctionService.getItems().filter((i) => i.status === "sold");

  return (
    <AdminLayout title="정산 관리">
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={CreditCard} label="전체 정산" value={settlements.length} accent />
        <StatCard icon={Clock} label="처리 대기" value={pendingCount} />
        <StatCard icon={Banknote} label="플랫폼 수익" value={formatPrice(totalFeeAmount)} />
        <StatCard
          icon={TrendingUp}
          label="총 거래액"
          value={formatPrice(totalSaleAmount)}
        />
      </div>

      {settlements.length > 0 ? (
        <Panel
          title={`정산 내역 (${filtered.length}건)`}
          action={
            <div className="flex flex-wrap gap-2">
              <FilterChip active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>
                전체
              </FilterChip>
              {statusList.map((s) => (
                <FilterChip
                  key={s}
                  active={statusFilter === s}
                  onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
                >
                  {settlementStatusLabels[s]}
                </FilterChip>
              ))}
            </div>
          }
        >
          <Table head={["상품", "낙찰가", "수수료(11%)", "정산 금액", "판매자", "구매자", "상태"]}>
            {filtered.map((sv) => {
              const seller = marketService.getUser(sv.sellerId);
              const buyer = marketService.getUser(sv.buyerId);
              return (
                <tr key={sv.id}>
                  <td className="px-3 py-2.5 font-medium text-neutral-800">{sv.itemName}</td>
                  <td className="px-3 py-2.5 font-bold text-neutral-900">
                    {formatPrice(sv.salePrice)}
                  </td>
                  <td className="px-3 py-2.5 text-neutral-500">{formatPrice(sv.platformFee)}</td>
                  <td className="px-3 py-2.5 font-semibold text-brand-600">
                    {formatPrice(sv.settlementAmount)}
                  </td>
                  <td className="px-3 py-2.5 text-neutral-600">{seller?.nickname ?? "-"}</td>
                  <td className="px-3 py-2.5 text-neutral-600">{buyer?.nickname ?? "-"}</td>
                  <td className="px-3 py-2.5">
                    <StatusPill tone={statusTone[sv.status]}>
                      {settlementStatusLabels[sv.status]}
                    </StatusPill>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-sm text-neutral-400">
                  조건에 맞는 정산 내역이 없습니다.
                </td>
              </tr>
            )}
          </Table>
        </Panel>
      ) : (
        <>
          {/* settlements 비어 있을 때: 낙찰 상품 기반 예상 정산 표시 */}
          <Panel title={`낙찰 기반 예상 정산 (${soldItems.length}건)`}>
            <p className="px-4 pt-2 text-xs text-neutral-400">
              실제 결제 완료 시 정산 레코드가 생성됩니다. 아래는 낙찰 기반 예상 정산 금액입니다.
            </p>
            <Table head={["상품", "판매자", "낙찰가", "수수료(11%)", "예상 정산액", "낙찰자"]}>
              {soldItems.map((it) => {
                const seller = marketService.getUser(it.sellerId);
                const platformFee = Math.round((it.finalPrice ?? 0) * 0.11);
                const settlement = (it.finalPrice ?? 0) - platformFee;
                return (
                  <tr key={it.id}>
                    <td className="px-3 py-2.5 font-medium text-neutral-800">{it.name}</td>
                    <td className="px-3 py-2.5 text-neutral-600">{seller?.nickname ?? "-"}</td>
                    <td className="px-3 py-2.5 font-bold text-neutral-900">
                      {formatPrice(it.finalPrice)}
                    </td>
                    <td className="px-3 py-2.5 text-neutral-500">{formatPrice(platformFee)}</td>
                    <td className="px-3 py-2.5 font-semibold text-brand-600">
                      {formatPrice(settlement)}
                    </td>
                    <td className="px-3 py-2.5 text-neutral-600">{it.winnerName ?? "-"}</td>
                  </tr>
                );
              })}
              {soldItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-sm text-neutral-400">
                    낙찰 완료된 상품이 없습니다.
                  </td>
                </tr>
              )}
            </Table>
          </Panel>
          <div className="mt-4 rounded-xl border border-neutral-100 bg-neutral-50 p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="text-center">
                <p className="text-xs text-neutral-500">예상 총 거래액</p>
                <p className="text-lg font-bold text-neutral-900">
                  {formatPrice(soldItems.reduce((s, i) => s + (i.finalPrice ?? 0), 0))}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-neutral-500">예상 플랫폼 수익 (11%)</p>
                <p className="text-lg font-bold text-neutral-900">
                  {formatPrice(soldItems.reduce((s, i) => s + Math.round((i.finalPrice ?? 0) * 0.11), 0))}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-neutral-500">예상 판매자 정산액</p>
                <p className="text-lg font-bold text-brand-600">
                  {formatPrice(soldItems.reduce((s, i) => s + Math.round((i.finalPrice ?? 0) * 0.89), 0))}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
