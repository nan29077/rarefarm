"use client";

// 라이브 경매 service layer (mock). 실제 API 연동 시 내부 구현만 교체하면 된다.
import type {
  AuctionItem,
  AuctionItemCondition,
  AuctionItemStatus,
  AuctionBid,
  LiveAuction,
  LiveAuctionStatus,
  LivePlatform,
  User,
} from "@/types";
import { categories } from "./mockData";
import { getState, update, uid } from "./store";

// auctionService 내부용 경매 기본 시간 (초) — itemDurations/durationSec 없을 때 폴백
const DEFAULT_AUCTION_SEC = 90;

// ---- 라벨 ----
export const auctionItemStatusLabels: Record<AuctionItemStatus, string> = {
  waiting: "대기중",
  live: "라이브중",
  sold: "낙찰완료",
  failed: "유찰",
};

export const liveStatusLabels: Record<LiveAuctionStatus, string> = {
  scheduled: "예정",
  live: "진행중",
  paused: "일시정지",
  ended: "종료",
};

export const auctionConditionLabels: Record<AuctionItemCondition, string> = {
  new: "새상품",
  best: "최상",
  high: "상",
  mid: "중",
};

// 경매 전용 카테고리 (등록 폼)
export const auctionCategories = [
  { id: "ac-figure", name: "피규어" },
  { id: "ac-lego", name: "레고" },
  { id: "ac-diecast", name: "다이캐스트" },
  { id: "ac-game", name: "게임" },
  { id: "ac-anime", name: "애니" },
  { id: "ac-etc", name: "기타" },
];

// 카테고리 라벨 조회 — 경매 카테고리 → 마켓 카테고리 순으로 폴백
export function auctionCategoryName(id: string): string {
  return (
    auctionCategories.find((c) => c.id === id)?.name ??
    categories.find((c) => c.id === id)?.name ??
    "기타"
  );
}

// 경매 제한 시간 옵션 (초)
export const auctionDurationOptions = [
  { sec: 180, label: "3분" },
  { sec: 300, label: "5분" },
  { sec: 600, label: "10분" },
  { sec: 900, label: "15분" },
  { sec: 1800, label: "30분" },
  { sec: 3600, label: "1시간" },
  { sec: 7200, label: "2시간" },
  { sec: 10800, label: "3시간" },
  { sec: 14400, label: "4시간" },
  { sec: 18000, label: "5시간" },
  { sec: 21600, label: "6시간" },
  { sec: 25200, label: "7시간" },
  { sec: 28800, label: "8시간" },
  { sec: 32400, label: "9시간" },
  { sec: 36000, label: "10시간" },
];

export function durationLabel(sec: number): string {
  const found = auctionDurationOptions.find((d) => d.sec === sec);
  if (found) return found.label;
  if (sec >= 3600) {
    const h = sec / 3600;
    return Number.isInteger(h) ? `${h}시간` : `${(h).toFixed(1)}시간`;
  }
  return `${Math.round(sec / 60)}분`;
}

// 최소 입찰 단위 자동 추천: 시작가의 약 3% (2~5% 범위)를 보기 좋은 단위로 반올림
export function recommendBidUnit(startPrice: number): number {
  if (!startPrice || startPrice <= 0) return 0;
  const raw = startPrice * 0.03;
  const mag = Math.pow(10, Math.max(2, Math.floor(Math.log10(raw))));
  return Math.max(100, Math.round(raw / mag) * mag);
}

// 닉네임 마스킹: 홍길동 → 홍*동, 두 글자 → 홍*, 영문/긴 닉네임 가운데 마스킹
export function maskNickname(name: string): string {
  if (!name) return "익명";
  if (name.length <= 1) return name + "*";
  if (name.length === 2) return name[0] + "*";
  const mid = "*".repeat(Math.min(name.length - 2, 3));
  return name[0] + mid + name[name.length - 1];
}

// YouTube URL → videoId 추출 (watch?v=, youtu.be/, /live/, /embed/ 지원)
export function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1) || null;
    if (u.hostname.includes("youtube.com")) {
      if (u.searchParams.get("v")) return u.searchParams.get("v");
      const m = u.pathname.match(/\/(live|embed|shorts)\/([\w-]+)/);
      if (m) return m[2];
    }
  } catch {
    /* noop */
  }
  return null;
}

export function detectPlatform(url: string): LivePlatform {
  return url.includes("instagram") ? "instagram" : "youtube";
}

export const auctionService = {
  // ================= 경매 상품 =================
  getItems(opts?: { sellerId?: string }): AuctionItem[] {
    let list = getState().auctionItems.slice();
    if (opts?.sellerId) list = list.filter((i) => i.sellerId === opts.sellerId);
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  getItem: (id: string): AuctionItem | undefined =>
    getState().auctionItems.find((i) => i.id === id),

  addItem(input: {
    sellerId: string;
    name: string;
    description: string;
    categoryId: string;
    startPrice: number;
    bidUnit: number;
    buyNowPrice: number | null;
    condition?: AuctionItemCondition;
    images?: string[];
    thumbIndex?: number;
    components?: string;
    durationSec?: number;
    shippingFee?: number;
    shippingMethod?: string;
    shipLeadTime?: string;
    hasCertificate?: boolean;
    isUnopened?: boolean;
  }): AuctionItem {
    const item: AuctionItem = {
      id: uid("ai"),
      sellerId: input.sellerId,
      name: input.name,
      description: input.description,
      categoryId: input.categoryId,
      image: uid("au"),
      startPrice: input.startPrice,
      bidUnit: input.bidUnit,
      buyNowPrice: input.buyNowPrice,
      status: "waiting",
      suspended: false,
      currentPrice: input.startPrice,
      winnerName: null,
      finalPrice: null,
      createdAt: new Date().toISOString(),
      condition: input.condition,
      images: input.images,
      thumbIndex: input.thumbIndex,
      components: input.components,
      durationSec: input.durationSec,
      shippingFee: input.shippingFee,
      shippingMethod: input.shippingMethod,
      shipLeadTime: input.shipLeadTime,
      hasCertificate: input.hasCertificate,
      isUnopened: input.isUnopened,
    };
    update((s) => s.auctionItems.unshift(item));
    return item;
  },

  // 상품 수정 (판매자)
  updateItem(
    itemId: string,
    patch: Partial<
      Pick<
        AuctionItem,
        | "name"
        | "description"
        | "categoryId"
        | "startPrice"
        | "bidUnit"
        | "buyNowPrice"
        | "condition"
        | "images"
        | "thumbIndex"
        | "components"
        | "durationSec"
        | "shippingFee"
        | "shippingMethod"
        | "shipLeadTime"
        | "hasCertificate"
        | "isUnopened"
      >
    >
  ) {
    update((s) => {
      const it = s.auctionItems.find((x) => x.id === itemId);
      if (!it) return;
      Object.assign(it, patch);
      // 대기중 상품은 시작가 변경 시 현재가도 동기화
      if (it.status === "waiting" && patch.startPrice !== undefined)
        it.currentPrice = patch.startPrice;
    });
  },

  // 상품 삭제 (판매자) — 예정 라이브의 상품 목록에서도 제거
  deleteItem(itemId: string) {
    update((s) => {
      s.auctionItems = s.auctionItems.filter((x) => x.id !== itemId);
      s.liveAuctions.forEach((l) => {
        if (l.status === "scheduled")
          l.itemIds = l.itemIds.filter((id) => id !== itemId);
      });
    });
  },

  // 상품 복제 (판매자) — 대기중 상태의 새 상품으로 복사
  duplicateItem(itemId: string): AuctionItem | undefined {
    const src = getState().auctionItems.find((x) => x.id === itemId);
    if (!src) return undefined;
    const copy: AuctionItem = {
      ...structuredClone(src),
      id: uid("ai"),
      name: `${src.name} (복제)`,
      status: "waiting",
      suspended: false,
      currentPrice: src.startPrice,
      winnerName: null,
      finalPrice: null,
      createdAt: new Date().toISOString(),
    };
    update((s) => s.auctionItems.unshift(copy));
    return copy;
  },

  // 관리자: 판매중지 토글
  setItemSuspended(itemId: string, suspended: boolean) {
    update((s) => {
      const it = s.auctionItems.find((x) => x.id === itemId);
      if (it) it.suspended = suspended;
    });
  },

  // ================= 라이브 방송 =================
  getLives(status?: LiveAuctionStatus): LiveAuction[] {
    let list = getState().liveAuctions.slice();
    if (status) list = list.filter((l) => l.status === status);
    return list.sort((a, b) =>
      a.status === "scheduled"
        ? a.scheduledAt.localeCompare(b.scheduledAt)
        : b.scheduledAt.localeCompare(a.scheduledAt)
    );
  },

  getLive: (id: string): LiveAuction | undefined =>
    getState().liveAuctions.find((l) => l.id === id),

  getLivesForSeller: (sellerId: string): LiveAuction[] =>
    getState()
      .liveAuctions.filter((l) => l.sellerId === sellerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),

  // 진행중 + 일시정지 라이브 (시청자 화면용)
  getOngoingLives(): LiveAuction[] {
    return getState()
      .liveAuctions.filter((l) => l.status === "live" || l.status === "paused")
      .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
  },

  createLive(input: {
    sellerId: string;
    title: string;
    videoUrl: string;
    itemIds: string[];
    scheduledAt: string;
    thumbnailUrl?: string;
    tags?: string[];
    expectedMinutes?: number;
    isPublic?: boolean;
    itemDurations?: Record<string, number>;
    couponIds?: string[];
    badges?: string[];
  }): LiveAuction {
    const live: LiveAuction = {
      id: uid("live"),
      sellerId: input.sellerId,
      title: input.title,
      platform: detectPlatform(input.videoUrl),
      videoUrl: input.videoUrl,
      itemIds: input.itemIds,
      currentItemIndex: 0,
      scheduledAt: input.scheduledAt,
      status: "scheduled",
      viewers: 0,
      createdAt: new Date().toISOString(),
      thumbnailUrl: input.thumbnailUrl,
      tags: input.tags,
      expectedMinutes: input.expectedMinutes,
      isPublic: input.isPublic ?? true,
      chatEnabled: true,
      chatFilterWords: [],
      pinnedNotice: "",
      itemDurations: input.itemDurations ?? {},
      couponIds: input.couponIds ?? [],
      badges: input.badges ?? [],
    };
    update((s) => s.liveAuctions.unshift(live));

    // 서버 동기화 (fire-and-forget) — 실패해도 로컬은 정상 동작
    {
      const relatedItems = getState().auctionItems.filter((i) =>
        live.itemIds.includes(i.id)
      );
      fetch("/api/live-sync/lives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ live, items: relatedItems }),
      }).catch(() => {});
    }

    return live;
  },

  // 방송 정보 수정 (링크/채팅/공지 등 인라인 편집)
  updateLive(
    liveId: string,
    patch: Partial<
      Pick<
        LiveAuction,
        | "title"
        | "videoUrl"
        | "thumbnailUrl"
        | "tags"
        | "expectedMinutes"
        | "isPublic"
        | "chatEnabled"
        | "chatFilterWords"
        | "pinnedNotice"
        | "scheduledAt"
      >
    >
  ) {
    update((s) => {
      const l = s.liveAuctions.find((x) => x.id === liveId);
      if (!l) return;
      Object.assign(l, patch);
      if (patch.videoUrl !== undefined) l.platform = detectPlatform(patch.videoUrl);
    });

    // 서버 동기화 (fire-and-forget)
    fetch(`/api/live-sync/lives/${liveId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).catch(() => {});
  },

  // 상품별 경매 시간 설정 (실시간 조정)
  setItemDuration(liveId: string, itemId: string, sec: number) {
    update((s) => {
      const l = s.liveAuctions.find((x) => x.id === liveId);
      if (!l) return;
      l.itemDurations = { ...(l.itemDurations ?? {}), [itemId]: sec };
    });
  },

  // 현재 진행 상품 변경 (순서 건너뛰기)
  jumpToItem(liveId: string, index: number) {
    update((s) => {
      const l = s.liveAuctions.find((x) => x.id === liveId);
      if (!l || index < 0 || index >= l.itemIds.length) return;
      const prev = s.auctionItems.find(
        (i) => i.id === l.itemIds[l.currentItemIndex]
      );
      if (prev && prev.status === "live") prev.status = "waiting";
      l.currentItemIndex = index;
      const next = s.auctionItems.find((i) => i.id === l.itemIds[index]);
      if (
        next &&
        next.status === "waiting" &&
        !next.suspended &&
        (l.status === "live" || l.status === "paused")
      ) {
        next.status = "live";
        // 경매 종료 시각 설정 (점프 시 리셋)
        const dur = l.itemDurations?.[next.id] ?? next.durationSec ?? DEFAULT_AUCTION_SEC;
        next.endTime = Date.now() + dur * 1000;
      }
    });

    // 서버 동기화 (fire-and-forget)
    {
      const s = getState();
      const updatedLive = s.liveAuctions.find((l) => l.id === liveId);
      if (updatedLive) {
        const relatedItems = s.auctionItems.filter((i) =>
          updatedLive.itemIds.includes(i.id)
        );
        fetch(`/api/live-sync/lives/${liveId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentItemIndex: updatedLive.currentItemIndex,
            items: relatedItems,
          }),
        }).catch(() => {});
      }
    }
  },

  // 긴급 상품 추가 (방송 중 새 상품 추가)
  addItemToLive(liveId: string, itemId: string) {
    update((s) => {
      const l = s.liveAuctions.find((x) => x.id === liveId);
      if (!l || l.itemIds.includes(itemId)) return;
      l.itemIds.push(itemId);
    });
  },

  // 방송 통계 (시청자/입찰/낙찰)
  getLiveStats(liveId: string) {
    const s = getState();
    const l = s.liveAuctions.find((x) => x.id === liveId);
    const items = (l?.itemIds ?? [])
      .map((id) => s.auctionItems.find((i) => i.id === id))
      .filter((i): i is AuctionItem => !!i);
    const sold = items.filter((i) => i.status === "sold");
    const failed = items.filter((i) => i.status === "failed");
    return {
      viewers: l?.viewers ?? 0,
      totalBids: s.auctionBids.filter((b) => b.liveId === liveId).length,
      soldCount: sold.length,
      failedCount: failed.length,
      itemCount: items.length,
      totalAmount: sold.reduce((sum, i) => sum + (i.finalPrice ?? 0), 0),
      // 낙찰률: 결과가 나온 상품 기준
      soldRate:
        sold.length + failed.length > 0
          ? Math.round((sold.length / (sold.length + failed.length)) * 100)
          : 0,
    };
  },

  // 라이브 시작/일시정지/재개/종료
  setLiveStatus(liveId: string, status: LiveAuctionStatus) {
    update((s) => {
      const l = s.liveAuctions.find((x) => x.id === liveId);
      if (!l) return;
      l.status = status;
      if (status === "live") {
        if (l.viewers === 0) l.viewers = 30 + Math.floor(Math.random() * 200);
        const cur = s.auctionItems.find(
          (i) => i.id === l.itemIds[l.currentItemIndex]
        );
        if (cur && cur.status === "waiting") {
          cur.status = "live";
          // 경매 종료 시각 설정 (서버 기준 — 크로스브라우저 타이머 동기화)
          const dur = l.itemDurations?.[cur.id] ?? cur.durationSec ?? DEFAULT_AUCTION_SEC;
          cur.endTime = Date.now() + dur * 1000;
        }
      }
      if (status === "ended") {
        // 진행되지 못한 상품은 유찰 처리
        l.itemIds.forEach((id) => {
          const it = s.auctionItems.find((i) => i.id === id);
          if (it && (it.status === "waiting" || it.status === "live"))
            it.status = "failed";
        });
        l.viewers = 0;
      }
    });

    // 서버 동기화 (fire-and-forget)
    if (status === "ended") {
      fetch(`/api/live-sync/lives/${liveId}`, {
        method: "DELETE",
      }).catch(() => {});
      // YouTube 폴링 중지
      fetch(`/api/live-sync/yt-chat`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liveId }),
      }).catch(() => {});
    } else {
      const s = getState();
      const updatedLive = s.liveAuctions.find((l) => l.id === liveId);
      if (updatedLive) {
        const relatedItems = s.auctionItems.filter((i) =>
          updatedLive.itemIds.includes(i.id)
        );
        // 전체 live 데이터 포함 → 서버 재시작 후에도 upsert 가능
        fetch(`/api/live-sync/lives/${liveId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...updatedLive,
            items: relatedItems,
          }),
        }).catch(() => {});

        // YouTube 채팅 서버 폴링 시작 (라이브 시작 시)
        if (status === "live" && updatedLive.videoUrl) {
          const videoId = extractYouTubeId(updatedLive.videoUrl);
          const apiKey = s.sellerYoutubeApiKeys?.[updatedLive.sellerId] ?? "";
          console.log("[YT-CHAT] setLiveStatus 폴링 시작:", {
            liveId,
            videoId: videoId ?? "없음 (YouTube URL 아님)",
            apiKey: apiKey ? "있음" : "없음 (설정 탭에서 저장 필요)",
          });
          if (videoId && apiKey) {
            fetch(`/api/live-sync/yt-chat`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ liveId, videoId, apiKey }),
            })
              .then((r) => r.json())
              .then((d) => console.log("[YT-CHAT] 서버 폴링 응답:", d))
              .catch((err) => console.error("[YT-CHAT] 폴링 시작 오류:", err));
          }
        }
      }
    }
  },

  // 상품 순서 이동 (위/아래)
  moveLiveItem(liveId: string, index: number, dir: -1 | 1) {
    update((s) => {
      const l = s.liveAuctions.find((x) => x.id === liveId);
      if (!l) return;
      const to = index + dir;
      if (to < 0 || to >= l.itemIds.length) return;
      const arr = l.itemIds;
      [arr[index], arr[to]] = [arr[to], arr[index]];
    });
  },

  // 지난 라이브 삭제 (클라이언트 store + 서버 파일 동기화)
  deleteLive(liveId: string) {
    update((s) => {
      s.liveAuctions = s.liveAuctions.filter((l) => l.id !== liveId);
    });
    // 서버 동기화 (fire-and-forget)
    fetch(`/api/live-sync/lives/${liveId}`, {
      method: "DELETE",
    }).catch(() => {});
  },


  // ================= 입찰 / 낙찰 =================

  // 특정 상품의 입찰 기록 조회
  getBidsForItem(itemId: string): AuctionBid[] {
    return getState().auctionBids.filter((b) => b.itemId === itemId);
  },

  placeBid(liveId: string, itemId: string, user: { id: string; nickname: string }, price: number) {
    update((s) => {
      const item = s.auctionItems.find((x) => x.id === itemId);
      if (!item) return;
      if (price > item.currentPrice) item.currentPrice = price;
      const bid: import("@/types").AuctionBid = {
        id: uid("bid"),
        liveId,
        itemId,
        userId: user.id,
        bidderName: user.nickname,
        price,
        createdAt: new Date().toISOString(),
      };
      s.auctionBids.push(bid);
    });
    const s = getState();
    const bid = [...s.auctionBids].reverse().find((b) => b.itemId === itemId && b.userId === user.id);
    if (bid) {
      fetch("/api/live-sync/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bid),
      }).catch(() => {});
    }
  },

  buyNow(liveId: string, itemId: string, user: { id: string; nickname: string }) {
    update((s) => {
      const item = s.auctionItems.find((x) => x.id === itemId);
      if (!item || item.buyNowPrice === null) return;
      item.status = "sold";
      item.winnerName = user.nickname;
      item.finalPrice = item.buyNowPrice;
      item.currentPrice = item.buyNowPrice;
      const bid: import("@/types").AuctionBid = {
        id: uid("bid"),
        liveId,
        itemId,
        userId: user.id,
        bidderName: user.nickname,
        price: item.buyNowPrice,
        createdAt: new Date().toISOString(),
      };
      s.auctionBids.push(bid);
      const now = Date.now();
      const settlement: import("@/types").Settlement = {
        id: `s-${now}-${Math.random().toString(36).slice(2, 8)}`,
        orderId: bid.id,
        itemId: item.id,
        itemName: item.name,
        sellerId: item.sellerId,
        buyerId: user.id,
        salePrice: item.buyNowPrice,
        platformFee: Math.round(item.buyNowPrice * 0.11),
        settlementAmount: Math.round(item.buyNowPrice * 0.89),
        status: "pending_payment",
        awardedAt: now,
        paymentDeadline: now + 24 * 60 * 60 * 1000,
      };
      s.settlements.push(settlement);
      const l = s.liveAuctions.find((x) => x.id === liveId);
      if (l) {
        const nextIndex = l.currentItemIndex + 1;
        if (nextIndex < l.itemIds.length) {
          l.currentItemIndex = nextIndex;
          const nextItem = s.auctionItems.find((i) => i.id === l.itemIds[nextIndex]);
          if (nextItem && nextItem.status === "waiting" && !nextItem.suspended) {
            nextItem.status = "live";
            // 다음 상품 경매 종료 시각 설정 (즉시 낙찰 후 다음 상품)
            const dur = l.itemDurations?.[nextItem.id] ?? nextItem.durationSec ?? DEFAULT_AUCTION_SEC;
            nextItem.endTime = Date.now() + dur * 1000;
          }
        }
      }
    });
    const s = getState();
    const bid = [...s.auctionBids].reverse().find((b) => b.itemId === itemId && b.userId === user.id);
    if (bid) {
      fetch("/api/live-sync/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bid),
      }).catch(() => {});
    }
    const settlement = [...s.settlements].reverse().find((sv) => sv.itemId === itemId);
    if (settlement) {
      fetch("/api/settlement/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settlement),
      }).catch(() => {});
    }
  },

  finalizeCurrentItem(liveId: string, winner: { name: string; price: number } | null) {
    update((s) => {
      const l = s.liveAuctions.find((x) => x.id === liveId);
      if (!l) return;
      const item = s.auctionItems.find((i) => i.id === l.itemIds[l.currentItemIndex]);
      if (!item) return;
      if (winner) {
        item.status = "sold";
        item.winnerName = winner.name;
        item.finalPrice = winner.price;
        const winnerBid = [...s.auctionBids]
          .filter((b) => b.itemId === item.id && b.price === winner.price)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
        if (winnerBid?.userId) {
          const now = Date.now();
          const settlement: import("@/types").Settlement = {
            id: `s-${now}-${Math.random().toString(36).slice(2, 8)}`,
            orderId: winnerBid.id,
            itemId: item.id,
            itemName: item.name,
            sellerId: item.sellerId,
            buyerId: winnerBid.userId,
            salePrice: winner.price,
            platformFee: Math.round(winner.price * 0.11),
            settlementAmount: Math.round(winner.price * 0.89),
            status: "pending_payment",
            awardedAt: now,
            paymentDeadline: now + 24 * 60 * 60 * 1000,
          };
          s.settlements.push(settlement);
        }
      } else {
        item.status = "failed";
      }
      const nextIndex = l.currentItemIndex + 1;
      if (nextIndex < l.itemIds.length) {
        l.currentItemIndex = nextIndex;
        const nextItem = s.auctionItems.find((i) => i.id === l.itemIds[nextIndex]);
        if (nextItem && nextItem.status === "waiting" && !nextItem.suspended) {
          nextItem.status = "live";
          // 다음 상품 경매 종료 시각 설정 (크로스브라우저 타이머 동기화)
          const dur = l.itemDurations?.[nextItem.id] ?? nextItem.durationSec ?? DEFAULT_AUCTION_SEC;
          nextItem.endTime = Date.now() + dur * 1000;
        }
      }
    });
    // 서버 동기화: live 상태 + items (endTime 포함) broadcast
    {
      const s2 = getState();
      const updatedLive = s2.liveAuctions.find((x) => x.id === liveId);
      if (updatedLive) {
        const relatedItems = s2.auctionItems.filter((i) => updatedLive.itemIds.includes(i.id));
        fetch(`/api/live-sync/lives/${liveId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ currentItemIndex: updatedLive.currentItemIndex, items: relatedItems }),
        }).catch(() => {});
      }
    }
    if (winner) {
      const s = getState();
      const settlement = [...s.settlements].reverse().find((sv) => {
        const l = s.liveAuctions.find((x) => x.id === liveId);
        return l && l.itemIds.includes(sv.itemId);
      });
      if (settlement) {
        fetch("/api/settlement/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settlement),
        }).catch(() => {});
      }
    }
  },

  // 현재 상품만 낙찰/유찰 처리 (인덱스 자동 이동 없음 — 판매자가 수동으로 다음 상품으로 이동)
  finalizeCurrentItemOnly(liveId: string, winner: { name: string; price: number } | null) {
    update((s) => {
      const l = s.liveAuctions.find((x) => x.id === liveId);
      if (!l) return;
      const item = s.auctionItems.find((i) => i.id === l.itemIds[l.currentItemIndex]);
      if (!item) return;
      if (winner) {
        item.status = "sold";
        item.winnerName = winner.name;
        item.finalPrice = winner.price;
        const winnerBid = [...s.auctionBids]
          .filter((b) => b.itemId === item.id && b.price === winner.price)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
        if (winnerBid?.userId) {
          const now = Date.now();
          const settlement: import("@/types").Settlement = {
            id: `s-${now}-${Math.random().toString(36).slice(2, 8)}`,
            orderId: winnerBid.id,
            itemId: item.id,
            itemName: item.name,
            sellerId: item.sellerId,
            buyerId: winnerBid.userId,
            salePrice: winner.price,
            platformFee: Math.round(winner.price * 0.11),
            settlementAmount: Math.round(winner.price * 0.89),
            status: "pending_payment",
            awardedAt: now,
            paymentDeadline: now + 24 * 60 * 60 * 1000,
          };
          s.settlements.push(settlement);
        }
      } else {
        item.status = "failed";
      }
      // 인덱스 자동 이동 없음 — 판매자가 다음 상품 버튼으로 수동 이동
    });
    // 서버 동기화: 현재 상품의 새 상태만 broadcast
    {
      const s2 = getState();
      const updatedLive = s2.liveAuctions.find((x) => x.id === liveId);
      if (updatedLive) {
        const currentItem = s2.auctionItems.find(
          (i) => i.id === updatedLive.itemIds[updatedLive.currentItemIndex]
        );
        if (currentItem) {
          fetch(`/api/live-sync/lives/${liveId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: [currentItem] }),
          }).catch(() => {});
        }
      }
    }
    if (winner) {
      const s = getState();
      const settlement = [...s.settlements].reverse().find((sv) => {
        const l = s.liveAuctions.find((x) => x.id === liveId);
        return l && l.itemIds.includes(sv.itemId);
      });
      if (settlement) {
        fetch("/api/settlement/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settlement),
        }).catch(() => {});
      }
    }
  },

  // 사용자의 경매 참여 내역 (입찰 기록 + 결과)
  getParticipationsForUser(userId: string) {
    const s = getState();
    const myBids = s.auctionBids.filter((b) => b.userId === userId);
    const itemIds = [...new Set(myBids.map((b) => b.itemId))];
    return itemIds
      .map((itemId) => {
        const item = s.auctionItems.find((i) => i.id === itemId);
        const itemBids = myBids.filter((b) => b.itemId === itemId);
        const bid = [...itemBids].sort((a, b) => b.price - a.price)[0];
        if (!bid) return null;
        const live = s.liveAuctions.find((l) => l.itemIds.includes(itemId));
        let result: "won" | "lost" | "failed" | "ongoing";
        if (item?.status === "sold") {
          result = item.winnerName === bid.bidderName ? "won" : "lost";
        } else if (item?.status === "failed") {
          result = "failed";
        } else {
          result = "ongoing";
        }
        return { bid, item, live, result };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);
  },

  // ================= SSE 크로스브라우저 동기화 =================

  // SSE init/live_update/bid 이벤트로 받은 서버 데이터를 로컬 store에 병합
  applyServerSync(data: {
    lives?: LiveAuction[];
    items?: AuctionItem[];
    bids?: AuctionBid[];
  }) {
    update((s) => {
      data.lives?.forEach((l) => {
        const idx = s.liveAuctions.findIndex((x) => x.id === l.id);
        if (idx >= 0) {
          s.liveAuctions[idx] = { ...s.liveAuctions[idx], ...l };
        } else if (l.sellerId && l.title) {
          s.liveAuctions.unshift(l);
        }
      });
      data.items?.forEach((item) => {
        const idx = s.auctionItems.findIndex((x) => x.id === item.id);
        if (idx >= 0) {
          s.auctionItems[idx] = item;
        } else {
          s.auctionItems.unshift(item);
        }
      });
      data.bids?.forEach((bid) => {
        if (!s.auctionBids.find((b) => b.id === bid.id)) {
          s.auctionBids.push(bid);
        }
      });
    });
  },

  // live_ended SSE 이벤트로 라이브 종료 상태 반영
  applyLiveEnded(liveId: string) {
    update((s) => {
      const l = s.liveAuctions.find((x) => x.id === liveId);
      if (l) l.status = "ended";
    });
  },
};
