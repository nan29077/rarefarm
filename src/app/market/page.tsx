"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { CustomIcon } from "@/components/common/CustomIcon";
import { MobileShell } from "@/components/layout/MobileShell";
import { ProductCard } from "@/components/product/ProductCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Icon } from "@/components/common/Icon";
import { marketService, sortOptions, SortKey } from "@/lib/marketService";
import { useStoreVersion } from "@/lib/useStore";
import { cn } from "@/lib/utils";

function MarketContent() {
  useStoreVersion();
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const initialCat = params.get("category") ?? "";
  const [categoryId, setCategoryId] = useState(initialCat);
  const [sort, setSort] = useState<SortKey>("popular");

  const products = marketService.getProducts({
    categoryId: categoryId || undefined,
    search: q || undefined,
    sort,
  });
  const activeCat = marketService.getCategory(categoryId);

  return (
    <MobileShell search>
      {/* 카테고리 필터 */}
      <div className="-mx-0 flex gap-2 overflow-x-auto px-4 pb-2 no-scrollbar">
        <Chip active={!categoryId} onClick={() => setCategoryId("")}>
          전체
        </Chip>
        {marketService.categories.map((c) => (
          <Chip
            key={c.id}
            active={categoryId === c.id}
            onClick={() => setCategoryId(c.id)}
          >
            <Icon
              name={c.icon}
              className={cn(
                "h-3.5 w-3.5",
                categoryId === c.id && "brightness-0 invert"
              )}
            />
            {c.name}
          </Chip>
        ))}
      </div>

      {/* 정렬 */}
      <div className="flex items-center justify-between px-4 py-2">
        <p className="text-xs text-neutral-500">
          <span className="font-bold text-brand-700">{products.length}</span>개
          상품
        </p>
        <div className="flex items-center gap-1.5 text-xs text-neutral-500">
          <CustomIcon name="rf-trend" size={14} className="h-3.5 w-3.5" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="bg-transparent font-medium outline-none"
          >
            {sortOptions.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 성인 카테고리 안내 */}
      {activeCat?.adultOnly && (
        <div className="mx-4 mb-2 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          <ShieldAlert className="h-4 w-4" />
          성인 확인이 필요한 카테고리입니다. 관련 법규 준수가 필요합니다.
        </div>
      )}

      {/* 상품 그리드 */}
      {products.length === 0 ? (
        <EmptyState
          icon="rf-nav-search"
          title="검색 결과가 없어요"
          description="다른 카테고리나 검색어를 시도해보세요."
        />
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-5 px-4 py-2">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </MobileShell>
  );
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-neutral-900 bg-neutral-900 text-brand-400"
          : "border-neutral-200 bg-white text-neutral-600 hover:border-brand-400 hover:bg-brand-50"
      )}
    >
      {children}
    </button>
  );
}

export default function MarketPage() {
  return (
    <Suspense fallback={null}>
      <MarketContent />
    </Suspense>
  );
}
