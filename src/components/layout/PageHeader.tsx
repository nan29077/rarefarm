"use client";

import { useRouter } from "next/navigation";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";
import { CustomIcon } from "@/components/common/CustomIcon";

// 상세/서브 페이지용 상단 헤더 (뒤로가기 포함)
export function PageHeader({
  title,
  back = true,
  right,
}: {
  title: string;
  back?: boolean;
  right?: ReactNode;
}) {
  const router = useRouter();
  return (
    <header className="sticky top-12 z-30 flex h-14 items-center justify-between border-b border-neutral-100 bg-white/95 px-3 backdrop-blur md:top-0">
      <div className="flex items-center gap-1">
        {back && (
          <button
            onClick={() => router.back()}
            className="rounded-full p-1.5 text-neutral-700 hover:bg-neutral-100"
            aria-label="뒤로"
          >
            <CustomIcon name="rf-nav-home" size={24} className="h-6 w-6" />
          </button>
        )}
        <h1 className="text-[17px] font-bold text-neutral-900">{title}</h1>
      </div>
      {right}
    </header>
  );
}

export function IconButton({
  icon: Icon,
  onClick,
  label,
  active,
}: {
  icon: LucideIcon | string;
  onClick?: () => void;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={
        "rounded-full p-2 transition-colors " +
        (active
          ? "text-brand-600"
          : "text-neutral-600 hover:bg-brand-50")
      }
    >
      {typeof Icon === "string" ? (
        <CustomIcon name={Icon} size={20} className="h-5 w-5" />
      ) : (
        <Icon className="h-5 w-5" strokeWidth={1.9} />
      )}
    </button>
  );
}
