import { icons, LucideProps } from "lucide-react";
import { CustomIcon } from "@/components/common/CustomIcon";

// 카테고리 등에서 아이콘 이름(string)으로 라인 아이콘을 렌더링.
// "rf:" 접두사가 붙은 이름은 커스텀 아이콘(public/icons/*.svg)으로 렌더링.
export function Icon({
  name,
  ...props
}: { name: string } & LucideProps) {
  if (name.startsWith("rf:")) {
    return (
      <CustomIcon
        name={name.slice(3)}
        className={props.className as string | undefined}
      />
    );
  }
  const Cmp = icons[name as keyof typeof icons] ?? icons.Package;
  return <Cmp strokeWidth={1.75} {...props} />;
}

// 잎사귀 라인 아이콘 (레어팜 대표 아이콘 — 24x24, stroke 기반 라인형)
export function BeeIcon({
  className,
  strokeWidth = 1.75,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* 잎 몸통 */}
      <path d="M12 22C6.5 22 4 17 4 12C4 6.5 9 2 12 2C15 2 20 6.5 20 12C20 17 17.5 22 12 22Z" />
      {/* 중심 잎맥 */}
      <path d="M12 22 L12 8" />
      {/* 측면 잎맥 */}
      <path d="M12 14 L8 11" />
      <path d="M12 17 L9 14.5" />
      <path d="M12 14 L16 11" />
      <path d="M12 17 L15 14.5" />
    </svg>
  );
}
