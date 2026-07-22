"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "sell";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

const variantCls: Record<Variant, string> = {
  primary:
    "bg-brand-500 text-neutral-900 hover:bg-brand-400 active:bg-brand-600",
  secondary: "bg-neutral-900 text-brand-400 hover:bg-neutral-800",
  outline:
    "border border-neutral-300 text-neutral-800 hover:border-brand-500 hover:bg-brand-50 active:bg-brand-100",
  ghost: "text-neutral-700 hover:bg-neutral-100",
  danger: "bg-red-500 text-white hover:bg-red-600",
  sell: "bg-[#1a1a1a] text-brand-400 hover:bg-black",
};

const sizeCls: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-[15px]",
  lg: "h-13 px-5 text-base py-3.5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "primary", size = "md", fullWidth, className, children, ...rest },
    ref
  ) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variantCls[variant],
        sizeCls[size],
        fullWidth && "w-full",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  )
);
Button.displayName = "Button";
