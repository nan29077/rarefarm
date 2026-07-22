"use client";

// 마켓/거래 service layer (mock). 실제 API 연동 시 내부 구현만 교체.
import type { Product, Bid, Ask, Order, Trade, User } from "@/types";
import { categories } from "./mockData";
import { getState, update, uid } from "./store";

export type SortKey =
  | "popular"
  | "recent"
  | "price-asc"
  | "price-desc"
  | "trades";

export const sortOptions: { key: SortKey; label: string }[] = [
  { key: "popular", label: "인기순" },
  { key: "recent", label: "최근 등록순" },
  { key: "price-asc", label: "낮은 가격순" },
  { key: "price-desc", label: "높은 가격순" },
  { key: "trades", label: "거래 많은 순" },
];

export const marketService = {
  categories,
  getCategory: (id: string) => categories.find((c) => c.id === id),

  getUser: (id: string): User | undefined =>
    getState().users.find((u) => u.id === id),

  getProducts(opts?: {
    categoryId?: string;
    search?: string;
    sort?: SortKey;
    includeHidden?: boolean;
  }): Product[] {
    let list = getState().products.slice();
    if (!opts?.includeHidden) list = list.filter((p) => p.status === "visible");
    if (opts?.categoryId)
      list = list.filter((p) => p.categoryId === opts.categoryId);
    if (opts?.search) {
      const q = opts.search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q)
      );
    }
    switch (opts?.sort) {
      case "recent":
        list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        break;
      case "price-asc":
        list.sort((a, b) => (a.lowestAsk ?? 1e15) - (b.lowestAsk ?? 1e15));
        break;
      case "price-desc":
        list.sort((a, b) => (b.lowestAsk ?? 0) - (a.lowestAsk ?? 0));
        break;
      case "trades":
        list.sort((a, b) => b.tradeCount - a.tradeCount);
        break;
      default:
        list.sort((a, b) => b.likeCount - a.likeCount);
    }
    return list;
  },

  getProduct: (id: string) =>
    getState().products.find((p) => p.id === id),

  getBidsForProduct: (productId: string): Bid[] =>
    getState()
      .bids.filter((b) => b.productId === productId && b.status === "open")
      .sort((a, b) => b.price - a.price),

  getAsksForProduct: (productId: string): Ask[] =>
    getState()
      .asks.filter((a) => a.productId === productId && a.status === "open")
      .sort((a, b) => a.price - b.price),

  getTradesForProduct: (productId: string): Trade[] =>
    getState()
      .trades.filter((t) => t.productId === productId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),

  // 구매입찰 등록
  placeBid(productId: string, userId: string, price: number, expirationDays: number) {
    const bid: Bid = {
      id: uid("b"),
      productId,
      userId,
      price,
      expirationDays,
      createdAt: new Date().toISOString(),
      status: "open",
    };
    update((s) => {
      s.bids.push(bid);
      const p = s.products.find((x) => x.id === productId);
      if (p && (p.highestBid === null || price > p.highestBid))
        p.highestBid = price;
    });
    return bid;
  },

  // 판매입찰 등록
  placeAsk(productId: string, userId: string, price: number, expirationDays: number) {
    const ask: Ask = {
      id: uid("a"),
      productId,
      userId,
      price,
      expirationDays,
      createdAt: new Date().toISOString(),
      status: "open",
    };
    update((s) => {
      s.asks.push(ask);
      const p = s.products.find((x) => x.id === productId);
      if (p && (p.lowestAsk === null || price < p.lowestAsk))
        p.lowestAsk = price;
    });
    return ask;
  },

  // 즉시구매: 최저 판매가로 주문 생성
  instantBuy(productId: string, userId: string): Order {
    const p = getState().products.find((x) => x.id === productId)!;
    const order: Order = {
      id: uid("o"),
      productId,
      userId,
      side: "buy",
      price: p.lowestAsk ?? p.lastTradePrice ?? 0,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    update((s) => s.orders.push(order));
    return order;
  },

  // 즉시판매: 최고 구매입찰가로 주문 생성
  instantSell(productId: string, userId: string): Order {
    const p = getState().products.find((x) => x.id === productId)!;
    const order: Order = {
      id: uid("o"),
      productId,
      userId,
      side: "sell",
      price: p.highestBid ?? p.lastTradePrice ?? 0,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    update((s) => s.orders.push(order));
    return order;
  },

  // 관심 상품
  isWatched: (userId: string, productId: string) =>
    (getState().watchedProducts[userId] ?? []).includes(productId),

  toggleWatch(userId: string, productId: string): boolean {
    let now = false;
    update((s) => {
      const list = s.watchedProducts[userId] ?? [];
      const p = s.products.find((x) => x.id === productId);
      if (list.includes(productId)) {
        s.watchedProducts[userId] = list.filter((id) => id !== productId);
        if (p) p.likeCount = Math.max(0, p.likeCount - 1);
      } else {
        s.watchedProducts[userId] = [...list, productId];
        if (p) p.likeCount += 1;
        now = true;
      }
    });
    return now;
  },

  getWatchlist: (userId: string): Product[] => {
    const ids = getState().watchedProducts[userId] ?? [];
    return getState().products.filter((p) => ids.includes(p.id));
  },

  getOrdersForUser: (userId: string): Order[] =>
    getState()
      .orders.filter((o) => o.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),

  getBidsForUser: (userId: string): Bid[] =>
    getState().bids.filter((b) => b.userId === userId),

  getAsksForUser: (userId: string): Ask[] =>
    getState().asks.filter((a) => a.userId === userId),

  // 판매 등록 (새 상품 mock)
  addProduct(input: {
    name: string;
    categoryId: string;
    brand: string;
    condition: Product["condition"];
    price: number;
    description: string;
    sellerId: string;
  }): Product {
    const cat = categories.find((c) => c.id === input.categoryId);
    const product: Product = {
      id: uid("p"),
      name: input.name,
      categoryId: input.categoryId,
      brand: input.brand || "미상",
      condition: input.condition,
      images: [uid("img"), uid("img")],
      description: input.description,
      sellerId: input.sellerId,
      status: "visible",
      lastTradePrice: null,
      lowestAsk: input.price,
      highestBid: null,
      likeCount: 0,
      tradeCount: 0,
      createdAt: new Date().toISOString(),
      adultOnly: cat?.adultOnly,
    };
    update((s) => {
      s.products.unshift(product);
      s.asks.push({
        id: uid("a"),
        productId: product.id,
        userId: input.sellerId,
        price: input.price,
        expirationDays: 30,
        createdAt: new Date().toISOString(),
        status: "open",
      });
    });
    return product;
  },

  // ---- 관리자용 ----
  setProductStatus(productId: string, status: Product["status"]) {
    update((s) => {
      const p = s.products.find((x) => x.id === productId);
      if (p) p.status = status;
    });
  },
};
