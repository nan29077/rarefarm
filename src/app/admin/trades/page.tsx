"use client";

import { AdminLayout } from "@/components/layout/AdminLayout";
import { StatCard, Panel, Table, StatusPill } from "@/components/admin/AdminUI";
import { TrendingUp, TrendingDown, ShoppingBag } from "lucide-react";
import { getState } from "@/lib/store";
import { marketService } from "@/lib/marketService";
import { useStoreVersion } from "@/lib/useStore";
import { formatPrice, orderStatusLabels, timeAgo } from "@/lib/utils";
import type { OrderStatus } from "@/types";

const orderTone: Record<OrderStatus, "green" | "amber" | "neutral" | "red"> = {
  completed: "green",
  matched: "green",
  shipping: "amber",
  pending: "neutral",
  canceled: "red",
};

export default function AdminTradesPage() {
  useStoreVersion();
  const s = getState();
  const openBids = s.bids.filter((b) => b.status === "open");
  const openAsks = s.asks.filter((a) => a.status === "open");
  const orders = s.orders
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <AdminLayout title="입찰/거래 관리">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard
          icon={TrendingUp}
          label="진행 중 구매입찰"
          value={openBids.length}
          sub="매칭 대기 중"
        />
        <StatCard
          icon={TrendingDown}
          label="진행 중 판매입찰"
          value={openAsks.length}
          sub="매칭 대기 중"
        />
        <StatCard
          icon={ShoppingBag}
          label="주문 건수"
          value={orders.length}
          accent
          sub="즉시구매/판매 포함"
        />
      </div>

      <div className="mt-6">
        <Panel title="주문 내역">
          <Table head={["상품", "유형", "금액", "상태", "생성"]}>
            {orders.map((o) => {
              const p = marketService.getProduct(o.productId);
              return (
                <tr key={o.id}>
                  <td className="px-3 py-3 font-medium text-neutral-800">
                    {p?.name ?? "삭제된 상품"}
                  </td>
                  <td className="px-3 py-3 text-neutral-500">
                    {o.side === "buy" ? "즉시구매" : "즉시판매"}
                  </td>
                  <td className="px-3 py-3 font-bold text-neutral-900">
                    {formatPrice(o.price)}
                  </td>
                  <td className="px-3 py-3">
                    <StatusPill tone={orderTone[o.status]}>
                      {orderStatusLabels[o.status]}
                    </StatusPill>
                  </td>
                  <td className="px-3 py-3 text-neutral-400">
                    {timeAgo(o.createdAt)}
                  </td>
                </tr>
              );
            })}
          </Table>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title={`구매입찰 (${openBids.length})`}>
          <Table head={["상품", "입찰가", "마감"]}>
            {openBids.map((b) => (
              <tr key={b.id}>
                <td className="px-3 py-3 font-medium text-neutral-800">
                  {marketService.getProduct(b.productId)?.name}
                </td>
                <td className="px-3 py-3 font-bold text-neutral-900">
                  {formatPrice(b.price)}
                </td>
                <td className="px-3 py-3 text-neutral-400">{b.expirationDays}일</td>
              </tr>
            ))}
          </Table>
        </Panel>
        <Panel title={`판매입찰 (${openAsks.length})`}>
          <Table head={["상품", "판매가", "마감"]}>
            {openAsks.map((a) => (
              <tr key={a.id}>
                <td className="px-3 py-3 font-medium text-neutral-800">
                  {marketService.getProduct(a.productId)?.name}
                </td>
                <td className="px-3 py-3 font-bold text-neutral-900">
                  {formatPrice(a.price)}
                </td>
                <td className="px-3 py-3 text-neutral-400">{a.expirationDays}일</td>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>
    </AdminLayout>
  );
}
