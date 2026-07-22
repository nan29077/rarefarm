"use client";

import { useState } from "react";
import { Users, UserCheck, UserX, ShieldCheck } from "lucide-react";
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
import { formatDate } from "@/lib/utils";

type StatusFilter = "all" | "active" | "suspended"; // 상태 필터

export default function AdminMembersPage() {
  useStoreVersion();
  const { toast } = useToast();
  const members = adminService.getMembers();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const activeCount = members.filter((m) => m.status === "active").length;
  const suspendedCount = members.filter((m) => m.status === "suspended").length;
  const adminCount = members.filter((m) => m.role === "admin").length;

  const filtered = members.filter((m) => {
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
    <AdminLayout title="회원 관리">
      {/* 통계 카드 */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Users} label="전체 회원" value={members.length} accent />
        <StatCard icon={UserCheck} label="정상 회원" value={activeCount} />
        <StatCard icon={UserX} label="정지 회원" value={suspendedCount} />
        <StatCard icon={ShieldCheck} label="관리자" value={adminCount} />
      </div>

      <Panel
        title={`회원 목록 (${filtered.length}명)`}
        action={
          <div className="flex items-center gap-2">
            <FilterChip
              active={statusFilter === "all"}
              onClick={() => setStatusFilter("all")}
            >
              전체
            </FilterChip>
            <FilterChip
              active={statusFilter === "active"}
              onClick={() => setStatusFilter("active")}
            >
              정상
            </FilterChip>
            <FilterChip
              active={statusFilter === "suspended"}
              onClick={() => setStatusFilter("suspended")}
            >
              정지
            </FilterChip>
            <AdminSearch
              value={query}
              onChange={setQuery}
              placeholder="닉네임/이메일 검색"
            />
          </div>
        }
      >
        <Table head={["회원", "이메일", "권한", "가입일", "상태", "관리"]}>
          {filtered.map((m) => (
            <tr key={m.id}>
              <td className="px-3 py-3">
                <div className="flex items-center gap-2.5">
                  <Avatar seed={m.avatar} name={m.nickname} size={32} />
                  <span className="font-semibold text-neutral-900">
                    {m.nickname}
                  </span>
                </div>
              </td>
              <td className="px-3 py-3 text-neutral-500">{m.email}</td>
              <td className="px-3 py-3">
                <StatusPill tone={m.role === "admin" ? "amber" : "neutral"}>
                  {m.role === "admin" ? "관리자" : "일반"}
                </StatusPill>
              </td>
              <td className="px-3 py-3 text-neutral-400">
                {formatDate(m.createdAt)}
              </td>
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
          ))}
        </Table>
        {filtered.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-neutral-400">
            조건에 맞는 회원이 없습니다.
          </p>
        )}
      </Panel>
    </AdminLayout>
  );
}
