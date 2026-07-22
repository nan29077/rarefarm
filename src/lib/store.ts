"use client";

// localStorage 기반 mock 데이터 스토어 (경량 pub/sub)
import type {
  User,
  Product,
  Bid,
  Ask,
  Order,
  Trade,
  CommunityPost,
  Comment,
  Report,
  Notification,
  AuctionItem,
  LiveAuction,
  AuctionBid,
  LiveCoupon,
  UserLiveCoupon,
  SellerRequest,
  Banner,
  Settlement,
} from "@/types";
import * as seed from "./mockData";
import { getCharacterAvatar } from "./avatarUtils";

export interface AppState {
  users: User[];
  products: Product[];
  bids: Bid[];
  asks: Ask[];
  orders: Order[];
  trades: Trade[];
  posts: CommunityPost[];
  comments: Comment[];
  reports: Report[];
  notifications: Notification[];
  likedPosts: Record<string, string[]>;
  bookmarkedPosts: Record<string, string[]>;
  watchedProducts: Record<string, string[]>;
  auctionItems: AuctionItem[];
  liveAuctions: LiveAuction[];
  auctionBids: AuctionBid[];
  liveCoupons: LiveCoupon[];
  userLiveCoupons: UserLiveCoupon[];
  sellerYoutubeApiKeys: Record<string, string>;
  sellerRequests: SellerRequest[];
  banners: Banner[];
  // 정산 시스템
  settlements: Settlement[];
}

const STORAGE_KEY = "rarefarm:v1";

function initialState(): AppState {
  return {
    users: structuredClone(seed.users),
    products: structuredClone(seed.products),
    bids: structuredClone(seed.bids),
    asks: structuredClone(seed.asks),
    orders: structuredClone(seed.orders),
    trades: structuredClone(seed.trades),
    posts: structuredClone(seed.posts),
    comments: structuredClone(seed.comments),
    reports: structuredClone(seed.reports),
    notifications: structuredClone(seed.notifications),
    likedPosts: { "u-user": ["post2"] },
    bookmarkedPosts: { "u-user": ["post3"] },
    watchedProducts: { "u-user": ["p1", "p4"], "u-buyer": ["p2", "p5"] },
    auctionItems: structuredClone(seed.auctionItems),
    liveAuctions: structuredClone(seed.liveAuctions),
    auctionBids: structuredClone(seed.auctionBids),
    liveCoupons: structuredClone(seed.liveCoupons),
    userLiveCoupons: structuredClone(seed.userLiveCoupons),
    sellerYoutubeApiKeys: {},
    sellerRequests: structuredClone(seed.sellerRequests),
    banners: structuredClone(seed.banners),
    settlements: [],
  };
}

let state: AppState | null = null;
let version = 0;
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue !== null) {
      try {
        state = { ...initialState(), ...JSON.parse(e.newValue) };
        version++;
        listeners.forEach((l) => l());
      } catch {
        /* noop */
      }
    }
  });
}

export function getVersion(): number {
  return version;
}

function load(): AppState {
  if (typeof window === "undefined") return initialState();
  if (state) return state;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const loaded = JSON.parse(raw);
      if (loaded.users) {
        loaded.users = loaded.users.map((u: User) => {
          if (!u.avatar || !u.avatar.startsWith("/")) {
            return { ...u, avatar: getCharacterAvatar(u.id) };
          }
          return u;
        });
      }
      state = { ...initialState(), ...loaded };
    } else {
      state = initialState();
      persist();
    }
  } catch {
    state = initialState();
  }
  return state!;
}

function persist() {
  if (typeof window === "undefined" || !state) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* noop */
  }
}

export function getState(): AppState {
  return load();
}

export function update(mutator: (s: AppState) => void) {
  const s = load();
  mutator(s);
  version++;
  persist();
  listeners.forEach((l) => l());
}

export function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function uid(prefix = "x") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function resetStore() {
  state = initialState();
  version++;
  persist();
  listeners.forEach((l) => l());
}

export function togglePickSeller(userId: string, sellerId: string) {
  update((s) => {
    const u = s.users.find((x) => x.id === userId);
    if (!u) return;
    if (!u.pickedSellers) u.pickedSellers = [];
    const idx = u.pickedSellers.indexOf(sellerId);
    if (idx >= 0) u.pickedSellers.splice(idx, 1);
    else u.pickedSellers.push(sellerId);
  });
}
