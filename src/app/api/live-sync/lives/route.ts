import { NextRequest, NextResponse } from "next/server";
import { serverStore, toPublicLives } from "@/lib/serverStore";
import { getRequester, isAdmin, requireUser } from "@/lib/apiAuth";
import { auctionEngine } from "@/lib/auctionEngine";
import type { AuctionItem, LiveAuction } from "@/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function sanitizeItem(raw: AuctionItem, sellerId: string): AuctionItem {
  const startPrice = Number(raw.startPrice);
  const bidUnit = Number(raw.bidUnit);
  const buyNowPrice = raw.buyNowPrice === null ? null : Number(raw.buyNowPrice);
  if (!raw.id || !raw.name?.trim() || !Number.isSafeInteger(startPrice) || startPrice <= 0 || !Number.isSafeInteger(bidUnit) || bidUnit <= 0) {
    throw new Error("INVALID_ITEM");
  }
  if (buyNowPrice !== null && (!Number.isSafeInteger(buyNowPrice) || buyNowPrice <= startPrice)) throw new Error("INVALID_ITEM");
  return {
    ...raw,
    sellerId,
    name: raw.name.trim().slice(0, 120),
    description: String(raw.description ?? "").slice(0, 3000),
    startPrice,
    bidUnit,
    buyNowPrice,
    status: "waiting",
    suspended: false,
    currentPrice: startPrice,
    winnerName: null,
    finalPrice: null,
    endTime: undefined,
    pausedRemainingMs: undefined,
  };
}

export async function GET(req: NextRequest) {
  await auctionEngine.sweepExpired();
  const requester = getRequester(req);
  const allLives = Object.values(serverStore.getLives());
  const lives = allLives.filter((live) => live.isPublic !== false || requester?.userId === live.sellerId || isAdmin(requester));
  const allowedItems = new Set(lives.flatMap((live) => live.itemIds));
  const items = Object.values(serverStore.getItems()).filter((item) => allowedItems.has(item.id));
  return NextResponse.json({ lives: toPublicLives(lives), items });
}

export async function POST(req: NextRequest) {
  const auth = requireUser(req);
  if (auth.response) return auth.response;
  if (auth.requester.role === "buyer") {
    return NextResponse.json({ error: "판매자 계정만 라이브 경매를 생성할 수 있습니다." }, { status: 403 });
  }
  try {
    const { live: rawLive, items: rawItems = [] } = await req.json() as { live?: LiveAuction; items?: AuctionItem[] };
    if (!rawLive?.id || !rawLive.title?.trim() || !Array.isArray(rawLive.itemIds) || rawLive.itemIds.length === 0) {
      return NextResponse.json({ error: "라이브 제목과 경매 상품이 필요합니다." }, { status: 400 });
    }
    const result = await serverStore.runExclusive(() => {
      const existing = serverStore.getLives()[rawLive.id];
      if (existing) {
        if (existing.sellerId !== auth.requester.userId && !isAdmin(auth.requester)) throw new Error("FORBIDDEN");
        throw new Error("ALREADY_EXISTS");
      }
      const itemMap = new Map(rawItems.map((item) => [item.id, item]));
      const items = rawLive.itemIds.map((id) => {
        const stored = serverStore.getItems()[id];
        if (stored && stored.sellerId !== auth.requester.userId) throw new Error("FORBIDDEN");
        return sanitizeItem(itemMap.get(id) ?? stored, auth.requester.userId);
      });
      const live: LiveAuction = {
        id: rawLive.id,
        sellerId: auth.requester.userId,
        title: rawLive.title.trim().slice(0, 150),
        platform: rawLive.platform === "instagram" ? "instagram" : "youtube",
        videoUrl: String(rawLive.videoUrl ?? "").slice(0, 500),
        itemIds: items.map((item) => item.id),
        currentItemIndex: 0,
        scheduledAt: rawLive.scheduledAt,
        status: "scheduled",
        viewers: 0,
        createdAt: new Date().toISOString(),
        thumbnailUrl: rawLive.thumbnailUrl,
        tags: rawLive.tags?.slice(0, 5).map((tag) => tag.slice(0, 30)),
        expectedMinutes: rawLive.expectedMinutes,
        isPublic: rawLive.isPublic !== false,
        chatEnabled: rawLive.chatEnabled !== false,
        chatFilterWords: rawLive.chatFilterWords?.slice(0, 100).map((word) => word.slice(0, 50)) ?? [],
        pinnedNotice: rawLive.pinnedNotice?.slice(0, 500) ?? "",
        itemDurations: rawLive.itemDurations,
        couponIds: rawLive.couponIds?.slice(0, 100),
        badges: rawLive.badges?.slice(0, 20),
      };
      items.forEach((item) => serverStore.setItem(item));
      serverStore.setLive(live);
      serverStore.broadcast("live_update", { live, items });
      return { live, items };
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const status = code === "FORBIDDEN" ? 403 : code === "ALREADY_EXISTS" ? 409 : 400;
    return NextResponse.json({ error: code === "ALREADY_EXISTS" ? "이미 존재하는 라이브입니다." : "라이브 정보를 확인해주세요." }, { status });
  }
}
