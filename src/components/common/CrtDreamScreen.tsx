"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface CrtDreamScreenProps {
  className?: string;
  status?: "scheduled" | "ended" | "offline";
  scheduledAt?: string;
}

export function CrtDreamScreen({
  className,
  status = "offline",
  scheduledAt,
}: CrtDreamScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let running = true;

    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }

    function drawNoise() {
      if (!running || !ctx || !canvas) return;
      const w = canvas.width || canvas.offsetWidth;
      const h = canvas.height || canvas.offsetHeight;
      if (!w || !h) { animId = requestAnimationFrame(drawNoise); return; }
      const imageData = ctx.createImageData(w, h);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const v = (Math.random() * 255) | 0;
        data[i] = v;
        data[i + 1] = v;
        data[i + 2] = v;
        data[i + 3] = (Math.random() * 25) | 0;
      }
      ctx.putImageData(imageData, 0, 0);
      animId = requestAnimationFrame(drawNoise);
    }

    resize();
    window.addEventListener("resize", resize);
    drawNoise();

    return () => {
      running = false;
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const headingText =
    status === "scheduled" ? "STAND BY" : status === "ended" ? "OFF AIR" : "NO SIGNAL";

  const subText =
    status === "scheduled"
      ? "방송 준비 중"
      : status === "ended"
      ? "방송이 종료되었습니다"
      : "방송 없음";

  return (
    <div className={cn("relative overflow-hidden bg-[#070712]", className)}>
      <style>{`
        @keyframes crt-flicker {
          0%, 92%, 96%, 100% { opacity: 1; }
          93% { opacity: 0.88; }
          95% { opacity: 0.94; }
        }
        @keyframes crt-blob1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          40% { transform: translate(24px, -18px) scale(1.06); }
          70% { transform: translate(-16px, 12px) scale(0.96); }
        }
        @keyframes crt-blob2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          35% { transform: translate(-20px, 26px) scale(1.08); }
          65% { transform: translate(18px, -10px) scale(0.94); }
        }
        @keyframes crt-glow {
          0%, 100% { text-shadow: 0 0 18px rgba(140,80,255,0.9), 0 0 40px rgba(140,80,255,0.4); }
          50% { text-shadow: 0 0 24px rgba(60,210,255,0.95), 0 0 56px rgba(60,210,255,0.45); }
        }
        @keyframes crt-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.25; }
        }
        @keyframes crt-scan-move {
          0% { transform: translateY(-4px); }
          100% { transform: translateY(4px); }
        }
        .crt-flicker { animation: crt-flicker 5s infinite; }
        .crt-blob1 { animation: crt-blob1 9s ease-in-out infinite; }
        .crt-blob2 { animation: crt-blob2 11s ease-in-out infinite; }
        .crt-glow-text { animation: crt-glow 3.5s ease-in-out infinite; }
        .crt-blink { animation: crt-blink 2.2s ease-in-out infinite; }
      `}</style>

      {/* 드리미 컬러 블롭 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="crt-blob1 absolute left-[8%] top-[12%] h-72 w-72 rounded-full bg-purple-700/25 blur-[90px]" />
        <div className="crt-blob2 absolute right-[8%] top-[28%] h-60 w-60 rounded-full bg-cyan-500/18 blur-[80px]" />
        <div className="crt-blob1 absolute bottom-[12%] left-[28%] h-52 w-52 rounded-full bg-indigo-600/18 blur-[70px]" />
        <div className="crt-blob2 absolute bottom-[18%] right-[18%] h-44 w-44 rounded-full bg-teal-400/12 blur-[65px]" />
      </div>

      {/* 스캔라인 */}
      <div
        className="pointer-events-none absolute inset-0 z-10 opacity-50"
        style={{
          background:
            "repeating-linear-gradient(to bottom, transparent, transparent 3px, rgba(0,0,0,0.22) 3px, rgba(0,0,0,0.22) 4px)",
        }}
      />

      {/* 노이즈 캔버스 */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-10 h-full w-full"
        style={{ mixBlendMode: "overlay", opacity: 0.45 }}
      />

      {/* 비네트 */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 38%, rgba(0,0,0,0.88) 100%)",
        }}
      />

      {/* 콘텐츠 */}
      <div className="crt-flicker relative z-20 flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center">
        {/* 컬러바 + 신호 아이콘 */}
        <div className="crt-blink mb-1 flex flex-col items-center gap-2">
          <div className="flex gap-0.5 opacity-70">
            {[
              "#ffffff",
              "#ffff00",
              "#00ffff",
              "#00ff00",
              "#ff00ff",
              "#ff0000",
              "#0000ff",
            ].map((color, i) => (
              <div
                key={i}
                className="h-9 w-3 rounded-[2px]"
                style={{ backgroundColor: color, opacity: 0.55 + i * 0.03 }}
              />
            ))}
          </div>
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        </div>

        {/* 헤딩 */}
        <p
          className="crt-glow-text font-mono text-[15px] font-bold tracking-[0.3em] text-white/90 uppercase"
        >
          {headingText}
        </p>

        {/* 서브텍스트 */}
        <p className="text-[13px] font-medium text-white/55">{subText}</p>

        {/* 예정 시간 */}
        {status === "scheduled" && scheduledAt && (
          <p className="mt-0.5 font-mono text-[11px] text-purple-300/75">
            {new Date(scheduledAt).toLocaleString("ko-KR", {
              month: "long",
              day: "numeric",
              weekday: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            시작 예정
          </p>
        )}

        {/* CRT 코너 장식 */}
        <div className="pointer-events-none absolute left-4 top-4 h-5 w-5 rounded-tl border-l-2 border-t-2 border-white/15" />
        <div className="pointer-events-none absolute right-4 top-4 h-5 w-5 rounded-tr border-r-2 border-t-2 border-white/15" />
        <div className="pointer-events-none absolute bottom-4 left-4 h-5 w-5 rounded-bl border-b-2 border-l-2 border-white/15" />
        <div className="pointer-events-none absolute bottom-4 right-4 h-5 w-5 rounded-br border-b-2 border-r-2 border-white/15" />
      </div>
    </div>
  );
}
