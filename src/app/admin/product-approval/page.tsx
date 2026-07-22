"use client";

import { useState } from "react";
import { ShieldCheck, Clock, CheckCircle2, XCircle, Eye } from "lucide-react";
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
import { Placeholder } from "@/components/common/Placeholder";
import { marketService } from "@/lib/marketService";
import { useStoreVersion } from "@/lib/useStore";
import { useToast } from "@/components/providers/ToastProvider";
import { formatPrice, formatDate, conditionLabels } from "@/lib/utils";

// 데모: hidden 상품 = 승인 대기 상품으로 취급
export default function AdminProductApprovalPage() {
  useStoreVersion();
  const { toast } = useToast();
  const allProducts = marketService.getProducts({ includeHidden: true });

  // 승인 대기: hidden 상태 상품 (실제 시스템에선 별도 pending 상태)
  const pendingProducts = allProducts.filter((p) => p.status === "hidden");
  const [query, setQuery] = useState("");
  const [approved, setApproved] = useState<Set<string>>(new Set());
  const [rejected, setRejected] = useState<Set<string>>(new Set());

  const filtered = pendingProducts.filter((p) => {
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      return p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q);
    }
    return true;
  });

  const pendingCount = filtered.filter((p) => !approved.has(p.id) && !rejected.has(p.id)).length;

  function approve(id: string, name: string) {
    marketService.setProductStatus(id, "visible");
    setApproved((prev) => new Set(prev).add(id));
    toast(`${name} 상품을 승인했습니다.`);
  }

  function reject(id: string, name: string) {
    setRejected((prev) => new Set(prev).add(id));
    toast(`${name} 상품을 거절했습니다.`, "error");
  }

  function getStatus(id: string): "pending" | "approved" | "rejected" {
    if (approved.has(id)) return "approved";
    if (rejected.has(id)) return "rejected";
    return "pending";
  }

  return (
    <AdminLayout title="상품 승인">
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Clock} label="전체 심사 상품" value={pendingProducts.length} accent />
        <StatCard icon={ShieldCheck} label="대기중" value={pendingCount} sub={pendingCount > 0 ? "확인 필요" : undefined} />
        <StatCard icon={CheckCircle2} label="승인" value={approved.size} />
        <StatCard icon={XCircle} label="거절" value={rejected.size} />
      </div>

      {pendingCount > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Clock className="h-4 w-4 shrink-0 text-amber-500" strokeWidth={2} />
          <p className="text-sm text-amber-700">
            심사 대기 중인 상품 <span className="font-bold">{pendingCount}개</span>가 있습니다. 빠른 검토가 필요합니다.
          </p>
        </div>
      )}

      <Panel
        title={`심사 목록 (${filtered.length}개)`}
        action={
          <AdminSearch value={query} onChange={setQuery} placeholder="상품명/브랜드 검색..." />
        }
      >
        {/* PC 테이블 */}
        <div className="hidden md:block">
          <Table head={["상품", "카테고리", "상태", "최저 판매가", "등록일", "심사 상태", "처리"]}>
            {filtered.map((p) => {
              const status = getStatus(p.id);
              const seller = marketService.getUser(p.sellerId);
              return (
                <tr key={p.id}>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Placeholder seed={p.images[0]} className="h-10 w-10 rounded-lg" />
                      <div>
                        <p className="line-clamp-1 font-medium text-neutral-800">{p.name}</p>
                        <p className="text-xs text-neutral-400">{p.brand} · {seller?.nickname}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-neutral-500">
                    {marketService.getCategory(p.categoryId)?.name}
                  </td>
                  <td className="px-3 py-2.5 text-neutral-500">{conditionLabels[p.condition]}</td>
                  <td className="px-3 py-2.5 font-bold text-neutral-900">
                    {formatPrice(p.lowestAsk)}
                  </td>
                  <td className="px-3 py-2.5 text-neutral-400">{formatDate(p.createdAt)}</td>
                  <td className="px-3 py-2.5">
                    <StatusPill
                      tone={status === "approved" ? "green" : status === "rejected" ? "red" : "amber"}
                    >
                      {status === "approved" ? "승인" : status === "rejected" ? "거절" : "대기중"}
                    </StatusPill>
                  </td>
                  <td className="px-3 py-2.5">
                    {status === "pending" ? (
                      <div className="flex gap-1.5">
                        <ActionButton onClick={() => approve(p.id, p.name)}>승인</ActionButton>
                        <ActionButton onClick={() => reject(p.id, p.name)}>거절</ActionButton>
                      </div>
                    ) : (
                      <span className="text-xs text-neutral-300">처리 완료</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-sm text-neutral-400">
                  심사 대기 상품이 없습니다. 모든 상품이 승인 완료되었습니다.
                </td>
              </tr>
            )}
          </Table>
        </div>

        {/* 모바일 카드 */}
        <div className="space-y-3 p-3 md:hidden">
          {filtered.map((p) => {
            const status = getStatus(p.id);
            return (
              <div key={p.id} className="rounded-xl border border-neutral-200 p-3">
                <div className="flex items-start gap-3">
                  <Placeholder seed={p.images[0]} className="h-12 w-12 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-bold text-neutral-900">{p.name}</p>
                    <p className="text-xs text-neutral-400">{marketService.getCategory(p.categoryId)?.name} · {formatDate(p.createdAt)}</p>
                    <p className="text-sm font-bold text-neutral-900">{formatPrice(p.lowestAsk)}</p>
                  </div>
                  <StatusPill
                    tone={status === "approved" ? "green" : status === "rejected" ? "red" : "amber"}
                  >
                    {status === "approved" ? "승인" : status === "rejected" ? "거절" : "대기중"}
                  </StatusPill>
                </div>
                {status === "pending" && (
                  <div className="mt-2 flex gap-2">
                    <ActionButton onClick={() => approve(p.id, p.name)}>승인</ActionButton>
                    <ActionButton onClick={() => reject(p.id, p.name)}>거절</ActionButton>
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-neutral-400">심사 대기 상품이 없습니다.</p>
          )}
        </div>
      </Panel>

      <p className="mt-3 text-xs text-neutral-400">
        * 데모 환경에서는 숨김(hidden) 상태의 상품을 승인 대기 상품으로 표시합니다. 실제 운영 시 별도 pending 상태로 구분됩니다.
      </p>
    </AdminLayout>
  );
}
