"use client";

import { useState } from "react";
import { RefreshCcw, XCircle, AlertCircle, CheckCircle2 } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  StatCard,
  Panel,
  Table,
  StatusPill,
  ActionButton,
  FilterChip,
  AdminSearch,
} from "@/components/admin/AdminUI";
import { marketService } from "@/lib/marketService";
import { useStoreVersion } from "@/lib/useStore";
import { getState, update } from "@/lib/store";
import { formatPrice, formatDate } from "@/lib/utils";
import { useToast } from "@/components/providers/ToastProvider";
import type { OrderStatus } from "@/types";

type RefundFilter = "all" | "canceled" | "pending";

export default function AdminRefundsPage() {
  useStoreVersion();
  const { toast } = useToast();
  const s = getState();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RefundFilter>("all");
  const [processed, setProcessed] = useState<Set<string>>(new Set());

  // 취소/환불 대상: canceled 주문 + pending 주문 (환불 요청 가능 상태)
  const refundOrders = s.orders
    .filter((o) => o.status === "canceled" || o.status === "pending")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const canceledAmount = s.orders
    .filter((o) => o.status === "canceled")
    .reduce((sum, o) => sum + o.price, 0);

  const counts = {
    all: refundOrders.length,
    canceled: refundOrders.filter((o) => o.status === "canceled").length,
    pending: refundOrders.filter((o) => o.status === "pending").length,
  };

  const filtered = refundOrders.filter((o) => {
    if (filter === "canceled" && o.status !== "canceled") return false;
    if (filter === "pending" && o.status !== "pending") return false;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      const product = marketService.getProduct(o.productId);
      const user = marketService.getUser(o.userId);
      return (
        (product?.name ?? "").toLowerCase().includes(q) ||
        (user?.nickname ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  function processRefund(id: string, productName: string) {
    update((s) => {
      const o = s.orders.find((x) => x.id === id);
      if (o) o.status = "canceled";
    });
    setProcessed((prev) => new Set(prev).add(id));
    toast(`${productName} 환불 처리 완료했습니다.`);
  }

  return (
    <AdminLayout title="환불/취소 관리">
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={RefreshCcw} label="전체 환불/취소" value={counts.all} accent />
        <StatCard icon={XCircle} label="취소 완료" value={counts.canceled} />
        <StatCard
          icon={AlertCircle}
          label="환불 대기"
          value={counts.pending}
          sub={counts.pending > 0 ? "처리 필요" : undefined}
        />
        <StatCard
          icon={CheckCircle2}
          label="취소 금액 합계"
          value={formatPrice(canceledAmount)}
        />
      </div>

      {counts.pending > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" strokeWidth={2} />
          <p className="text-sm text-amber-700">
            환불 처리 대기 중인 주문 <span className="font-bold">{counts.pending}건</span>이 있습니다.
          </p>
        </div>
      )}

      <Panel
        title={`환불/취소 목록 (${filtered.length}건)`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>전체</FilterChip>
            <FilterChip active={filter === "pending"} onClick={() => setFilter("pending")}>환불 대기</FilterChip>
            <FilterChip active={filter === "canceled"} onClick={() => setFilter("canceled")}>취소 완료</FilterChip>
            <AdminSearch value={query} onChange={setQuery} placeholder="상품명/구매자 검색..." />
          </div>
        }
      >
        {/* PC 테이블 */}
        <div className="hidden md:block">
          <Table head={["주문 ID", "상품", "구매자", "금액", "유형", "상태", "처리"]}>
            {filtered.map((o) => {
              const product = marketService.getProduct(o.productId);
              const user = marketService.getUser(o.userId);
              const isProcessed = processed.has(o.id);
              return (
                <tr key={o.id}>
                  <td className="px-3 py-2.5 font-mono text-xs text-neutral-400">
                    #{o.id.slice(-6)}
                  </td>
                  <td className="px-3 py-2.5 font-medium text-neutral-800">
                    {product?.name ?? "삭제된 상품"}
                  </td>
                  <td className="px-3 py-2.5 text-neutral-600">{user?.nickname ?? "-"}</td>
                  <td className="px-3 py-2.5 font-bold text-neutral-900">{formatPrice(o.price)}</td>
                  <td className="px-3 py-2.5">
                    <StatusPill tone={o.side === "buy" ? "neutral" : "amber"}>
                      {o.side === "buy" ? "즉시구매" : "즉시판매"}
                    </StatusPill>
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusPill tone={o.status === "canceled" || isProcessed ? "neutral" : "amber"}>
                      {o.status === "canceled" || isProcessed ? "취소 완료" : "환불 대기"}
                    </StatusPill>
                  </td>
                  <td className="px-3 py-2.5">
                    {o.status === "pending" && !isProcessed ? (
                      <ActionButton onClick={() => processRefund(o.id, product?.name ?? "상품")}>
                        환불 처리
                      </ActionButton>
                    ) : (
                      <span className="text-xs text-neutral-300">완료</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-sm text-neutral-400">
                  조건에 맞는 환불/취소 내역이 없습니다.
                </td>
              </tr>
            )}
          </Table>
        </div>

        {/* 모바일 카드 */}
        <div className="space-y-3 p-3 md:hidden">
          {filtered.map((o) => {
            const product = marketService.getProduct(o.productId);
            const user = marketService.getUser(o.userId);
            const isProcessed = processed.has(o.id);
            return (
              <div key={o.id} className="rounded-xl border border-neutral-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-bold text-neutral-900">
                      {product?.name ?? "삭제된 상품"}
                    </p>
                    <p className="text-xs text-neutral-400">
                      {user?.nickname} · {formatDate(o.createdAt)}
                    </p>
                    <p className="text-sm font-bold text-neutral-900">{formatPrice(o.price)}</p>
                  </div>
                  <StatusPill tone={o.status === "canceled" || isProcessed ? "neutral" : "amber"}>
                    {o.status === "canceled" || isProcessed ? "취소" : "대기"}
                  </StatusPill>
                </div>
                {o.status === "pending" && !isProcessed && (
                  <div className="mt-2">
                    <ActionButton onClick={() => processRefund(o.id, product?.name ?? "상품")}>
                      환불 처리
                    </ActionButton>
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-neutral-400">조건에 맞는 내역이 없습니다.</p>
          )}
        </div>
      </Panel>
    </AdminLayout>
  );
}
