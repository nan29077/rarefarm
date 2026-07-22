import { NextRequest, NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";
import type { AuctionBid } from "@/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // Edge 런타임 방지 — 파일 I/O 필요

// POST - 입찰 기록 및 최고가 업데이트
export async function POST(req: NextRequest) {
  try {
    const bid = await req.json() as AuctionBid;

    if (!bid?.itemId || !bid?.price) {
      return NextResponse.json({ error: "itemId, price required" }, { status: 400 });
    }

    // 해당 아이템 최고가 업데이트
    const item = serverStore.getItems()[bid.itemId];
    let updatedItem = item;
    if (item && bid.price > item.currentPrice) {
      updatedItem = { ...item, currentPrice: bid.price };
      serverStore.setItem(updatedItem);
    }

    serverStore.addBid(bid);
    serverStore.broadcast("bid", { bid, item: updatedItem });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
}
