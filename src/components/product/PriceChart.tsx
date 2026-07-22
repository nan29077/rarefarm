"use client";

import type { Trade } from "@/types";
import { formatPrice } from "@/lib/utils";

// mock 가격 변동 그래프 (SVG). 실제 API 연동 시 시세 데이터로 교체.
export function PriceChart({ trades }: { trades: Trade[] }) {
  const points = trades
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((t) => t.price);

  if (points.length < 2) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-brand-200 bg-brand-50/50 text-sm text-neutral-400">
        거래 데이터가 충분하지 않습니다
      </div>
    );
  }

  const w = 320;
  const h = 140;
  const pad = 8;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const coords = points.map((p, i) => {
    const x = pad + (i / (points.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (p - min) / range) * (h - pad * 2);
    return [x, y];
  });
  const line = coords.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `${pad},${h - pad} ${line} ${w - pad},${h - pad}`;

  return (
    <div className="rounded-xl border border-brand-100 bg-white p-3">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-semibold text-brand-700">
          최고 {formatPrice(max)}
        </span>
        <span className="text-neutral-400">최저 {formatPrice(min)}</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-40 w-full">
        <defs>
          <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F5C518" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* 가이드 라인 */}
        {[0.25, 0.5, 0.75].map((r) => (
          <line
            key={r}
            x1={pad}
            x2={w - pad}
            y1={pad + r * (h - pad * 2)}
            y2={pad + r * (h - pad * 2)}
            stroke="#1a1a1a"
            strokeOpacity="0.06"
            strokeWidth={1}
          />
        ))}
        <polygon points={area} fill="url(#pg)" />
        <polyline
          points={line}
          fill="none"
          stroke="#D9A400"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {coords.map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={3.5}
            fill="#FFD700"
            stroke="#1a1a1a"
            strokeWidth={1.25}
          />
        ))}
      </svg>
    </div>
  );
}
