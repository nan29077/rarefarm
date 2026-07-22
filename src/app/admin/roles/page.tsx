"use client";

import { useState } from "react";
import { ShieldCheck, Users, UserCheck, ShoppingBag, Crown } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  StatCard,
  Panel,
  Table,
  StatusPill,
  AdminSearch,
} from "@/components/admin/AdminUI";
import { Avatar } from "@/components/common/Avatar";
import { adminService } from "@/lib/adminService";
import { useStoreVersion } from "@/lib/useStore";
import { useToast } from "@/components/providers/ToastProvider";
import { formatDate, cn } from "@/lib/utils";
import { update } from "@/lib/store";
import type { Role } from "@/types";

const roleLabels: Record<Role, string> = {
  admin: "관리자",
  user: "판매자(구)",
  seller: "판매자",
  buyer: "구매자",
};

const roleTone: Record<Role, "green" | "amber" | "neutral" | "red"> = {
  admin: "red",
  user: "amber",
  seller: "green",
  buyer: "neutral",
};

const roleOrder: Role[] = ["admin", "user", "seller", "buyer"];

export default function AdminRolesPage() {
  useStoreVersion();
  const { toast } = useToast();
  const members = adminService.getMembers();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");

  const counts: Record<Role, number> = {
    admin: members.filter((m) => m.role === "admin").length,
    user: members.filter((m) => m.role === "user").length,
    seller: members.filter((m) => m.role === "seller").length,
    buyer: members.filter((m) => m.role === "buyer").length,
  };

  const filtered = members.filter((m) => {
    if (roleFilter !== "all" && m.role !== roleFilter) return false;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      return m.nickname.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
    }
    return true;
  });

  function changeRole(id: string, newRole: Role) {
    update((s) => {
      const u = s.users.find((x) => x.id === id);
      if (u) u.role = newRole;
    });
    toast(`권한을 ${roleLabels[newRole]}(으)로 변경했습니다.`);
  }

  return (
    <AdminLayout title="등급/권한 관리">
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Crown} label="관리자" value={counts.admin} accent />
        <StatCard icon={Users} label="판매자(구)" value={counts.user} />
        <StatCard icon={UserCheck} label="판매자" value={counts.seller} />
        <StatCard icon={ShoppingBag} label="구매자" value={counts.buyer} />
      </div>

      {/* 역할 설명 */}
      <Panel title="권한 등급 기준">
        <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
          {(["admin", "user", "seller", "buyer"] as Role[]).map((role) => (
            <div key={role} className="rounded-xl border border-neutral-100 bg-neutral-50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <StatusPill tone={roleTone[role]}>{roleLabels[role]}</StatusPill>
              </div>
              <p className="text-xs text-neutral-500">
                {role === "admin" && "시스템 전체 관리 권한. 모든 메뉴 접근 및 데이터 수정 가능."}
                {role === "user" && "레거시 판매자 계정. 경매 참여 및 상품 등록 가능."}
                {role === "seller" && "구매자 전환 승인 판매자. 라이브 경매 개설 가능."}
                {role === "buyer" && "일반 구매자. 입찰 및 즉시구매 가능."}
              </p>
            </div>
          ))}
        </div>
      </Panel>

      <div className="mt-6">
        <Panel
          title={`회원 권한 목록 (${filtered.length}명)`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <AdminSearch value={query} onChange={setQuery} placeholder="닉네임/이메일 검색" />
            </div>
          }
        >
          <div className="flex flex-wrap gap-2 px-3 pt-2">
            {(["all", ...roleOrder] as (Role | "all")[]).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  roleFilter === r
                    ? "border-neutral-900 bg-neutral-900 text-brand-400"
                    : "border-neutral-200 text-neutral-600 hover:border-brand-400 hover:bg-brand-50"
                )}
              >
                {r === "all" ? "전체" : roleLabels[r]}
                {r !== "all" && ` (${counts[r]})`}
              </button>
            ))}
          </div>
          <div className="hidden md:block">
            <Table head={["회원", "이메일", "현재 권한", "가입일", "권한 변경"]}>
              {filtered.map((m) => (
                <tr key={m.id}>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar seed={m.avatar} name={m.nickname} size={32} />
                      <span className="font-semibold text-neutral-900">{m.nickname}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-neutral-500">{m.email}</td>
                  <td className="px-3 py-3">
                    <StatusPill tone={roleTone[m.role]}>{roleLabels[m.role]}</StatusPill>
                  </td>
                  <td className="px-3 py-3 text-neutral-400">{formatDate(m.createdAt)}</td>
                  <td className="px-3 py-3">
                    <select
                      value={m.role}
                      onChange={(e) => changeRole(m.id, e.target.value as Role)}
                      className="rounded-lg border border-neutral-300 px-2 py-1 text-xs text-neutral-700 focus:border-brand-500 focus:outline-none"
                    >
                      {roleOrder.map((r) => (
                        <option key={r} value={r}>{roleLabels[r]}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-sm text-neutral-400">
                    조건에 맞는 회원이 없습니다.
                  </td>
                </tr>
              )}
            </Table>
          </div>
          <div className="space-y-3 p-3 md:hidden">
            {filtered.map((m) => (
              <div key={m.id} className="rounded-xl border border-neutral-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <Avatar seed={m.avatar} name={m.nickname} size={32} />
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">{m.nickname}</p>
                      <p className="text-xs text-neutral-400">{m.email}</p>
                    </div>
                  </div>
                  <StatusPill tone={roleTone[m.role]}>{roleLabels[m.role]}</StatusPill>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-neutral-400">{formatDate(m.createdAt)} 가입</span>
                  <select
                    value={m.role}
                    onChange={(e) => changeRole(m.id, e.target.value as Role)}
                    className="rounded-lg border border-neutral-300 px-2 py-1 text-xs text-neutral-700 focus:border-brand-500 focus:outline-none"
                  >
                    {roleOrder.map((r) => (
                      <option key={r} value={r}>{roleLabels[r]}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </AdminLayout>
  );
}
