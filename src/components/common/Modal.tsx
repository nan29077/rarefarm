"use client";

import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 backdrop-blur-sm md:items-center"
      onClick={onClose}
    >
      <div
        className="animate-fade-up w-full max-w-app overflow-hidden rounded-t-3xl bg-white shadow-2xl md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 드래그 핸들 (모바일) */}
        <div className="mx-auto mb-2 mt-3 h-1 w-10 rounded-full bg-neutral-200 md:hidden" />
        {/* 헤더 */}
        <div className="mb-4 flex items-center justify-between px-5 pt-4">
          <h3 className="flex items-center gap-2 text-lg font-bold text-neutral-900">
            <span className="h-4 w-1 rounded-full bg-brand-500" />
            {title}
          </h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
            aria-label="닫기"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>
        {/* 콘텐츠 */}
        <div className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>
  );
}
