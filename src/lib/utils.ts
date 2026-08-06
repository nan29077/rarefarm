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

// 이미지 파일 → base64 데이터 URL 변환 (클라이언트 전용).
// URL.createObjectURL()의 blob URL은 세션 종료/새로고침 시 무효화되어 영속 저장에 쓸 수 없으므로,
// 저장 가능한 데이터 URL로 변환한다. 저장 용량 절약을 위해 긴 변을 maxDim 이하로 축소한다.
export function fileToDataUrl(file: File, maxDim = 1280, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("이미지 파일을 읽을 수 없습니다."));
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      const img = new Image();
      img.onerror = () => reject(new Error("이미지를 불러올 수 없습니다."));
      img.onload = () => {
        try {
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height, 1));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(dataUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        } catch {
          resolve(dataUrl);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
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
