"use client";

import { useState } from "react";
import {
  FileText,
  ShoppingBag,
  TrendingUp,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  StatCard,
  Panel,
  Table,
  StatusPill,
  FilterChip,
  AdminSearch,
} from "@/components/admin/AdminUI";
import { marketService } from "@/lib/marketService";
import { useStoreVersion } from "@/lib/useStore";
import { getState } from "@/lib/store";
import { formatPrice, formatDate, orderStatusLabels, cn } from "@/lib/utils";
import type { OrderStatus } from "@/types";

const statusTone: Record<OrderStatus, "green" | "amber" | "neutral" | "red"> = {
  completed: "green",
  matched: "green",
  shipping: "amber",
  pending: "neutral",
  canceled: "red",
};

const statusList: OrderStatus[] = ["pending", "matched", "shipping", "completed", "canceled"];

export default function AdminOrdersPage() {
  useStoreVersion();
  const s = getState();
  const orders = s.orders.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");

  const totalAmount = orders
    .filter((o) => o.status !== "canceled")
    .reduce((sum, o) => sum + o.price, 0);

  const counts = {
    all: orders.length,
    completed: orders.filter((o) => o.status === "completed").length,
    canceled: orders.filter((o) => o.status === "canceled").length,
    pending: orders.filter((o) => o.status === "pending").length,
    shipping: orders.filter((o) => o.status === "shipping").length,
    matched: orders.filter((o) => o.status === "matched").length,
  };

  const filtered = orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      const product = marketService.getProduct(o.productId);
      const user = marketService.getUser(o.userId);
      return (
        (product?.name ?? "").toLowerCase().includes(q) ||
        (user?.nickname ?? "").toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <AdminLayout title="주문 내역">
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={FileText} label="전체 주문" value={orders.length} accent />
        <StatCard icon={CheckCircle2} label="완료" value={counts.completed} />
        <StatCard icon={XCircle} label="취소" value={counts.canceled} />
        <StatCard
          icon={TrendingUp}
          label="총 거래 금액"
          value={formatPrice(totalAmount)}
          sub="취소 제외"
        />
      </div>

      <Panel
        title={`주문 목록 (${filtered.length}건)`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <FilterChip active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>
              전체 ({counts.all})
            </FilterChip>
            {statusList.map((s) => (
              <FilterChip
                key={s}
                active={statusFilter === s}
                onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
              >
                {orderStatusLabels[s]}
              </FilterChip>
            ))}
            <AdminSearch value={query} onChange={setQuery} placeholder="상품명/구매자 검색..." />
          </div>
        }
      >
        {/* PC 테이블 */}
        <div className="hidden md:block">
          <Table head={["주문 ID", "상품", "구매자", "유형", "금액", "상태", "주문일"]}>
            {filtered.map((o) => {
              const product = marketService.getProduct(o.productId);
              const user = marketService.getUser(o.userId);
              return (
                <tr key={o.id}>
                  <td className="px-3 py-2.5 font-mono text-xs text-neutral-400">
                    #{o.id.slice(-6)}
                  </td>
                  <td className="px-3 py-2.5 font-medium text-neutral-800">
                    {product?.name ?? "삭제된 상품"}
                  </td>
                  <td className="px-3 py-2.5 text-neutral-600">
                    {user?.nickname ?? "-"}
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusPill tone={o.side === "buy" ? "neutral" : "amber"}>
                      {o.side === "buy" ? "즉시구매" : "즉시판매"}
                    </StatusPill>
                  </td>
                  <td className="px-3 py-2.5 font-bold text-neutral-900">
                    {formatPrice(o.price)}
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusPill tone={statusTone[o.status]}>
                      {orderStatusLabels[o.status]}
                    </StatusPill>
                  </td>
                  <td className="px-3 py-2.5 text-neutral-400">
                    {formatDate(o.createdAt)}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-sm text-neutral-400">
                  조건에 맞는 주문이 없습니다.
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
            return (
              <div key={o.id} className="rounded-xl border border-neutral-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-bold text-neutral-900">
                      {product?.name ?? "삭제된 상품"}
                    </p>
                    <p className="text-xs text-neutral-400">
                      {user?.nickname ?? "-"} · {o.side === "buy" ? "즉시구매" : "즉시판매"} · {formatDate(o.createdAt)}
                    </p>
                    <p className="text-sm font-bold text-neutral-900">{formatPrice(o.price)}</p>
                  </div>
                  <StatusPill tone={statusTone[o.status]}>{orderStatusLabels[o.status]}</StatusPill>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-neutral-400">조건에 맞는 주문이 없습니다.</p>
          )}
        </div>
      </Panel>
    </AdminLayout>
  );
}
