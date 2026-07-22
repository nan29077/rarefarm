import { NextRequest, NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // Edge 런타임 방지 — 파일 I/O 필요

// POST - 현재 경매 상품 시간 연장
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { seconds } = (await req.json()) as { seconds: number };
    if (!seconds || typeof seconds !== "number" || seconds <= 0) {
      return NextResponse.json({ error: "seconds required (positive number)" }, { status: 400 });
    }

    const lives = serverStore.getLives();
    const live = lives[id];
    if (!live) return NextResponse.json({ error: "live not found" }, { status: 404 });

    const items = serverStore.getItems();
    const currentItem = items[live.itemIds[live.currentItemIndex]];
    if (!currentItem) {
      return NextResponse.json({ error: "no current item" }, { status: 400 });
    }

    // 현재 endTime이 이미 과거면 현재 시각 기준으로 연장
    const base = (currentItem.endTime && currentItem.endTime > Date.now())
      ? currentItem.endTime
      : Date.now();
    const newEndTime = base + seconds * 1000;

    currentItem.endTime = newEndTime;
    serverStore.setItem(currentItem);
    // item_update 이벤트로 모든 시청자에게 endTime 변경 브로드캐스트
    serverStore.broadcast("item_update", currentItem);

    return NextResponse.json({ ok: true, newEndTime });
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
}
