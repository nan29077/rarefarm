import { NextRequest, NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // Edge 런타임 방지 — 파일 I/O 필요

const DEFAULT_AUCTION_SEC = 300; // 판매자 설정 없을 때 폴백 (5분)

// POST - 판매자 수동으로 다음 상품으로 이동
// 현재 active/sold/failed 상품을 건너뛰고 다음 waiting 상품을 live 상태로 전환
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const lives = serverStore.getLives();
  const live = lives[id];
  if (!live) return NextResponse.json({ error: "live not found" }, { status: 404 });

  const items = serverStore.getItems();

  // 현재 인덱스 이후에서 다음 waiting(대기중) 상품 탐색
  let newIndex = live.currentItemIndex + 1;
  while (newIndex < live.itemIds.length) {
    const candidate = items[live.itemIds[newIndex]];
    if (candidate && candidate.status === "waiting" && !candidate.suspended) break;
    newIndex++;
  }

  if (newIndex >= live.itemIds.length) {
    // 더 이상 대기 상품 없음
    return NextResponse.json({ ok: true, message: "no more items" });
  }

  // 인덱스 이동
  live.currentItemIndex = newIndex;
  const nextItem = items[live.itemIds[newIndex]];
  if (nextItem) {
    nextItem.status = "live";
    const dur =
      live.itemDurations?.[nextItem.id] ?? nextItem.durationSec ?? DEFAULT_AUCTION_SEC;
    nextItem.endTime = Date.now() + dur * 1000;
    serverStore.setItem(nextItem);
  }
  serverStore.setLive(live);

  // 라이브 전체 상태 + 아이템 목록 브로드캐스트
  const allItems = live.itemIds
    .map((iid) => serverStore.getItems()[iid])
    .filter(Boolean);
  serverStore.broadcast("live_update", { live, items: allItems });

  return NextResponse.json({ ok: true, newIndex });
}
