import { NextRequest, NextResponse } from "next/server";
import { serverStore, toPublicLive, toPublicLives } from "@/lib/serverStore";
import { isAdmin, requireUser } from "@/lib/apiAuth";
import type { AuctionItem, LiveAuction } from "@/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // Edge 런타임 방지 — 파일 I/O 필요

// GET - 모든 라이브 + 관련 상품 조회 (다른 브라우저에서 SSE 없이도 전체 데이터 수신 가능)
// 비로그인 시청자도 방송 목록을 봐야 하므로 공개 조회. youtubeApiKey는 응답에서 제거한다.
export async function GET() {
  const lives = toPublicLives(Object.values(serverStore.getLives()));
  const items = Object.values(serverStore.getItems());
  return NextResponse.json({ lives, items });
}

// POST - 라이브 생성 또는 업데이트
export async function POST(req: NextRequest) {
  const auth = requireUser(req);
  if (auth.response) return auth.response;

  try {
    const body = await req.json();
    const { live, items } = body as {
      live: LiveAuction;
      items?: AuctionItem[];
    };

    if (!live?.id) {
      return NextResponse.json({ error: "live.id required" }, { status: 400 });
    }

    // 방송 생성/수정은 방송 주인(판매자) 또는 관리자만 가능
    const existing = serverStore.getLives()[live.id];
    const ownerId = existing?.sellerId ?? live.sellerId;
    if (ownerId !== auth.requester.userId && !isAdmin(auth.requester)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    // 서버에만 저장된 youtubeApiKey 보존 (클라이언트 live 객체에는 이 필드가 없어 그대로 덮어쓰면 유실됨)
    const merged: LiveAuction =
      existing?.youtubeApiKey && !live.youtubeApiKey
        ? { ...live, youtubeApiKey: existing.youtubeApiKey }
        : live;
    serverStore.setLive(merged);
    if (items) {
      items.forEach((item) => serverStore.setItem(item));
    }

    serverStore.broadcast("live_update", { live: toPublicLive(merged), items: items ?? [] });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
}
