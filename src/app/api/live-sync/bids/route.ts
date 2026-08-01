import { NextRequest, NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";
import { requireUser } from "@/lib/apiAuth";
import type { AuctionBid } from "@/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // Edge 런타임 방지 — 파일 I/O 필요

const LAST_MINUTE_MS = 10 * 1000; // 마감 직전 판정 구간
const EXTEND_MS = 30 * 1000; // 마감 직전 입찰 시 연장 시간

// POST - 입찰 기록 및 최고가 업데이트
export async function POST(req: NextRequest) {
  // 세션 검증 — 미로그인 입찰 차단
  const auth = requireUser(req);
  if (auth.response) return auth.response;

  try {
    const bid = await req.json() as AuctionBid;

    if (!bid?.itemId || !bid?.liveId) {
      return NextResponse.json({ error: "itemId, liveId required" }, { status: 400 });
    }

    // 입찰가 검증 — 음수/0원/소수점/비정상 값 차단
    if (typeof bid.price !== "number" || !Number.isFinite(bid.price) || bid.price <= 0) {
      return NextResponse.json({ error: "입찰가는 0원보다 큰 숫자여야 합니다." }, { status: 400 });
    }

    // 입찰자 위조 방지 — body의 userId는 세션 userId와 반드시 일치해야 한다
    if (bid.userId !== auth.requester.userId) {
      return NextResponse.json({ error: "입찰자 정보가 세션과 일치하지 않습니다." }, { status: 403 });
    }

    const live = serverStore.getLives()[bid.liveId];
    if (!live) return NextResponse.json({ error: "라이브를 찾을 수 없습니다." }, { status: 404 });
    if (live.status === "ended") {
      return NextResponse.json({ error: "종료된 방송에는 입찰할 수 없습니다." }, { status: 400 });
    }

    const item = serverStore.getItems()[bid.itemId];
    if (!item) return NextResponse.json({ error: "상품을 찾을 수 없습니다." }, { status: 404 });

    // 경매 종료 후 입찰 차단
    if (item.status === "sold" || item.status === "failed") {
      return NextResponse.json({ error: "이미 종료된 경매입니다." }, { status: 400 });
    }
    if (item.suspended) {
      return NextResponse.json({ error: "판매 중지된 상품입니다." }, { status: 400 });
    }
    const now = Date.now();
    if (item.endTime && item.endTime <= now) {
      return NextResponse.json({ error: "경매 시간이 종료되었습니다." }, { status: 400 });
    }
    // 본인 상품 입찰 차단
    if (item.sellerId === auth.requester.userId) {
      return NextResponse.json({ error: "본인이 등록한 상품에는 입찰할 수 없습니다." }, { status: 400 });
    }
    // 현재가 이하 입찰 차단 (즉시 낙찰가는 예외 — buyNow 경로)
    const isBuyNow = item.buyNowPrice !== null && bid.price >= item.buyNowPrice;
    if (!isBuyNow && bid.price <= item.currentPrice) {
      return NextResponse.json({ error: "현재가보다 높은 금액으로 입찰해주세요." }, { status: 400 });
    }

    // 동가 입찰 우선순위 판정을 서버 시각 기준으로 맞추기 위해 createdAt을 검증/보정
    const createdAtMs = Date.parse(bid.createdAt ?? "");
    const stored: AuctionBid = {
      ...bid,
      bidderName: String(bid.bidderName ?? "").slice(0, 30) || "익명",
      createdAt: Number.isFinite(createdAtMs) ? bid.createdAt : new Date(now).toISOString(),
    };

    // 해당 아이템 최고가 업데이트
    let updatedItem = item;
    if (bid.price > item.currentPrice) {
      updatedItem = { ...item, currentPrice: bid.price };
    }
    let newEndTime: number | undefined;
    if (isBuyNow) {
      // 즉시 낙찰 — 서버에서 바로 sold 처리해 호스트의 중복 낙찰 확정을 차단.
      // 낙찰가는 클라이언트가 보낸 값이 아니라 서버가 가진 즉시 낙찰가를 사용한다.
      const buyNowPrice = item.buyNowPrice as number;
      updatedItem = {
        ...updatedItem,
        status: "sold",
        winnerName: stored.bidderName,
        finalPrice: buyNowPrice,
        currentPrice: buyNowPrice,
      };
    } else if (updatedItem.endTime && updatedItem.endTime - now < LAST_MINUTE_MS) {
      // 마감 직전 입찰이면 경매 시간 연장 (서버가 단일 기준 — 클라이언트 조작 불가)
      newEndTime = now + EXTEND_MS;
      updatedItem = { ...updatedItem, endTime: newEndTime };
    }
    if (updatedItem !== item) serverStore.setItem(updatedItem);

    serverStore.addBid(stored);
    serverStore.broadcast("bid", { bid: stored, item: updatedItem });

    return NextResponse.json({ ok: true, newEndTime });
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
}
