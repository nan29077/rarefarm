import { NextRequest, NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";
import { isAdmin, requireUser } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // Edge 런타임 방지 — 파일 I/O 필요

// POST - 현재 경매 상품 시간 연장
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireUser(req);
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    const { seconds } = (await req.json()) as { seconds: number };
    if (!Number.isSafeInteger(seconds) || seconds <= 0 || seconds > 3600) {
      return NextResponse.json({ error: "seconds required (positive number)" }, { status: 400 });
    }

    const lives = serverStore.getLives();
    const live = lives[id];
    if (!live) return NextResponse.json({ error: "live not found" }, { status: 404 });

    // 시간 연장은 방송 주인(판매자) 또는 관리자만 가능
    if (live.sellerId !== auth.requester.userId && !isAdmin(auth.requester)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const items = serverStore.getItems();
    const currentItem = items[live.itemIds[live.currentItemIndex]];
    if (!currentItem) {
      return NextResponse.json({ error: "no current item" }, { status: 400 });
    }
    if (live.status !== "live" || currentItem.status !== "live") {
      return NextResponse.json({ error: "진행 중인 경매만 연장할 수 있습니다." }, { status: 409 });
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
