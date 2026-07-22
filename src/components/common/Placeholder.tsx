"use client";

import { useState } from "react";
import { gradientFor } from "@/lib/utils";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// seed → Unsplash 실제 사진 매핑 (상품/게시물 썸네일)
const unsplashMap: Record<string, string> = {
  // p1: 몬스테라 알보 바리에가타 — 열대 잎/몬스테라
  "p1-a": "photo-1614594975525-e45190c55d0b",
  "p1-b": "photo-1463936575829-25148e1db1b8",
  "p1-c": "photo-1518335935020-cfd6580c1ab4",
  // p2: 아가베 블루 차크라 — 선인장/아가베
  "p2-a": "photo-1485955900006-10f4d324d411",
  "p2-b": "photo-1506905925346-21bda4d32df4",
  // p3: 안스리움 아마조니카 — 열대잎
  "p3-a": "photo-1512428559087-560fa5ceab42",
  "p3-b": "photo-1580048915913-4f8f5d7c1155",
  // p4: 레오파드게코 슈퍼설 — 도마뱀/게코
  "p4-a": "photo-1559563458-527698bf5295",
  "p4-b": "photo-1518709766631-a6a7f45921c3",
  // p5: 볼파이톤 차이나백 — 뱀
  "p5-a": "photo-1531259683007-016a7b628fc3",
  "p5-b": "photo-1558618666-fcd25c85cd64",
  // p6: 헤르만 육지거북 — 거북이
  "p6-a": "photo-1437622368342-7a3d73a34c8f",
  "p6-b": "photo-1503656142023-618e7d1f435a",
  // p7: 엘로에 디코토마 (나무알로에) — 알로에/선인장
  "p7-a": "photo-1459156212016-c812468e2115",
  "p7-b": "photo-1416879595882-3373a0480b5b",
  // p8: 알비노 볼파이톤 — 뱀
  "p8-a": "photo-1558618666-fcd25c85cd64",
  "p8-b": "photo-1553284965-83fd3e82fa5a",
  // p9: 알비노 슈가글라이더 — 소동물
  "p9-a": "photo-1548767797-d8c844163c4a",
  "p9-b": "photo-1535083783855-aaab7d918517",
  // p10: 에우포르비아 오베사 무늬종 — 다육
  "p10-a": "photo-1574871786514-2d0a20e23f28",
  "p10-b": "photo-1459156212016-c812468e2115",
  // 커뮤니티 게시물
  "post1-a": "photo-1614594975525-e45190c55d0b",
  "post1-b": "photo-1463936575829-25148e1db1b8",
  "post2-a": "photo-1559563458-527698bf5295",
  "post3-a": "photo-1518709766631-a6a7f45921c3",
  "post3-b": "photo-1512428559087-560fa5ceab42",
  "post3-c": "photo-1437622368342-7a3d73a34c8f",
  "post4-a": "photo-1518335935020-cfd6580c1ab4",
  // 경매 전용 썸네일
  "au5":  "photo-1416879595882-3373a0480b5b",
  "au8":  "photo-1553284965-83fd3e82fa5a",
  "au9":  "photo-1518709766631-a6a7f45921c3",
  "au11": "photo-1559563458-527698bf5295",
  "au12": "photo-1518709766631-a6a7f45921c3",
  "au15": "photo-1574871786514-2d0a20e23f28",
  "au17": "photo-1614594975525-e45190c55d0b",
  "au18": "photo-1506905925346-21bda4d32df4",
  "au19": "photo-1512428559087-560fa5ceab42",
  "au21": "photo-1559563458-527698bf5295",
  "au24": "photo-1437622368342-7a3d73a34c8f",
  "au25": "photo-1485955900006-10f4d324d411",
};

function unsplashFor(seed: string): string | null {
  const id = unsplashMap[seed] ?? unsplashMap[`${seed.split("-")[0]}-a`];
  return id ? `https://images.unsplash.com/${id}?w=400&q=80` : null;
}

// 상품/게시물 썸네일. seed가 매핑되면 Unsplash 실제 사진,
// 아니면 (또는 로드 실패 시) 결정적 gradient placeholder로 폴백.
export function Placeholder({
  seed,
  label,
  className,
  rounded = "rounded-none",
  showIcon = true,
  stickers,
}: {
  seed: string;
  label?: string;
  className?: string;
  rounded?: string;
  showIcon?: boolean;
  stickers?: string[];
}) {
  const [failed, setFailed] = useState(false);
  const url = unsplashFor(seed);
  const useImage = !!url && !failed;

  // seed 기반 결정론적 스티커 선택
  const stickerSrc = !useImage && stickers && stickers.length > 0
    ? stickers[seed.charCodeAt(0) % stickers.length]
    : null;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden",
        rounded,
        className,
        stickerSrc ? "bg-neutral-50" : ""
      )}
      style={stickerSrc ? undefined : { background: gradientFor(seed) }}
    >
      {useImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : stickerSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={stickerSrc}
          alt=""
          className="absolute inset-0 h-full w-full object-contain"
        />
      ) : (
        <div className="absolute inset-0 bg-white/5" />
      )}
      {!useImage && !stickerSrc && showIcon && !label && (
        <ImageIcon className="h-8 w-8 text-white/70" strokeWidth={1.5} />
      )}
      {label && (
        <span className="relative z-10 px-3 text-center text-sm font-bold text-white drop-shadow">
          {label}
        </span>
      )}
    </div>
  );
}
