"use client";

import { useState } from "react";
import { Flag, CircleAlert, CircleCheck } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  StatCard,
  Panel,
  Table,
  StatusPill,
  ActionButton,
  FilterChip,
} from "@/components/admin/AdminUI";
import { adminService } from "@/lib/adminService";
import { useStoreVersion } from "@/lib/useStore";
import { useToast } from "@/components/providers/ToastProvider";
import { formatDate } from "@/lib/utils";

const typeLabel: Record<string, string> = {
  product: "상품",
  post: "게시물",
  user: "회원",
};

type StatusFilter = "all" | "pending" | "resolved";

export default function AdminReportsPage() {
  useStoreVersion();
  const { toast } = useToast();
  const reports = adminService.getReports();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const pendingCount = reports.filter((r) => r.status === "pending").length;
  const resolvedCount = reports.filter((r) => r.status === "resolved").length;

  const filtered = reports.filter(
    (r) => statusFilter === "all" || r.status === statusFilter
  );

  function toggle(id: string, current: "pending" | "resolved") {
    const next = current === "pending" ? "resolved" : "pending";
    adminService.setReportStatus(id, next);
    toast(next === "resolved" ? "신고를 처리 완료했습니다." : "대기 상태로 변경했습니다.");
  }

  return (
    <AdminLayout title="신고 관리">
      {/* 통계 카드 */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard icon={Flag} label="전체 신고" value={reports.length} />
        <StatCard
          icon={CircleAlert}
          label="처리 대기"
          value={pendingCount}
          accent={pendingCount > 0}
          sub={pendingCount > 0 ? "빠른 확인이 필요해요" : undefined}
        />
        <StatCard icon={CircleCheck} label="처리 완료" value={resolvedCount} />
      </div>

      <Panel
        title={`신고 목록 (대기 ${pendingCount}건)`}
        action={
          <div className="flex items-center gap-2">
            <FilterChip
              active={statusFilter === "all"}
              onClick={() => setStatusFilter("all")}
            >
              전체
            </FilterChip>
            <FilterChip
              active={statusFilter === "pending"}
              onClick={() => setStatusFilter("pending")}
            >
              대기
            </FilterChip>
            <FilterChip
              active={statusFilter === "resolved"}
              onClick={() => setStatusFilter("resolved")}
            >
              처리 완료
            </FilterChip>
          </div>
        }
      >
        <Table head={["유형", "대상", "사유", "신고일", "상태", "처리"]}>
          {filtered.map((r) => (
            <tr key={r.id}>
              <td className="px-3 py-3">
                <StatusPill tone="neutral">{typeLabel[r.targetType]}</StatusPill>
              </td>
              <td className="px-3 py-3 font-medium text-neutral-800">
                {r.targetLabel}
              </td>
              <td className="px-3 py-3 text-neutral-500">{r.reason}</td>
              <td className="px-3 py-3 text-neutral-400">
                {formatDate(r.createdAt)}
              </td>
              <td className="px-3 py-3">
                <StatusPill tone={r.status === "pending" ? "amber" : "green"}>
                  {r.status === "pending" ? "대기" : "처리 완료"}
                </StatusPill>
              </td>
              <td className="px-3 py-3">
                <ActionButton onClick={() => toggle(r.id, r.status)}>
                  {r.status === "pending" ? "처리 완료" : "대기로"}
                </ActionButton>
              </td>
            </tr>
          ))}
        </Table>
        {filtered.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-neutral-400">
            조건에 맞는 신고가 없습니다.
          </p>
        )}
      </Panel>
    </AdminLayout>
  );
}
