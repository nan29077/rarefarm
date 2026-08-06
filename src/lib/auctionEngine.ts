import crypto from "crypto";
import type { AuctionBid, AuctionItem, LiveAuction, LiveAuctionStatus, Settlement } from "@/types";
import { serverStore, toPublicBid, toPublicLive } from "./serverStore";

const DEFAULT_AUCTION_SEC = 90;
const PLATFORM_FEE_RATE = 0.11;
const LAST_MOMENT_MS = 10_000;
const EXTENSION_MS = 30_000;

function durationMs(live: LiveAuction, item: AuctionItem): number {
  const seconds = live.itemDurations?.[item.id] ?? item.durationSec ?? DEFAULT_AUCTION_SEC;
  return Math.min(Math.max(Math.round(seconds), 10), 24 * 60 * 60) * 1000;
}

function currentItem(live: LiveAuction): AuctionItem | undefined {
  return serverStore.getItems()[live.itemIds[live.currentItemIndex]];
}

function winningBid(itemId: string): AuctionBid | null {
  return serverStore.getBids()
    .filter((bid) => bid.itemId === itemId && !!bid.userId)
    .sort((a, b) => b.price - a.price || a.createdAt.localeCompare(b.createdAt))[0] ?? null;
}

function makeSettlement(item: AuctionItem, bid: AuctionBid): Settlement {
  const now = Date.now();
  const platformFee = Math.round(bid.price * PLATFORM_FEE_RATE);
  return {
    id: `s-${crypto.randomUUID()}`,
    orderId: bid.id,
    itemId: item.id,
    itemName: item.name,
    sellerId: item.sellerId,
    buyerId: bid.userId!,
    salePrice: bid.price,
    platformFee,
    settlementAmount: bid.price - platformFee,
    status: "pending_payment",
    awardedAt: now,
    paymentDeadline: now + 24 * 60 * 60 * 1000,
  };
}

function startItem(live: LiveAuction, item: AuctionItem) {
  item.status = "live";
  item.endTime = Date.now() + durationMs(live, item);
  delete item.pausedRemainingMs;
  serverStore.setItem(item);
}

function advance(live: LiveAuction): AuctionItem | null {
  const items = serverStore.getItems();
  let index = live.currentItemIndex + 1;
  while (index < live.itemIds.length) {
    const candidate = items[live.itemIds[index]];
    if (candidate?.status === "waiting" && !candidate.suspended) {
      live.currentItemIndex = index;
      startItem(live, candidate);
      serverStore.setLive(live);
      return candidate;
    }
    index += 1;
  }
  live.currentItemIndex = live.itemIds.length;
  serverStore.setLive(live);
  return null;
}

function finalizeUnlocked(live: LiveAuction, shouldSell: boolean, shouldAdvance: boolean) {
  const item = currentItem(live);
  if (!item) return { live, item: null, winnerBid: null, settlement: null, nextItem: null };
  if (item.status === "sold" || item.status === "failed") {
    return { live, item, winnerBid: winningBid(item.id), settlement: serverStore.findSettlementByItem(item.id) ?? null, nextItem: null };
  }

  const winner = shouldSell ? winningBid(item.id) : null;
  let settlement: Settlement | null = null;
  if (winner) {
    item.status = "sold";
    item.winnerName = winner.bidderName;
    item.currentPrice = winner.price;
    item.finalPrice = winner.price;
    settlement = serverStore.findSettlementByItem(item.id) ?? makeSettlement(item, winner);
    serverStore.addSettlement(settlement);
  } else {
    item.status = "failed";
    item.winnerName = null;
    item.finalPrice = null;
  }
  delete item.endTime;
  delete item.pausedRemainingMs;
  serverStore.setItem(item);
  const nextItem = shouldAdvance ? advance(live) : null;
  serverStore.setLive(live);
  return { live, item, winnerBid: winner, settlement, nextItem };
}

function broadcastState(result: ReturnType<typeof finalizeUnlocked>) {
  serverStore.broadcast("auction_finalized", {
    live: toPublicLive(result.live),
    item: result.item,
    bid: result.winnerBid ? toPublicBid(result.winnerBid) : null,
    nextItem: result.nextItem,
  });
  serverStore.broadcast("live_update", {
    live: toPublicLive(result.live),
    items: result.live.itemIds.map((id) => serverStore.getItems()[id]).filter(Boolean),
  });
  if (result.settlement) serverStore.broadcast("settlement_created", {
    liveId: result.live.id,
    itemId: result.settlement.itemId,
  });
}

export const auctionEngine = {
  async placeBid(input: {
    liveId: string;
    itemId: string;
    requesterId: string;
    requesterName: string;
    amount?: number;
    action: "bid" | "buy_now";
    idempotencyKey: string;
  }) {
    return serverStore.runExclusive(() => {
      const live = serverStore.getLives()[input.liveId];
      const item = serverStore.getItems()[input.itemId];
      if (!live || !item) throw new Error("NOT_FOUND");
      if (live.status !== "live") throw new Error("LIVE_NOT_ACTIVE");
      if (live.itemIds[live.currentItemIndex] !== item.id || item.status !== "live") throw new Error("ITEM_NOT_ACTIVE");
      if (item.suspended) throw new Error("ITEM_SUSPENDED");
      if (item.sellerId === input.requesterId) throw new Error("SELF_BID");
      if (!item.endTime || item.endTime <= Date.now()) throw new Error("AUCTION_ENDED");

      const bidId = `bid-${crypto.createHash("sha256").update(`${input.requesterId}:${input.idempotencyKey}`).digest("hex").slice(0, 32)}`;
      const duplicate = serverStore.getBids().find((bid) => bid.id === bidId);
      if (duplicate) return { bid: duplicate, item, live, settlement: serverStore.findSettlementByItem(item.id) ?? null, duplicated: true };

      const isBuyNow = input.action === "buy_now";
      const price = isBuyNow ? item.buyNowPrice : input.amount;
      if (isBuyNow && item.buyNowPrice === null) throw new Error("BUY_NOW_DISABLED");
      if (typeof price !== "number" || !Number.isSafeInteger(price) || price <= 0) throw new Error("INVALID_AMOUNT");
      if (!isBuyNow) {
        if (item.buyNowPrice !== null && price >= item.buyNowPrice) throw new Error("USE_BUY_NOW");
        if (price < item.currentPrice + item.bidUnit || (price - item.currentPrice) % item.bidUnit !== 0) {
          throw new Error("INVALID_INCREMENT");
        }
      }

      const bid: AuctionBid = {
        id: bidId,
        liveId: live.id,
        itemId: item.id,
        userId: input.requesterId,
        bidderName: input.requesterName.slice(0, 30) || "회원",
        price,
        createdAt: new Date().toISOString(),
      };
      serverStore.addBid(bid);
      item.currentPrice = price;

      let settlement: Settlement | null = null;
      if (isBuyNow) {
        serverStore.setItem(item);
        const finalized = finalizeUnlocked(live, true, true);
        settlement = finalized.settlement;
        broadcastState(finalized);
      } else {
        if (item.endTime - Date.now() < LAST_MOMENT_MS) item.endTime = Date.now() + EXTENSION_MS;
        serverStore.setItem(item);
      }
      serverStore.broadcast("bid", { bid: toPublicBid(bid), item });
      return { bid, item, live, settlement, duplicated: false };
    });
  },

  async setStatus(liveId: string, requesterId: string, admin: boolean, status: LiveAuctionStatus) {
    return serverStore.runExclusive(() => {
      const live = serverStore.getLives()[liveId];
      if (!live) throw new Error("LIVE_NOT_FOUND");
      if (live.sellerId !== requesterId && !admin) throw new Error("FORBIDDEN");
      const item = currentItem(live);
      const now = Date.now();

      if (status === "live") {
        if (live.status === "ended") throw new Error("INVALID_TRANSITION");
        if (!item || item.suspended || !["waiting", "live"].includes(item.status)) {
          throw new Error("NO_ACTIVE_ITEM");
        }
        if (live.status === "paused" && item?.status === "live") {
          item.endTime = now + Math.max(item.pausedRemainingMs ?? durationMs(live, item), 1_000);
          delete item.pausedRemainingMs;
          serverStore.setItem(item);
        } else if (item?.status === "waiting" && !item.suspended) {
          startItem(live, item);
        }
        live.status = "live";
      } else if (status === "paused") {
        if (live.status !== "live") throw new Error("INVALID_TRANSITION");
        if (item?.status === "live") {
          item.pausedRemainingMs = Math.max((item.endTime ?? now) - now, 1_000);
          delete item.endTime;
          serverStore.setItem(item);
        }
        live.status = "paused";
      } else if (status === "ended") {
        if (item?.status === "live") broadcastState(finalizeUnlocked(live, true, false));
        const items = serverStore.getItems();
        live.itemIds.forEach((itemId) => {
          const pending = items[itemId];
          if (pending && (pending.status === "waiting" || pending.status === "live")) {
            pending.status = "failed";
            delete pending.endTime;
            delete pending.pausedRemainingMs;
            serverStore.setItem(pending);
          }
        });
        live.status = "ended";
        live.viewers = 0;
      } else if (status === "scheduled" && live.status !== "scheduled") {
        throw new Error("INVALID_TRANSITION");
      }

      serverStore.setLive(live);
      serverStore.broadcast(status === "ended" ? "live_ended" : "live_update", {
        liveId,
        live: toPublicLive(live),
        items: live.itemIds.map((id) => serverStore.getItems()[id]).filter(Boolean),
      });
      return { live, item: currentItem(live) ?? null };
    });
  },

  async jumpToItem(liveId: string, requesterId: string, admin: boolean, index: number) {
    return serverStore.runExclusive(() => {
      const live = serverStore.getLives()[liveId];
      if (!live) throw new Error("LIVE_NOT_FOUND");
      if (live.sellerId !== requesterId && !admin) throw new Error("FORBIDDEN");
      if (!Number.isInteger(index) || index < 0 || index >= live.itemIds.length) throw new Error("INVALID_ITEM");
      const target = serverStore.getItems()[live.itemIds[index]];
      if (!target || target.suspended || target.status !== "waiting") throw new Error("INVALID_ITEM");
      const previous = currentItem(live);
      if (previous?.status === "live") broadcastState(finalizeUnlocked(live, true, false));
      live.currentItemIndex = index;
      if (live.status === "live") startItem(live, target);
      serverStore.setLive(live);
      serverStore.broadcast("live_update", { live: toPublicLive(live), items: live.itemIds.map((id) => serverStore.getItems()[id]).filter(Boolean) });
      return { live, item: target };
    });
  },

  async finalize(liveId: string, requesterId: string, admin: boolean, shouldSell: boolean, shouldAdvance: boolean) {
    return serverStore.runExclusive(() => {
      const live = serverStore.getLives()[liveId];
      if (!live) throw new Error("LIVE_NOT_FOUND");
      if (live.sellerId !== requesterId && !admin) throw new Error("FORBIDDEN");
      const result = finalizeUnlocked(live, shouldSell, shouldAdvance);
      broadcastState(result);
      return result;
    });
  },

  async sweepExpired() {
    return serverStore.runExclusive(() => {
      const now = Date.now();
      const results: Array<ReturnType<typeof finalizeUnlocked>> = [];
      for (const live of Object.values(serverStore.getLives())) {
        if (live.status !== "live") continue;
        const item = currentItem(live);
        if (item?.status === "live" && item.endTime && item.endTime <= now) {
          const result = finalizeUnlocked(live, true, true);
          broadcastState(result);
          results.push(result);
        }
      }
      return results;
    });
  },
};
