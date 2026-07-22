import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";
import { CustomIcon } from "@/components/common/CustomIcon";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon | string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="hex-clip mb-3 flex h-16 w-16 items-center justify-center bg-brand-100">
        {typeof Icon === "string" ? (
          <CustomIcon name={Icon} size={28} className="h-7 w-7" />
        ) : (
          <Icon className="h-7 w-7 text-brand-700" strokeWidth={1.5} />
        )}
      </div>
      <p className="font-semibold text-neutral-800">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-neutral-500">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex justify-center py-10">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-100 border-t-brand-500" />
    </div>
  );
}
