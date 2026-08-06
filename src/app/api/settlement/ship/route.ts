import { NextRequest, NextResponse } from "next/server";
import { requireSelf } from "@/lib/apiAuth";
import { serverStore } from "@/lib/serverStore";
import type { DeliveryMethod } from "@/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, unknown>;
    const settlementId = String(body.settlementId ?? "");
    const sellerId = String(body.sellerId ?? "");
    const requestedDeliveryMethod = String(body.deliveryMethod ?? "");
    const deliveryMethod: DeliveryMethod | "" = ["courier", "special", "meetup"].includes(requestedDeliveryMethod)
      ? requestedDeliveryMethod as DeliveryMethod
      : "";
    const trackingNumber = String(body.trackingNumber ?? "").trim().slice(0, 80);
    const meetupLocation = String(body.meetupLocation ?? "").trim().slice(0, 200);
    if (!settlementId || !sellerId || !deliveryMethod) {
      return NextResponse.json({ error: "배송 정보를 확인해 주세요." }, { status: 400 });
    }
    if (deliveryMethod !== "meetup" && !trackingNumber) {
      return NextResponse.json({ error: "운송장 번호를 입력해 주세요." }, { status: 400 });
    }
    if (deliveryMethod === "meetup" && !meetupLocation) {
      return NextResponse.json({ error: "직거래 장소를 입력해 주세요." }, { status: 400 });
    }
    const auth = requireSelf(req, sellerId);
    if (auth.response) return auth.response;

    const updated = await serverStore.runExclusive(() => {
      const settlement = serverStore.getSettlements().find((candidate) => candidate.id === settlementId);
      if (!settlement) throw new Error("NOT_FOUND");
      if (settlement.sellerId !== sellerId) throw new Error("FORBIDDEN");
      if (settlement.status !== "payment_done") throw new Error("INVALID_STATUS");
      const shippedAt = Date.now();
      serverStore.updateSettlement(settlementId, {
        status: "shipping",
        shippedAt,
        deliveryMethod,
        trackingNumber: trackingNumber || undefined,
        meetupLocation: meetupLocation || undefined,
        autoConfirmAt: shippedAt + 15 * 24 * 60 * 60 * 1000,
      });
      return true;
    });
    if (updated) serverStore.broadcast("settlement_updated", { id: settlementId, status: "shipping" });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const status = code === "NOT_FOUND" ? 404 : code === "FORBIDDEN" ? 403 : code === "INVALID_STATUS" ? 409 : 400;
    return NextResponse.json({ error: "배송 처리를 완료할 수 없습니다." }, { status });
  }
}
