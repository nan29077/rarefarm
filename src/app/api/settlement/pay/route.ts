import { NextRequest, NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";
import { requireSelf } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { settlementId, buyerId } = await req.json();
    if (!settlementId || !buyerId) return NextResponse.json({ error: "필수 필드 누락" }, { status: 400 });
    // body의 buyerId가 요청자 본인인지 세션으로 검증
    const auth = requireSelf(req, buyerId);
    if (auth.response) return auth.response;
    const settlement = serverStore.getSettlements().find((s) => s.id === settlementId);
    if (!settlement) return NextResponse.json({ error: "정산 레코드를 찾을 수 없습니다." }, { status: 404 });
    if (settlement.buyerId !== buyerId) return NextResponse.json({ error: "권한 없음" }, { status: 403 });
    if (settlement.status !== "pending_payment") return NextResponse.json({ error: "결제 대기 상태가 아닙니다." }, { status: 400 });
    if (Date.now() > settlement.paymentDeadline) {
      serverStore.updateSettlement(settlementId, { status: "cancelled" });
      return NextResponse.json({ error: "결제 기한이 초과되었습니다." }, { status: 400 });
    }
    serverStore.updateSettlement(settlementId, { status: "payment_done", paidAt: Date.now() });
    serverStore.broadcast("settlement_updated", { id: settlementId, status: "payment_done" });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
}
