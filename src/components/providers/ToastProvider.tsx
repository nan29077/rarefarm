"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "info" | "error";
interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = ++counter;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 2600);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[100] flex flex-col items-center gap-2.5 px-4 md:bottom-8">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex min-w-[200px] max-w-[86vw] items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-2xl animate-in",
              "border-l-2",
              t.type === "success" && "border-brand-500 bg-[#111111]",
              t.type === "info"    && "border-neutral-500 bg-[#111111]",
              t.type === "error"   && "border-red-500 bg-[#111111]"
            )}
          >
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                t.type === "success" && "bg-brand-500/15 text-brand-400",
                t.type === "info"    && "bg-neutral-700 text-neutral-300",
                t.type === "error"   && "bg-red-500/15 text-red-400"
              )}
            >
              {t.type === "success" && <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />}
              {t.type === "info"    && <Info          className="h-4 w-4" strokeWidth={1.75} />}
              {t.type === "error"   && <XCircle       className="h-4 w-4" strokeWidth={1.75} />}
            </span>
            <span className="leading-snug">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
