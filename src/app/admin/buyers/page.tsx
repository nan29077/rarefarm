"use client";

import { useState } from "react";
import { ShoppingBag, TrendingUp, UserCheck, UserX } from "lucide-react";
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
import { Avatar } from "@/components/common/Avatar";
import { adminService } from "@/lib/adminService";
import { useStoreVersion } from "@/lib/useStore";
import { useToast } from "@/components/providers/ToastProvider";
import { formatDate, formatPrice } from "@/lib/utils";
import { getState } from "@/lib/store";

type StatusFilter = "all" | "active" | "suspended";

export default function AdminBuyersPage() {
  useStoreVersion();
  const { toast } = useToast();
  const allMembers = adminService.getMembers();
  const buyers = allMembers.filter((m) => m.role === "buyer" || m.role === "user");

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const activeCount = buyers.filter((m) => m.status === "active").length;
  const suspendedCount = buyers.filter((m) => m.status === "suspended").length;

  const orders = getState().orders;
  const totalOrderAmount = orders.reduce((sum, o) => sum + o.price, 0);

  const filtered = buyers.filter((m) => {
    if (statusFilter !== "all" && m.status !== statusFilter) return false;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      return (
        m.nickname.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q)
      );
    }
    return true;
  });

  function toggle(id: string, current: "active" | "suspended") {
    const next = current === "active" ? "suspended" : "active";
    adminService.setUserStatus(id, next);
    toast(next === "suspended" ? "계정을 정지했습니다." : "계정을 정상 처리했습니다.");
  }

  return (
    <AdminLayout title="구매자 관리">
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={ShoppingBag} label="전체 구매자" value={buyers.length} accent />
        <StatCard icon={UserCheck} label="정상 계정" value={activeCount} />
        <StatCard icon={UserX} label="정지 계정" value={suspendedCount} />
        <StatCard
          icon={TrendingUp}
          label="총 주문 금액"
          value={formatPrice(totalOrderAmount)}
          sub={`${orders.length}건`}
        />
      </div>

      <Panel
        title={`구매자 목록 (${filtered.length}명)`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <FilterChip active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>전체</FilterChip>
            <FilterChip active={statusFilter === "active"} onClick={() => setStatusFilter("active")}>정상</FilterChip>
            <FilterChip active={statusFilter === "suspended"} onClick={() => setStatusFilter("suspended")}>정지</FilterChip>
            <AdminSearch value={query} onChange={setQuery} placeholder="닉네임/이메일 검색" />
          </div>
        }
      >
        {/* PC 테이블 */}
        <div className="hidden md:block">
          <Table head={["구매자", "이메일", "가입일", "주문수", "상태", "관리"]}>
            {filtered.map((m) => {
              const userOrders = orders.filter((o) => o.userId === m.id);
              return (
                <tr key={m.id}>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar seed={m.avatar} name={m.nickname} size={32} />
                      <span className="font-semibold text-neutral-900">{m.nickname}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-neutral-500">{m.email}</td>
                  <td className="px-3 py-3 text-neutral-400">{formatDate(m.createdAt)}</td>
                  <td className="px-3 py-3 font-semibold text-neutral-700">{userOrders.length}건</td>
                  <td className="px-3 py-3">
                    <StatusPill tone={m.status === "active" ? "green" : "red"}>
                      {m.status === "active" ? "정상" : "정지"}
                    </StatusPill>
                  </td>
                  <td className="px-3 py-3">
                    <ActionButton onClick={() => toggle(m.id, m.status)}>
                      {m.status === "active" ? "정지" : "정상 전환"}
                    </ActionButton>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-sm text-neutral-400">
                  조건에 맞는 구매자가 없습니다.
                </td>
              </tr>
            )}
          </Table>
        </div>
        {/* 모바일 카드 */}
        <div className="space-y-3 p-3 md:hidden">
          {filtered.map((m) => {
            const userOrders = orders.filter((o) => o.userId === m.id);
            return (
              <div key={m.id} className="rounded-xl border border-neutral-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <Avatar seed={m.avatar} name={m.nickname} size={32} />
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">{m.nickname}</p>
                      <p className="text-xs text-neutral-400">{m.email}</p>
                    </div>
                  </div>
                  <StatusPill tone={m.status === "active" ? "green" : "red"}>
                    {m.status === "active" ? "정상" : "정지"}
                  </StatusPill>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-neutral-500">
                  <span>주문 {userOrders.length}건 · {formatDate(m.createdAt)} 가입</span>
                  <ActionButton onClick={() => toggle(m.id, m.status)}>
                    {m.status === "active" ? "정지" : "정상 전환"}
                  </ActionButton>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-neutral-400">조건에 맞는 구매자가 없습니다.</p>
          )}
        </div>
      </Panel>
    </AdminLayout>
  );
}
