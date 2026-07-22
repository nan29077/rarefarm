"use client";

import { useState } from "react";
import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { CustomIcon } from "@/components/common/CustomIcon";
import { PageHeader, IconButton } from "@/components/layout/PageHeader";
import { Placeholder } from "@/components/common/Placeholder";
import { Badge } from "@/components/common/Badge";
import { Avatar } from "@/components/common/Avatar";
import { BidAskPanel } from "./BidAskPanel";
import { PriceChart } from "./PriceChart";
import {
  formatPrice,
  formatNumber,
  conditionLabels,
  timeAgo,
} from "@/lib/utils";
import { marketService } from "@/lib/marketService";
import { useStoreVersion } from "@/lib/useStore";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/providers/ToastProvider";

export function ProductDetail({ productId }: { productId: string }) {
  useStoreVersion();
  const { user, requireAuth } = useAuth();
  const { toast } = useToast();
  const [slide, setSlide] = useState(0);

  const product = marketService.getProduct(productId);
  if (!product) return notFound();

  const category = marketService.getCategory(product.categoryId);
  const seller = marketService.getUser(product.sellerId);
  const trades = marketService.getTradesForProduct(product.id);
  const watched = user ? marketService.isWatched(user.id, product.id) : false;

  function toggleWatch() {
    if (!requireAuth()) return;
    const now = marketService.toggleWatch(user!.id, product!.id);
    toast(now ? "관심 상품에 추가했어요." : "관심 상품에서 제거했어요.");
  }

  function share() {
    toast("공유 링크가 복사되었습니다.", "info");
  }

  return (
    <div>
      <PageHeader
        title=""
        right={
          <div className="flex items-center">
            <IconButton icon="rf-share" label="공유" onClick={share} />
          </div>
        }
      />

      {/* 이미지 슬라이더 */}
      <div className="relative">
        <div className="flex snap-x snap-mandatory overflow-x-auto no-scrollbar">
          {product.images.map((img, i) => (
            <Placeholder
              key={i}
              seed={img}
              className="aspect-square w-full shrink-0 snap-center"
            />
          ))}
        </div>
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
          {product.images.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className={
                "h-1.5 rounded-full transition-all " +
                (i === slide ? "w-4 bg-white" : "w-1.5 bg-white/60")
              }
            />
          ))}
        </div>
      </div>

      <div className="space-y-5 px-4 py-4">
        {/* 기본 정보 */}
        <div>
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <Badge tone="brand">{category?.name}</Badge>
            <Badge tone="neutral">{conditionLabels[product.condition]}</Badge>
            {product.adultOnly && (
              <>
                <Badge tone="red">
                  <ShieldCheck className="h-3 w-3" /> 성인 확인 필요
                </Badge>
                <Badge tone="amber">관련 법규 준수 필요</Badge>
              </>
            )}
          </div>
          <h1 className="text-xl font-extrabold leading-snug text-neutral-900">
            {product.name}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">{product.brand}</p>
          <div className="mt-2 flex items-center gap-3 text-xs text-neutral-400">
            <span className="flex items-center gap-1">
              <CustomIcon name="rf-like" size={14} className="h-3.5 w-3.5 grayscale opacity-70" /> 관심{" "}
              {formatNumber(product.likeCount)}
            </span>
            <span>거래 {product.tradeCount}건</span>
          </div>
        </div>

        {/* 시세 */}
        <div className="honeycomb-dark grid grid-cols-3 gap-2 rounded-xl border border-brand-200 bg-brand-50 p-3 text-center">
          <div>
            <p className="text-[11px] text-neutral-500">최근 거래가</p>
            <p className="text-sm font-bold text-neutral-900">
              {formatPrice(product.lastTradePrice)}
            </p>
          </div>
          <div className="border-x border-brand-200">
            <p className="text-[11px] text-neutral-500">최저 판매가</p>
            <p className="text-sm font-bold text-brand-700">
              {formatPrice(product.lowestAsk)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-neutral-500">최고 구매입찰</p>
            <p className="text-sm font-bold text-neutral-900">
              {formatPrice(product.highestBid)}
            </p>
          </div>
        </div>

        {/* 가격 변동 그래프 (mock) */}
        <section>
          <h2 className="mb-2 text-[15px] font-bold text-neutral-900">
            시세 변동
          </h2>
          <PriceChart trades={trades} />
        </section>

        {/* 거래/입찰 패널 */}
        <div data-bidask>
          <BidAskPanel product={product} />
        </div>

        {/* 판매자 */}
        {seller && (
          <div className="flex items-center gap-3 rounded-xl border border-neutral-100 p-3">
            <Avatar seed={seller.avatar} name={seller.nickname} size={40} />
            <div className="flex-1">
              <p className="flex items-center gap-1 text-sm font-bold text-neutral-900">
                <CustomIcon
                  name="cat-goods-shop"
                  size={14}
                  className="h-3.5 w-3.5 grayscale opacity-60"
                />
                {seller.nickname}
              </p>
              <p className="text-xs text-neutral-400">{seller.bio}</p>
            </div>
          </div>
        )}

        {/* 상품 설명 */}
        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-[15px] font-bold text-neutral-900">
            <CustomIcon name="rf-pedigree" size={16} className="h-4 w-4" /> 상품
            설명
          </h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-700">
            {product.description}
          </p>
        </section>

        {/* 거래 체결 내역 */}
        <section>
          <h2 className="mb-2 text-[15px] font-bold text-neutral-900">
            거래 체결 내역
          </h2>
          {trades.length === 0 ? (
            <p className="text-sm text-neutral-400">체결 내역이 없습니다.</p>
          ) : (
            <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-100">
              {trades.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between px-3 py-2.5 text-sm"
                >
                  <span className="text-neutral-500">{timeAgo(t.createdAt)}</span>
                  <span className="font-bold text-neutral-900">
                    {formatPrice(t.price)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* 하단 고정 액션 바 */}
      <div className="sticky bottom-0 z-20 flex items-center gap-3 border-t border-neutral-100 bg-white/95 px-4 py-3 backdrop-blur">
        <button
          onClick={toggleWatch}
          className="flex flex-col items-center text-[11px] text-neutral-500"
        >
          <CustomIcon
            name="rf-like"
            size={24}
            className={"h-6 w-6 " + (watched ? "" : "grayscale opacity-70")}
          />
          {formatNumber(product.likeCount)}
        </button>
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            document
              .querySelector("[data-bidask]")
              ?.scrollIntoView({ behavior: "smooth" });
          }}
          className="flex-1 rounded-xl bg-brand-500 py-3 text-center font-extrabold text-neutral-900 transition-colors hover:bg-brand-400"
        >
          {formatPrice(product.lowestAsk)} 즉시구매 · 입찰
        </a>
      </div>
    </div>
  );
}
