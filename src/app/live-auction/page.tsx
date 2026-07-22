"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import {
  Eye,
  CalendarClock,
  Trophy,
  Bell,
  BellRing,
  Flame,
  Gavel,
  Crown,
  ChevronLeft,
  ChevronRight,
  Heart,
} from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { SectionTitle } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";
import { EmptyState } from "@/components/common/EmptyState";
import { CustomIcon } from "@/components/common/CustomIcon";
import { auctionService, extractYouTubeId, maskNickname } from "@/lib/auctionService";
import { marketService } from "@/lib/marketService";
import { getState, togglePickSeller, update } from "@/lib/store";
import { useStoreVersion } from "@/lib/useStore";
import { useToast } from "@/components/providers/ToastProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { formatPrice, formatNumber, timeAgo, cn } from "@/lib/utils";
import type { AuctionItem, LiveAuction } from "@/types";

export default function LiveAuctionListPage() {
  useStoreVersion();
  const [, forceRerender] = useState(0);
  const forceUpdate = useCallback(() => forceRerender((v) => v + 1), []);
  const slideRef = useRef<HTMLDivElement>(null);
  const [slideIdx, setSlideIdx] = useState(0);

  function scrollSlide(dir: -1 | 1) {
    if (!slideRef.current) return;
    const w = slideRef.current.clientWidth;
    slideRef.current.scrollBy({ left: dir * w, behavior: "smooth" });
  }

  // 슬라이드 인덱스 추적
  useEffect(() => {
    const el = slideRef.current;
    if (!el) return;
    const onScroll = () => {
      const idx = Math.round(el.scrollLeft / (el.clientWidth || 1));
      setSlideIdx(idx);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // SSE 연결 — 서버에서 라이브 실시간 동기화
  useEffect(() => {
    let es: EventSource | null = null;
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    // 서버 데이터 병합 헬퍼 — lives + items 동시에 merge (서버 상태 우선)
    function mergeServerData(lives: LiveAuction[], items: AuctionItem[]) {
      if (!lives.length && !items.length) return;
      update((s) => {
        lives.forEach((serverLive) => {
          const idx = s.liveAuctions.findIndex((l) => l.id === serverLive.id);
          if (idx >= 0) {
            s.liveAuctions[idx] = { ...s.liveAuctions[idx], ...serverLive };
          } else {
            s.liveAuctions.unshift(serverLive);
          }
        });
        items.forEach((serverItem) => {
          const idx = s.auctionItems.findIndex((i) => i.id === serverItem.id);
          if (idx >= 0) {
            s.auctionItems[idx] = { ...s.auctionItems[idx], ...serverItem };
          } else {
            s.auctionItems.unshift(serverItem);
          }
        });
      });
      forceUpdate();
    }

    // 초기 서버 데이터 로드 (SSE init 이전 빠른 채우기, 모든 브라우저 공통)
    // GET /api/live-sync/lives → { lives, items } 반환
    fetch("/api/live-sync/lives")
      .then((r) => r.json())
      .then((data: { lives: LiveAuction[]; items: AuctionItem[] }) => {
        mergeServerData(data.lives ?? [], data.items ?? []);
      })
      .catch(() => {});

    // SSE 미지원 브라우저(IE 등) 또는 SSE 오류 시 폴링 fallback
    function startPolling() {
      if (pollInterval) return; // 중복 방지
      pollInterval = setInterval(() => {
        fetch("/api/live-sync/lives")
          .then((r) => r.json())
          .then((data: { lives: LiveAuction[]; items: AuctionItem[] }) => {
            mergeServerData(data.lives ?? [], data.items ?? []);
          })
          .catch(() => {});
      }, 5000); // 5초마다 폴링
    }

    if (typeof EventSource !== "undefined") {
      // SSE 지원 브라우저 (Chrome, Firefox, Safari, Whale 등)
      es = new EventSource("/api/live-sync");

      es.addEventListener("init", (e: MessageEvent) => {
        try {
          const { lives, items } = JSON.parse(e.data) as {
            lives: LiveAuction[];
            items: AuctionItem[];
          };
          update((s) => {
            // 서버 라이브를 로컬 스토어에 병합 (서버 우선)
            lives.forEach((serverLive) => {
              const idx = s.liveAuctions.findIndex((l) => l.id === serverLive.id);
              if (idx >= 0) {
                s.liveAuctions[idx] = { ...s.liveAuctions[idx], ...serverLive };
              } else {
                s.liveAuctions.unshift(serverLive);
              }
            });
            // 서버 아이템도 병합
            items.forEach((serverItem) => {
              const idx = s.auctionItems.findIndex((i) => i.id === serverItem.id);
              if (idx >= 0) {
                s.auctionItems[idx] = { ...s.auctionItems[idx], ...serverItem };
              } else {
                s.auctionItems.unshift(serverItem);
              }
            });
          });
          forceUpdate();
        } catch {
          /* noop */
        }
      });

      es.addEventListener("live_update", (e: MessageEvent) => {
        try {
          const { live, items } = JSON.parse(e.data) as {
            live: LiveAuction;
            items?: AuctionItem[];
          };
          update((s) => {
            const idx = s.liveAuctions.findIndex((l) => l.id === live.id);
            if (idx >= 0) {
              s.liveAuctions[idx] = { ...s.liveAuctions[idx], ...live };
            } else {
              s.liveAuctions.unshift(live);
            }
            if (items) {
              items.forEach((serverItem) => {
                const iIdx = s.auctionItems.findIndex((i) => i.id === serverItem.id);
                if (iIdx >= 0) {
                  s.auctionItems[iIdx] = { ...s.auctionItems[iIdx], ...serverItem };
                } else {
                  s.auctionItems.unshift(serverItem);
                }
              });
            }
          });
          forceUpdate();
        } catch {
          /* noop */
        }
      });

      es.addEventListener("live_ended", (e: MessageEvent) => {
        try {
          const { liveId } = JSON.parse(e.data) as { liveId: string };
          update((s) => {
            const live = s.liveAuctions.find((l) => l.id === liveId);
            if (live) live.status = "ended";
          });
          forceUpdate();
        } catch {
          /* noop */
        }
      });

      // SSE 오류 시 폴링으로 전환
      es.onerror = () => {
        es?.close();
        es = null;
        startPolling();
      };
    } else {
      // SSE 미지원 브라우저 (IE 등) → 폴링 fallback
      startPolling();
    }

    return () => {
      es?.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [forceUpdate]);

  // 비공개 방송은 목록에서 제외
  const visible = (l: LiveAuction) => l.isPublic !== false;
  const liveNow = auctionService.getOngoingLives().filter(visible);
  const scheduled = auctionService.getLives("scheduled").filter(visible);
  const ended = auctionService.getLives("ended").filter(visible);

  // 인기 경매 상품: 입찰 많은 순
  const state = getState();
  const bidCountByItem = new Map<string, number>();
  state.auctionBids.forEach((b) =>
    bidCountByItem.set(b.itemId, (bidCountByItem.get(b.itemId) ?? 0) + 1)
  );
  const popularItems = state.auctionItems
    .filter((i) => !i.suspended)
    .map((i) => ({ item: i, bids: bidCountByItem.get(i.id) ?? 0 }))
    .sort((a, b) => b.bids - a.bids || b.item.currentPrice - a.item.currentPrice)
    .slice(0, 6);

  // 최근 낙찰 내역: 낙찰 완료 상품, 마지막 입찰 시간 기준 최신순
  const lastBidAt = new Map<string, string>();
  state.auctionBids.forEach((b) => {
    const cur = lastBidAt.get(b.itemId);
    if (!cur || b.createdAt > cur) lastBidAt.set(b.itemId, b.createdAt);
  });
  const recentSold = state.auctionItems
    .filter((i) => i.status === "sold" && i.finalPrice !== null)
    .map((i) => ({ item: i, at: lastBidAt.get(i.id) ?? i.createdAt }))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 6);

  return (
    <MobileShell>
      {/* 헤더 */}
      <header className="sticky top-12 z-40 flex h-14 items-center gap-2 border-b border-neutral-100 bg-white/95 px-4 backdrop-blur md:top-0">
        <CustomIcon name="rf-nav-live" size={24} className="h-6 w-6" />
        <h1 className="text-[17px] font-bold text-neutral-900">라이브 경매</h1>
      </header>

      {/* 상단 고정: 진행중 라이브 가로 슬라이드 (스크롤해도 유지) */}
      {liveNow.length > 0 && (
        <div className="sticky top-14 z-30 border-b border-neutral-100 bg-white/95 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between px-4 pb-2 pt-3">
            <h2 className="text-[17px] font-bold text-neutral-900">지금 진행중인 라이브 경매</h2>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-xs font-bold text-red-500">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
                ON AIR
              </span>
              {liveNow.length > 1 && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-neutral-400 font-medium">{slideIdx + 1}/{liveNow.length}</span>
                  <button
                    onClick={() => scrollSlide(-1)}
                    disabled={slideIdx === 0}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 transition-colors hover:border-brand-400 hover:text-brand-600 disabled:opacity-30"
                    aria-label="이전"
                  >
                    <ChevronLeft className="h-4 w-4" strokeWidth={2} />
                  </button>
                  <button
                    onClick={() => scrollSlide(1)}
                    disabled={slideIdx >= liveNow.length - 1}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 transition-colors hover:border-brand-400 hover:text-brand-600 disabled:opacity-30"
                    aria-label="다음"
                  >
                    <ChevronRight className="h-4 w-4" strokeWidth={2} />
                  </button>
                </div>
              )}
            </div>
          </div>
          {/* 1개씩 snap 캐러셀 */}
          <div ref={slideRef} className="flex snap-x snap-mandatory overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {liveNow.map((l, i) => (
              <div key={l.id} className="w-full shrink-0 snap-start px-4 pb-3">
                <LiveSlideCard live={l} />
              </div>
            ))}
          </div>
          {/* 점 인디케이터 */}
          {liveNow.length > 1 && (
            <div className="flex justify-center gap-1.5 pb-2">
              {liveNow.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (!slideRef.current) return;
                    slideRef.current.scrollTo({ left: i * slideRef.current.clientWidth, behavior: "smooth" });
                  }}
                  aria-label={`슬라이드 ${i + 1}`}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === slideIdx ? "w-5 bg-brand-500" : "w-1.5 bg-neutral-300"
                  )}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="px-4 py-4">
        {liveNow.length === 0 && (
          <div className="mb-8">
            <SectionTitle title="지금 진행중인 라이브 경매" />
            <EmptyState
              icon="rf-nav-live"
              title="진행중인 라이브가 없어요"
              description="예정된 라이브를 확인해보세요."
            />
          </div>
        )}

        {/* 예정 라이브 */}
        <div>
          <SectionTitle title="예정된 라이브" />
          <div className="space-y-2.5">
            {scheduled.map((l) => (
              <ScheduledCard key={l.id} live={l} />
            ))}
            {scheduled.length === 0 && (
              <p className="rounded-xl border border-dashed border-neutral-200 py-8 text-center text-sm text-neutral-400">
                예정된 라이브가 없습니다.
              </p>
            )}
          </div>
        </div>

        {/* 최근 낙찰 내역 */}
        <div className="mt-8">
          <SectionTitle
            title="최근 낙찰 내역"
            action={
              <Badge tone="brand">
                <Trophy className="h-3 w-3" strokeWidth={2} /> 실시간
              </Badge>
            }
          />
          <div className="honeycomb-light overflow-hidden rounded-2xl bg-[#111111] p-3">
            <div className="space-y-1">
              {recentSold.map(({ item, at }) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2.5 rounded-xl bg-white/5 px-3 py-2"
                >
                  <Crown className="h-3.5 w-3.5 shrink-0 text-brand-400" strokeWidth={2} />
                  <p className="line-clamp-1 min-w-0 flex-1 text-xs font-medium text-white">
                    {item.name}
                  </p>
                  <span className="shrink-0 text-xs font-extrabold text-brand-400">
                    {formatPrice(item.finalPrice)}
                  </span>
                  <span className="shrink-0 text-[10px] text-neutral-400">
                    {maskNickname(item.winnerName ?? "")} · {timeAgo(at)}
                  </span>
                </div>
              ))}
              {recentSold.length === 0 && (
                <p className="py-6 text-center text-xs text-neutral-500">
                  아직 낙찰 내역이 없습니다.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 인기 경매 상품 */}
        <div className="mt-8">
          <SectionTitle
            title="인기 경매 상품"
            action={
              <Badge tone="dark">
                <Flame className="h-3 w-3" strokeWidth={2} /> 입찰 많은 순
              </Badge>
            }
          />
          <div className="grid grid-cols-2 gap-x-3 gap-y-4">
            {popularItems.map(({ item, bids }, i) => (
              <PopularItemCard key={item.id} item={item} bids={bids} rank={i + 1} />
            ))}
            {popularItems.length === 0 && (
              <p className="col-span-2 rounded-xl border border-dashed border-neutral-200 py-8 text-center text-sm text-neutral-400">
                아직 경매 상품이 없습니다.
              </p>
            )}
          </div>
        </div>

        {/* 종료된 라이브 */}
        <div className="mt-8">
          <SectionTitle title="종료된 라이브" />
          <div className="space-y-2.5">
            {ended.map((l) => (
              <EndedCard key={l.id} live={l} />
            ))}
            {ended.length === 0 && (
              <p className="rounded-xl border border-dashed border-neutral-200 py-8 text-center text-sm text-neutral-400">
                종료된 라이브가 없습니다.
              </p>
            )}
          </div>
        </div>
      </div>
    </MobileShell>
  );
}

const NO_IMAGE_STICKERS = [
  "/레어팜_이미지없음_공통.svg",
  "/레어팜_이미지없음_식물.svg",
  "/레어팜_이미지없음_파충류.svg",
] as const;

function getNoImageSticker(id: string): string {
  return NO_IMAGE_STICKERS[id.charCodeAt(0) % 3];
}

// 경매 상품 썸네일 (이미지 URL 우선, 없으면 노이미지 스티커)
function ItemThumb({
  item,
  className,
  seedFallback,
}: {
  item?: AuctionItem;
  className?: string;
  seedFallback?: string;
}) {
  const url = item?.images?.[item.thumbIndex ?? 0];
  if (url)
    return (
      <div className={cn("relative overflow-hidden", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />
      </div>
    );
  const sticker = getNoImageSticker(item?.id ?? seedFallback ?? "live");
  return (
    <div className={cn("relative overflow-hidden bg-neutral-50", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={sticker} alt="이미지 없음" className="absolute inset-0 h-full w-full object-contain" />
    </div>
  );
}

// 진행중 라이브 슬라이드 카드 — YouTube 미리보기(음소거) + 참여하기 버튼
function LiveSlideCard({ live }: { live: LiveAuction }) {
  useStoreVersion();
  const { user } = useAuth();
  const { toast } = useToast();
  const seller = marketService.getUser(live.sellerId);
  const currentItem = auctionService.getItem(live.itemIds[live.currentItemIndex]);
  const storeUser = user ? getState().users.find((u) => u.id === user.id) : null;
  const isPicked = storeUser?.pickedSellers?.includes(live.sellerId) ?? false;

  function handlePick(e: MouseEvent) {
    e.preventDefault();
    if (!user) { toast("로그인 후 PICK할 수 있어요."); return; }
    togglePickSeller(user.id, live.sellerId);
    toast(isPicked ? "PICK 파머를 취소했습니다." : "파머를 PICK했습니다!");
  }
  const isPaused = live.status === "paused";
  const youtubeId = live.platform === "youtube" ? extractYouTubeId(live.videoUrl) : null;
  return (
    <div className="w-full overflow-hidden rounded-2xl border-2 border-brand-500 bg-white shadow-sm">
      {/* 상단: 라이브 미리보기 (YouTube embed 음소거, 클릭 방지) */}
      <div className="relative aspect-video w-full overflow-hidden rounded-t-xl bg-black">
        {youtubeId ? (
          <>
            {/* YouTube 썸네일 이미지 (iframe 폴백) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
              alt={live.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 overflow-hidden">
              <iframe
                src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&loop=1&playlist=${youtubeId}&controls=0&modestbranding=1&playsinline=1&rel=0&showinfo=0&fs=0&iv_load_policy=3&disablekb=1`}
                title={live.title}
                allow="autoplay; encrypted-media"
                tabIndex={-1}
                className="pointer-events-none w-full"
                style={{ height: "calc(100% + 80px)" }}
              />
            </div>
          </>
        ) : live.thumbnailUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={live.thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <ItemThumb item={currentItem} seedFallback={live.id} className="h-full w-full" />
        )}
        {/* LIVE / 일시정지 뱃지 (좌상단) */}
        {isPaused ? (
          <span className="absolute left-2.5 top-2.5 rounded-md bg-neutral-900/90 px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-white">
            일시정지
          </span>
        ) : (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-md bg-red-500 px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-white">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
            </span>
            LIVE
          </span>
        )}
        {/* 시청자 수 뱃지 (우상단) */}
        <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          <Eye className="h-3 w-3" strokeWidth={2} /> {formatNumber(live.viewers)}
        </span>
      </div>
      {/* 하단: 제목 + 판매자/현재 상품 + 참여하기 */}
      <div className="p-3">
        <p className="line-clamp-1 text-sm font-bold text-neutral-900">{live.title}</p>
        <div className="mt-0.5 flex items-center gap-1.5">
          <p className="min-w-0 flex-1 line-clamp-1 text-[11px] text-neutral-400">
            {seller?.nickname ?? "판매자"}
            {currentItem && (
              <>
                {" · "}
                <span className="font-medium text-neutral-600">{currentItem.name}</span>
              </>
            )}
          </p>
          {seller && (
            <button
              onClick={handlePick}
              aria-label={isPicked ? "PICK 취소" : "파머 PICK"}
              className="flex shrink-0 items-center gap-0.5 rounded-lg border border-neutral-200 px-1.5 py-0.5 text-[10px] font-bold transition-colors hover:border-red-300 hover:bg-red-50"
            >
              <Heart
                className={cn("h-3 w-3", isPicked ? "fill-red-500 text-red-500" : "text-neutral-400")}
                strokeWidth={1.75}
              />
              <span className={isPicked ? "text-red-500" : "text-neutral-400"}>PICK</span>
            </button>
          )}
        </div>
        <Link
          href={`/live-auction/${live.id}`}
          className="mt-2.5 block rounded-xl bg-[#FFB800] py-2.5 text-center text-sm font-bold text-black transition-[filter] hover:brightness-95 active:brightness-90"
        >
          참여하기
        </Link>
      </div>
    </div>
  );
}

// D-day 라벨 계산
function dDayLabel(iso: string): string {
  const target = new Date(iso);
  const today = new Date();
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff <= 0) return "D-DAY";
  return `D-${diff}`;
}

// 예정 라이브 카드 — D-day + 알림 신청
function ScheduledCard({ live }: { live: LiveAuction }) {
  const seller = marketService.getUser(live.sellerId);
  const { toast } = useToast();
  const [notified, setNotified] = useState(false);
  const firstItem = auctionService.getItem(live.itemIds[0] ?? "");
  return (
    <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3 transition-colors hover:border-brand-300 hover:bg-brand-50/40">
      <Link href={`/live-auction/${live.id}`} className="relative shrink-0">
        {live.thumbnailUrl ? (
          <div className="relative h-16 w-16 overflow-hidden rounded-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={live.thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          </div>
        ) : (
          <ItemThumb item={firstItem} seedFallback={live.id} className="h-16 w-16 rounded-lg" />
        )}
        <span className="absolute -left-1 -top-1 rounded bg-neutral-900 px-1.5 py-0.5 text-[9px] font-extrabold text-brand-400">
          {dDayLabel(live.scheduledAt)}
        </span>
      </Link>
      <Link href={`/live-auction/${live.id}`} className="min-w-0 flex-1">
        <p className="line-clamp-1 text-sm font-semibold text-neutral-900">{live.title}</p>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-neutral-500">
          <CalendarClock className="h-3.5 w-3.5" strokeWidth={1.75} />
          {new Date(live.scheduledAt).toLocaleString("ko-KR", {
            month: "long",
            day: "numeric",
            weekday: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
        <p className="mt-0.5 text-[11px] text-neutral-400">
          {seller?.nickname ?? "판매자"} · 상품 {live.itemIds.length}개 ·{" "}
          {live.platform === "youtube" ? "YouTube" : "Instagram"}
        </p>
      </Link>
      {/* 알림 신청 (mock) */}
      <button
        onClick={() => {
          setNotified((v) => !v);
          toast(notified ? "라이브 알림 신청을 취소했습니다." : "라이브 시작 알림을 신청했습니다!");
        }}
        className={cn(
          "flex shrink-0 flex-col items-center gap-0.5 rounded-xl border px-2.5 py-2 text-[10px] font-bold transition-colors",
          notified
            ? "border-neutral-900 bg-neutral-900 text-brand-400"
            : "border-neutral-200 text-neutral-500 hover:border-brand-400 hover:bg-brand-50"
        )}
        aria-label="알림 신청"
      >
        {notified ? (
          <BellRing className="h-4 w-4" strokeWidth={1.75} />
        ) : (
          <Bell className="h-4 w-4" strokeWidth={1.75} />
        )}
        {notified ? "신청됨" : "알림"}
      </button>
    </div>
  );
}

// 인기 경매 상품 카드
function PopularItemCard({
  item,
  bids,
  rank,
}: {
  item: AuctionItem;
  bids: number;
  rank: number;
}) {
  const lives = auctionService
    .getLives()
    .filter((l) => l.itemIds.includes(item.id) && l.isPublic !== false);
  const href = lives[0] ? `/live-auction/${lives[0].id}` : "/live-auction";
  return (
    <Link href={href} className="block">
      <div className="relative overflow-hidden rounded-xl">
        <ItemThumb item={item} className="aspect-square w-full" />
        <span className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-lg bg-neutral-900/90 text-xs font-extrabold text-brand-400">
          {rank}
        </span>
        <span className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          <Gavel className="h-3 w-3" strokeWidth={2} /> {bids}회 입찰
        </span>
      </div>
      <p className="mt-1.5 line-clamp-1 text-[13px] font-semibold text-neutral-900">{item.name}</p>
      <p className="text-xs text-neutral-500">
        {item.status === "sold" ? "낙찰가" : "현재가"}{" "}
        <span className="font-extrabold text-neutral-900">
          {formatPrice(item.finalPrice ?? item.currentPrice)}
        </span>
      </p>
    </Link>
  );
}

// 종료 라이브 카드 — 낙찰 결과 표시
function EndedCard({ live }: { live: LiveAuction }) {
  const seller = marketService.getUser(live.sellerId);
  const items = live.itemIds
    .map((id) => auctionService.getItem(id))
    .filter((i): i is NonNullable<typeof i> => !!i);
  const sold = items.filter((i) => i.status === "sold");
  const totalAmount = sold.reduce((sum, i) => sum + (i.finalPrice ?? 0), 0);
  return (
    <Link
      href={`/live-auction/${live.id}`}
      className="block rounded-xl border border-neutral-200 bg-white p-3 transition-colors hover:border-brand-300 hover:bg-brand-50/40"
    >
      <div className="flex items-center gap-2">
        <Badge tone="neutral">종료</Badge>
        <p className="line-clamp-1 flex-1 text-sm font-semibold text-neutral-700">{live.title}</p>
        <span className="text-[11px] text-neutral-400">
          {new Date(live.scheduledAt).toLocaleDateString("ko-KR")}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-neutral-400">
        {seller?.nickname ?? "판매자"} · 낙찰 {sold.length}건 / 전체 {items.length}건
        {totalAmount > 0 && (
          <>
            {" · 총 낙찰금액 "}
            <span className="font-bold text-neutral-600">{formatPrice(totalAmount)}</span>
          </>
        )}
      </p>
      {sold.length > 0 && (
        <div className="mt-2 space-y-1 rounded-lg bg-neutral-50 p-2">
          {sold.slice(0, 3).map((it) => (
            <div key={it.id} className="flex items-center gap-1.5 text-xs">
              <Trophy className="h-3 w-3 shrink-0 text-brand-600" strokeWidth={2} />
              <span className="line-clamp-1 flex-1 text-neutral-600">{it.name}</span>
              <span className="shrink-0 font-semibold text-neutral-900">
                {formatPrice(it.finalPrice)}
              </span>
              <span className="shrink-0 text-neutral-400">
                {maskNickname(it.winnerName ?? "")}
              </span>
            </div>
          ))}
        </div>
      )}
    </Link>
  );
}
