"use client";

import { useState } from "react";
import { Package, Eye, EyeOff, Hexagon } from "lucide-react";
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
import { Icon } from "@/components/common/Icon";
import { marketService } from "@/lib/marketService";
import { useStoreVersion } from "@/lib/useStore";
import { useToast } from "@/components/providers/ToastProvider";
import { formatPrice, conditionLabels } from "@/lib/utils";

type VisFilter = "all" | "visible" | "hidden";

export default function AdminProductsPage() {
  useStoreVersion();
  const { toast } = useToast();
  const products = marketService.getProducts({ includeHidden: true });

  const [query, setQuery] = useState("");
  const [visFilter, setVisFilter] = useState<VisFilter>("all");
  const [catFilter, setCatFilter] = useState("");

  const visibleCount = products.filter((p) => p.status === "visible").length;
  const hiddenCount = products.filter((p) => p.status === "hidden").length;

  const filtered = products.filter((p) => {
    if (visFilter !== "all" && p.status !== visFilter) return false;
    if (catFilter && p.categoryId !== catFilter) return false;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      return (
        p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)
      );
    }
    return true;
  });

  function toggle(id: string, current: "visible" | "hidden") {
    const next = current === "visible" ? "hidden" : "visible";
    marketService.setProductStatus(id, next);
    toast(next === "hidden" ? "상품을 숨김 처리했습니다." : "상품을 노출 처리했습니다.");
  }

  return (
    <AdminLayout title="상품/카테고리 관리">
      {/* 통계 카드 */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon={Package} label="전체 상품" value={products.length} accent />
        <StatCard icon={Eye} label="노출 상품" value={visibleCount} />
        <StatCard icon={EyeOff} label="숨김 상품" value={hiddenCount} />
        <StatCard
          icon={Hexagon}
          label="카테고리"
          value={marketService.categories.length}
        />
      </div>

      {/* 카테고리 요약 — 클릭 시 필터 */}
      <Panel title="카테고리">
        <div className="flex flex-wrap gap-2 p-3">
          <button
            onClick={() => setCatFilter("")}
            className={
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors " +
              (!catFilter
                ? "border-neutral-900 bg-neutral-900 text-brand-400"
                : "border-neutral-200 text-neutral-600 hover:border-brand-400 hover:bg-brand-50")
            }
          >
            전체
          </button>
          {marketService.categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCatFilter(catFilter === c.id ? "" : c.id)}
              className={
                "flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors " +
                (catFilter === c.id
                  ? "border-neutral-900 bg-neutral-900 text-brand-400"
                  : "border-neutral-200 text-neutral-600 hover:border-brand-400 hover:bg-brand-50")
              }
            >
              <Icon name={c.icon} className="h-3.5 w-3.5" />
              {c.name}
              {c.adultOnly && (
                <span className="ml-0.5 text-red-500">· 성인</span>
              )}
            </button>
          ))}
        </div>
      </Panel>

      <div className="mt-6">
        <Panel
          title={`상품 목록 (${filtered.length}개)`}
          action={
            <div className="flex items-center gap-2">
              <FilterChip
                active={visFilter === "all"}
                onClick={() => setVisFilter("all")}
              >
                전체
              </FilterChip>
              <FilterChip
                active={visFilter === "visible"}
                onClick={() => setVisFilter("visible")}
              >
                노출
              </FilterChip>
              <FilterChip
                active={visFilter === "hidden"}
                onClick={() => setVisFilter("hidden")}
              >
                숨김
              </FilterChip>
              <AdminSearch
                value={query}
                onChange={setQuery}
                placeholder="상품명/브랜드 검색"
              />
            </div>
          }
        >
          {/* PC 테이블 */}
          <div className="hidden md:block">
          <Table head={["상품", "카테고리", "상태등급", "최저 판매가", "노출", "관리"]}>
            {filtered.map((p) => (
              <tr key={p.id}>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2.5">
                    <Placeholder
                      seed={p.images[0]}
                      className="h-10 w-10 rounded-lg"
                    />
                    <span className="font-semibold text-neutral-900 line-clamp-1 max-w-[220px]">
                      {p.name}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3 text-neutral-500">
                  {marketService.getCategory(p.categoryId)?.name}
                </td>
                <td className="px-3 py-3 text-neutral-500">
                  {conditionLabels[p.condition]}
                </td>
                <td className="px-3 py-3 font-bold text-neutral-900">
                  {formatPrice(p.lowestAsk)}
                </td>
                <td className="px-3 py-3">
                  <StatusPill tone={p.status === "visible" ? "green" : "neutral"}>
                    {p.status === "visible" ? "노출" : "숨김"}
                  </StatusPill>
                </td>
                <td className="px-3 py-3">
                  <ActionButton onClick={() => toggle(p.id, p.status)}>
                    {p.status === "visible" ? "숨김" : "노출"}
                  </ActionButton>
                </td>
              </tr>
            ))}
          </Table>
          </div>
          {/* 모바일 카드 */}
          <div className="space-y-3 p-3 md:hidden">
            {filtered.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3">
                <Placeholder seed={p.images[0]} className="h-12 w-12 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-semibold text-neutral-900">{p.name}</p>
                  <p className="text-xs text-neutral-400">
                    {marketService.getCategory(p.categoryId)?.name} · {conditionLabels[p.condition]}
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-neutral-900">{formatPrice(p.lowestAsk)}</p>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-2">
                  <StatusPill tone={p.status === "visible" ? "green" : "neutral"}>
                    {p.status === "visible" ? "노출" : "숨김"}
                  </StatusPill>
                  <ActionButton onClick={() => toggle(p.id, p.status)}>
                    {p.status === "visible" ? "숨김" : "노출"}
                  </ActionButton>
                </div>
              </div>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-neutral-400">
              조건에 맞는 상품이 없습니다.
            </p>
          )}
        </Panel>
      </div>
    </AdminLayout>
  );
}
