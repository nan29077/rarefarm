import { gradientFor } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function Avatar({
  seed,
  name,
  size = 36,
  className,
}: {
  seed: string;
  name?: string;
  size?: number;
  className?: string;
}) {
  // avatar가 /로 시작하는 경로(캐릭터 이미지)인 경우 <img>로 표시
  if (seed.startsWith("/")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={seed}
        alt={name ?? ""}
        className={cn("shrink-0 rounded-full object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  const initial = (name ?? seed).trim().charAt(0).toUpperCase();
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold text-white",
        className
      )}
      style={{
        width: size,
        height: size,
        background: gradientFor(seed),
        fontSize: size * 0.42,
      }}
    >
      {initial}
    </div>
  );
}
