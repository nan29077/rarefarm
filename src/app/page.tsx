"use client";

import Link from "next/link";
import { Flame, Clock, ChevronRight, Hexagon } from "lucide-react";
import { CustomIcon } from "@/components/common/CustomIcon";
import { HeroBanner } from "@/components/main/HeroBanner";
import { MobileShell } from "@/components/layout/MobileShell";
import { SectionTitle } from "@/components/common/Card";
import { Icon, BeeIcon } from "@/components/common/Icon";
import { Badge } from "@/components/common/Badge";
import { Placeholder } from "@/components/common/Placeholder";
import { Avatar } from "@/components/common/Avatar";
import { ProductCard, ProductCardMini } from "@/components/product/ProductCard";
import { marketService } from "@/lib/marketService";
import { communityService } from "@/lib/communityService";
import { auctionService } from "@/lib/auctionService";
import { getState } from "@/lib/store";
import { useStoreVersion } from "@/lib/useStore";
import { useAuth } from "@/components/providers/AuthProvider";
import { formatNumber, formatPrice } from "@/lib/utils";

const RF_STICKERS = [
  "/레어팜_이미지없음_공통.svg",
  "/레어팜_이미지없음_식물.svg",
  "/레어팜_이미지없음_파충류.svg",
];

export default function HomePage() {
  useStoreVersion();
  const { user } = useAuth();
  const popular = marketService.getProducts({ sort: "popular" }).slice(0, 6);
  const recommended = marketService.getProducts({ sort: "recent" }).slice(0, 8);

  // 마감 임박 입찰: 만료일 3일 이하 구매입찰이 걸린 상품
  const closingProductIds = Array.from(
    new Set(
      getState()
        .bids.filter((b) => b.status === "open" && b.expirationDays <= 3)
        .map((b) => b.productId)
    )
  );
  const closing = closingProductIds
    .map((id) => marketService.getProduct(id))
    .filter((p): p is NonNullable<typeof p> => !!p && p.status === "visible");

  const hotPosts = communityService.getPosts("popular").slice(0, 3);

  // 라이브 지표 (mock 데이터 기반)
  const state = getState();
  const openBidCount = state.bids.filter((b) => b.status === "open").length;
  const visibleProducts = state.products.filter(
    (p) => p.status === "visible"
  ).length;
  const totalTrades = state.trades.length;

  // 내 PICK 파머 — 현재 라이브 중인 PICK 판매자
  const storeUser = user ? state.users.find((u) => u.id === user.id) : null;
  const pickedSellerIds = storeUser?.pickedSellers ?? [];
  const liveNow = auctionService.getOngoingLives().filter((l) => l.isPublic !== false);
  const liveSellerIds = new Set(liveNow.map((l) => l.sellerId));
  const pickedFarmers = pickedSellerIds
    .map((id) => ({
      seller: marketService.getUser(id),
      live: liveNow.find((l) => l.sellerId === id),
      isLive: liveSellerIds.has(id),
    }))
    .filter((f) => f.seller && f.isLive);

  return (
    <MobileShell search>
      {/* 히어로 슬라이드 배너 — 관리자 배너 관리(/admin/banners)에서 운영 */}
      <HeroBanner />

      {/* 내 PICK 파머 — 현재 라이브 중인 PICK 판매자 */}
      {user && pickedFarmers.length > 0 && (
        <section className="px-4 pt-4 pb-1">
          <SectionTitle
            title="내 PICK 파머 라이브 중"
            action={
              <Link href="/live-auction" className="flex items-center text-xs text-neutral-400">
                전체보기 <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 no-scrollbar">
            {pickedFarmers.map(({ seller, live }) => (
              <Link
                key={seller!.id}
                href={live ? `/live-auction/${live.id}` : "/live-auction"}
                className="flex shrink-0 flex-col items-center gap-1.5"
              >
                <div className="relative">
                  <Avatar seed={seller!.avatar} name={seller!.nickname} size={52} className="ring-2 ring-red-400" />
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-0.5 rounded-md bg-red-500 px-1.5 py-0.5 text-[9px] font-extrabold text-white">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                    </span>
                    LIVE
                  </span>
                </div>
                <span className="mt-1 max-w-[56px] truncate text-[11px] font-medium text-neutral-700">
                  {seller!.nickname}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 라이브 지표 스트립 */}
      <div className="mt-3 grid grid-cols-3 gap-2 px-4">
        <MetricChip
          icon={<CustomIcon name="rf-cert" size={16} className="h-4 w-4" />}
          label="등록 상품"
          value={`${visibleProducts}개`}
        />
        <MetricChip
          icon={<CustomIcon name="rf-auction" size={16} className="h-4 w-4" />}
          label="진행 입찰"
          value={`${openBidCount}건`}
        />
        <MetricChip
          icon={<CustomIcon name="rf-trend" size={16} className="h-4 w-4" />}
          label="누적 체결"
          value={`${totalTrades}건`}
        />
      </div>

      {/* 카테고리 바로가기 — 육각형 허니컴 타일 */}
      <section className="px-4 py-5">
        <div className="grid grid-cols-4 gap-y-4">
          {marketService.categories.slice(0, 7).map((c) => (
            <Link
              key={c.id}
              href={`/market?category=${c.id}`}
              className="group flex flex-col items-center gap-1.5"
            >
              <span className="hex-clip flex h-[52px] w-[52px] items-center justify-center bg-brand-100 transition-colors group-hover:bg-brand-300">
                <Icon name={c.icon} className="h-6 w-6 text-neutral-900" />
              </span>
              <span className="text-[11px] font-medium text-neutral-600">
                {c.name}
              </span>
            </Link>
          ))}
          <Link
            href="/market"
            className="group flex flex-col items-center gap-1.5"
          >
            <span className="hex-clip flex h-[52px] w-[52px] items-center justify-center bg-neutral-900 transition-colors group-hover:bg-neutral-700">
              <Hexagon className="h-6 w-6 text-brand-400" strokeWidth={1.75} />
            </span>
            <span className="text-[11px] font-medium text-neutral-600">
              전체보기
            </span>
          </Link>
        </div>
      </section>

      {/* 오늘의 인기 상품 — 랭킹 뱃지 */}
      <section className="px-4 py-2">
        <SectionTitle
          title="오늘의 인기 희귀 동식물"
          action={
            <Link href="/market" className="flex items-center text-xs text-neutral-400">
              더보기 <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 no-scrollbar">
          {popular.map((p, i) => (
            <div key={p.id} className="relative">
              <span className="absolute left-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-lg bg-neutral-900/90 text-xs font-extrabold text-brand-400">
                {i + 1}
              </span>
              <ProductCardMini product={p} />
            </div>
          ))}
        </div>
      </section>

      {/* 마감 임박 입찰 */}
      <section className="px-4 py-4">
        <SectionTitle
          title="마감 임박 입찰"
          action={<Badge tone="dark"><Clock className="h-3 w-3" /> D-3 이하</Badge>}
        />
        {closing.length === 0 ? (
          <p className="text-sm text-neutral-400">마감 임박 입찰이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {closing.map((p) => (
              <Link
                key={p.id}
                href={`/product/${p.id}`}
                className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50/60 p-2.5 transition-colors hover:border-brand-400"
              >
                <Placeholder
                  seed={p.images[0]}
                  className="h-16 w-16 rounded-lg"
                  stickers={RF_STICKERS}
                />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-semibold text-neutral-900">
                    {p.name}
                  </p>
                  <p className="text-xs text-neutral-500">
                    최고 구매입찰{" "}
                    <span className="font-bold text-brand-700">
                      {p.highestBid?.toLocaleString("ko-KR")}원
                    </span>
                  </p>
                </div>
                <Flame className="h-5 w-5 shrink-0 text-brand-600" />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 커뮤니티 인기 */}
      <section className="px-4 py-4">
        <SectionTitle
          title="커뮤니티 인기 게시물"
          action={
            <Link href="/community" className="flex items-center text-xs text-neutral-400">
              더보기 <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 no-scrollbar">
          {hotPosts.map((post) => {
            const author = communityService.getUser(post.userId);
            return (
              <Link
              key={post.id}
                href={`/community/${post.id}`}
                className="w-40 shrink-0"
              >
                <Placeholder
                  seed={post.images[0]}
                  className="aspect-square rounded-xl"
                />
                <p className="mt-1.5 line-clamp-1 text-[12px] font-semibold text-neutral-900">
                  {post.content}
                </p>
                <p className="text-[11px] text-neutral-400">
                  {author?.nickname} · ♥ {formatNumber(post.likeCount)}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 오늘의 팜딜 배너 — 최고가 인기 상품 */}
      {popular[0] && (
        <div className="px-4 py-1">
          <Link
            href={`/product/${popular[0].id}`}
            className="honeycomb-light relative flex items-center gap-3 overflow-hidden rounded-2xl bg-[#111111] px-4 py-3.5"
          >
            <span className="hex-clip flex h-11 w-11 shrink-0 items-center justify-center bg-brand-500">
              <BeeIcon className="h-6 w-6 text-neutral-900" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-brand-400">
                오늘의 팜딜
              </p>
              <p className="line-clamp-1 text-sm font-bold text-white">
                {popular[0].name}
              </p>
            </div>
            <p className="shrink-0 text-sm font-extrabold text-brand-400">
              {formatPrice(popular[0].lowestAsk)}
            </p>
          </Link>
        </div>
      )}

      {/* 추천 상품 */}
      <section className="px-4 py-4">
        <SectionTitle title="추천 상품" />
        <div className="grid grid-cols-2 gap-x-3 gap-y-5">
          {recommended.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </MobileShell>
  );
}

function MetricChip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-neutral-100 bg-white px-2.5 py-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] leading-tight text-neutral-400">{label}</p>
        <p className="text-xs font-extrabold leading-tight text-neutral-900">
          {value}
        </p>
      </div>
    </div>
  );
}
