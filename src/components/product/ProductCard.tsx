"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { CustomIcon } from "@/components/common/CustomIcon";
import type { Product } from "@/types";
import { Placeholder } from "@/components/common/Placeholder";
import { Badge } from "@/components/common/Badge";
import { formatPrice, formatNumber } from "@/lib/utils";
import { marketService } from "@/lib/marketService";

const RF_STICKERS = [
  "/레어팜_이미지없음_공통.svg",
  "/레어팜_이미지없음_식물.svg",
  "/레어팜_이미지없음_파충류.svg",
];

export function ProductCard({ product }: { product: Product }) {
  const category = marketService.getCategory(product.categoryId);
  return (
    <Link href={`/product/${product.id}`} className="group block">
      <div className="relative aspect-square w-full overflow-hidden rounded-xl">
        <Placeholder seed={product.images[0]} className="h-full w-full" stickers={RF_STICKERS} />
        {product.adultOnly && (
          <div className="absolute left-2 top-2">
            <Badge tone="red">
              <ShieldCheck className="h-3 w-3" /> 성인 확인
            </Badge>
          </div>
        )}
        <div className="absolute bottom-2 right-2 flex items-center gap-0.5 rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-medium text-white">
          <CustomIcon
            name="rf-like"
            size={12}
            className="h-3 w-3 brightness-0 invert"
          />{" "}
          {formatNumber(product.likeCount)}
        </div>
      </div>
      <div className="mt-2">
        <p className="text-[11px] font-medium text-neutral-400">
          {category?.name}
        </p>
        <p className="mt-0.5 line-clamp-2 text-[13px] font-semibold leading-snug text-neutral-900">
          {product.name}
        </p>
        <p className="mt-1 text-[15px] font-extrabold text-neutral-900">
          {formatPrice(product.lowestAsk)}
          <span className="ml-1 text-[11px] font-medium text-neutral-400">
            즉시구매가
          </span>
        </p>
        <p className="text-[11px] text-neutral-400">
          최근 {formatPrice(product.lastTradePrice)}
        </p>
      </div>
    </Link>
  );
}

// 가로 스크롤용 컴팩트 카드
export function ProductCardMini({ product }: { product: Product }) {
  return (
    <Link
      href={`/product/${product.id}`}
      className="block w-36 shrink-0"
    >
      <div className="relative aspect-square overflow-hidden rounded-xl">
        <Placeholder seed={product.images[0]} className="h-full w-full" stickers={RF_STICKERS} />
        {product.adultOnly && (
          <div className="absolute left-1.5 top-1.5">
            <Badge tone="red">성인</Badge>
          </div>
        )}
      </div>
      <p className="mt-1.5 line-clamp-1 text-[12px] font-semibold text-neutral-900">
        {product.name}
      </p>
      <p className="text-[14px] font-extrabold text-neutral-900">
        {formatPrice(product.lowestAsk)}
      </p>
    </Link>
  );
}
