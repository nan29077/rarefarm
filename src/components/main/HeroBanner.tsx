"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { bannerService } from "@/lib/bannerService";
import { useStoreVersion } from "@/lib/useStore";
import { cn } from "@/lib/utils";

const AUTO_INTERVAL = 5000; // 5초 자동 전환
const SWIPE_THRESHOLD = 40; // 터치 스와이프 최소 이동 (px)

// 메인 상단 슬라이드 배너 — 자동 전환 / 좌우 화살표 / 닷 인디케이터 / 터치 스와이프
export function HeroBanner() {
  useStoreVersion();
  const banners = bannerService.getActiveBanners();
  const [index, setIndex] = useState(0);
  const touchX = useRef<number | null>(null);
  const count = banners.length;

  const go = useCallback(
    (next: number) => {
      if (count === 0) return;
      setIndex((next + count) % count);
    },
    [count]
  );

  // 자동 전환 (5초) — index가 바뀌면 타이머 리셋
  useEffect(() => {
    if (count <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), AUTO_INTERVAL);
    return () => clearInterval(t);
  }, [count, index]);

  // 배너 삭제/비활성화로 index가 범위를 벗어나면 보정
  useEffect(() => {
    if (index >= count && count > 0) setIndex(0);
  }, [index, count]);

  if (count === 0) return null;

  function onTouchStart(e: React.TouchEvent) {
    touchX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    go(dx < 0 ? index + 1 : index - 1);
  }

  return (
    <div className="px-4">
      <div
        className="group relative aspect-[16/9] overflow-hidden rounded-2xl bg-neutral-900"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* 슬라이드 트랙 */}
        <div
          className="flex h-full transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {banners.map((b, i) => (
            <div key={b.id} className="relative h-full w-full shrink-0">
              {/* 첫 슬라이드만 above-the-fold → 우선 로드, 나머지는 lazy */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={b.imageUrl}
                alt={b.title}
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : "auto"}
                className="absolute inset-0 h-full w-full object-cover"
                draggable={false}
              />
              {/* 어둡게 처리 오버레이 */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10" />
              <div className="absolute inset-x-0 bottom-0 p-4 pb-5 md:p-5">
                <p className="text-lg font-extrabold leading-tight text-white drop-shadow md:text-xl">
                  {b.title}
                </p>
                <p className="mt-1 line-clamp-1 text-xs text-white/80 md:text-sm">
                  {b.subtitle}
                </p>
                {b.ctaText && (
                  <Link
                    href={b.ctaLink || "/"}
                    className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-brand-500 px-3.5 py-1.5 text-xs font-bold text-neutral-900 transition-colors hover:bg-brand-400"
                  >
                    {b.ctaText} <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 좌우 화살표 */}
        {count > 1 && (
          <>
            <button
              onClick={() => go(index - 1)}
              aria-label="이전 배너"
              className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/35 p-1.5 text-white opacity-0 transition-opacity hover:bg-black/60 focus:opacity-100 group-hover:opacity-100"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2} />
            </button>
            <button
              onClick={() => go(index + 1)}
              aria-label="다음 배너"
              className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/35 p-1.5 text-white opacity-0 transition-opacity hover:bg-black/60 focus:opacity-100 group-hover:opacity-100"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={2} />
            </button>
          </>
        )}

        {/* 닷 인디케이터 */}
        {count > 1 && (
          <div className="absolute bottom-2 right-3 z-10 flex items-center gap-1.5 md:bottom-2.5">
            {banners.map((b, i) => (
              <button
                key={b.id}
                onClick={() => go(i)}
                aria-label={`${i + 1}번 배너`}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === index ? "w-4 bg-brand-400" : "w-1.5 bg-white/50 hover:bg-white/80"
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
