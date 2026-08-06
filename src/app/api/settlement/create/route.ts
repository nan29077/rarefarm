import { NextRequest, NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";
import { isAdmin, requireUser } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = requireUser(req);
  if (auth.response) return auth.response;
  return NextResponse.json({ error: "정산은 서버의 낙찰 확정 과정에서만 생성됩니다." }, { status: 405, headers: { Allow: "GET" } });
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
  return NextResponse.json({
    settlements: settlements.map(({ withdrawAccountEncrypted: _secret, ...settlement }) => settlement),
  });
}
