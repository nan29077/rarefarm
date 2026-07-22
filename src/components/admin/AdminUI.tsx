import { ReactNode, useId } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  sub,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  accent?: boolean;
  sub?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-shadow hover:shadow-md sm:p-5",
        accent
          ? "honeycomb-light border-neutral-800 bg-[#111111]"
          : "border-neutral-200 bg-white"
      )}
    >
      <div className="flex items-center justify-between">
        <p
          className={cn(
            "text-sm",
            accent ? "text-neutral-400" : "text-neutral-500"
          )}
        >
          {label}
        </p>
        <span
          className={cn(
            "hex-clip flex h-9 w-9 items-center justify-center",
            accent ? "bg-brand-500" : "bg-brand-100"
          )}
        >
          <Icon
            className={cn(
              "h-[18px] w-[18px]",
              accent ? "text-neutral-900" : "text-brand-700"
            )}
            strokeWidth={1.75}
          />
        </span>
      </div>
      <p
        className={cn(
          "mt-1.5 text-xl font-extrabold sm:text-2xl",
          accent ? "text-brand-400" : "text-neutral-900"
        )}
      >
        {value}
      </p>
      {sub && (
        <p
          className={cn(
            "mt-0.5 text-xs",
            accent ? "text-neutral-500" : "text-neutral-400"
          )}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

export function Panel({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-neutral-100 px-4 py-3 sm:px-5 sm:py-3.5">
        <h2 className="flex items-center gap-2 font-bold text-neutral-900">
          <span className="h-3.5 w-1 rounded-full bg-brand-500" />
          {title}
        </h2>
        {action}
      </div>
      <div className="p-2">{children}</div>
    </section>
  );
}

export function Table({
  head,
  children,
}: {
  head: string[];
  children: ReactNode;
}) {
  // 인스턴스별 고유 클래스 — 모바일에서 테이블을 카드형으로 변환할 때
  // 각 셀 앞에 해당 열 제목을 라벨로 표시하기 위해 사용
  const scope = `rt-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const mobileCss = `
@media (max-width: 767px) {
  .${scope} table, .${scope} tbody { display: block; width: 100%; }
  .${scope} thead { display: none; }
  .${scope} tbody tr {
    display: block;
    border: 1px solid #e5e5e5 !important;
    border-radius: 12px;
    background: #fff;
    margin: 8px 2px;
    padding: 6px 12px;
  }
  .${scope} tbody td {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 6px 0;
    text-align: right;
  }
${head
  .map(
    (h, i) => `  .${scope} tbody td:nth-child(${i + 1})::before {
    content: "${h.replace(/"/g, "'")}";
    flex-shrink: 0;
    font-size: 11px;
    font-weight: 600;
    color: #a3a3a3;
    text-align: left;
  }`
  )
  .join("\n")}
}`;
  return (
    <div className={scope}>
      <style>{mobileCss}</style>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-neutral-400">
              {head.map((h) => (
                <th key={h} className="px-3 py-2.5 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 [&>tr]:transition-colors [&>tr:hover]:bg-brand-50/60">
            {children}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function StatusPill({
  tone,
  children,
}: {
  tone: "green" | "red" | "amber" | "neutral";
  children: ReactNode;
}) {
  const cls = {
    green: "bg-emerald-100 text-emerald-700",
    red: "bg-red-100 text-red-600",
    amber: "bg-brand-100 text-brand-800",
    neutral: "bg-neutral-100 text-neutral-500",
  }[tone];
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
        cls
      )}
    >
      {children}
    </span>
  );
}

export function ActionButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-neutral-900 sm:py-1"
    >
      {children}
    </button>
  );
}

// 관리자 목록 페이지용 검색 인풋 (UI 필터)
export function AdminSearch({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? "검색..."}
      className="h-9 w-full min-w-0 rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-sm outline-none transition-colors placeholder:text-neutral-400 focus:border-brand-500 focus:bg-brand-50/40 sm:w-56"
    />
  );
}

// 관리자 목록 페이지용 필터 칩
export function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
        active
          ? "border-neutral-900 bg-neutral-900 text-brand-400"
          : "border-neutral-200 bg-white text-neutral-500 hover:border-brand-400 hover:bg-brand-50"
      )}
    >
      {children}
    </button>
  );
}
