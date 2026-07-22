"use client";

import { UserCheck, Clock, CheckCircle2, XCircle } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  StatCard,
  Panel,
  Table,
  StatusPill,
  ActionButton,
} from "@/components/admin/AdminUI";
import { Avatar } from "@/components/common/Avatar";
import { marketService } from "@/lib/marketService";
import {
  sellerRequestService,
  sellerRequestStatusLabels,
} from "@/lib/sellerRequestService";
import { useStoreVersion } from "@/lib/useStore";
import { useToast } from "@/components/providers/ToastProvider";
import { formatDate } from "@/lib/utils";
import type { SellerRequestStatus } from "@/types";

const tone: Record<SellerRequestStatus, "green" | "red" | "amber" | "neutral"> = {
  pending: "amber",
  approved: "green",
  rejected: "red",
};

export default function AdminSellerRequestsPage() {
  useStoreVersion();
  const { toast } = useToast();
  const requests = sellerRequestService.getAll();

  const pending = requests.filter((r) => r.status === "pending").length;
  const approved = requests.filter((r) => r.status === "approved").length;
  const rejected = requests.filter((r) => r.status === "rejected").length;

  function approve(id: string, nickname: string) {
    sellerRequestService.approve(id);
    toast(`${nickname}님을 판매자로 승인했습니다.`);
  }
  function reject(id: string, nickname: string) {
    sellerRequestService.reject(id);
    toast(`${nickname}님의 신청을 거절했습니다.`, "error");
  }

  return (
    <AdminLayout title="판매자 전환 신청">
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon={UserCheck} label="전체 신청" value={requests.length} accent />
        <StatCard icon={Clock} label="심사 중" value={pending} />
        <StatCard icon={CheckCircle2} label="승인" value={approved} />
        <StatCard icon={XCircle} label="거절" value={rejected} />
      </div>

      <Panel title={`판매자 전환 신청 목록 (${requests.length})`}>
        {/* PC 테이블 */}
        <div className="hidden md:block">
          <Table head={["신청자", "이름", "사업자 정보", "신청 이유", "신청일", "상태", "처리"]}>
            {requests.map((r) => {
              const u = marketService.getUser(r.userId);
              return (
                <tr key={r.id}>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar seed={u?.avatar ?? r.userId} name={u?.nickname ?? "?"} size={32} />
                      <div>
                        <p className="font-medium text-neutral-800">
                          {u?.nickname ?? "탈퇴 회원"}
                        </p>
                        <p className="text-xs text-neutral-400">{u?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-neutral-600">{r.name}</td>
                  <td className="max-w-[180px] px-3 py-2.5 text-neutral-500">
                    <span className="line-clamp-2">{r.businessInfo}</span>
                  </td>
                  <td className="max-w-[220px] px-3 py-2.5 text-neutral-500">
                    <span className="line-clamp-2">{r.reason}</span>
                  </td>
                  <td className="px-3 py-2.5 text-neutral-400">
                    {formatDate(r.createdAt)}
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusPill tone={tone[r.status]}>
                      {sellerRequestStatusLabels[r.status]}
                    </StatusPill>
                  </td>
                  <td className="px-3 py-2.5">
                    {r.status === "pending" ? (
                      <div className="flex gap-1.5">
                        <ActionButton
                          onClick={() => approve(r.id, u?.nickname ?? r.name)}
                        >
                          승인
                        </ActionButton>
                        <ActionButton
                          onClick={() => reject(r.id, u?.nickname ?? r.name)}
                        >
                          거절
                        </ActionButton>
                      </div>
                    ) : (
                      <span className="text-xs text-neutral-300">처리 완료</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {requests.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-sm text-neutral-400">
                  판매자 전환 신청이 없습니다.
                </td>
              </tr>
            )}
          </Table>
        </div>
        {/* 모바일 카드 */}
        <div className="space-y-3 p-3 md:hidden">
          {requests.map((r) => {
            const u = marketService.getUser(r.userId);
            return (
              <div key={r.id} className="rounded-xl border border-neutral-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <Avatar seed={u?.avatar ?? r.userId} name={u?.nickname ?? "?"} size={32} />
                    <div>
                      <p className="text-sm font-medium text-neutral-800">{u?.nickname ?? "탈퇴 회원"}</p>
                      <p className="text-xs text-neutral-400">{u?.email}</p>
                    </div>
                  </div>
                  <StatusPill tone={tone[r.status]}>
                    {sellerRequestStatusLabels[r.status]}
                  </StatusPill>
                </div>
                <div className="mt-2 space-y-1 text-xs text-neutral-500">
                  <p><span className="font-medium text-neutral-700">이름:</span> {r.name}</p>
                  <p className="line-clamp-2"><span className="font-medium text-neutral-700">신청 이유:</span> {r.reason}</p>
                  <p className="text-neutral-400">{formatDate(r.createdAt)}</p>
                </div>
                {r.status === "pending" && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <ActionButton onClick={() => approve(r.id, u?.nickname ?? r.name)}>
                      승인
                    </ActionButton>
                    <ActionButton onClick={() => reject(r.id, u?.nickname ?? r.name)}>
                      거절
                    </ActionButton>
                  </div>
                )}
              </div>
            );
          })}
          {requests.length === 0 && (
            <p className="py-8 text-center text-sm text-neutral-400">판매자 전환 신청이 없습니다.</p>
          )}
        </div>
      </Panel>

      <p className="mt-3 text-xs text-neutral-400">
        * 승인 시 해당 회원의 역할이 구매자(buyer) → 판매자(seller)로 즉시 변경되며,
        판매자 센터를 이용할 수 있게 됩니다.
      </p>
    </AdminLayout>
  );
}
