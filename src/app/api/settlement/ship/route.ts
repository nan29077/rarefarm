import { NextRequest, NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { settlementId, sellerId, deliveryMethod, trackingNumber, meetupLocation } = await req.json();
    if (!settlementId || !sellerId || !deliveryMethod) return NextResponse.json({ error: "필수 필드 누락" }, { status: 400 });
    const settlement = serverStore.getSettlements().find((s) => s.id === settlementId);
    if (!settlement) return NextResponse.json({ error: "정산 레코드를 찾을 수 없습니다." }, { status: 404 });
    if (settlement.sellerId !== sellerId) return NextResponse.json({ error: "권한 없음" }, { status: 403 });
    if (settlement.status !== "payment_done") return NextResponse.json({ error: "결제 완료 상태가 아닙니다." }, { status: 400 });
    const shippedAt = Date.now();
    serverStore.updateSettlement(settlementId, {
      status: "shipping",
      shippedAt,
      deliveryMethod,
      trackingNumber: trackingNumber || undefined,
      meetupLocation: meetupLocation || undefined,
      autoConfirmAt: shippedAt + 15 * 24 * 60 * 60 * 1000,
    });
    serverStore.broadcast("settlement_updated", { id: settlementId, status: "shipping" });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
}
