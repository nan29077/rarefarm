import type { ProductCondition, OrderStatus } from "@/types";

// className 병합 (경량 clsx 대체)
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export function formatPrice(v: number | null | undefined): string {
  if (v === null || v === undefined) return "-";
  return v.toLocaleString("ko-KR") + "원";
}

export function formatNumber(v: number): string {
  if (v >= 10000) return (v / 10000).toFixed(v % 10000 === 0 ? 0 : 1) + "만";
  if (v >= 1000) return (v / 1000).toFixed(1) + "천";
  return v.toLocaleString("ko-KR");
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR");
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export const conditionLabels: Record<ProductCondition, string> = {
  sealed: "미개봉",
  "like-new": "거의 새것",
  good: "양호",
  used: "사용감 있음",
  "parts-missing": "부품 누락",
  "box-damaged": "박스 손상",
};

export const orderStatusLabels: Record<OrderStatus, string> = {
  pending: "결제 대기",
  matched: "거래 체결",
  shipping: "배송 중",
  completed: "거래 완료",
  canceled: "취소됨",
};

// gradient placeholder — seed 문자열로 결정적 그라디언트 생성
export function gradientFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  const h2 = (h + 45) % 360;
  return `linear-gradient(135deg, hsl(${h} 70% 62%), hsl(${h2} 68% 48%))`;
}

// 만료일 → 마감 임박 여부(mock): expirationDays가 3 이하면 임박
export function isClosingSoon(expirationDays: number): boolean {
  return expirationDays <= 3;
}
