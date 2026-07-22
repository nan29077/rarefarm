import fs from "fs";
import path from "path";
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
}

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function readJSON<T>(file: string, defaultVal: T): T {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
  } catch {
    /* noop */
  }
  return defaultVal;
}

function writeJSON(file: string, data: unknown) {
  try {
    fs.writeFileSync(file, JSON.stringify(data), "utf-8");
  } catch {
    /* noop */
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __sse_clients_rarefarm: Set<(data: string) => void>;
}
if (!global.__sse_clients_rarefarm) global.__sse_clients_rarefarm = new Set();

export const serverStore = {
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
    list.push(settlement);
    writeJSON(SETTLEMENTS_FILE, list);
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
    global.__sse_clients_rarefarm.forEach((send) => {
      try { send(msg); } catch { /* noop */ }
    });
  },
  addSSEClient(send: (data: string) => void) {
    global.__sse_clients_rarefarm.add(send);
    // 반환된 함수로 연결 종료 시 클라이언트 제거
    return () => { global.__sse_clients_rarefarm.delete(send); };
  },
  removeSSEClient(send: (data: string) => void) {
    global.__sse_clients_rarefarm.delete(send);
  },
};
