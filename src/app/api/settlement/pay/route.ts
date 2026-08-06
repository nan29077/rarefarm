import { NextRequest, NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";
import { requireSelf } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// PG 계약 전에는 결제 완료 상태를 만들지 않는다. 추후 이 라우트는 PG 결제 세션 생성만 담당하고,
// payment_done 전환은 서명 검증된 PG 웹훅에서만 수행해야 한다.
export async function POST(req: NextRequest) {
  try {
    const { settlementId, buyerId } = await req.json();
    if (!settlementId || !buyerId) return NextResponse.json({ error: "결제 정보가 필요합니다." }, { status: 400 });
    const auth = requireSelf(req, buyerId);
    if (auth.response) return auth.response;
    const settlement = serverStore.getSettlements().find((candidate) => candidate.id === settlementId);
    if (!settlement) return NextResponse.json({ error: "정산 정보를 찾을 수 없습니다." }, { status: 404 });
    if (settlement.buyerId !== buyerId) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    if (settlement.status !== "pending_payment") return NextResponse.json({ error: "결제 대기 상태가 아닙니다." }, { status: 409 });
    return NextResponse.json({
      error: "PG 결제 서비스 연동 준비 중입니다. 계약 완료 후 결제창이 연결됩니다.",
      code: "PG_NOT_CONFIGURED",
    }, { status: 503 });
  } catch {
    return NextResponse.json({ error: "결제 요청을 처리할 수 없습니다." }, { status: 400 });
  }
}
