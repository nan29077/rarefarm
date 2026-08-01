import { NextResponse } from "next/server";
import { serverStore, toPublicLives } from "@/lib/serverStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET — 현재 서버 상태 전체 조회 (SSE 끊김 대비 5초 폴링 폴백용)
// 비로그인 시청자도 방송을 볼 수 있어야 하므로 공개 조회. 단, youtubeApiKey 등 서버 전용 값은 제외한다.
export async function GET() {
  return NextResponse.json({
    lives: toPublicLives(Object.values(serverStore.getLives())),
    items: Object.values(serverStore.getItems()),
    bids: serverStore.getBids(),
  });
}
