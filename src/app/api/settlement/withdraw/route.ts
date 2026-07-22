import { NextRequest, NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { sellerId, withdrawAccount } = await req.json();
    if (!sellerId || !withdrawAccount?.bankName || !withdrawAccount?.accountNumber || !withdrawAccount?.accountHolder) {
      return NextResponse.json({ error: "sellerId, withdrawAccount 필요" }, { status: 400 });
    }
    const settlements = serverStore.getSettlementsBySeller(sellerId);
    const withdrawable = settlements.filter((s) => s.status === "withdrawable");
    if (withdrawable.length === 0) return NextResponse.json({ error: "출금 가능한 정산이 없습니다." }, { status: 400 });
    const now = Date.now();
    withdrawable.forEach((sv) => {
      serverStore.updateSettlement(sv.id, { status: "withdrawn", withdrawRequestedAt: now, withdrawnAt: now, withdrawAccount });
    });
    serverStore.broadcast("settlement_withdrawn", { sellerId, count: withdrawable.length });
    return NextResponse.json({ ok: true, count: withdrawable.length });
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
}
