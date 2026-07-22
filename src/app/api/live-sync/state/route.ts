import { NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET — 현재 서버 상태 전체 조회 (SSE 끊김 대비 5초 폴링 폴백용)
export async function GET() {
  return NextResponse.json({
    lives: Object.values(serverStore.getLives()),
    items: Object.values(serverStore.getItems()),
    bids: serverStore.getBids(),
  });
}
