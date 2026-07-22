import { NextRequest, NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";
import type { AuctionItem, LiveAuction } from "@/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // Edge 런타임 방지 — 파일 I/O 필요

// GET - 모든 라이브 + 관련 상품 조회 (다른 브라우저에서 SSE 없이도 전체 데이터 수신 가능)
export async function GET() {
  const lives = Object.values(serverStore.getLives());
  const items = Object.values(serverStore.getItems());
  return NextResponse.json({ lives, items });
}

// POST - 라이브 생성 또는 업데이트
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { live, items } = body as {
      live: LiveAuction;
      items?: AuctionItem[];
    };

    if (!live?.id) {
      return NextResponse.json({ error: "live.id required" }, { status: 400 });
    }

    // 서버에만 저장된 youtubeApiKey 보존 (클라이언트 live 객체에는 이 필드가 없어 그대로 덮어쓰면 유실됨)
    const existing = serverStore.getLives()[live.id];
    const merged: LiveAuction =
      existing?.youtubeApiKey && !live.youtubeApiKey
        ? { ...live, youtubeApiKey: existing.youtubeApiKey }
        : live;
    serverStore.setLive(merged);
    if (items) {
      items.forEach((item) => serverStore.setItem(item));
    }

    serverStore.broadcast("live_update", { live: merged, items: items ?? [] });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
}
