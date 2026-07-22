import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "brand" | "orange" | "green" | "red" | "amber" | "dark";

const toneCls: Record<Tone, string> = {
  neutral: "bg-neutral-100 text-neutral-600",
  brand: "bg-brand-100 text-brand-800",
  orange: "bg-orange-100 text-orange-700",
  green: "bg-emerald-100 text-emerald-700",
  red: "bg-red-100 text-red-600",
  amber: "bg-amber-100 text-amber-700",
  dark: "bg-neutral-900 text-brand-400",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        toneCls[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
