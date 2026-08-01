import { NextRequest, NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";
import { isAdmin, requireUser } from "@/lib/apiAuth";
import type { Settlement } from "@/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = requireUser(req);
  if (auth.response) return auth.response;

  try {
    const settlement = await req.json() as Settlement;
    if (!settlement?.id || !settlement?.itemId || !settlement?.sellerId || !settlement?.buyerId) {
      return NextResponse.json({ error: "필수 필드 누락" }, { status: 400 });
    }

    // 정산 생성은 낙찰 확정 주체(판매자) 또는 즉시낙찰 구매자 본인만 가능
    if (
      settlement.sellerId !== auth.requester.userId &&
      settlement.buyerId !== auth.requester.userId &&
      !isAdmin(auth.requester)
    ) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    // 중복 정산 차단 — 같은 id 또는 같은 상품(itemId)에 이미 정산이 있으면 무시
    const existing =
      serverStore.getSettlements().find((s) => s.id === settlement.id) ??
      serverStore.findSettlementByItem(settlement.itemId);
    if (!existing) {
      serverStore.addSettlement(settlement);
      serverStore.broadcast("settlement_created", { settlement });
    }
    return NextResponse.json({ ok: true, duplicated: !!existing });
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
}

// GET - 정산 내역 조회
// sellerId/buyerId 필터는 본인 것만 조회 가능. 필터 없이 전체 조회는 관리자 전용.
export async function GET(req: NextRequest) {
  const auth = requireUser(req);
  if (auth.response) return auth.response;

  const { searchParams } = new URL(req.url);
  const sellerId = searchParams.get("sellerId");
  const buyerId = searchParams.get("buyerId");
  const admin = isAdmin(auth.requester);

  if (!sellerId && !buyerId && !admin) {
    return NextResponse.json({ error: "관리자 전용 기능입니다." }, { status: 403 });
  }
  if (
    !admin &&
    ((sellerId && sellerId !== auth.requester.userId) ||
      (buyerId && buyerId !== auth.requester.userId))
  ) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  // 조회 시점에 자동 구매확정 / 결제기한 만료를 서버 데이터에 반영
  let settlements = serverStore.sweepSettlements();
  if (sellerId) settlements = settlements.filter((s) => s.sellerId === sellerId);
  if (buyerId) settlements = settlements.filter((s) => s.buyerId === buyerId);
  return NextResponse.json({ settlements });
}
