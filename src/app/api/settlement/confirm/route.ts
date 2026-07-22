import { NextRequest, NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { settlementId, buyerId } = await req.json();
    if (!settlementId || !buyerId) return NextResponse.json({ error: "필수 필드 누락" }, { status: 400 });
    const settlement = serverStore.getSettlements().find((s) => s.id === settlementId);
    if (!settlement) return NextResponse.json({ error: "정산 레코드를 찾을 수 없습니다." }, { status: 404 });
    if (settlement.buyerId !== buyerId) return NextResponse.json({ error: "권한 없음" }, { status: 403 });
    if (settlement.status !== "shipping") return NextResponse.json({ error: "배송 중 상태가 아닙니다." }, { status: 400 });
    serverStore.updateSettlement(settlementId, { status: "withdrawable", confirmedAt: Date.now() });
    serverStore.broadcast("settlement_updated", { id: settlementId, status: "withdrawable" });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
}
