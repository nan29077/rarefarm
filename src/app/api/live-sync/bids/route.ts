import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/apiAuth";
import { auctionEngine } from "@/lib/auctionEngine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

declare global {
  // eslint-disable-next-line no-var
  var __rf_bid_attempts: Map<string, number[]>;
}
if (!global.__rf_bid_attempts) global.__rf_bid_attempts = new Map();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const attempts = (global.__rf_bid_attempts.get(userId) ?? []).filter((time) => now - time < 10_000);
  attempts.push(now);
  global.__rf_bid_attempts.set(userId, attempts);
  return attempts.length > 20;
}

const messages: Record<string, string> = {
  LIVE_NOT_ACTIVE: "진행 중인 라이브에서만 입찰할 수 있습니다.",
  ITEM_NOT_ACTIVE: "현재 경매 중인 상품이 아닙니다.",
  ITEM_SUSPENDED: "판매 중지된 상품입니다.",
  SELF_BID: "본인 상품에는 입찰할 수 없습니다.",
  AUCTION_ENDED: "경매 시간이 종료되었습니다.",
  BUY_NOW_DISABLED: "즉시 낙찰이 제공되지 않는 상품입니다.",
  USE_BUY_NOW: "즉시 낙찰 버튼을 이용해주세요.",
  INVALID_INCREMENT: "현재가와 최소 입찰 단위를 확인해주세요.",
  INVALID_AMOUNT: "올바른 입찰 금액이 필요합니다.",
};

export async function POST(req: NextRequest) {
  const auth = requireUser(req);
  if (auth.response) return auth.response;
  if (isRateLimited(auth.requester.userId)) {
    return NextResponse.json({ error: "입찰 요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
  }

  try {
    const body = await req.json() as Record<string, unknown>;
    const liveId = String(body.liveId ?? "");
    const itemId = String(body.itemId ?? "");
    const action = body.action === "buy_now" ? "buy_now" : "bid";
    const idempotencyKey = String(body.idempotencyKey ?? "");
    if (!liveId || !itemId || !idempotencyKey || idempotencyKey.length > 100) {
      return NextResponse.json({ error: "입찰 식별 정보가 필요합니다." }, { status: 400 });
    }
    const result = await auctionEngine.placeBid({
      liveId,
      itemId,
      requesterId: auth.requester.userId,
      requesterName: auth.requester.nickname,
      amount: typeof body.amount === "number" ? body.amount : undefined,
      action,
      idempotencyKey,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const code = error instanceof Error ? error.message : "INVALID_REQUEST";
    const status = code === "NOT_FOUND" ? 404 : code === "AUCTION_ENDED" ? 409 : 400;
    return NextResponse.json({ error: messages[code] ?? "입찰을 처리할 수 없습니다." }, { status });
  }
}
