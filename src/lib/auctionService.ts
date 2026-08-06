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
import { authHeaders, jsonAuthHeaders } from "./apiClient";

/**
 * 실제 낙찰자 판정용 최고 입찰 선택.
 * - 봇(시뮬레이션) 입찰은 userId가 null이므로 제외 — 표시용일 뿐 낙찰 대상이 아니다.
 * - 동가일 경우 먼저 입찰한 사람(createdAt이 빠른 쪽)이 우선한다.
 */
export function pickWinningBid(bids: AuctionBid[], itemId: string): AuctionBid | null {
  return bids
    .filter((b) => b.itemId === itemId && !!b.userId)
    .reduce<AuctionBid | null>((top, b) => {
      if (!top) return b;
      if (b.price > top.price) return b;
      // 동가 → 먼저 입찰한 쪽 우선
      if (b.price === top.price && b.createdAt < top.createdAt) return b;
      return top;
    }, null);
}

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

  async createLive(input: {
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
  }): Promise<LiveAuction> {
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
    const relatedItems = getState().auctionItems.filter((item) => live.itemIds.includes(item.id));
    const response = await fetch("/api/live-sync/lives", {
      method: "POST",
      headers: jsonAuthHeaders(),
      body: JSON.stringify({ live, items: relatedItems }),
    });
    const data = await response.json().catch(() => ({})) as {
      live?: LiveAuction;
      items?: AuctionItem[];
      error?: string;
    };
    if (!response.ok || !data.live) {
      throw new Error(data.error ?? "라이브 경매를 생성할 수 없습니다.");
    }
    this.applyServerSync({ lives: [data.live], items: data.items ?? [], bids: [] });
    return data.live;
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
      headers: jsonAuthHeaders(),
      body: JSON.stringify(patch),
    }).catch(() => {});
  },

  // 상품별 경매 시간 설정 (실시간 조정)
  async setItemDuration(liveId: string, itemId: string, sec: number) {
    update((s) => {
      const l = s.liveAuctions.find((x) => x.id === liveId);
      if (!l) return;
      l.itemDurations = { ...(l.itemDurations ?? {}), [itemId]: sec };
    });
    const live = getState().liveAuctions.find((candidate) => candidate.id === liveId);
    if (live) {
      const response = await fetch(`/api/live-sync/lives/${liveId}`, {
        method: "PATCH",
        headers: jsonAuthHeaders(),
        body: JSON.stringify({ itemDurations: live.itemDurations }),
      });
      return response.ok;
    }
    return false;
  },

  // 현재 진행 상품 변경 (순서 건너뛰기)
  async jumpToItem(liveId: string, index: number): Promise<boolean> {
    try {
      const response = await fetch(`/api/live-sync/lives/${liveId}/jump`, {
        method: "POST",
        headers: jsonAuthHeaders(),
        body: JSON.stringify({ index }),
      });
      const data = await response.json();
      if (!response.ok) return false;
      const live = data.live as LiveAuction;
      const items = live.itemIds.map((id) => data.item?.id === id ? data.item : getState().auctionItems.find((item) => item.id === id)).filter(Boolean) as AuctionItem[];
      this.applyServerSync({ lives: [live], items, bids: [] });
      return true;
    } catch {
      return false;
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
  async setLiveStatus(liveId: string, status: LiveAuctionStatus): Promise<boolean> {
    try {
      const response = await fetch(`/api/live-sync/lives/${liveId}/status`, {
        method: "POST",
        headers: jsonAuthHeaders(),
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) return false;
      this.applyServerSync({ lives: [data.live], items: data.item ? [data.item] : [], bids: [] });
      if (status === "ended") {
        void fetch("/api/live-sync/yt-chat", {
          method: "DELETE",
          headers: jsonAuthHeaders(),
          body: JSON.stringify({ liveId }),
        });
      }
      return true;
    } catch {
      return false;
    }
  },

  // 상품 순서 이동 (위/아래)
  async moveLiveItem(liveId: string, index: number, dir: -1 | 1): Promise<boolean> {
    let nextOrder: string[] | null = null;
    update((s) => {
      const l = s.liveAuctions.find((x) => x.id === liveId);
      if (!l) return;
      const to = index + dir;
      if (to < 0 || to >= l.itemIds.length) return;
      const arr = l.itemIds;
      [arr[index], arr[to]] = [arr[to], arr[index]];
      nextOrder = [...arr];
    });
    if (!nextOrder) return false;
    try {
      const response = await fetch(`/api/live-sync/lives/${liveId}`, {
        method: "PATCH",
        headers: jsonAuthHeaders(),
        body: JSON.stringify({ itemIds: nextOrder }),
      });
      return response.ok;
    } catch {
      return false;
    }
  },

  // 지난 라이브 삭제 (클라이언트 store + 서버 파일 동기화)
  // 서버 삭제 실패 시 로컬 삭제를 롤백해 SSE 재접속 시 부활/불일치를 막는다.
  async deleteLive(liveId: string): Promise<{ ok: boolean; error?: string }> {
    const before = getState().liveAuctions;
    const removedIndex = before.findIndex((l) => l.id === liveId);
    const removed = removedIndex >= 0 ? before[removedIndex] : undefined;
    update((s) => {
      s.liveAuctions = s.liveAuctions.filter((l) => l.id !== liveId);
    });
    const rollback = () => {
      if (!removed) return;
      update((s) => {
        if (!s.liveAuctions.some((l) => l.id === liveId)) {
          const at = Math.min(Math.max(removedIndex, 0), s.liveAuctions.length);
          s.liveAuctions.splice(at, 0, removed);
        }
      });
    };
    try {
      const response = await fetch(`/api/live-sync/lives/${liveId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        rollback();
        return { ok: false, error: data.error ?? "라이브를 삭제할 수 없습니다." };
      }
      return { ok: true };
    } catch {
      rollback();
      return { ok: false, error: "네트워크 오류로 라이브를 삭제하지 못했습니다." };
    }
  },


  // ================= 입찰 / 낙찰 =================

  // 특정 상품의 입찰 기록 조회
  getBidsForItem(itemId: string): AuctionBid[] {
    return getState().auctionBids.filter((b) => b.itemId === itemId);
  },

  async placeBid(liveId: string, itemId: string, _user: { id: string; nickname: string }, price: number) {
    return this.submitBid(liveId, itemId, "bid", price);
  },

  async buyNow(liveId: string, itemId: string, _user: { id: string; nickname: string }) {
    return this.submitBid(liveId, itemId, "buy_now");
  },

  async submitBid(liveId: string, itemId: string, action: "bid" | "buy_now", amount?: number) {
    try {
      const response = await fetch("/api/live-sync/bids", {
        method: "POST",
        headers: jsonAuthHeaders(),
        body: JSON.stringify({
          liveId,
          itemId,
          action,
          amount,
          idempotencyKey: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        }),
      });
      const data = await response.json();
      if (!response.ok) return { ok: false, error: data.error as string };
      this.applyServerSync({
        lives: data.live ? [data.live] : [],
        items: data.item ? [data.item] : [],
        bids: data.bid ? [data.bid] : [],
      });
      if (data.settlement) {
        update((state) => {
          if (!state.settlements.some((settlement) => settlement.id === data.settlement.id)) state.settlements.push(data.settlement);
        });
      }
      return { ok: true, ...data };
    } catch {
      return { ok: false, error: "네트워크 오류로 요청을 처리하지 못했습니다." };
    }
  },

  async finalizeCurrentItem(liveId: string, sold: boolean, opts?: { advanceToNext?: boolean }) {
    try {
      const response = await fetch(`/api/live-sync/lives/${liveId}/finalize`, {
        method: "POST",
        headers: jsonAuthHeaders(),
        body: JSON.stringify({ sold, advance: opts?.advanceToNext === true }),
      });
      const data = await response.json();
      if (!response.ok) return { winnerBid: null, item: null, error: data.error as string };
      this.applyServerSync({
        lives: data.live ? [data.live] : [],
        items: [data.item, data.nextItem].filter(Boolean),
        bids: data.winnerBid ? [data.winnerBid] : [],
      });
      if (data.settlement) {
        update((state) => {
          if (!state.settlements.some((settlement) => settlement.id === data.settlement.id)) state.settlements.push(data.settlement);
        });
      }
      return { winnerBid: data.winnerBid as AuctionBid | null, item: data.item as AuctionItem | null };
    } catch {
      return { winnerBid: null, item: null, error: "네트워크 오류" };
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
