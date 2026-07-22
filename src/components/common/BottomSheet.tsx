"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// 공용 Bottom Sheet — 하단에서 슬라이드업, 꿀벌 테마
// - 배경 어둡게 처리 + 탭 시 닫힘
// - 상단 핸들을 아래로 드래그하면 닫힘
export function BottomSheet({
  open,
  onClose,
  title,
  children,
  maxHeight = "80vh",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxHeight?: string;
}) {
  const [dragY, setDragY] = useState(0);
  const startYRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) setDragY(0);
  }, [open]);

  if (!open) return null;

  function onTouchStart(e: React.TouchEvent) {
    startYRef.current = e.touches[0].clientY;
  }
  function onTouchMove(e: React.TouchEvent) {
    if (startYRef.current === null) return;
    const dy = e.touches[0].clientY - startYRef.current;
    setDragY(Math.max(0, dy));
  }
  function onTouchEnd() {
    if (dragY > 80) onClose();
    setDragY(0);
    startYRef.current = null;
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-sheet-up relative w-full max-w-app overflow-hidden rounded-t-3xl bg-white shadow-2xl ring-1 ring-black/5"
        style={{
          maxHeight,
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          transition: dragY ? "none" : undefined,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 닫기 버튼 (오른쪽 상단) */}
        <button
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-800"
        >
          <X className="h-4 w-4" strokeWidth={1.75} />
        </button>
        {/* 드래그 핸들 */}
        <div
          className="cursor-grab touch-none px-5 pb-1 pt-3"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="mx-auto h-1 w-10 rounded-full bg-neutral-300" />
        </div>
        {title && (
          <div className="flex items-center gap-2 px-5 pb-2 pt-1">
            <span className="h-4 w-1 rounded-full bg-brand-500" />
            <h3 className="text-base font-bold text-neutral-900">{title}</h3>
          </div>
        )}
        <div
          className="overflow-y-auto px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-1"
          style={{ maxHeight: `calc(${maxHeight} - 64px)` }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
