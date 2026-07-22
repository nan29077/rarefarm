"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Eye,
  Timer,
  Trophy,
  Send,
  ExternalLink,
  CalendarClock,
  Ban,
  Zap,
  Gavel,
  Crown,
  Pin,
  Pause,
  Sparkles,
  Volume2,
  VolumeX,
  Headphones,
  LayoutList,
  Instagram,
  Square,
  Play,
  SkipForward,
  Heart,
  Share2,
  Flag,
  Ticket,
  ChevronLeft,
  Gift,
  ShoppingCart,
  Bell,
  UserPlus,
} from "lucide-react";
import { CustomIcon } from "@/components/common/CustomIcon";
import { CrtDreamScreen } from "@/components/common/CrtDreamScreen";
import { Button } from "@/components/common/Button";
import { Badge } from "@/components/common/Badge";
import { Modal } from "@/components/common/Modal";
import { BottomSheet } from "@/components/common/BottomSheet";
import { Placeholder } from "@/components/common/Placeholder";
import { EmptyState } from "@/components/common/EmptyState";
import {
  auctionService,
  auctionItemStatusLabels,
  extractYouTubeId,
  maskNickname,
  durationLabel,
} from "@/lib/auctionService";
import { couponService, couponDiscountLabel } from "@/lib/couponService";
import { marketService } from "@/lib/marketService";
import { useStoreVersion } from "@/lib/useStore";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { formatPrice, formatNumber, cn } from "@/lib/utils";
import type { AuctionBid, AuctionItem, LiveAuction, LiveCoupon } from "@/types";

const SIM_BIDDERS = ["건담매니아", "레고홀릭", "피규어킹", "프라덕후", "카드왕", "브릭러버"];

const DEFAULT_ITEM_DURATION = 300;
const LAST_MINUTE_SEC = 10;
const EXTEND_SEC = 30;

interface ChatMsg {
  id: string | number;
  name: string;
  text: string;
  source?: "app" | "youtube";
  mine?: boolean;
}

interface WinnerInfo {
  itemName: string;
  winnerName: string;
  price: number;
  mine: boolean;
  item?: AuctionItem;
}

type MobileTab = "auction" | "chat" | "items";

export default function LiveAuctionDetailPage() {
  useStoreVersion();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, requireAuth } = useAuth();
  const { toast } = useToast();

  const live = auctionService.getLive(params.id);
  const items = (live?.itemIds ?? [])
    .map((id) => auctionService.getItem(id))
    .filter((i): i is AuctionItem => !!i);
  const isLive = live?.status === "live";
  const isPaused = live?.status === "paused";
  const ongoing = isLive || isPaused;
  const currentItem = live && ongoing ? items[live.currentItemIndex] : undefined;

  const [simBids, setSimBids] = useState<AuctionBid[]>([]);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [viewerDrift, setViewerDrift] = useState(0);
  const [joined, setJoined] = useState(false);
  const [customPrice, setCustomPrice] = useState("");
  const [suspendedModal, setSuspendedModal] = useState(false);
  const [buyNowConfirm, setBuyNowConfirm] = useState(false);
  const [winnerInfo, setWinnerInfo] = useState<WinnerInfo | null>(null);
  const [failedNotice, setFailedNotice] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("auction");
  const [pcTab, setPcTab] = useState<"items" | "auction" | "info" | "benefit">("auction");
  const [liked, setLiked] = useState(false);
  const [chats, setChats] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [showItemsSheet, setShowItemsSheet] = useState(false);
  const [couponModal, setCouponModal] = useState(false);
  const finalizedRef = useRef(false);
  const seenChatIds = useRef<Set<string>>(new Set());
  const [muted, setMuted] = useState(true);
  const [ytProgress, setYtProgress] = useState({ current: 0, duration: 0 });
  const ytFrameRef = useRef<HTMLIFrameElement | null>(null);
  const mobileChatRef = useRef<HTMLDivElement>(null);
  const pcChatRef = useRef<HTMLDivElement>(null);

  const currentItemId = currentItem?.id;
  const liveStatus = live?.status;
  const liveId = live?.id;
  const itemDuration =
    (currentItemId
      ? live?.itemDurations?.[currentItemId] ?? currentItem?.durationSec
      : undefined) ?? DEFAULT_ITEM_DURATION;

  // ── SSE 구독 ──────────────────────────────────────────────────────
  useEffect(() => {
    const lId = params.id;
    const es = new EventSource("/api/live-sync");

    es.addEventListener("init", (e: MessageEvent) => {
      try {
        const { lives, items, bids, chats: serverChats } = JSON.parse(e.data) as {
          lives: import("@/types").LiveAuction[];
          items: import("@/types").AuctionItem[];
          bids: import("@/types").AuctionBid[];
          chats: Record<string, Array<{ id: string | number; name: string; text: string; source?: "app" | "youtube" }>>;
        };
        auctionService.applyServerSync({ lives, items, bids });
        const liveMsgs = serverChats?.[lId];
        if (liveMsgs?.length) {
          setChats((prev) => {
            const existingIds = new Set(prev.map((c) => String(c.id)));
            const newMsgs = liveMsgs
              .filter((c) => !existingIds.has(String(c.id)))
              .map((c) => ({ id: c.id, name: c.name, text: c.text, source: c.source }));
            liveMsgs.forEach((c) => seenChatIds.current.add(String(c.id)));
            return newMsgs.length ? [...prev, ...newMsgs].slice(-40) : prev;
          });
        }
      } catch { /* noop */ }
    });

    es.addEventListener("message", (e: MessageEvent) => {
      try {
        const { event, data } = JSON.parse(e.data) as { event: string; data: unknown };
        if (event === "live_update") {
          const { live: updLive, items: updItems } = data as {
            live: import("@/types").LiveAuction;
            items: import("@/types").AuctionItem[];
          };
          auctionService.applyServerSync({ lives: [updLive], items: updItems });
        } else if (event === "bid") {
          const { bid, item: updItem } = data as {
            bid: import("@/types").AuctionBid;
            item?: import("@/types").AuctionItem;
          };
          auctionService.applyServerSync({ bids: [bid], items: updItem ? [updItem] : [] });
        } else if (event === "chat") {
          const { liveId: msgLiveId, chat } = data as {
            liveId: string;
            chat: { id: string | number; name: string; text: string; source?: "app" | "youtube" };
          };
          if (msgLiveId === lId) {
            const chatId = String(chat.id);
            if (seenChatIds.current.has(chatId)) return;
            seenChatIds.current.add(chatId);
            setChats((prev) => {
              if (prev.find((c) => String(c.id) === chatId)) return prev;
              return [...prev, { id: chat.id, name: chat.name, text: chat.text, source: chat.source ?? "app" }].slice(-40);
            });
          }
        } else if (event === "yt_chat") {
          // ── 레어팜 YouTube 채팅 수신 (seenChatIds 중복 방지) ──
          const { liveId: msgLiveId, messages } = data as {
            liveId: string;
            messages: Array<{ id: string; name: string; text: string }>;
          };
          if (msgLiveId === lId) {
            const unseen = messages.filter((m) => !seenChatIds.current.has(String(m.id)));
            if (!unseen.length) return;
            unseen.forEach((m) => seenChatIds.current.add(String(m.id)));
            setChats((prev) => {
              const existingIds = new Set(prev.map((c) => String(c.id)));
              const newMsgs = unseen
                .filter((m) => !existingIds.has(String(m.id)))
                .map((m) => ({ id: m.id, name: m.name, text: m.text, source: "youtube" as const }));
              return newMsgs.length ? [...prev, ...newMsgs].slice(-40) : prev;
            });
          }
        } else if (event === "item_update") {
          auctionService.applyServerSync({ items: [data as import("@/types").AuctionItem] });
        } else if (event === "live_ended") {
          const { liveId: endedId } = data as { liveId: string };
          auctionService.applyLiveEnded(endedId);
        }
      } catch { /* noop */ }
    });

    es.onerror = () => { /* SSE 자동 재연결 */ };
    return () => es.close();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  // ── 레어팜: YouTube 채팅 폴링 시작 ──
  useEffect(() => {
    if (!live || live.platform !== "youtube" || live.status !== "live") return;
    const videoId = extractYouTubeId(live.videoUrl);
    if (!videoId) return;
    const apiKey = live.youtubeApiKey || couponService.getSellerYoutubeApiKey(live.sellerId);
    if (!apiKey) return;
    fetch("/api/live-sync/yt-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ liveId: live.id, videoId, apiKey }),
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, liveStatus, live?.youtubeApiKey, live?.videoUrl]);

  // ── 레어팜: 3초 채팅 폴링 폴백 (SSE 미수신 보완) ──
  useEffect(() => {
    if (!params.id) return;
    const poll = setInterval(async () => {
      try {
        const r = await fetch(`/api/live-sync/chats?liveId=${params.id}`);
        if (!r.ok) return;
        const { chats: serverChats } = await r.json() as {
          chats: Array<{ id: string | number; name: string; text: string; source?: "app" | "youtube" }>;
        };
        if (!serverChats?.length) return;
        const unseen = serverChats.filter((c) => !seenChatIds.current.has(String(c.id)));
        if (!unseen.length) return;
        unseen.forEach((c) => seenChatIds.current.add(String(c.id)));
        setChats((prev) => {
          const existingIds = new Set(prev.map((x) => String(x.id)));
          const newChats = unseen.filter((c) => !existingIds.has(String(c.id)));
          if (!newChats.length) return prev;
          return [
            ...prev,
            ...newChats.map((c) => ({ id: c.id, name: c.name, text: c.text, source: c.source, mine: false as const })),
          ].slice(-40);
        });
      } catch { /* noop */ }
    }, 3000);
    return () => clearInterval(poll);
  }, [params.id]);

  useEffect(() => {
    if (!currentItemId || liveStatus !== "live") {
      setEndsAt(null);
      return;
    }
    setSimBids([]);
    finalizedRef.current = false;
    const serverEndTime = currentItem?.endTime;
    if (serverEndTime && serverEndTime > Date.now()) {
      setEndsAt(serverEndTime);
    } else {
      // 서버에서 endTime 조회 후 설정 (페이지 새로고침 시 타이머 유지)
      fetch("/api/live-sync/lives")
        .then((r) => r.json())
        .then((data: { lives: import("@/types").LiveAuction[]; items: import("@/types").AuctionItem[] }) => {
          const sItem = data.items?.find((i) => i.id === currentItemId);
          if (sItem?.endTime && sItem.endTime > Date.now()) {
            setEndsAt(sItem.endTime);
            auctionService.applyServerSync({ lives: data.lives ?? [], items: data.items ?? [], bids: [] });
          } else {
            // 서버에도 유효한 endTime 없으면 (새 상품 시작) → 기본값 사용
            setEndsAt(Date.now() + itemDuration * 1000);
          }
        })
        .catch(() => {
          setEndsAt(Date.now() + itemDuration * 1000);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentItemId, liveStatus]);

  useEffect(() => {
    const serverEndTime = currentItem?.endTime;
    if (!serverEndTime || liveStatus !== "live") return;
    if (serverEndTime > Date.now()) {
      setEndsAt((prev) => {
        if (prev === null) return serverEndTime;
        if (Math.abs(prev - serverEndTime) > 5000) return serverEndTime;
        return prev;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentItem?.endTime]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const storeBids = currentItem ? auctionService.getBidsForItem(currentItem.id) : [];
  const allBids = [...storeBids, ...simBids].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
  const topBid = allBids.reduce<AuctionBid | null>(
    (top, b) => (top === null || b.price > top.price ? b : top),
    null
  );
  const currentPrice = Math.max(currentItem?.currentPrice ?? 0, topBid?.price ?? 0);
  const isTopBidder = !!user && topBid?.userId === user.id;
  const isOwnItem = !!user && currentItem?.sellerId === user.id;

  const remainSec = endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : 0;

  useEffect(() => {
    if (!live || live.status !== "live" || !currentItem || !endsAt) return;
    if (remainSec > 0 || finalizedRef.current) return;
    finalizedRef.current = true;
    const winner = topBid ? { name: topBid.bidderName, price: topBid.price } : null;
    const itemName = currentItem.name;
    const finishedItem = currentItem;
    auctionService.finalizeCurrentItemOnly(live.id, winner);
    if (winner) {
      setWinnerInfo({ itemName, winnerName: winner.name, price: winner.price, mine: topBid?.userId === user?.id, item: finishedItem });
    } else {
      setFailedNotice(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainSec, live?.status, currentItemId]);

  useEffect(() => {
    if (!winnerInfo) return;
    const t = setTimeout(() => setWinnerInfo(null), 3000);
    return () => clearTimeout(t);
  }, [winnerInfo]);

  useEffect(() => {
    if (!failedNotice) return;
    const t = setTimeout(() => setFailedNotice(false), 2400);
    return () => clearTimeout(t);
  }, [failedNotice]);

  useEffect(() => {
    if (!liveId || liveStatus !== "live") return;
    let timer: ReturnType<typeof setTimeout>;
    let alive = true;
    const tick = () => {
      timer = setTimeout(() => {
        if (!alive) return;
        setSimBids((prev) => {
          const item = currentItemId ? auctionService.getItem(currentItemId) : undefined;
          if (!item || item.status !== "live" || item.suspended) return prev;
          const store = auctionService.getBidsForItem(item.id);
          const top = [...store, ...prev].reduce((m, b) => Math.max(m, b.price), item.currentPrice);
          const price = top + item.bidUnit * (Math.random() > 0.7 ? 2 : 1);
          if (item.buyNowPrice && price >= item.buyNowPrice) return prev;
          return [
            ...prev,
            {
              id: `sim-${Date.now()}`,
              liveId,
              itemId: item.id,
              userId: null,
              bidderName: SIM_BIDDERS[Math.floor(Math.random() * SIM_BIDDERS.length)],
              price,
              createdAt: new Date().toISOString(),
            },
          ];
        });
        tick();
      }, 4000 + Math.random() * 4000);
    };
    tick();
    return () => { alive = false; clearTimeout(timer); };
  }, [liveId, liveStatus, currentItemId]);

  // 시청자 수 자연스러운 변동 (±10~20명)
  useEffect(() => {
    if (!liveId || liveStatus !== "live") return;
    const t = setInterval(() => {
      setViewerDrift(Math.floor(Math.random() * 30) - 10);
    }, 6000);
    return () => clearInterval(t);
  }, [liveId, liveStatus]);

  const placeBid = useCallback(
    (price: number) => {
      if (!live || !currentItem) return;
      if (!requireAuth() || !user) return;
      if (currentItem.suspended) { setSuspendedModal(true); return; }
      if (currentItem.sellerId === user.id)
        return toast("본인이 등록한 상품에는 입찰할 수 없습니다.", "error");
      if (price <= currentPrice)
        return toast("현재가보다 높은 금액으로 입찰해주세요.", "error");
      if (price < currentPrice + currentItem.bidUnit)
        return toast(`최소 입찰 단위(${formatPrice(currentItem.bidUnit)}) 이상 올려서 입찰해주세요.`, "error");
      if (currentItem.buyNowPrice && price >= currentItem.buyNowPrice) {
        setBuyNowConfirm(true);
        return;
      }
      auctionService.placeBid(live.id, currentItem.id, user, price);
      setJoined(true);
      if (endsAt && endsAt - Date.now() < LAST_MINUTE_SEC * 1000) {
        const extEndTime = Date.now() + EXTEND_SEC * 1000;
        setEndsAt(extEndTime);
        toast(`마감 직전 입찰! 경매 시간이 ${EXTEND_SEC}초 연장되었습니다.`, "info");
        fetch(`/api/live-sync/lives/${live.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: [{ ...currentItem, endTime: extEndTime }] }),
        }).catch(() => {});
      }
      toast(`${formatPrice(price)} 입찰 완료!`);
    },
    [live, currentItem, currentPrice, requireAuth, user, toast, endsAt]
  );

  function handleBuyNow() {
    if (!live || !currentItem || currentItem.buyNowPrice === null) return;
    if (!requireAuth() || !user) return;
    if (currentItem.suspended) { setSuspendedModal(true); return; }
    if (currentItem.sellerId === user.id) {
      setBuyNowConfirm(false);
      return toast("본인이 등록한 상품은 낙찰받을 수 없습니다.", "error");
    }
    const itemName = currentItem.name;
    const price = currentItem.buyNowPrice;
    const finishedItem = currentItem;
    auctionService.buyNow(live.id, currentItem.id, user);
    setBuyNowConfirm(false);
    setWinnerInfo({ itemName, winnerName: user.nickname, price, mine: true, item: finishedItem });
  }

  function sendChat() {
    if (!live) return;
    if (live.chatEnabled === false) return toast("판매자가 채팅을 금지한 방송입니다.", "error");
    const text = chatInput.trim();
    if (!text) return;
    const banned = (live.chatFilterWords ?? []).find(
      (w) => w && text.toLowerCase().includes(w.toLowerCase())
    );
    if (banned) return toast("금칙어가 포함되어 전송할 수 없습니다.", "error");
    const chatMsg = { id: Date.now(), name: user?.nickname ?? "게스트", text, source: "app" as const };
    setChats((prev) => [...prev, { ...chatMsg, mine: true }].slice(-40));
    setChatInput("");
    fetch("/api/live-sync/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ liveId: live.id, chat: chatMsg }),
    }).catch(() => {});
  }

  useEffect(() => {
    mobileChatRef.current?.scrollTo({ top: mobileChatRef.current.scrollHeight });
    pcChatRef.current?.scrollTo({ top: pcChatRef.current.scrollHeight });
  }, [chats]);

  function onItemClick(item: AuctionItem) {
    if (item.suspended) { setSuspendedModal(true); return; }
    if (live && user && live.sellerId === user.id && ongoing && item.status === "waiting") {
      const idx = live.itemIds.indexOf(item.id);
      if (idx >= 0 && idx !== live.currentItemIndex) {
        auctionService.jumpToItem(live.id, idx);
        toast(`"${item.name}" 상품으로 진행을 변경했습니다.`);
      }
    }
  }

  function toggleMute() {
    const win = ytFrameRef.current?.contentWindow;
    if (win) {
      win.postMessage(JSON.stringify({ event: "command", func: muted ? "unMute" : "mute", args: [] }), "*");
    }
    setMuted((m) => !m);
    toast(muted ? "소리를 켰습니다. 하울링이 발생하면 다시 음소거해주세요." : "음소거되었습니다.", "info");
  }

  useEffect(() => {
    const youtubeId2 = live && live.platform === "youtube" ? extractYouTubeId(live.videoUrl) : null;
    if (!youtubeId2) return;
    // 진행 중인 라이브 방송일 때만 라이브 엣지 동기화 로직 활성화 (VOD/예약/종료 제외)
    const isLiveStream = live?.status === "live";
    let didLiveSeek = false;

    const postCommand = (func: string, args: unknown[] = []) => {
      ytFrameRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func, args }), "*"
      );
    };
    // 라이브 엣지로 점프 (약간의 여유를 두어 리버퍼링 방지)
    const seekToLiveEdge = (duration: number) => {
      postCommand("seekTo", [Math.max(0, duration - 0.5), true]);
    };

    const handler = (e: MessageEvent) => {
      if (e.source !== ytFrameRef.current?.contentWindow) return;
      try {
        const d = JSON.parse(typeof e.data === "string" ? e.data : "{}");
        if (d.event === "infoDelivery" && d.info) {
          const cur = d.info.currentTime;
          const dur = d.info.duration;
          if (typeof cur === "number" && typeof dur === "number") {
            setYtProgress({ current: cur, duration: dur });
            if (isLiveStream && dur > 0) {
              if (!didLiveSeek) {
                // 최초 재생 시: 화질 고정 후 라이브 엣지로 이동해 오디오/비디오 싱크 확보
                didLiveSeek = true;
                postCommand("setPlaybackQuality", ["hd720"]);
                seekToLiveEdge(dur);
              } else if (dur - cur > 10) {
                // 라이브 엣지에서 10초 이상 뒤처지면 재동기화
                seekToLiveEdge(dur);
              }
            }
          }
        }
      } catch { /* noop */ }
    };
    window.addEventListener("message", handler);
    const t = setInterval(() => {
      ytFrameRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "listening" }), "*");
    }, 1000);
    return () => { window.removeEventListener("message", handler); clearInterval(t); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live?.videoUrl, live?.status]);

  if (!live) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50">
        <EmptyState icon="sns-live" title="라이브를 찾을 수 없어요"
          action={<Button onClick={() => router.push("/live-auction")}>라이브 경매 목록으로</Button>}
        />
      </div>
    );
  }

  const seller = marketService.getUser(live.sellerId);
  const liveCouponList = (live.couponIds ?? [])
    .map((id) => couponService.getLiveCoupon(id))
    .filter((c): c is LiveCoupon => !!c);
  const hasCoupons = liveCouponList.length > 0;
  const liveBadges = live.badges ?? [];
  const hasBadges = liveBadges.length > 0;
  const issuedCouponIds = user
    ? couponService.getIssuedCouponIds(user.id, liveCouponList.map((c) => c.id))
    : [];

  function receiveCoupon(couponId: string) {
    if (!requireAuth() || !user || !live) return;
    const res = couponService.issueLiveCouponToUser(couponId, user.id, live.id);
    if (!res.ok) {
      if (res.reason === "duplicate") toast("이미 받은 쿠폰입니다. 마이페이지에서 확인하세요.", "info");
      else if (res.reason === "soldout") toast("쿠폰이 모두 소진되었습니다.", "error");
      else toast("쿠폰을 찾을 수 없습니다.", "error");
      return;
    }
    toast("쿠폰이 지급되었습니다! 마이페이지에서 확인하세요.");
  }

  const youtubeId = live.platform === "youtube" ? extractYouTubeId(live.videoUrl) : null;
  const viewers = Math.max(1, live.viewers + viewerDrift);
  const chatDisabled = !isLive || live.chatEnabled === false;
  const showFixedCta = isLive && !!currentItem && !currentItem.suspended && !isOwnItem;
  const isHost = !!user && live.sellerId === user.id;
  const allItemsDone = ongoing && items.length > 0 && !currentItem;

  function endBroadcast() {
    if (!live) return;
    auctionService.setLiveStatus(live.id, "ended");
    toast("방송을 종료했습니다. 수고하셨습니다!");
  }
  function pauseBroadcast() {
    if (!live) return;
    auctionService.setLiveStatus(live.id, "paused");
    toast("방송을 일시정지했습니다.");
  }
  function resumeBroadcast() {
    if (!live) return;
    auctionService.setLiveStatus(live.id, "live");
    toast("방송을 재개했습니다.");
  }
  function skipToNextItem() {
    if (!live) return;
    const nextIdx = items.findIndex((it, i) => i > live.currentItemIndex && it.status === "waiting" && !it.suspended);
    if (nextIdx === -1) return toast("전환할 다음 상품이 없습니다.", "error");
    auctionService.jumpToItem(live.id, nextIdx);
    toast("다음 상품으로 진행을 전환했습니다.");
  }

  // ── 레어팜 판매자 전용 고급 제어 ──
  const extendTime = async (seconds: number) => {
    if (!isHost || !live?.id) return;
    const res = await fetch(`/api/live-sync/lives/${live.id}/extend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seconds }),
    }).catch(() => null);
    if (res?.ok) {
      const data = await res.json().catch(() => ({})) as { newEndTime?: number };
      if (data.newEndTime) setEndsAt(data.newEndTime);
      toast(`${seconds >= 60 ? `${Math.round(seconds / 60)}분` : `${seconds}초`} 연장되었습니다.`, "info");
    }
  };
  const moveToNextItem = async () => {
    if (!isHost || !live?.id) return;
    await fetch(`/api/live-sync/lives/${live.id}/next-item`, { method: "POST" }).catch(() => {});
    toast("다음 상품으로 이동했습니다.", "info");
  };
  const forceSettle = () => {
    if (!live || !currentItem || !isHost) return;
    if (!topBid) return toast("입찰 내역이 없어 즉시 낙찰할 수 없습니다.", "error");
    const winner = { name: topBid.bidderName, price: topBid.price };
    const itemName = currentItem.name;
    const finishedItem = currentItem;
    auctionService.finalizeCurrentItemOnly(live.id, winner);
    setWinnerInfo({ itemName, winnerName: winner.name, price: winner.price, mine: topBid.userId === user?.id, item: finishedItem });
  };
  const forceUnsold = () => {
    if (!live || !currentItem || !isHost) return;
    auctionService.finalizeCurrentItemOnly(live.id, null);
    setFailedNotice(true);
  };

  function sendEffect(text: string) {
    setChats((prev) =>
      [...prev, { id: Date.now(), name: user?.nickname ?? "게스트", text, mine: true, source: "app" as const }].slice(-40)
    );
  }

  // ==================== 재사용 블록 ====================
  const itemListPanel = (
    <ItemList items={items} live={live} ongoing={ongoing} onItemClick={onItemClick} />
  );

  // ==================== PC 다크 우측 패널 탭 콘텐츠 ====================

  // 탭1: 상품목록 (다크)
  const pcItemsDark = (
    <div className="space-y-2 p-3">
      {items.map((it, idx) => {
        const isCurrent = ongoing && idx === live.currentItemIndex;
        const done = it.status === "sold" || it.status === "failed";
        return (
          <button
            key={it.id}
            onClick={() => onItemClick(it)}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors",
              isCurrent
                ? "border-brand-400 bg-brand-400/10"
                : "border-white/10 bg-neutral-800/50 hover:border-white/25 hover:bg-neutral-800",
              it.suspended && "opacity-60",
              done && !isCurrent && "opacity-70"
            )}
          >
            <span className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
              isCurrent ? "bg-brand-400 text-black" : "bg-white/10 text-neutral-400"
            )}>
              {idx + 1}
            </span>
            <ItemThumb item={it} className="h-12 w-12 rounded-lg" seedFallback={it.id} />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-sm font-semibold text-white">{it.name}</p>
              <p className="text-[11px] text-neutral-500">
                시작가 {formatPrice(it.startPrice)} · 단위 {formatPrice(it.bidUnit)}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1">
                {it.suspended ? (
                  <Badge tone="red">판매중지</Badge>
                ) : isCurrent ? (
                  <Badge tone="brand">경매 진행 중</Badge>
                ) : (
                  <Badge tone={it.status === "sold" ? "green" : it.status === "failed" ? "neutral" : "amber"}>
                    {it.status === "waiting" ? "예정" : auctionItemStatusLabels[it.status]}
                  </Badge>
                )}
                {it.status === "sold" && it.finalPrice !== null && (
                  <span className="text-[11px] font-bold text-brand-300">
                    {formatPrice(it.finalPrice)} · {maskNickname(it.winnerName ?? "")}
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
      {items.length === 0 && (
        <p className="py-10 text-center text-xs text-neutral-500">등록된 경매 상품이 없습니다.</p>
      )}
    </div>
  );

  // 탭2: 경매정보 (다크)
  const pcAuctionDark = (
    <div className="p-3">
      {live.status === "scheduled" && (
        <div className="rounded-2xl bg-neutral-800/50 py-8 text-center">
          <CalendarClock className="mx-auto mb-2 h-8 w-8 text-brand-400" strokeWidth={1.5} />
          <p className="font-bold text-white">라이브 시작 전이에요</p>
          <p className="mt-1 text-sm text-neutral-400">
            {new Date(live.scheduledAt).toLocaleString("ko-KR", {
              month: "long", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit",
            })}{" "}시작 예정
          </p>
          <p className="mt-3 text-xs text-neutral-500">상품목록 탭에서 경매 예정 상품을 미리 확인해보세요.</p>
        </div>
      )}

      {live.status === "ended" && (
        <div>
          <p className="mb-3 flex items-center gap-1.5 font-bold text-white">
            <Trophy className="h-4 w-4 text-brand-400" strokeWidth={1.75} /> 낙찰 결과
          </p>
          <div className="space-y-2">
            {items.map((it) => (
              <div key={it.id} className="flex items-center gap-2 rounded-xl bg-neutral-800/50 p-2 text-xs">
                <ItemThumb item={it} className="h-9 w-9 rounded-md" />
                <span className="line-clamp-1 flex-1 text-neutral-200">{it.name}</span>
                {it.status === "sold" ? (
                  <span className="text-right">
                    <span className="block font-bold text-brand-300">{formatPrice(it.finalPrice)}</span>
                    <span className="text-neutral-500">{maskNickname(it.winnerName ?? "")} 낙찰</span>
                  </span>
                ) : (
                  <Badge tone="neutral">유찰</Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {isPaused && (
        <div className="mb-3 rounded-2xl border border-white/10 bg-black/40 p-4 text-center">
          <Pause className="mx-auto mb-1 h-6 w-6 text-brand-400" strokeWidth={1.75} />
          <p className="text-sm font-bold text-white">방송이 잠시 일시정지되었습니다</p>
          <p className="mt-0.5 text-xs text-neutral-400">잠시만 기다려주세요. 곧 재개됩니다.</p>
        </div>
      )}

      {ongoing && !currentItem && (
        <div className="rounded-2xl border border-white/10 bg-black/40 p-5 text-center">
          <Trophy className="mx-auto mb-2 h-7 w-7 text-brand-400" strokeWidth={1.5} />
          <p className="text-sm font-bold text-white">모든 상품 경매 완료</p>
          <p className="mt-1 text-xs leading-relaxed text-neutral-400">
            방송은 판매자가 종료할 때까지 계속됩니다.<br />채팅으로 판매자와 소통해보세요!
          </p>
          {isHost && (
            <Button fullWidth className="mt-3" onClick={endBroadcast}>
              <Square className="h-4 w-4" strokeWidth={1.75} /> 방송 종료하기
            </Button>
          )}
        </div>
      )}

      {ongoing && currentItem && (
        <>
          <div className="flex items-center gap-3">
            <ItemThumb item={currentItem} className="h-16 w-16 rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-brand-400">
                {live.currentItemIndex + 1}번째 상품 경매 중 · 제한 {durationLabel(itemDuration)}
              </p>
              <p className="line-clamp-2 text-sm font-bold text-white">{currentItem.name}</p>
            </div>
          </div>

          {currentItem.suspended ? (
            <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-center">
              <Ban className="mx-auto mb-1 h-6 w-6 text-red-400" strokeWidth={1.75} />
              <p className="text-sm font-bold text-red-300">관리자에 의해 판매 중지된 상품입니다</p>
            </div>
          ) : (
            <>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-white/10 bg-black/40 p-3 text-center">
                  <p className="text-[11px] text-neutral-400">현재가</p>
                  <p className="text-lg font-extrabold text-brand-400">{formatPrice(currentPrice)}</p>
                </div>
                <div className={cn(
                  "rounded-xl border p-3 text-center",
                  !isLive ? "border-white/10 bg-black/40"
                    : remainSec <= 30 ? "border-red-500/40 bg-red-500/10"
                    : "border-brand-400/40 bg-brand-400/10"
                )}>
                  <p className="flex items-center justify-center gap-0.5 text-[11px] text-neutral-400">
                    <Timer className="h-3 w-3" strokeWidth={2} /> 남은 시간
                  </p>
                  {!isLive ? (
                    <p className="text-lg font-extrabold text-neutral-500">일시정지</p>
                  ) : (
                    <p className={cn(
                      "font-extrabold tabular-nums transition-all",
                      remainSec <= 10 ? "animate-shake text-2xl text-red-400"
                        : remainSec <= 30 ? "animate-blink text-lg text-red-400"
                        : "text-lg text-white"
                    )}>
                      {Math.floor(remainSec / 60)}:{String(remainSec % 60).padStart(2, "0")}
                    </p>
                  )}
                </div>
              </div>
              {isLive && remainSec <= LAST_MINUTE_SEC && remainSec > 0 && (
                <p className="mt-1.5 text-center text-[11px] font-semibold text-red-400">
                  지금 입찰하면 {EXTEND_SEC}초 연장됩니다!
                </p>
              )}

              <div className={cn(
                "mt-2 flex items-center justify-between rounded-xl border px-3 py-2",
                isTopBidder ? "border-brand-400 bg-brand-400/10" : "border-white/10 bg-neutral-800/50"
              )}>
                <span className="text-xs text-neutral-400">최고 입찰자</span>
                {isTopBidder ? (
                  <span className="inline-flex items-center gap-1 text-sm font-extrabold text-brand-300">
                    <Crown className="h-4 w-4" strokeWidth={2} /> 현재 최고 입찰자입니다
                  </span>
                ) : (
                  <span className="text-sm font-bold text-white">
                    {topBid ? maskNickname(topBid.bidderName) : "아직 없음"}
                  </span>
                )}
              </div>

              {isHost ? (
                <div className="mt-3 space-y-2">
                  {/* 레어팜: 시간 연장 */}
                  <div className="flex gap-1.5">
                    {[60, 180, 300].map((sec) => (
                      <button key={sec} onClick={() => extendTime(sec)}
                        className="flex-1 rounded-xl border border-white/15 bg-neutral-800 py-2 text-[11px] font-bold text-white transition-colors hover:bg-neutral-700">
                        +{sec / 60}분
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {isLive ? (
                      <button onClick={pauseBroadcast}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-neutral-800 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-700">
                        <Pause className="h-4 w-4" strokeWidth={1.75} /> 일시정지
                      </button>
                    ) : (
                      <button onClick={resumeBroadcast}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-neutral-800 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-700">
                        <Play className="h-4 w-4" strokeWidth={1.75} /> 재개
                      </button>
                    )}
                    <button onClick={() => moveToNextItem()}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-brand-400 py-2.5 text-sm font-bold text-black transition-colors hover:bg-brand-300">
                      <SkipForward className="h-4 w-4" strokeWidth={1.75} /> 다음 상품
                    </button>
                  </div>
                  {/* 레어팜: 즉시 낙찰 / 유찰 처리 */}
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={forceSettle}
                      disabled={!isLive || !currentItem || currentItem.status !== "live" || !topBid}
                      className="flex items-center justify-center gap-1 rounded-xl bg-brand-400 py-2 text-[11px] font-bold text-black hover:bg-brand-300 disabled:cursor-not-allowed disabled:opacity-40">
                      즉시 낙찰
                    </button>
                    <button onClick={forceUnsold}
                      disabled={!isLive || !currentItem || currentItem.status !== "live"}
                      className="flex items-center justify-center gap-1 rounded-xl border border-red-500/50 bg-red-500/10 py-2 text-[11px] font-bold text-red-300 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40">
                      유찰 처리
                    </button>
                  </div>
                  <button onClick={endBroadcast}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-600">
                    <Square className="h-4 w-4" strokeWidth={1.75} /> 방송 종료하기
                  </button>
                  <p className="text-center text-[11px] text-neutral-500">
                    상품목록 탭에서 대기중 상품을 누르면 해당 상품으로 바로 전환됩니다.
                  </p>
                </div>
              ) : isOwnItem ? (
                <div className="mt-3 rounded-xl border border-white/10 bg-neutral-800/50 p-3 text-center text-xs text-neutral-400">
                  내가 등록한 상품입니다. 본인 상품에는 입찰할 수 없어요.
                </div>
              ) : !joined ? (
                <Button fullWidth size="lg" className="mt-3" disabled={!isLive}
                  onClick={() => { if (!requireAuth()) return; setJoined(true); toast("경매에 참여했습니다. 입찰해보세요!"); }}>
                  <Gavel className="h-4 w-4" strokeWidth={1.75} /> 경매 참여하기
                </Button>
              ) : (
                <>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {[1, 2, 5].map((mult) => (
                      <button key={mult} disabled={!isLive}
                        onClick={() => placeBid(currentPrice + currentItem.bidUnit * mult)}
                        className="rounded-xl border border-white/15 bg-neutral-800 py-2.5 text-center transition-all hover:border-brand-400 hover:bg-neutral-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40">
                        <span className="block text-[10px] font-medium text-neutral-400">
                          +{formatPrice(currentItem.bidUnit * mult)}
                        </span>
                        <span className="block text-[13px] font-extrabold text-white">
                          {formatPrice(currentPrice + currentItem.bidUnit * mult)}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <input value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value.replace(/[^0-9]/g, ""))}
                      inputMode="numeric" disabled={!isLive}
                      placeholder={`직접 입력 (최소 ${formatPrice(currentPrice + currentItem.bidUnit)})`}
                      className="h-11 min-w-0 flex-1 rounded-xl border border-white/15 bg-neutral-800 px-3 text-sm text-white placeholder-neutral-500 outline-none focus:border-brand-400 disabled:opacity-50"
                    />
                    <Button disabled={!isLive}
                      onClick={() => {
                        const p = Number(customPrice);
                        if (!p || p < currentPrice + currentItem.bidUnit)
                          return toast(`최소 ${formatPrice(currentPrice + currentItem.bidUnit)} 이상 입력해주세요.`, "error");
                        placeBid(p);
                        setCustomPrice("");
                      }}>
                      입찰
                    </Button>
                  </div>
                </>
              )}

              {currentItem.buyNowPrice !== null && !isOwnItem && !isHost && (
                <button disabled={!isLive}
                  onClick={() => { if (!requireAuth()) return; setBuyNowConfirm(true); }}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-brand-400/50 bg-brand-400/10 py-3 text-sm font-bold text-brand-300 transition-colors hover:bg-brand-400/20 disabled:cursor-not-allowed disabled:opacity-40">
                  <Zap className="h-4 w-4" strokeWidth={1.75} /> 즉시 낙찰받기 · {formatPrice(currentItem.buyNowPrice)}
                </button>
              )}

              <div className="mt-4">
                <p className="mb-1.5 text-xs font-bold text-neutral-400">입찰 히스토리</p>
                <div className="max-h-44 space-y-1 overflow-y-auto rounded-xl border border-white/10 bg-black/30 p-2">
                  {allBids.map((b) => (
                    <div key={b.id} className={cn(
                      "flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs animate-in",
                      b.userId === user?.id ? "bg-brand-400/15 font-semibold ring-1 ring-brand-400/60" : "bg-neutral-800/60"
                    )}>
                      <span className="min-w-0 flex-1 truncate text-neutral-300">
                        {b.userId === user?.id ? `${b.bidderName} (나)` : maskNickname(b.bidderName)}
                      </span>
                      <span className="shrink-0 text-[10px] text-neutral-500">
                        {new Date(b.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </span>
                      <span className="shrink-0 font-bold text-white">{formatPrice(b.price)}</span>
                    </div>
                  ))}
                  {allBids.length === 0 && (
                    <p className="py-4 text-center text-xs text-neutral-500">아직 입찰이 없습니다. 첫 입찰의 주인공이 되어보세요!</p>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );

  // 탭3: 라이브 소개 (다크)
  const pcInfoDark = (
    <div className="space-y-3 p-3">
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-neutral-800/50 p-4">
        <Placeholder seed={seller?.avatar ?? live.sellerId} className="h-12 w-12 rounded-full" showIcon={false} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white">{seller?.nickname ?? "판매자"}</p>
          <p className="text-[11px] text-neutral-400">팔로워 {formatNumber(seller?.followers ?? 0)}명</p>
        </div>
        <button onClick={() => toast("팔로우했습니다!", "info")}
          className="shrink-0 rounded-full bg-brand-400 px-3.5 py-1.5 text-xs font-bold text-black transition-colors hover:bg-brand-300">
          <UserPlus className="mr-1 inline h-3.5 w-3.5" strokeWidth={2} />팔로우
        </button>
      </div>

      <div className="space-y-2.5 rounded-2xl border border-white/10 bg-neutral-800/50 p-4 text-sm">
        <p className="mb-1 text-xs font-bold text-neutral-400">방송 정보</p>
        <div className="flex justify-between">
          <span className="text-neutral-400">플랫폼</span>
          <span className="font-semibold text-white">
            {live.platform === "youtube" ? "YouTube LIVE" : "Instagram LIVE"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-400">일정</span>
          <span className="font-semibold text-white">
            {new Date(live.scheduledAt).toLocaleString("ko-KR", {
              month: "long", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit",
            })}
          </span>
        </div>
        {live.expectedMinutes && (
          <div className="flex justify-between">
            <span className="text-neutral-400">예상 진행</span>
            <span className="font-semibold text-white">약 {live.expectedMinutes}분</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-neutral-400">경매 상품</span>
          <span className="font-semibold text-white">{items.length}개</span>
        </div>
      </div>

      {(live.tags ?? []).length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-neutral-800/50 p-4">
          <p className="mb-2 text-xs font-bold text-neutral-400">태그</p>
          <div className="flex flex-wrap gap-1.5">
            {(live.tags ?? []).map((t) => (
              <span key={t} className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-neutral-200">#{t}</span>
            ))}
          </div>
        </div>
      )}

      {live.pinnedNotice && (
        <div className="flex items-start gap-2 rounded-2xl border border-brand-400/30 bg-brand-400/10 p-4">
          <Pin className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" strokeWidth={2} />
          <p className="text-[13px] leading-relaxed text-neutral-200">{live.pinnedNotice}</p>
        </div>
      )}

      {ongoing && (
        <div className="space-y-1.5 rounded-2xl border border-white/10 bg-neutral-800/50 p-4 text-[11px] leading-relaxed text-neutral-400">
          <p className="flex items-start gap-1.5">
            <VolumeX className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-400" strokeWidth={1.75} />
            하울링(에코) 방지를 위해 기본 음소거로 시작합니다. 좌측 스피커 버튼으로 소리를 켜세요.
          </p>
          <p className="flex items-start gap-1.5">
            <Headphones className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-400" strokeWidth={1.75} />
            이어폰 사용을 권장합니다. (에코 캔슬링)
          </p>
        </div>
      )}
    </div>
  );

  // 탭4: 혜택 (다크)
  const pcBenefitDark = (
    <div className="space-y-3 p-3">
      {hasBadges && (
        <div>
          <p className="px-1 pb-2 text-xs font-bold text-neutral-400">이 방송의 혜택</p>
          <div className="flex flex-wrap gap-1.5">
            {liveBadges.map((b) => (
              <span key={b} className="inline-flex items-center gap-1 rounded-full border border-brand-400/40 bg-brand-400/10 px-3 py-1.5 text-xs font-semibold text-brand-300">
                <Gift className="h-3.5 w-3.5" strokeWidth={1.75} /> {b}
              </span>
            ))}
          </div>
        </div>
      )}
      {hasCoupons ? (
        <>
          <p className="px-1 text-xs font-bold text-neutral-400">라이브 전용 할인 쿠폰</p>
          {liveCouponList.map((c) => {
            const received = issuedCouponIds.includes(c.id);
            const soldout = c.totalCount !== undefined && c.issuedCount >= c.totalCount;
            return (
              <div key={c.id} className={cn(
                "flex items-center gap-3 rounded-xl border p-3",
                received ? "border-white/10 bg-neutral-800/50" : "border-brand-400/40 bg-brand-400/10"
              )}>
                <div className="hex-clip flex h-11 w-11 shrink-0 items-center justify-center bg-brand-400">
                  <Ticket className="h-5 w-5 text-neutral-900" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-bold text-white">{c.name}</p>
                  <p className="text-sm font-extrabold text-brand-300">{couponDiscountLabel(c.discountType, c.discountValue)}</p>
                  <p className="mt-0.5 text-[11px] text-neutral-500">
                    발급 후 {c.expiryDays}일 유효{c.minOrderAmount ? ` · 최소 ${formatPrice(c.minOrderAmount)}` : ""}
                  </p>
                </div>
                <button disabled={received || soldout} onClick={() => receiveCoupon(c.id)}
                  className={cn(
                    "shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition-colors",
                    received || soldout ? "cursor-not-allowed bg-white/10 text-neutral-500" : "bg-brand-400 text-black hover:bg-brand-300"
                  )}>
                  {received ? "받음" : soldout ? "소진" : "받기"}
                </button>
              </div>
            );
          })}
        </>
      ) : !hasBadges ? (
        <div className="rounded-2xl border border-white/10 bg-neutral-800/50 py-10 text-center">
          <Gift className="mx-auto mb-2 h-8 w-8 text-neutral-500" strokeWidth={1.5} />
          <p className="text-sm font-semibold text-neutral-300">준비된 혜택이 아직 없어요</p>
          <p className="mt-1 text-[11px] text-neutral-500">방송 중 쿠폰·이벤트가 열리면 이곳에 표시됩니다.</p>
        </div>
      ) : null}
    </div>
  );

  const PC_TABS = [
    { key: "items" as const, label: "상품목록" },
    { key: "auction" as const, label: "경매정보" },
    { key: "info" as const, label: "라이브 소개" },
    { key: "benefit" as const, label: "혜택" },
  ];

  return (
    <>
    {/* ================================================================
        모바일 전용: 풀스크린 방송 화면
        ================================================================ */}
    <div className="fixed inset-0 z-[60] overflow-hidden bg-black md:hidden">
      <div className="absolute inset-0 overflow-hidden">
        {(live.status === "scheduled" || live.status === "ended") ? (
          <CrtDreamScreen
            className="h-full w-full"
            status={live.status}
            scheduledAt={live.scheduledAt}
          />
        ) : youtubeId ? (
          <iframe ref={ytFrameRef}
            src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&playsinline=1&enablejsapi=1&controls=0&modestbranding=1&rel=0&fs=0&iv_load_policy=3`}
            title={live.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            style={{ position: "absolute", top: "50%", left: "50%", width: "177.78vh", minWidth: "100%", height: "calc(100% + 80px)", transform: "translate(-50%, calc(-50% - 40px))", border: "none", pointerEvents: "auto" }}
          />
        ) : live.platform === "instagram" ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-8">
            <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF]">
              <Instagram className="h-10 w-10 text-white" strokeWidth={1.5} />
            </span>
            <p className="text-center text-base font-semibold text-white">Instagram 라이브</p>
            <a href={live.videoUrl} target="_blank" rel="noreferrer"
              className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-neutral-900">
              Instagram에서 시청하기
            </a>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <CustomIcon name="sns-video" size={48} className="h-12 w-12 brightness-0 invert opacity-40" />
            <a href={live.videoUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-brand-400 underline">방송 링크 열기</a>
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/70 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/80 to-transparent" />

      {/* 상단 바 */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 px-3 pt-12">
        <div className="flex min-w-0 items-center gap-2">
          <button onClick={() => router.push("/live-auction")} aria-label="뒤로"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/50">
            <CustomIcon name="ui-back" size={20} className="h-5 w-5 brightness-0 invert" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              {isLive && <LiveBadge />}
              {isPaused && <span className="rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-extrabold text-white">일시정지</span>}
              <p className="line-clamp-1 text-[13px] font-bold text-white drop-shadow">{live.title}</p>
            </div>
            <p className="text-[11px] text-white/70">{seller?.nickname ?? "판매자"}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {ongoing && (
            <span className="flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-[11px] font-semibold text-white">
              <Eye className="h-3 w-3" strokeWidth={2} /> {formatNumber(viewers)}
            </span>
          )}
          {youtubeId && (
            <button onClick={toggleMute} aria-label={muted ? "음소거 해제" : "음소거"}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white">
              {muted ? <VolumeX className="h-4 w-4" strokeWidth={1.75} /> : <Volume2 className="h-4 w-4" strokeWidth={1.75} />}
            </button>
          )}
        </div>
      </div>

      {/* 오른쪽 세로 메뉴 */}
      <div className="absolute right-3 top-1/2 z-10 flex -translate-y-1/2 flex-col items-center gap-4">
        <button onClick={() => { setLiked((v) => !v); if (!liked) sendEffect("하트를 보냈습니다!"); }}
          className="flex flex-col items-center gap-1">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40">
            <Heart className={cn("h-5 w-5 text-white", liked && "fill-white")} strokeWidth={1.75} />
          </span>
          <span className="text-[10px] font-semibold text-white drop-shadow">{formatNumber(viewers + 273)}</span>
        </button>
        <button onClick={() => toast("공유 기능 준비 중입니다.", "info")} className="flex flex-col items-center gap-1">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40">
            <Share2 className="h-5 w-5 text-white" strokeWidth={1.75} />
          </span>
          <span className="text-[10px] font-semibold text-white drop-shadow">공유</span>
        </button>
        <button onClick={() => toast("신고가 접수되었습니다.", "info")} className="flex flex-col items-center gap-1">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40">
            <Flag className="h-5 w-5 text-white" strokeWidth={1.75} />
          </span>
          <span className="text-[10px] font-semibold text-white drop-shadow">신고</span>
        </button>
        {hasCoupons && (
          <button onClick={() => setCouponModal(true)} className="flex flex-col items-center gap-1">
            <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-brand-500">
              <Ticket className="h-5 w-5 text-neutral-900" strokeWidth={1.75} />
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-extrabold text-white">
                {liveCouponList.length}
              </span>
            </span>
            <span className="text-[10px] font-semibold text-white drop-shadow">쿠폰</span>
          </button>
        )}
        <button onClick={() => setShowItemsSheet(true)} className="flex flex-col items-center gap-1">
          <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-black/40">
            <LayoutList className="h-5 w-5 text-white" strokeWidth={1.75} />
            {items.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-[9px] font-extrabold text-black">
                {items.length}
              </span>
            )}
          </span>
          <span className="text-[10px] font-semibold text-white drop-shadow">상품 {items.length}</span>
        </button>
        {isHost && ongoing && (
          <button onClick={endBroadcast} className="flex flex-col items-center gap-1">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-red-500">
              <Square className="h-5 w-5 text-white" strokeWidth={2} />
            </span>
            <span className="text-[10px] font-semibold text-white drop-shadow">종료</span>
          </button>
        )}
      </div>

      {/* 채팅 오버레이 */}
      <div className="pointer-events-none absolute bottom-[155px] left-3 right-16 z-10 space-y-1">
        {chats.slice(-4).map((c) => (
          <p key={String(c.id)} className="line-clamp-1 flex items-center gap-1 text-[12px] leading-relaxed drop-shadow">
            {c.source === "youtube" ? (
              <span className="inline-flex flex-shrink-0 items-center gap-0.5 rounded bg-red-600 px-1 py-0.5 text-[10px] font-bold text-white">
                <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                YT
              </span>
            ) : (
              <span className="inline-flex flex-shrink-0 items-center rounded bg-green-500 px-1 py-0.5 text-[10px] font-bold text-white">레어팜</span>
            )}
            <span className={cn("font-bold", c.mine ? "text-brand-400" : "text-white/70")}>
              {c.source === "youtube" ? c.name : (c.mine ? c.name : maskNickname(c.name))}
            </span>
            <span className="text-white">{c.text}</span>
          </p>
        ))}
      </div>

      {/* 현재 경매 상품 카드 */}
      {isLive && currentItem && (
        <div className="absolute inset-x-3 bottom-[60px] z-10 flex items-center gap-3 rounded-2xl bg-black/75 p-2.5 backdrop-blur-sm">
          <ItemThumb item={currentItem} className="h-12 w-12 shrink-0 rounded-xl" seedFallback={currentItem.id} />
          <div className="min-w-0 flex-1">
            <p className="line-clamp-1 text-[13px] font-bold text-white">{currentItem.name}</p>
            <p className="text-[11px] text-white/70">
              현재가 <span className="font-extrabold text-brand-400">{formatPrice(currentPrice)}</span>
              {remainSec > 0 && (
                <span className={cn("ml-2 font-bold tabular-nums", remainSec <= 10 ? "text-red-400" : remainSec <= 30 ? "text-orange-400" : "text-white/70")}>
                  {Math.floor(remainSec / 60)}:{String(remainSec % 60).padStart(2, "0")}
                </span>
              )}
            </p>
          </div>
          {!isOwnItem && (
            <button
              onClick={() => {
                if (currentItem.suspended) { setSuspendedModal(true); return; }
                if (!joined) { if (!requireAuth()) return; setJoined(true); }
                placeBid(currentPrice + currentItem.bidUnit);
              }}
              className="shrink-0 rounded-full bg-brand-400 px-4 py-2.5 text-[13px] font-extrabold text-black active:brightness-90">
              경매 참여
            </button>
          )}
        </div>
      )}

      {/* 하단 진행바 (YouTube) — 현재 경매 상품 카드 바로 위 */}
      {youtubeId && (
        <div className="absolute inset-x-0 bottom-[130px] z-10 px-3">
          {ytProgress.duration > 0 ? (
            <div className="flex items-center gap-2">
              <div className="h-1 flex-1 cursor-pointer overflow-hidden rounded-full bg-white/25"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const ratio = (e.clientX - rect.left) / rect.width;
                  ytFrameRef.current?.contentWindow?.postMessage(
                    JSON.stringify({ event: "command", func: "seekTo", args: [ratio * ytProgress.duration, true] }), "*"
                  );
                }}>
                <div className="h-full rounded-full bg-brand-400 transition-all duration-500"
                  style={{ width: `${(ytProgress.current / ytProgress.duration) * 100}%` }} />
              </div>
              <span className="shrink-0 font-mono text-[10px] text-white/70">
                {String(Math.floor(ytProgress.current / 60)).padStart(2, "0")}:{String(Math.floor(ytProgress.current % 60)).padStart(2, "0")}
                {" / "}
                {String(Math.floor(ytProgress.duration / 60)).padStart(2, "0")}:{String(Math.floor(ytProgress.duration % 60)).padStart(2, "0")}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="h-1 flex-1 rounded-full bg-white/25">
                <div className="h-full w-full animate-pulse rounded-full bg-red-500/70" />
              </div>
              <span className="shrink-0 text-[10px] font-bold text-red-400">● LIVE</span>
            </div>
          )}
        </div>
      )}

      {/* 하단 입력 바 */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex items-center gap-2 px-3 pb-6 pt-2">
        <input value={chatInput} onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendChat()}
          placeholder={chatDisabled ? "라이브 중에만 채팅 가능" : "채팅을 입력하세요"}
          disabled={chatDisabled}
          className="h-10 min-w-0 flex-1 rounded-full border border-white/30 bg-black/50 px-4 text-sm text-white placeholder-white/50 outline-none focus:border-white/60 disabled:opacity-50"
        />
        <button onClick={sendChat} disabled={chatDisabled} aria-label="전송"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/50 text-white disabled:opacity-40">
          <Send className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>

      {/* 모바일 모달 */}
      <Modal open={suspendedModal} onClose={() => setSuspendedModal(false)} title="판매 중지 안내">
        <div className="pb-2 text-center">
          <Ban className="mx-auto mb-3 h-10 w-10 text-red-500" strokeWidth={1.5} />
          <p className="font-bold text-neutral-900">관리자에 의해 판매 중지된 상품입니다</p>
          <p className="mt-1 text-sm text-neutral-500">해당 상품은 경매에 참여할 수 없습니다.</p>
          <Button fullWidth className="mt-4" onClick={() => setSuspendedModal(false)}>확인</Button>
        </div>
      </Modal>
      <Modal open={buyNowConfirm} onClose={() => setBuyNowConfirm(false)} title="즉시 낙찰">
        {currentItem && (
          <div className="pb-2">
            <p className="mb-3 text-sm text-neutral-600">즉시 낙찰가로 낙찰받으시겠습니까?</p>
            <p className="text-center text-2xl font-extrabold text-neutral-900">{formatPrice(currentItem.buyNowPrice ?? 0)}</p>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" fullWidth onClick={() => setBuyNowConfirm(false)}>취소</Button>
              <Button fullWidth onClick={handleBuyNow}>즉시 낙찰받기</Button>
            </div>
          </div>
        )}
      </Modal>
      {winnerInfo && (
        <Modal open={!!winnerInfo} onClose={() => setWinnerInfo(null)} title={winnerInfo.mine ? "낙찰을 축하합니다!" : "낙찰 완료"}>
          <div className="pb-2 text-center">
            <Trophy className="mx-auto mb-2 h-12 w-12 text-brand-500" strokeWidth={1.5} />
            {winnerInfo.item && <ItemThumb item={winnerInfo.item} className="mx-auto mb-3 h-20 w-20 rounded-2xl" seedFallback={winnerInfo.item.id} />}
            <p className="font-bold text-neutral-900">{winnerInfo.itemName}</p>
            <p className="mt-1 text-2xl font-extrabold text-brand-600">{formatPrice(winnerInfo.price)}</p>
            <p className="mt-1 text-sm text-neutral-500">{maskNickname(winnerInfo.winnerName)} 님 낙찰</p>
            <Button fullWidth className="mt-4" onClick={() => setWinnerInfo(null)}>확인</Button>
          </div>
        </Modal>
      )}
      <BottomSheet open={showItemsSheet} onClose={() => setShowItemsSheet(false)} title="다른 경매 상품">
        <div className="px-1 pb-4">{itemListPanel}</div>
      </BottomSheet>
    </div>

    {/* ================================================================
        PC 전용: 풀뷰포트 다크 라이브 레이아웃
        ================================================================ */}
    <div className="fixed inset-0 z-50 hidden bg-black text-white md:flex">
      {/* 1. 좌측 아이콘 사이드바 */}
      <aside className="flex w-14 shrink-0 flex-col items-center border-r border-white/10 bg-neutral-950 py-3">
        <button onClick={() => router.push("/live-auction")} aria-label="뒤로"
          className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-300 transition-colors hover:bg-white/10 hover:text-white">
          <ChevronLeft className="h-5 w-5" strokeWidth={2} />
        </button>

        <div className="mt-4 flex flex-1 flex-col items-center gap-2">
          <button
            onClick={() => { setLiked((v) => !v); if (!liked) sendEffect("하트를 보냈습니다!"); }}
            className="flex flex-col items-center gap-0.5 text-neutral-400 transition-colors hover:text-white"
            aria-label="좋아요">
            <span className={cn("flex h-9 w-9 items-center justify-center rounded-full transition-colors", liked ? "bg-brand-400/20 text-brand-400" : "hover:bg-white/10")}>
              <Heart className={cn("h-5 w-5", liked && "fill-brand-400")} strokeWidth={1.75} />
            </span>
            <span className="text-[9px] font-semibold">좋아요</span>
          </button>
          <button onClick={() => toast("공유 링크가 복사되었습니다.", "info")}
            className="flex flex-col items-center gap-0.5 text-neutral-400 transition-colors hover:text-white" aria-label="공유">
            <span className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10">
              <Share2 className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <span className="text-[9px] font-semibold">공유</span>
          </button>
          <button onClick={() => setPcTab("benefit")}
            className={cn("flex flex-col items-center gap-0.5 transition-colors", pcTab === "benefit" ? "text-brand-400" : "text-neutral-400 hover:text-white")}
            aria-label="혜택">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10">
              <Gift className="h-5 w-5" strokeWidth={1.75} />
              {hasCoupons && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />}
            </span>
            <span className="text-[9px] font-semibold">혜택</span>
          </button>
          <button onClick={() => toast("장바구니 기능은 준비 중입니다.", "info")}
            className="flex flex-col items-center gap-0.5 text-neutral-400 transition-colors hover:text-white" aria-label="장바구니">
            <span className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10">
              <ShoppingCart className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <span className="text-[9px] font-semibold">장바구니</span>
          </button>
          <button onClick={() => toast("알림을 설정했습니다.", "info")}
            className="flex flex-col items-center gap-0.5 text-neutral-400 transition-colors hover:text-white" aria-label="알림">
            <span className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10">
              <Bell className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <span className="text-[9px] font-semibold">알림</span>
          </button>
        </div>

        <div className="flex flex-col items-center gap-0.5 pt-2 text-neutral-400">
          <Heart className="h-4 w-4 fill-brand-400 text-brand-400" strokeWidth={1.75} />
          <span className="text-[10px] font-bold text-white">{formatNumber(viewers + 273 + (liked ? 1 : 0))}</span>
        </div>
      </aside>

      {/* 2. 중앙 비디오 */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-black">
        <div className="relative aspect-[9/16] h-screen overflow-hidden bg-black">
          {(live.status === "scheduled" || live.status === "ended") ? (
            <CrtDreamScreen
              className="h-full w-full"
              status={live.status}
              scheduledAt={live.scheduledAt}
            />
          ) : youtubeId ? (
            <iframe ref={ytFrameRef}
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&playsinline=1&enablejsapi=1&controls=0&modestbranding=1&rel=0&fs=0&iv_load_policy=3`}
              title={live.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              style={{ position: "absolute", top: "50%", left: "50%", width: "177.78vh", minWidth: "100%", height: "calc(100% + 80px)", transform: "translate(-50%, calc(-50% - 40px))", border: "none" }}
            />
          ) : live.platform === "instagram" ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-8">
              <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF]">
                <Instagram className="h-10 w-10 text-white" strokeWidth={1.5} />
              </span>
              <p className="text-center text-base font-semibold text-white">Instagram 라이브</p>
              <p className="px-4 text-center text-xs leading-relaxed text-neutral-400">
                Instagram 라이브는 정책상 페이지 안에서 재생할 수 없어요.
              </p>
              <a href={live.videoUrl} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-neutral-900 transition-colors hover:bg-brand-400">
                <ExternalLink className="h-4 w-4" strokeWidth={1.75} /> Instagram에서 시청하기
              </a>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <CustomIcon name="sns-video" size={48} className="h-12 w-12 opacity-40 brightness-0 invert" />
              <a href={live.videoUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-brand-400 underline">방송 링크 열기</a>
            </div>
          )}

          {/* 상단 오버레이: 방송자 + 팔로우 / LIVE + 시청자 + 음소거 */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 bg-gradient-to-b from-black/70 to-transparent p-4">
            <div className="pointer-events-auto flex min-w-0 items-center gap-2.5">
              <Placeholder seed={seller?.avatar ?? live.sellerId} className="h-9 w-9 shrink-0 rounded-full ring-2 ring-white/30" showIcon={false} />
              <div className="min-w-0">
                <p className="line-clamp-1 text-sm font-bold text-white drop-shadow">{seller?.nickname ?? "판매자"}</p>
                <p className="text-[11px] text-white/70">{live.platform === "youtube" ? "YouTube LIVE" : "Instagram LIVE"}</p>
              </div>
              {!isHost && (
                <button onClick={() => toast("팔로우했습니다!", "info")}
                  className="ml-1 shrink-0 rounded-full bg-brand-400 px-3 py-1.5 text-[11px] font-bold text-black transition-colors hover:bg-brand-300">
                  <UserPlus className="mr-0.5 inline h-3 w-3" strokeWidth={2.5} />팔로우
                </button>
              )}
            </div>
            <div className="pointer-events-auto flex shrink-0 items-center gap-2">
              {isLive && <LiveBadge />}
              {isPaused && <span className="rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-extrabold text-white">일시정지</span>}
              {ongoing && (
                <span className="flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-[11px] font-semibold text-white">
                  <Eye className="h-3 w-3" strokeWidth={2} /> {formatNumber(viewers)}
                </span>
              )}
              {youtubeId && (
                <button onClick={toggleMute} aria-label={muted ? "음소거 해제" : "음소거"}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/80">
                  {muted ? <VolumeX className="h-4 w-4" strokeWidth={1.75} /> : <Volume2 className="h-4 w-4" strokeWidth={1.75} />}
                </button>
              )}
            </div>
          </div>

          {/* 모든 상품 완료 배너 */}
          {allItemsDone && (
            <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 flex -translate-y-1/2 justify-center">
              <span className="rounded-full bg-brand-500 px-3.5 py-1.5 text-[11px] font-extrabold text-neutral-900">
                모든 상품 경매 완료 · 방송은 계속됩니다
              </span>
            </div>
          )}

          {/* 하단 오버레이: 진행바 + 상품 고정 바 */}
          <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pb-3 pt-10">
            {youtubeId && (
              <div className="mb-2.5">
                {ytProgress.duration > 0 ? (
                  <div className="flex items-center gap-2">
                    <div className="h-1 flex-1 cursor-pointer overflow-hidden rounded-full bg-white/25"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const ratio = (e.clientX - rect.left) / rect.width;
                        ytFrameRef.current?.contentWindow?.postMessage(
                          JSON.stringify({ event: "command", func: "seekTo", args: [ratio * ytProgress.duration, true] }), "*"
                        );
                      }}>
                      <div className="h-full rounded-full bg-brand-400 transition-all duration-500"
                        style={{ width: `${(ytProgress.current / ytProgress.duration) * 100}%` }} />
                    </div>
                    <span className="shrink-0 font-mono text-[10px] text-white/70">
                      {String(Math.floor(ytProgress.current / 60)).padStart(2, "0")}:{String(Math.floor(ytProgress.current % 60)).padStart(2, "0")}
                      {" / "}
                      {String(Math.floor(ytProgress.duration / 60)).padStart(2, "0")}:{String(Math.floor(ytProgress.duration % 60)).padStart(2, "0")}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="h-1 flex-1 rounded-full bg-white/25">
                      <div className="h-full w-full animate-pulse rounded-full bg-red-500/70" />
                    </div>
                    <span className="shrink-0 text-[10px] font-bold text-red-400">● LIVE</span>
                  </div>
                )}
              </div>
            )}

            {/* 현재 경매 상품 고정 바 */}
            {isLive && currentItem && !currentItem.suspended && (
              <div className="flex items-center gap-3 rounded-2xl bg-black/70 p-2.5 backdrop-blur-sm">
                <ItemThumb item={currentItem} className="h-12 w-12 shrink-0 rounded-xl" seedFallback={currentItem.id} />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-[13px] font-bold text-white">{currentItem.name}</p>
                  <p className="text-[11px] text-white/70">
                    현재가 <span className="font-extrabold text-brand-400">{formatPrice(currentPrice)}</span>
                    {remainSec > 0 && (
                      <span className={cn("ml-2 font-bold tabular-nums", remainSec <= 10 ? "text-red-400" : remainSec <= 30 ? "text-orange-400" : "text-white/70")}>
                        {Math.floor(remainSec / 60)}:{String(remainSec % 60).padStart(2, "0")}
                      </span>
                    )}
                  </p>
                </div>
                {isOwnItem ? (
                  <span className="shrink-0 rounded-full bg-white/10 px-3 py-2 text-[11px] font-semibold text-white/70">내 상품</span>
                ) : (
                  <>
                    <button onClick={() => toast("장바구니 기능은 준비 중입니다.", "info")} aria-label="장바구니"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20">
                      <ShoppingCart className="h-4 w-4" strokeWidth={1.75} />
                    </button>
                    <button
                      onClick={() => {
                        if (currentItem.suspended) { setSuspendedModal(true); return; }
                        if (!requireAuth()) return;
                        if (currentItem.buyNowPrice !== null) {
                          setBuyNowConfirm(true);
                        } else {
                          setPcTab("auction");
                          if (!joined) { setJoined(true); toast("경매에 참여했습니다. 입찰해보세요!"); }
                        }
                      }}
                      className="shrink-0 rounded-full bg-brand-400 px-4 py-2.5 text-[13px] font-extrabold text-black transition-colors hover:bg-brand-300">
                      {currentItem.buyNowPrice !== null ? "구매하기" : "입찰하기"}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. 우측 정보 패널 */}
      <aside className="flex w-80 shrink-0 flex-col border-l border-white/10 bg-neutral-900">
        <div className="shrink-0 border-b border-white/10 p-4">
          <div className="flex items-center gap-2">
            {isLive && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-red-500 px-1.5 py-0.5 text-[10px] font-extrabold tracking-wider text-white">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                </span>
                ON AIR
              </span>
            )}
            {isPaused && <span className="shrink-0 rounded-md bg-neutral-700 px-1.5 py-0.5 text-[10px] font-extrabold text-white">일시정지</span>}
            {live.status === "scheduled" && <span className="shrink-0 rounded-md bg-neutral-700 px-1.5 py-0.5 text-[10px] font-extrabold text-white">예정</span>}
            {live.status === "ended" && <span className="shrink-0 rounded-md bg-neutral-700 px-1.5 py-0.5 text-[10px] font-extrabold text-neutral-300">종료</span>}
            <h1 className="line-clamp-1 flex-1 text-sm font-bold text-white">{live.title}</h1>
          </div>
          <p className="mt-1.5 line-clamp-1 text-[11px] text-neutral-400">
            {seller?.nickname ?? "판매자"} · 경매 상품 {items.length}개
            {live.expectedMinutes ? ` · 약 ${live.expectedMinutes}분` : ""}
          </p>
        </div>

        <div className="flex shrink-0 border-b border-white/10">
          {PC_TABS.map((t) => (
            <button key={t.key} onClick={() => setPcTab(t.key)}
              className={cn("relative flex-1 py-3 text-[12px] font-semibold transition-colors",
                pcTab === t.key ? "text-brand-400" : "text-neutral-500 hover:text-neutral-200"
              )}>
              <span className="inline-flex items-center gap-1">
                {t.label}
                {t.key === "benefit" && hasCoupons && <span className="h-1.5 w-1.5 rounded-full bg-red-500" />}
              </span>
              {pcTab === t.key && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand-400" />}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-brand-400 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1.5">
          {pcTab === "items" ? pcItemsDark : pcTab === "auction" ? pcAuctionDark : pcTab === "info" ? pcInfoDark : pcBenefitDark}
        </div>

        {/* 하단: 실시간 채팅 */}
        <div className="flex h-[42%] shrink-0 flex-col border-t border-white/10 bg-neutral-950/60">
          <div className="flex shrink-0 items-center justify-between px-4 pt-3">
            <p className="flex items-center gap-1.5 text-xs font-bold text-white">
              <CustomIcon name="trade-comment" size={16} className="h-4 w-4 opacity-80 brightness-0 invert" />
              실시간 채팅
            </p>
            {ongoing && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-neutral-400">
                <Eye className="h-3 w-3" strokeWidth={2} /> {formatNumber(viewers)}
              </span>
            )}
          </div>
          {live.pinnedNotice && (
            <div className="mx-4 mt-2 flex shrink-0 items-start gap-1.5 rounded-lg bg-brand-400/10 px-3 py-2 text-xs text-brand-200">
              <Pin className="mt-0.5 h-3 w-3 shrink-0 text-brand-400" strokeWidth={2} />
              <span className="font-semibold">{live.pinnedNotice}</span>
            </div>
          )}
          <div ref={pcChatRef}
            className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-4 py-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1">
            {chats.map((c) => (
              <p key={String(c.id)} className="animate-in flex flex-wrap items-center gap-1 text-[13px] leading-relaxed">
                {c.source === "youtube" ? (
                  <span className="inline-flex flex-shrink-0 items-center gap-0.5 rounded bg-red-600 px-1 py-0.5 text-[10px] font-bold text-white">
                    <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
                    YT
                  </span>
                ) : (
                  <span className="inline-flex flex-shrink-0 items-center rounded bg-green-500 px-1 py-0.5 text-[10px] font-bold text-white">레어팜</span>
                )}
                <span className={cn("font-bold", c.mine ? "text-brand-400" : "text-neutral-400")}>
                  {c.source === "youtube" ? c.name : (c.mine ? c.name : maskNickname(c.name))}
                </span>
                <span className="text-neutral-100">{c.text}</span>
              </p>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-2 px-3 pb-3 pt-1">
            <input value={chatInput} onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChat()}
              placeholder={live.chatEnabled === false ? "판매자가 채팅을 금지했습니다" : isLive ? "채팅을 입력하세요" : "라이브 중에만 채팅할 수 있어요"}
              disabled={chatDisabled}
              className="h-10 min-w-0 flex-1 rounded-full border border-white/15 bg-neutral-800 px-4 text-sm text-white placeholder-neutral-500 outline-none focus:border-brand-400 disabled:opacity-50"
            />
            <button onClick={sendChat} disabled={chatDisabled} aria-label="전송"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-400 text-black transition-colors hover:bg-brand-300 disabled:cursor-not-allowed disabled:opacity-40">
              <Send className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </aside>

      {/* PC 모달 */}
      <Modal open={suspendedModal} onClose={() => setSuspendedModal(false)} title="판매 중지 안내">
        <div className="pb-2 text-center">
          <Ban className="mx-auto mb-3 h-10 w-10 text-red-500" strokeWidth={1.5} />
          <p className="font-bold text-neutral-900">관리자에 의해 판매 중지된 상품입니다</p>
          <p className="mt-1 text-sm text-neutral-500">해당 상품은 경매에 참여할 수 없습니다.</p>
          <Button fullWidth className="mt-4" onClick={() => setSuspendedModal(false)}>확인</Button>
        </div>
      </Modal>

      <Modal open={buyNowConfirm} onClose={() => setBuyNowConfirm(false)} title="즉시 낙찰">
        {currentItem && (
          <div className="pb-2">
            <div className="flex items-center gap-3 rounded-xl bg-neutral-50 p-3">
              <ItemThumb item={currentItem} className="h-12 w-12 rounded-lg" />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm font-bold text-neutral-900">{currentItem.name}</p>
                <p className="text-xs text-neutral-500">즉시 낙찰가 <span className="font-extrabold text-neutral-900">{formatPrice(currentItem.buyNowPrice)}</span></p>
              </div>
            </div>
            <p className="mt-3 text-center text-sm text-neutral-500">즉시 낙찰 시 바로 경매가 종료되고 낙찰자로 확정됩니다.</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setBuyNowConfirm(false)}>취소</Button>
              <Button onClick={handleBuyNow}>즉시 낙찰받기</Button>
            </div>
          </div>
        )}
      </Modal>

      {winnerInfo && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 px-6" onClick={() => setWinnerInfo(null)}>
          <div className="animate-pop relative w-full max-w-sm overflow-hidden rounded-3xl bg-white p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24">
              {[8, 22, 38, 55, 70, 86].map((left, i) => (
                <span key={i} className="animate-confetti absolute top-0 block h-2 w-2 rounded-sm"
                  style={{ left: `${left}%`, background: i % 3 === 0 ? "#F5C518" : i % 3 === 1 ? "#111111" : "#FFD700", animationDelay: `${i * 0.22}s` }} />
              ))}
            </div>
            <div className="relative mx-auto mb-3 h-20 w-20">
              <span className="animate-win-spin absolute inset-0 rounded-full border-2 border-dashed border-brand-400" />
              <span className="hex-clip absolute inset-2 flex items-center justify-center bg-gradient-to-br from-[#FFD700] to-brand-500">
                <Trophy className="h-8 w-8 text-neutral-900" strokeWidth={1.5} />
              </span>
            </div>
            <p className="flex items-center justify-center gap-1 text-lg font-extrabold text-neutral-900">
              <Sparkles className="h-4 w-4 text-brand-600" strokeWidth={2} />
              {winnerInfo.mine ? "축하합니다! 낙찰 성공" : "낙찰이 완료되었습니다"}
              <Sparkles className="h-4 w-4 text-brand-600" strokeWidth={2} />
            </p>
            {winnerInfo.item && <ItemThumb item={winnerInfo.item} className="mx-auto mt-3 h-20 w-20 rounded-2xl ring-2 ring-brand-400" seedFallback={winnerInfo.item.id} />}
            <p className="mt-2 line-clamp-2 text-sm font-semibold text-neutral-700">{winnerInfo.itemName}</p>
            <div className="mt-3 rounded-2xl bg-neutral-900 px-4 py-3">
              <p className="text-[11px] text-neutral-400">낙찰자</p>
              <p className="text-sm font-bold text-white">
                {winnerInfo.mine ? `${winnerInfo.winnerName} (나)` : maskNickname(winnerInfo.winnerName)}
              </p>
              <p className="mt-1 text-xl font-extrabold text-brand-400">{formatPrice(winnerInfo.price)}</p>
            </div>
            <p className="mt-3 text-[11px] text-neutral-400">3초 후 자동으로 닫히고 다음 상품 경매로 전환됩니다.</p>
            <Button fullWidth className="mt-3" onClick={() => setWinnerInfo(null)}>확인</Button>
          </div>
        </div>
      )}

      {failedNotice && (
        <div className="pointer-events-none fixed inset-0 z-[95] flex items-center justify-center px-6">
          <div className="animate-pop rounded-2xl bg-neutral-900/95 px-6 py-5 text-center shadow-xl ring-1 ring-white/10">
            <Ban className="mx-auto mb-2 h-7 w-7 text-neutral-400" strokeWidth={1.5} />
            <p className="font-bold text-white">유찰되었습니다</p>
            <p className="mt-0.5 text-xs text-neutral-400">다음 상품으로 자동 전환됩니다.</p>
          </div>
        </div>
      )}
    </div>

    {/* 쿠폰 받기 모달 (모바일·PC 공용) */}
    <Modal open={couponModal} onClose={() => setCouponModal(false)} title="쿠폰 받기">
      <div className="pb-2">
        <p className="mb-3 text-sm text-neutral-500">이 라이브 방송에서 사용할 수 있는 할인 쿠폰이에요. 받은 쿠폰은 마이페이지 쿠폰함에서 확인할 수 있습니다.</p>
        <div className="space-y-2">
          {liveCouponList.map((c) => {
            const received = issuedCouponIds.includes(c.id);
            const soldout = c.totalCount !== undefined && c.issuedCount >= c.totalCount;
            return (
              <div key={c.id} className={cn(
                "flex items-center gap-3 rounded-xl border p-3",
                received ? "border-neutral-100 bg-neutral-50" : "border-brand-300 bg-brand-50/50"
              )}>
                <div className="hex-clip flex h-12 w-12 shrink-0 items-center justify-center bg-brand-400">
                  <Ticket className="h-5 w-5 text-neutral-900" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-bold text-neutral-900">{c.name}</p>
                  <p className="text-sm font-extrabold text-brand-700">{couponDiscountLabel(c.discountType, c.discountValue)}</p>
                  <p className="mt-0.5 text-[11px] text-neutral-500">
                    발급 후 {c.expiryDays}일 유효{c.minOrderAmount ? ` · 최소 ${formatPrice(c.minOrderAmount)}` : ""}
                  </p>
                </div>
                <Button size="sm" variant={received ? "outline" : "primary"} disabled={received || soldout} onClick={() => receiveCoupon(c.id)}>
                  {received ? "받음" : soldout ? "소진" : "받기"}
                </Button>
              </div>
            );
          })}
        </div>
        <Button fullWidth className="mt-4" variant="outline" onClick={() => setCouponModal(false)}>닫기</Button>
      </div>
    </Modal>
  </>
  );
}

// ==================== 보조 컴포넌트 ====================

function LiveBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-red-500 px-1.5 py-0.5 text-[10px] font-extrabold tracking-wider text-white">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
      </span>
      LIVE
    </span>
  );
}

const NO_IMAGE_STICKERS = [
  "/레어팜_이미지없음_공통.svg",
  "/레어팜_이미지없음_식물.svg",
  "/레어팜_이미지없음_파충류.svg",
] as const;

function getNoImageSticker(id: string): string {
  return NO_IMAGE_STICKERS[id.charCodeAt(0) % 3];
}

// 경매 상품 썸네일 (이미지 URL 우선, 없으면 노이미지 스티커)
function ItemThumb({ item, className, seedFallback }: { item: AuctionItem; className?: string; seedFallback?: string }) {
  const url = item.images?.[item.thumbIndex ?? 0];
  if (url)
    return (
      <div className={cn("relative shrink-0 overflow-hidden", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />
      </div>
    );
  const sticker = getNoImageSticker(item.id ?? seedFallback ?? item.image ?? "live");
  return (
    <div className={cn("relative shrink-0 overflow-hidden bg-neutral-50", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={sticker} alt="이미지 없음" className="absolute inset-0 h-full w-full object-contain" />
    </div>
  );
}

function ItemList({
  items,
  live,
  ongoing,
  onItemClick,
}: {
  items: AuctionItem[];
  live: LiveAuction;
  ongoing: boolean;
  onItemClick: (item: AuctionItem) => void;
}) {
  return (
    <div className="bg-white p-4 md:rounded-2xl md:border md:border-neutral-200">
      <p className="mb-3 text-sm font-bold text-neutral-900">
        방송 경매 상품 <span className="text-neutral-400">({items.length})</span>
      </p>
      <div className="space-y-2">
        {items.map((it, idx) => {
          const isCurrent = ongoing && idx === live.currentItemIndex;
          const done = it.status === "sold" || it.status === "failed";
          return (
            <button key={it.id} onClick={() => onItemClick(it)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors",
                isCurrent ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500" : "border-neutral-100 hover:border-brand-300 hover:bg-brand-50/40",
                it.suspended && "opacity-70",
                done && !isCurrent && "opacity-80"
              )}>
              <span className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                isCurrent ? "bg-neutral-900 text-brand-400" : "bg-neutral-100 text-neutral-400"
              )}>
                {idx + 1}
              </span>
              <ItemThumb item={it} className="h-12 w-12 rounded-lg" />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm font-semibold text-neutral-900">{it.name}</p>
                <p className="text-[11px] text-neutral-400">
                  시작가 {formatPrice(it.startPrice)} · 단위 {formatPrice(it.bidUnit)}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-1">
                  {it.suspended ? (
                    <Badge tone="red">판매중지</Badge>
                  ) : isCurrent ? (
                    <Badge tone="brand">경매 진행 중</Badge>
                  ) : (
                    <Badge tone={it.status === "sold" ? "green" : it.status === "failed" ? "neutral" : "amber"}>
                      {it.status === "waiting" ? "예정" : auctionItemStatusLabels[it.status]}
                    </Badge>
                  )}
                  {it.status === "sold" && it.finalPrice !== null && (
                    <span className="text-[11px] font-bold text-neutral-700">
                      {formatPrice(it.finalPrice)} · {maskNickname(it.winnerName ?? "")}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-center text-[11px] text-neutral-300">
        라이브 경매 목록으로 돌아가려면{" "}
        <Link href="/live-auction" className="font-semibold text-brand-600 underline">여기</Link>
        를 눌러주세요.
      </p>
    </div>
  );
}
