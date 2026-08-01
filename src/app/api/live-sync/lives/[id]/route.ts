import { NextRequest, NextResponse } from "next/server";
import { serverStore, toPublicLive } from "@/lib/serverStore";
import { isAdmin, requireUser } from "@/lib/apiAuth";
import type { AuctionItem, LiveAuction } from "@/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // Edge 런타임 방지 — 파일 I/O 필요

// PATCH - 라이브 상태/정보 부분 업데이트
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireUser(req);
  if (auth.response) return auth.response;

  try {
    const { id } = params;
    const patch = await req.json() as Partial<LiveAuction> & { items?: AuctionItem[] };

    const existing = serverStore.getLives()[id];
    const { items: patchItems, ...livePatch } = patch;

    // 방송 주인(판매자) 또는 관리자만 수정 가능
    const ownerId = existing?.sellerId ?? livePatch.sellerId;
    if (ownerId !== auth.requester.userId && !isAdmin(auth.requester)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    let updated: LiveAuction;
    if (existing) {
      updated = { ...existing, ...livePatch };
    } else if (livePatch.id && livePatch.sellerId && livePatch.title) {
      // Upsert: setLiveStatus에서 전체 live 데이터 포함 시 서버 재시작 후에도 복구 가능
      console.log("[ServerStore] PATCH upsert — live not in store, creating from full data:", id);
      updated = livePatch as LiveAuction;
    } else {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    serverStore.setLive(updated);

    if (patchItems) {
      patchItems.forEach((item) => serverStore.setItem(item));
    }

    serverStore.broadcast("live_update", {
      live: toPublicLive(updated),
      items: patchItems ?? [],
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
}

// DELETE - 라이브 종료 처리 및 파일에서 제거
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireUser(req);
  if (auth.response) return auth.response;

  const { id } = params;
  const live = serverStore.getLives()[id];
  if (live) {
    // 방송 주인(판매자) 또는 관리자만 종료 가능
    if (live.sellerId !== auth.requester.userId && !isAdmin(auth.requester)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }
    serverStore.broadcast("live_ended", { liveId: id });
    serverStore.deleteLive(id);
    serverStore.clearChats(id); // 라이브 종료 시 채팅 기록 삭제
  }
  return NextResponse.json({ ok: true });
}
