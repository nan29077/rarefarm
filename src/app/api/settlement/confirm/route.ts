import { NextRequest, NextResponse } from "next/server";
import { requireSelf } from "@/lib/apiAuth";
import { serverStore } from "@/lib/serverStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, unknown>;
    const settlementId = String(body.settlementId ?? "");
    const buyerId = String(body.buyerId ?? "");
    if (!settlementId || !buyerId) {
      return NextResponse.json({ error: "구매 확정 정보가 필요합니다." }, { status: 400 });
    }
    const auth = requireSelf(req, buyerId);
    if (auth.response) return auth.response;

    await serverStore.runExclusive(() => {
      const settlement = serverStore.getSettlements().find((candidate) => candidate.id === settlementId);
      if (!settlement) throw new Error("NOT_FOUND");
      if (settlement.buyerId !== buyerId) throw new Error("FORBIDDEN");
      if (settlement.status !== "shipping") throw new Error("INVALID_STATUS");
      serverStore.updateSettlement(settlementId, {
        status: "withdrawable",
        confirmedAt: Date.now(),
      });
    });
    serverStore.broadcast("settlement_updated", { id: settlementId, status: "withdrawable" });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const status = code === "NOT_FOUND" ? 404 : code === "FORBIDDEN" ? 403 : code === "INVALID_STATUS" ? 409 : 400;
    return NextResponse.json({ error: "구매 확정을 완료할 수 없습니다." }, { status });
  }
}
