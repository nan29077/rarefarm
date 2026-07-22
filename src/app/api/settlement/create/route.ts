import { NextRequest, NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";
import type { Settlement } from "@/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const settlement = await req.json() as Settlement;
    if (!settlement?.id || !settlement?.itemId || !settlement?.sellerId) {
      return NextResponse.json({ error: "필수 필드 누락" }, { status: 400 });
    }
    const existing = serverStore.getSettlements().find((s) => s.id === settlement.id);
    if (!existing) {
      serverStore.addSettlement(settlement);
      serverStore.broadcast("settlement_created", { settlement });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sellerId = searchParams.get("sellerId");
  const buyerId = searchParams.get("buyerId");
  let settlements = serverStore.getSettlements();
  if (sellerId) settlements = settlements.filter((s) => s.sellerId === sellerId);
  if (buyerId) settlements = settlements.filter((s) => s.buyerId === buyerId);
  return NextResponse.json({ settlements });
}
