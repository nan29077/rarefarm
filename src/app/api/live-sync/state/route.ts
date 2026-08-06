import { NextResponse } from "next/server";
import { serverStore, toPublicBids, toPublicLives } from "@/lib/serverStore";
import { auctionEngine } from "@/lib/auctionEngine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET — 현재 서버 상태 전체 조회 (SSE 끊김 대비 5초 폴링 폴백용)
// 비로그인 시청자도 방송을 볼 수 있어야 하므로 공개 조회. 단, youtubeApiKey 등 서버 전용 값은 제외한다.
export async function GET() {
  await auctionEngine.sweepExpired();
  const lives = Object.values(serverStore.getLives()).filter((live) => live.isPublic !== false);
  const liveIds = new Set(lives.map((live) => live.id));
  const itemIds = new Set(lives.flatMap((live) => live.itemIds));
  return NextResponse.json({
    lives: toPublicLives(lives),
    items: Object.values(serverStore.getItems()).filter((item) => itemIds.has(item.id)),
    bids: toPublicBids(serverStore.getBids().filter((bid) => liveIds.has(bid.liveId))),
  });
}
