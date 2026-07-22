import Image from "next/image";
import { cn } from "@/lib/utils";

// 레어팜 커스텀 아이콘 (public/icons/*.svg — 24x24 듀오톤 라인 아이콘)
// name: public/icons/{name}.svg 파일명
// 상태 표현용 유틸 클래스:
//  - 비활성(흐리게): "grayscale opacity-60"
//  - 어두운 배경 위(흰색): "brightness-0 invert"
export function CustomIcon({
  name,
  size = 24,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src={`/icons/${name}.svg`}
      alt=""
      aria-hidden
      width={size}
      height={size}
      unoptimized
      draggable={false}
      className={cn("inline-block shrink-0 select-none", className)}
    />
  );
}
