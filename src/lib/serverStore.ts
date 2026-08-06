import fs from "fs";
import path from "path";
import crypto from "crypto";
import type { AuctionItem, AuctionBid, LiveAuction, Settlement } from "@/types";

const DATA_DIR = path.join(process.cwd(), ".live-data");
const LIVES_FILE = path.join(DATA_DIR, "lives.json");
const ITEMS_FILE = path.join(DATA_DIR, "items.json");
const BIDS_FILE = path.join(DATA_DIR, "bids.json");
const CHATS_FILE = path.join(DATA_DIR, "chats.json");
const SETTLEMENTS_FILE = path.join(DATA_DIR, "settlements.json");

export interface ChatMessage {
  id: string | number;
  name: string;
  text: string;
  source?: "app" | "youtube";
  // ---- YouTube 라이브 채팅 연동 (선택) ----
  isYoutube?: boolean; // YouTube에서 가져온 메시지 여부 (채팅 UI의 YT 배지 표시용)
  ytMessageId?: string; // YouTube 원본 메시지 ID (중복 방지용)
  createdAt?: string; // YouTube 메시지 작성 시각 (ISO)
}

/**
 * 클라이언트로 내려보낼 라이브 객체.
 * youtubeApiKey는 서버 전용 비밀값이라 SSE/GET 응답에서 반드시 제거한다.
 */
export function toPublicLive(live: LiveAuction): LiveAuction {
  const copy = { ...live };
  delete copy.youtubeApiKey;
  return copy;
}

export function toPublicLives(lives: LiveAuction[]): LiveAuction[] {
  return lives.map(toPublicLive);
}

function maskBidderName(name: string): string {
  const chars = Array.from(name.trim());
  if (chars.length <= 1) return "익명";
  if (chars.length === 2) return `${chars[0]}*`;
  return `${chars[0]}${"*".repeat(Math.min(3, chars.length - 2))}${chars[chars.length - 1]}`;
}

export function toPublicBid(bid: AuctionBid): AuctionBid {
  return { ...bid, userId: null, bidderName: maskBidderName(bid.bidderName) };
}

export function toPublicBids(bids: AuctionBid[]): AuctionBid[] {
  return bids.map(toPublicBid);
}

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function readJSON<T>(file: string, defaultVal: T): T {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
  } catch (error) {
    console.error(`[ServerStore] failed to read ${path.basename(file)}`, error);
  }
  return defaultVal;
}

function writeJSON(file: string, data: unknown) {
  const temp = `${file}.${process.pid}.${crypto.randomBytes(5).toString("hex")}.tmp`;
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(temp, JSON.stringify(data), { encoding: "utf8", mode: 0o600 });
    fs.renameSync(temp, file);
  } catch (error) {
    try { if (fs.existsSync(temp)) fs.unlinkSync(temp); } catch { /* cleanup only */ }
    console.error(`[ServerStore] failed to write ${path.basename(file)}`, error);
    throw error;
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __sse_clients_rarefarm: Set<{
    send: (data: string) => void;
    userId?: string;
    isAdmin: boolean;
  }>;
  // eslint-disable-next-line no-var
  var __rf_store_queue: Promise<void>;
}
if (!global.__sse_clients_rarefarm) global.__sse_clients_rarefarm = new Set();
if (!global.__rf_store_queue) global.__rf_store_queue = Promise.resolve();

export const serverStore = {
  async runExclusive<T>(operation: () => T | Promise<T>): Promise<T> {
    const previous = global.__rf_store_queue;
    let release!: () => void;
    global.__rf_store_queue = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try {
      return await operation();
    } finally {
      release();
    }
  },
  getLives(): Record<string, LiveAuction> {
    return readJSON<Record<string, LiveAuction>>(LIVES_FILE, {});
  },
  getItems(): Record<string, AuctionItem> {
    return readJSON<Record<string, AuctionItem>>(ITEMS_FILE, {});
  },
  getBids(): AuctionBid[] {
    return readJSON<AuctionBid[]>(BIDS_FILE, []);
  },

  setLive(live: LiveAuction) {
    const lives = this.getLives();
    lives[live.id] = live;
    writeJSON(LIVES_FILE, lives);
  },
  deleteLive(id: string) {
    const lives = this.getLives();
    delete lives[id];
    writeJSON(LIVES_FILE, lives);
  },
  setItem(item: AuctionItem) {
    const items = this.getItems();
    items[item.id] = item;
    writeJSON(ITEMS_FILE, items);
  },
  addBid(bid: AuctionBid) {
    const bids = this.getBids();
    if (bids.some((existing) => existing.id === bid.id)) return;
    bids.push(bid);
    writeJSON(BIDS_FILE, bids);
  },

  getAllChats(): Record<string, ChatMessage[]> {
    return readJSON<Record<string, ChatMessage[]>>(CHATS_FILE, {});
  },
  getChats(liveId: string): ChatMessage[] {
    return this.getAllChats()[liveId] ?? [];
  },
  addChat(liveId: string, chat: ChatMessage) {
    const all = this.getAllChats();
    const existing = all[liveId] ?? [];
    // 같은 id가 이미 있으면 추가하지 않음 (중복 방지)
    if (existing.some(c => String(c.id) === String(chat.id))) return;
    all[liveId] = [...existing, chat].slice(-100);
    writeJSON(CHATS_FILE, all);
  },
  clearChats(liveId: string) {
    const all = this.getAllChats();
    delete all[liveId];
    writeJSON(CHATS_FILE, all);
  },

  // ================= 정산 =================
  getSettlements(): Settlement[] {
    return readJSON<Settlement[]>(SETTLEMENTS_FILE, []);
  },
  addSettlement(settlement: Settlement) {
    const list = this.getSettlements();
    if (list.some((existing) => existing.id === settlement.id || existing.itemId === settlement.itemId)) return;
    list.push(settlement);
    writeJSON(SETTLEMENTS_FILE, list);
  },
  /** 같은 상품(itemId)에 대한 정산 — 낙찰 중복 생성 차단용 */
  findSettlementByItem(itemId: string): Settlement | undefined {
    return this.getSettlements().find((s) => s.itemId === itemId);
  },
  /**
   * 조회 시점에 자동 구매확정(배송 15일 경과) / 결제기한 만료를 서버 데이터에 반영.
   * 클라이언트별 localStorage가 아니라 서버 파일이 기준이 되도록 한다.
   */
  sweepSettlements() {
    const now = Date.now();
    const list = this.getSettlements();
    let changed = false;
    list.forEach((sv) => {
      if (sv.status === "shipping" && sv.autoConfirmAt && sv.autoConfirmAt < now) {
        sv.status = "withdrawable";
        sv.confirmedAt = now;
        changed = true;
      } else if (sv.status === "pending_payment" && sv.paymentDeadline < now) {
        sv.status = "cancelled";
        changed = true;
      }
    });
    if (changed) writeJSON(SETTLEMENTS_FILE, list);
    return list;
  },
  updateSettlement(id: string, updates: Partial<Settlement>) {
    const list = this.getSettlements();
    const idx = list.findIndex((s) => s.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...updates };
      writeJSON(SETTLEMENTS_FILE, list);
    }
  },
  getSettlementsBySeller(sellerId: string): Settlement[] {
    return this.getSettlements().filter((s) => s.sellerId === sellerId);
  },
  getSettlementsByBuyer(buyerId: string): Settlement[] {
    return this.getSettlements().filter((s) => s.buyerId === buyerId);
  },

  // ================= SSE =================
  broadcast(event: string, data: unknown) {
    const msg = `data: ${JSON.stringify({ event, data })}\n\n`;
    const record = data && typeof data === "object" ? data as Record<string, unknown> : {};
    const nestedLive = record.live && typeof record.live === "object"
      ? record.live as Record<string, unknown>
      : undefined;
    const nestedItem = record.item && typeof record.item === "object"
      ? record.item as Record<string, unknown>
      : undefined;
    const nestedBid = record.bid && typeof record.bid === "object"
      ? record.bid as Record<string, unknown>
      : undefined;
    const liveId = String(
      record.liveId ?? nestedLive?.id ?? nestedItem?.liveId ?? nestedBid?.liveId ?? ""
    );
    const live = liveId ? this.getLives()[liveId] : undefined;
    const settlementId = event.startsWith("settlement_") && typeof record.id === "string"
      ? record.id
      : "";
    const settlement = settlementId
      ? this.getSettlements().find((candidate) => candidate.id === settlementId)
      : undefined;

    global.__sse_clients_rarefarm.forEach((client) => {
      if (
        live?.isPublic === false &&
        !client.isAdmin &&
        client.userId !== live.sellerId
      ) return;
      if (
        settlement &&
        !client.isAdmin &&
        client.userId !== settlement.sellerId &&
        client.userId !== settlement.buyerId
      ) return;
      if (
        event === "settlement_withdrawal_requested" &&
        typeof record.sellerId === "string" &&
        !client.isAdmin &&
        client.userId !== record.sellerId
      ) return;
      try { client.send(msg); } catch { /* noop */ }
    });
  },
  addSSEClient(send: (data: string) => void, viewer?: { userId?: string; isAdmin?: boolean }) {
    const client = { send, userId: viewer?.userId, isAdmin: viewer?.isAdmin === true };
    global.__sse_clients_rarefarm.add(client);
    // 반환된 함수로 연결 종료 시 클라이언트 제거
    return () => { global.__sse_clients_rarefarm.delete(client); };
  },
};
