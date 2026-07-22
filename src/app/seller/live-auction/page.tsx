"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  Radio,
  ImagePlus,
  ArrowUp,
  ArrowDown,
  Play,
  Pause,
  Square,
  ExternalLink,
  CalendarClock,
  Eye,
  Gavel,
  Trophy,
  Coins,
  Pencil,
  MessageSquare,
  PackagePlus,
  Pin,
  SkipForward,
  Tag,
  X,
  Lock,
  Globe,
  Timer,
  Settings,
  Youtube,
  Ticket,
  Trash2,
  Plus,
  Percent,
  Gift,
  Copy,
  Share2,
  Cast,
  Bell,
  Hash,
  LayoutDashboard,
} from "lucide-react";
import { SellerLayout } from "@/components/seller/SellerLayout";
import { Panel, StatusPill, ActionButton } from "@/components/admin/AdminUI";
import { Button } from "@/components/common/Button";
import { Badge } from "@/components/common/Badge";
import { Modal } from "@/components/common/Modal";
import {
  auctionService,
  auctionItemStatusLabels,
  liveStatusLabels,
  auctionDurationOptions,
  durationLabel,
} from "@/lib/auctionService";
import { couponService, couponDiscountLabel } from "@/lib/couponService";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { useStoreVersion } from "@/lib/useStore";
import { formatPrice, formatNumber, cn } from "@/lib/utils";
import type { AuctionItem, LiveAuction, LiveAuctionStatus, LivePlatform, LiveCoupon } from "@/types";

const liveTone: Record<LiveAuctionStatus, "green" | "red" | "amber" | "neutral"> = {
  scheduled: "neutral",
  live: "amber",
  paused: "red",
  ended: "green",
};

const DEFAULT_ITEM_DURATION = 300;

// 라이브 생성 시 선택 가능한 기본 혜택 배지 옵션
const BADGE_PRESETS = [
  "무료배송",
  "적립금",
  "할인쿠폰",
  "사은품",
  "선착순 특가",
  "무료반품",
];

type LiveTab = "ongoing" | "past" | "settings";

const inputCls =
  "w-full rounded-xl border border-neutral-300 px-3 py-3 text-sm outline-none focus:border-brand-500";

export default function SellerLiveAuctionPage() {
  useStoreVersion();
  const { user } = useAuth();
  const { toast } = useToast();

  // ---- 라이브 방송 생성 폼 상태 ----
  const [title, setTitle] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [platform, setPlatform] = useState<LivePlatform>("youtube");
  const [videoUrl, setVideoUrl] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [itemDurations, setItemDurations] = useState<Record<string, number>>({});
  const [isPublic, setIsPublic] = useState(true);
  const [selectedCouponIds, setSelectedCouponIds] = useState<string[]>([]);
  const [badges, setBadges] = useState<string[]>([]);
  const [badgeInput, setBadgeInput] = useState("");
  const [tab, setTab] = useState<LiveTab>("ongoing");
  // 라이브 생성 모달 열림 여부
  const [showCreate, setShowCreate] = useState(false);
  // 썸네일 파일 첨부용 input ref
  const thumbFileRef = useRef<HTMLInputElement>(null);

  // 썸네일 파일 선택 → 로컬 미리보기 URL 생성
  function onThumbFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbnailUrl(URL.createObjectURL(file));
    e.target.value = "";
  }

  const myItems = user ? auctionService.getItems({ sellerId: user.id }) : [];
  // 라이브에 넣을 수 있는 상품: 대기중 + 판매중지 아님
  const selectable = myItems.filter((i) => i.status === "waiting" && !i.suspended);
  const lives = user ? auctionService.getLivesForSeller(user.id) : [];
  // 판매자가 발급한 쿠폰 목록 (생성 폼의 쿠폰 첨부 · 설정 탭 공용)
  const myCoupons = user ? couponService.getLiveCoupons(user.id) : [];
  // 진행 중 라이브 경매: 종료되지 않은 라이브(예정/진행중/일시정지) · 지난 라이브 경매: 종료된 라이브
  const tabLives = lives.filter((l) =>
    tab === "past" ? l.status === "ended" : l.status !== "ended"
  );
  const ongoingCount = lives.filter((l) => l.status !== "ended").length;
  const pastCount = lives.filter((l) => l.status === "ended").length;

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function moveSelected(index: number, dir: -1 | 1) {
    setSelectedIds((prev) => {
      const to = index + dir;
      if (to < 0 || to >= prev.length) return prev;
      const arr = prev.slice();
      [arr[index], arr[to]] = [arr[to], arr[index]];
      return arr;
    });
  }

  function addTag() {
    const t = tagInput.trim().replace(/^#/, "");
    if (!t) return;
    if (tags.length >= 5) return toast("태그는 최대 5개까지 등록할 수 있습니다.", "error");
    if (tags.includes(t)) return setTagInput("");
    setTags([...tags, t]);
    setTagInput("");
  }

  // 혜택 배지 토글 (프리셋 선택)
  function toggleBadge(b: string) {
    setBadges((prev) =>
      prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]
    );
  }

  // 혜택 배지 직접 입력 추가 (커스텀)
  function addCustomBadge() {
    const b = badgeInput.trim();
    if (!b) return;
    if (badges.includes(b)) return setBadgeInput("");
    setBadges([...badges, b]);
    setBadgeInput("");
  }

  function create() {
    if (!user) return;
    if (!title.trim()) return toast("방송 제목을 입력해주세요.", "error");
    if (!videoUrl.trim())
      return toast(
        platform === "youtube"
          ? "YouTube 라이브 URL을 입력해주세요."
          : "Instagram 라이브 URL을 입력해주세요.",
        "error"
      );
    if (!scheduledAt) return toast("방송 예정 시간을 선택해주세요.", "error");
    if (selectedIds.length === 0)
      return toast("경매할 상품을 1개 이상 선택해주세요.", "error");
    auctionService.createLive({
      sellerId: user.id,
      title: title.trim(),
      videoUrl: videoUrl.trim(),
      itemIds: selectedIds,
      scheduledAt: new Date(scheduledAt).toISOString(),
      thumbnailUrl: thumbnailUrl.trim() || undefined,
      tags,
      isPublic,
      itemDurations,
      couponIds: selectedCouponIds,
      badges,
    });
    setTitle("");
    setThumbnailUrl("");
    setVideoUrl("");
    setScheduledAt("");
    setTags([]);
    setSelectedIds([]);
    setItemDurations({});
    setIsPublic(true);
    setSelectedCouponIds([]);
    setBadges([]);
    setBadgeInput("");
    setShowCreate(false);
    toast("라이브 경매가 생성되었습니다.");
  }

  return (
    <SellerLayout title="라이브 경매 관리">
      {/* ==================== 상단: 탭 + 새 라이브 생성 버튼 ==================== */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex w-full items-center gap-1.5 overflow-x-auto pb-0.5 sm:w-auto sm:overflow-visible sm:pb-0">
          <TabButton active={tab === "ongoing"} onClick={() => setTab("ongoing")}>
            <span className="inline-flex items-center gap-1.5">
              진행 중 라이브 경매
              {ongoingCount > 0 && (
                <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold text-brand-600">{ongoingCount}</span>
              )}
            </span>
          </TabButton>
          <TabButton active={tab === "past"} onClick={() => setTab("past")}>
            <span className="inline-flex items-center gap-1.5">
              지난 라이브 경매
              {pastCount > 0 && (
                <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold text-brand-600">{pastCount}</span>
              )}
            </span>
          </TabButton>
          <TabButton active={tab === "settings"} onClick={() => setTab("settings")}>
            <span className="inline-flex items-center gap-1.5">
              <Settings className="h-4 w-4" strokeWidth={1.75} /> 설정
            </span>
          </TabButton>
        </div>
        {tab !== "settings" && (
          <Button onClick={() => setShowCreate(true)} className="w-full sm:w-auto">
            <Radio className="h-4 w-4" strokeWidth={1.75} /> 새 라이브 경매 생성
          </Button>
        )}
      </div>

      {/* ==================== 방송 목록 ==================== */}
      {tab !== "settings" && (
        <div className="space-y-4">
          {tabLives.map((l) => (
            <LiveCard key={l.id} live={l} sellerItems={myItems} />
          ))}
          {tabLives.length === 0 && (
            <Panel title={tab === "past" ? "지난 라이브 경매" : "진행 중 라이브 경매"}>
              <p className="px-3 py-10 text-center text-sm text-neutral-400">
                {tab === "past"
                  ? "종료된 라이브 경매가 없습니다."
                  : "진행 중이거나 예정된 라이브 경매가 없습니다. 상단의 '새 라이브 경매 생성' 버튼으로 시작해보세요."}
              </p>
            </Panel>
          )}
        </div>
      )}

      {/* ==================== 설정 탭 ==================== */}
      {tab === "settings" && user && (
        <SettingsPanel sellerId={user.id} coupons={myCoupons} />
      )}

      {/* ==================== 오른쪽 하단 라이브경매보기 버튼 ==================== */}
      <Link
        href="/live-auction"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 flex-col items-center justify-center gap-0.5 rounded-full bg-brand-500 shadow-lg transition-transform hover:scale-105 hover:shadow-xl"
      >
        <Cast className="h-6 w-6 text-neutral-900" strokeWidth={1.75} />
        <span className="text-[9px] font-bold text-neutral-900">LIVE</span>
      </Link>

      {/* ==================== 라이브 경매 생성 모달 ==================== */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="새 라이브 경매 생성">
        <div className="max-h-[70vh] space-y-4 overflow-y-auto pb-1 pr-1">
            <Field label="방송 제목">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 건프라 한정판 심야 라이브 경매"
                className={inputCls}
              />
            </Field>

            <Field label="썸네일 이미지 (선택)">
              <div className="flex gap-2">
                <input
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className={cn(inputCls, "min-w-0 flex-1")}
                />
                <button
                  type="button"
                  onClick={() => thumbFileRef.current?.click()}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-neutral-300 px-3 text-sm font-semibold text-neutral-600 transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-neutral-900"
                >
                  <ImagePlus className="h-4 w-4" strokeWidth={1.75} /> 파일 첨부
                </button>
                <input
                  ref={thumbFileRef}
                  type="file"
                  accept="image/*"
                  onChange={onThumbFile}
                  className="hidden"
                  aria-label="썸네일 이미지 파일 첨부"
                />
              </div>
              {thumbnailUrl.trim() && (
                <div className="relative mt-2 h-24 w-full overflow-hidden rounded-lg bg-neutral-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumbnailUrl} alt="썸네일 미리보기" className="absolute inset-0 h-full w-full object-cover" />
                </div>
              )}
            </Field>

            {/* 플랫폼 선택 */}
            <Field label="방송 플랫폼 (둘 중 하나 선택)">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPlatform("youtube")}
                  className={cn(
                    "rounded-xl border py-2.5 text-sm font-bold transition-colors",
                    platform === "youtube"
                      ? "border-neutral-900 bg-neutral-900 text-brand-400"
                      : "border-neutral-200 text-neutral-500 hover:border-brand-400 hover:bg-brand-50"
                  )}
                >
                  YouTube 라이브
                </button>
                <button
                  type="button"
                  onClick={() => toast("Instagram 라이브는 현재 준비 중입니다.", "info")}
                  className="cursor-not-allowed rounded-xl border border-neutral-200 py-2.5 text-sm font-bold text-neutral-300 opacity-50"
                >
                  Instagram 라이브
                </button>
              </div>
              <input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder={
                  platform === "youtube"
                    ? "https://www.youtube.com/watch?v=..."
                    : "https://www.instagram.com/계정명/live"
                }
                className={cn(inputCls, "mt-2")}
              />
            </Field>

            <Field label="예정 시작시간">
              <div className="rounded-xl border border-green-200 bg-green-100 p-3">
                <div className="flex gap-2">
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    style={{ colorScheme: 'light' }}
                    className={cn(inputCls, "min-w-0 flex-1 bg-white")}
                  />
                  <button
                    type="button"
                    onClick={() => scheduledAt && toast("예정 시작시간이 설정되었습니다.", "info")}
                    disabled={!scheduledAt}
                    className="inline-flex shrink-0 items-center rounded-xl border border-brand-500 bg-brand-500 px-3.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:bg-neutral-100 disabled:text-neutral-400"
                  >
                    확인
                  </button>
                </div>
              </div>
              {scheduledAt && (
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2.5">
                  <CalendarClock className="h-4 w-4 shrink-0 text-brand-700" strokeWidth={1.75} />
                  <div>
                    <p className="text-xs text-brand-600">예정 시작시간 확인</p>
                    <p className="text-sm font-bold text-neutral-900">
                      {new Date(scheduledAt).toLocaleString("ko-KR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        weekday: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              )}
            </Field>

            {/* 태그 */}
            <Field label={`태그 (${tags.length}/5)`}>
              <div className="flex gap-2">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="키워드 입력 후 Enter"
                  className={cn(inputCls, "min-w-0 flex-1")}
                />
                <Button variant="outline" onClick={addTag}>
                  추가
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 rounded-full bg-neutral-900 px-2.5 py-1 text-[11px] font-semibold text-brand-400"
                    >
                      <Tag className="h-3 w-3" strokeWidth={2} /> {t}
                      <button
                        onClick={() => setTags(tags.filter((x) => x !== t))}
                        aria-label={`${t} 태그 제거`}
                      >
                        <X className="h-3 w-3" strokeWidth={2} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </Field>

            {/* 상품 선택 */}
            <Field label={`경매 상품 선택 (${selectedIds.length}개 선택)`}>
              <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-xl border border-neutral-200 p-2">
                {selectable.map((it) => {
                  const checked = selectedIds.includes(it.id);
                  return (
                    <button
                      key={it.id}
                      onClick={() => toggleSelect(it.id)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg border p-2 text-left transition-colors",
                        checked
                          ? "border-brand-500 bg-brand-50"
                          : "border-neutral-100 hover:border-brand-300 hover:bg-brand-50/40"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[10px] font-bold",
                          checked
                            ? "border-neutral-900 bg-neutral-900 text-brand-400"
                            : "border-neutral-300 text-transparent"
                        )}
                      >
                        ✓
                      </span>
                      <ItemThumb item={it} className="h-9 w-9 rounded-lg" />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-medium text-neutral-800">{it.name}</p>
                        <p className="text-xs text-neutral-400">시작가 {formatPrice(it.startPrice)}</p>
                      </div>
                    </button>
                  );
                })}
                {selectable.length === 0 && (
                  <p className="px-2 py-6 text-center text-sm text-neutral-400">
                    대기중인 경매 상품이 없습니다.
                    <br />
                    먼저 경매 상품을 등록해주세요.
                  </p>
                )}
              </div>
            </Field>

            {/* 선택된 상품 순서/시간 설정 */}
            {selectedIds.length > 0 && (
              <Field label="진행 순서 · 상품별 경매 시간">
                <div className="space-y-1.5 rounded-xl border border-brand-200 bg-brand-50/50 p-2">
                  {selectedIds.map((id, idx) => {
                    const it = myItems.find((x) => x.id === id);
                    if (!it) return null;
                    return (
                      <div key={id} className="flex items-center gap-2 rounded-lg bg-white p-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-brand-400">
                          {idx + 1}
                        </span>
                        <p className="line-clamp-1 min-w-0 flex-1 text-xs font-medium text-neutral-800">
                          {it.name}
                        </p>
                        <select
                          value={itemDurations[id] ?? it.durationSec ?? DEFAULT_ITEM_DURATION}
                          onChange={(e) =>
                            setItemDurations({ ...itemDurations, [id]: Number(e.target.value) })
                          }
                          className="shrink-0 rounded-lg border border-neutral-200 px-1.5 py-1 text-[11px] outline-none focus:border-brand-500"
                          aria-label="경매 시간"
                        >
                          {auctionDurationOptions.map((d) => (
                            <option key={d.sec} value={d.sec}>
                              {d.label}
                            </option>
                          ))}
                        </select>
                        <div className="flex shrink-0 gap-1">
                          <IconBtn onClick={() => moveSelected(idx, -1)} label="위로">
                            <ArrowUp className="h-3 w-3" strokeWidth={2} />
                          </IconBtn>
                          <IconBtn onClick={() => moveSelected(idx, 1)} label="아래로">
                            <ArrowDown className="h-3 w-3" strokeWidth={2} />
                          </IconBtn>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Field>
            )}

            {/* 공개/비공개 */}
            <Field label="공개 설정">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsPublic(true)}
                  className={cn(
                    "inline-flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-bold transition-colors",
                    isPublic
                      ? "border-neutral-900 bg-neutral-900 text-brand-400"
                      : "border-neutral-200 text-neutral-500 hover:border-brand-400"
                  )}
                >
                  <Globe className="h-4 w-4" strokeWidth={1.75} /> 공개
                </button>
                <button
                  type="button"
                  onClick={() => setIsPublic(false)}
                  className={cn(
                    "inline-flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-bold transition-colors",
                    !isPublic
                      ? "border-neutral-900 bg-neutral-900 text-brand-400"
                      : "border-neutral-200 text-neutral-500 hover:border-brand-400"
                  )}
                >
                  <Lock className="h-4 w-4" strokeWidth={1.75} /> 비공개
                </button>
              </div>
            </Field>

            {/* 혜택 배지 */}
            <Field label={`혜택 배지 (${badges.length}개 선택)`}>
              <div className="flex flex-wrap gap-1.5">
                {BADGE_PRESETS.map((b) => {
                  const checked = badges.includes(b);
                  return (
                    <button
                      key={b}
                      type="button"
                      onClick={() => toggleBadge(b)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                        checked
                          ? "border-neutral-900 bg-neutral-900 text-brand-400"
                          : "border-neutral-200 text-neutral-500 hover:border-brand-400 hover:bg-brand-50"
                      )}
                    >
                      <Gift className="h-3 w-3" strokeWidth={2} /> {b}
                    </button>
                  );
                })}
              </div>
              {/* 직접 입력 커스텀 배지 */}
              <div className="mt-2 flex gap-2">
                <input
                  value={badgeInput}
                  onChange={(e) => setBadgeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomBadge();
                    }
                  }}
                  placeholder="직접 입력 후 Enter (예: 방송 한정 특가)"
                  className={cn(inputCls, "min-w-0 flex-1")}
                />
                <Button variant="outline" onClick={addCustomBadge}>
                  추가
                </Button>
              </div>
              {/* 선택/추가된 배지 목록 */}
              {badges.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {badges.map((b) => (
                    <span
                      key={b}
                      className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2.5 py-1 text-[11px] font-semibold text-brand-800"
                    >
                      {b}
                      <button
                        onClick={() => setBadges(badges.filter((x) => x !== b))}
                        aria-label={`${b} 배지 제거`}
                      >
                        <X className="h-3 w-3" strokeWidth={2} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </Field>

            {/* 쿠폰 첨부 */}
            <Field label={`쿠폰 첨부 (${selectedCouponIds.length}개 선택)`}>
              {myCoupons.length > 0 ? (
                <div className="space-y-1.5 rounded-xl border border-neutral-200 p-2">
                  {myCoupons.map((c) => {
                    const checked = selectedCouponIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() =>
                          setSelectedCouponIds((prev) =>
                            prev.includes(c.id)
                              ? prev.filter((x) => x !== c.id)
                              : [...prev, c.id]
                          )
                        }
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-lg border p-2 text-left transition-colors",
                          checked
                            ? "border-brand-500 bg-brand-50"
                            : "border-neutral-100 hover:border-brand-300 hover:bg-brand-50/40"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[10px] font-bold",
                            checked
                              ? "border-neutral-900 bg-neutral-900 text-brand-400"
                              : "border-neutral-300 text-transparent"
                          )}
                        >
                          ✓
                        </span>
                        <Ticket className="h-4 w-4 shrink-0 text-brand-600" strokeWidth={1.75} />
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 text-sm font-medium text-neutral-800">{c.name}</p>
                          <p className="text-xs text-neutral-400">
                            {couponDiscountLabel(c.discountType, c.discountValue)} · 발급 후 {c.expiryDays}일
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-neutral-200 px-3 py-6 text-center text-xs text-neutral-400">
                  발급한 쿠폰이 없습니다. 설정 탭에서 먼저 쿠폰을 만들어주세요.
                </p>
              )}
            </Field>

            <Button fullWidth onClick={create}>
              <Radio className="h-4 w-4" strokeWidth={1.75} /> 라이브 경매 생성하기
            </Button>
        </div>
      </Modal>
    </SellerLayout>
  );
}

// ==================== 설정 탭 ====================

// ==================== 설정 탭 ====================

type SettingsSubTab = "youtube" | "coupon";

function SettingsPanel({ sellerId, coupons }: { sellerId: string; coupons: LiveCoupon[] }) {
  const { toast } = useToast();
  const [subTab, setSubTab] = useState<SettingsSubTab>("youtube");

  // ---- YouTube API 키 ----
  const savedKey = couponService.getSellerYoutubeApiKey(sellerId);
  const [apiKey, setApiKey] = useState(savedKey);

  function saveApiKey() {
    couponService.saveSellerYoutubeApiKey(sellerId, apiKey.trim());
    toast("YouTube API 키가 저장되었습니다.");
  }

  // ---- 쿠폰 생성 폼 ----
  const [cName, setCName] = useState("");
  const [cType, setCType] = useState<"percent" | "fixed">("percent");
  const [cValue, setCValue] = useState("");
  const [cMinOrder, setCMinOrder] = useState("");
  const [cMaxDiscount, setCMaxDiscount] = useState("");
  const [cExpiryDays, setCExpiryDays] = useState("30");
  const [cLimited, setCLimited] = useState(false);
  const [cTotalCount, setCTotalCount] = useState("");

  function createCoupon() {
    if (!cName.trim()) return toast("쿠폰 이름을 입력해주세요.", "error");
    const value = Number(cValue);
    if (!value || value <= 0) return toast("할인 값을 올바르게 입력해주세요.", "error");
    if (cType === "percent" && value > 100)
      return toast("할인율은 100% 이하로 입력해주세요.", "error");
    const expiryDays = Number(cExpiryDays);
    if (!expiryDays || expiryDays <= 0)
      return toast("유효기간(일)을 올바르게 입력해주세요.", "error");
    let totalCount: number | undefined;
    if (cLimited) {
      totalCount = Number(cTotalCount);
      if (!totalCount || totalCount <= 0)
        return toast("발급 수량을 올바르게 입력해주세요.", "error");
    }
    couponService.createLiveCoupon({
      sellerId,
      name: cName.trim(),
      discountType: cType,
      discountValue: value,
      minOrderAmount: cMinOrder ? Number(cMinOrder) : undefined,
      maxDiscount: cType === "percent" && cMaxDiscount ? Number(cMaxDiscount) : undefined,
      expiryDays,
      totalCount,
    });
    setCName("");
    setCValue("");
    setCMinOrder("");
    setCMaxDiscount("");
    setCExpiryDays("30");
    setCLimited(false);
    setCTotalCount("");
    toast("쿠폰이 생성되었습니다.");
  }

  function removeCoupon(id: string, name: string) {
    couponService.deleteLiveCoupon(id);
    toast(`"${name}" 쿠폰을 삭제했습니다.`);
  }

  return (
    <div className="space-y-4">
      {/* ===== 설정 서브탭 ===== */}
      <div className="flex items-center gap-1 rounded-xl border border-neutral-200 bg-neutral-50 p-1">
        <button
          type="button"
          onClick={() => setSubTab("youtube")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition-colors",
            subTab === "youtube"
              ? "bg-white text-neutral-900 shadow-sm"
              : "text-neutral-500 hover:text-neutral-700"
          )}
        >
          <Youtube className="h-4 w-4 text-red-500" strokeWidth={1.75} />
          YouTube 설정
        </button>
        <button
          type="button"
          onClick={() => setSubTab("coupon")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition-colors",
            subTab === "coupon"
              ? "bg-white text-neutral-900 shadow-sm"
              : "text-neutral-500 hover:text-neutral-700"
          )}
        >
          <Ticket className="h-4 w-4 text-brand-600" strokeWidth={1.75} />
          쿠폰
          {coupons.length > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-extrabold text-neutral-900">
              {coupons.length}
            </span>
          )}
        </button>
      </div>

      {/* ===== YouTube 설정 서브탭 ===== */}
      {subTab === "youtube" && (
        <SettingsSection
          icon={<Youtube className="h-4 w-4 text-red-500" strokeWidth={1.75} />}
          title="YouTube 라이브 채팅 연동"
        >
          <div className="space-y-4">
            <p className="text-sm text-neutral-500">
              YouTube 라이브 채팅을 연동하려면 판매자 본인의 YouTube Data API v3 키가 필요합니다.
              아래 안내를 따라 발급받아 입력해주세요.
            </p>

            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              <p className="mb-3 text-sm font-bold text-neutral-900">YouTube Data API 키 발급 방법</p>
              <ol className="space-y-3 text-sm text-neutral-600">
                {[
                  {
                    step: "1단계: Google Cloud Console 접속",
                    lines: [
                      "웹 브라우저에서 https://console.cloud.google.com 접속",
                      "Google 계정으로 로그인 (YouTube 채널과 같은 계정 권장)",
                    ],
                  },
                  {
                    step: "2단계: 프로젝트 생성",
                    lines: [
                      "상단 프로젝트 선택 드롭다운 클릭",
                      '"새 프로젝트" 클릭',
                      '프로젝트 이름 입력 (예: "레어팜-라이브") → 만들기',
                    ],
                  },
                  {
                    step: "3단계: YouTube Data API v3 활성화",
                    lines: [
                      '왼쪽 메뉴 → "API 및 서비스" → "라이브러리"',
                      '검색창에 "YouTube Data API v3" 입력',
                      '검색 결과 클릭 → "사용" 버튼 클릭',
                    ],
                  },
                  {
                    step: "4단계: API 키 발급",
                    lines: [
                      '왼쪽 메뉴 → "API 및 서비스" → "사용자 인증 정보"',
                      '상단 "+ 사용자 인증 정보 만들기" → "API 키" 선택',
                      "생성된 API 키 복사",
                    ],
                  },
                  {
                    step: "5단계: API 키 보안 설정 (권장)",
                    lines: [
                      "방금 만든 API 키 클릭",
                      '"API 제한사항"에서 "YouTube Data API v3" 선택',
                      "저장",
                    ],
                  },
                  {
                    step: "6단계: 키 적용",
                    lines: [
                      "아래 입력란에 복사한 API 키를 붙여넣기",
                      '"저장" 버튼 클릭',
                    ],
                  },
                ].map((g, i) => (
                  <li key={i} className="rounded-lg bg-white p-3">
                    <p className="font-bold text-neutral-900">{g.step}</p>
                    <ul className="mt-1.5 space-y-1">
                      {g.lines.map((line, j) => (
                        <li key={j} className="flex gap-1.5 text-[13px] leading-relaxed text-neutral-500">
                          <span className="text-brand-500">·</span>
                          <span className="min-w-0 break-words">{line}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-neutral-700">
                YouTube Data API 키
              </label>
              <div className="flex gap-2 md:pr-16">
                <input
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIza..."
                  className={cn(inputCls, "min-w-0 flex-1")}
                />
                <Button onClick={saveApiKey} className="shrink-0">저장</Button>
              </div>
              {savedKey && (
                <p className="mt-1.5 text-xs text-brand-700">
                  현재 저장된 키가 적용되어 있습니다.
                </p>
              )}
            </div>
          </div>
        </SettingsSection>
      )}

      {/* ===== 쿠폰 서브탭 ===== */}
      {subTab === "coupon" && (
        <SettingsSection
          icon={<Ticket className="h-4 w-4 text-brand-600" strokeWidth={1.75} />}
          title="라이브 경매 쿠폰"
        >
          <div className="space-y-5">
            {/* 쿠폰 생성 폼 */}
            <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              <p className="text-sm font-bold text-neutral-900">새 쿠폰 만들기</p>

              <Field label="쿠폰 이름">
                <input
                  value={cName}
                  onChange={(e) => setCName(e.target.value)}
                  placeholder='예: 첫 참여 환영 쿠폰'
                  className={cn(inputCls, "bg-white")}
                />
              </Field>

              <Field label="할인 유형">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCType("percent")}
                    className={cn(
                      "inline-flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-bold transition-colors",
                      cType === "percent"
                        ? "border-neutral-900 bg-neutral-900 text-brand-400"
                        : "border-neutral-200 bg-white text-neutral-500 hover:border-brand-400"
                    )}
                  >
                    <Percent className="h-4 w-4" strokeWidth={1.75} /> % 할인
                  </button>
                  <button
                    type="button"
                    onClick={() => setCType("fixed")}
                    className={cn(
                      "inline-flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-bold transition-colors",
                      cType === "fixed"
                        ? "border-neutral-900 bg-neutral-900 text-brand-400"
                        : "border-neutral-200 bg-white text-neutral-500 hover:border-brand-400"
                    )}
                  >
                    <Coins className="h-4 w-4" strokeWidth={1.75} /> 금액 할인
                  </button>
                </div>
              </Field>

              <Field label={cType === "percent" ? "할인율 (%)" : "할인 금액 (원)"}>
                <input
                  value={cValue}
                  onChange={(e) => setCValue(e.target.value.replace(/[^0-9]/g, ""))}
                  inputMode="numeric"
                  placeholder={cType === "percent" ? "예: 10" : "예: 5000"}
                  className={cn(inputCls, "bg-white")}
                />
              </Field>

              <Field label="최소 주문금액 (선택)">
                <input
                  value={cMinOrder}
                  onChange={(e) => setCMinOrder(e.target.value.replace(/[^0-9]/g, ""))}
                  inputMode="numeric"
                  placeholder="예: 30000 (미입력 시 제한 없음)"
                  className={cn(inputCls, "bg-white")}
                />
              </Field>

              {cType === "percent" && (
                <Field label="최대 할인금액 (선택)">
                  <input
                    value={cMaxDiscount}
                    onChange={(e) => setCMaxDiscount(e.target.value.replace(/[^0-9]/g, ""))}
                    inputMode="numeric"
                    placeholder="예: 30000 (미입력 시 제한 없음)"
                    className={cn(inputCls, "bg-white")}
                  />
                </Field>
              )}

              <Field label="유효기간: 발급 후 N일">
                <input
                  value={cExpiryDays}
                  onChange={(e) => setCExpiryDays(e.target.value.replace(/[^0-9]/g, ""))}
                  inputMode="numeric"
                  placeholder="예: 30"
                  className={cn(inputCls, "bg-white")}
                />
              </Field>

              <Field label="발급 수량 제한">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCLimited(false)}
                    className={cn(
                      "rounded-xl border py-2.5 text-sm font-bold transition-colors",
                      !cLimited
                        ? "border-neutral-900 bg-neutral-900 text-brand-400"
                        : "border-neutral-200 bg-white text-neutral-500 hover:border-brand-400"
                    )}
                  >
                    무제한
                  </button>
                  <button
                    type="button"
                    onClick={() => setCLimited(true)}
                    className={cn(
                      "rounded-xl border py-2.5 text-sm font-bold transition-colors",
                      cLimited
                        ? "border-neutral-900 bg-neutral-900 text-brand-400"
                        : "border-neutral-200 bg-white text-neutral-500 hover:border-brand-400"
                    )}
                  >
                    수량 제한
                  </button>
                </div>
                {cLimited && (
                  <input
                    value={cTotalCount}
                    onChange={(e) => setCTotalCount(e.target.value.replace(/[^0-9]/g, ""))}
                    inputMode="numeric"
                    placeholder="발급 가능 수량 (예: 100)"
                    className={cn(inputCls, "mt-2 bg-white")}
                  />
                )}
              </Field>

              <Button fullWidth onClick={createCoupon}>
                <Plus className="h-4 w-4" strokeWidth={1.75} /> 쿠폰 만들기
              </Button>
            </div>

            {/* 쿠폰 목록 */}
            <div>
              <p className="mb-2 text-sm font-bold text-neutral-900">
                발급한 쿠폰 <span className="text-neutral-400">({coupons.length})</span>
              </p>
              {coupons.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {coupons.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50/40 p-3"
                    >
                      <div className="hex-clip flex h-11 w-11 shrink-0 items-center justify-center bg-brand-400">
                        <Ticket className="h-5 w-5 text-neutral-900" strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-bold text-neutral-900">{c.name}</p>
                        <p className="text-sm font-extrabold text-brand-700">
                          {couponDiscountLabel(c.discountType, c.discountValue)}
                        </p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-neutral-500">
                          발급 후 {c.expiryDays}일 유효
                          {c.minOrderAmount ? ` · 최소 ${formatPrice(c.minOrderAmount)}` : ""}
                          {c.discountType === "percent" && c.maxDiscount
                            ? ` · 최대 ${formatPrice(c.maxDiscount)}`
                            : ""}
                        </p>
                        <p className="mt-0.5 text-[11px] font-semibold text-neutral-600">
                          발급 {c.issuedCount}
                          {c.totalCount !== undefined ? ` / ${c.totalCount}` : " (무제한)"}
                        </p>
                      </div>
                      <button
                        onClick={() => removeCoupon(c.id, c.name)}
                        aria-label="쿠폰 삭제"
                        className="rounded-lg border border-neutral-200 bg-white p-1.5 text-neutral-400 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-neutral-200 px-3 py-8 text-center text-sm text-neutral-400">
                  아직 발급한 쿠폰이 없습니다. 위 양식으로 첫 쿠폰을 만들어보세요.
                </p>
              )}
            </div>
          </div>
        </SettingsSection>
      )}
    </div>
  );
}

// 설정 탭 섹션 컨테이너
function SettingsSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="flex items-center gap-2 border-b border-neutral-100 px-5 py-3.5">
        <span className="h-3.5 w-1 rounded-full bg-brand-500" />
        <h2 className="flex items-center gap-2 font-bold text-neutral-900">
          {icon} {title}
        </h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

// ==================== 방송 카드 ====================

const AUCTION_TIME_OPTIONS = [
  { label: "5분", sec: 300 },
  { label: "10분", sec: 600 },
  { label: "30분", sec: 1800 },
];

function LiveCard({ live, sellerItems }: { live: LiveAuction; sellerItems: AuctionItem[] }) {
  const { toast } = useToast();
  const liveItems = live.itemIds
    .map((id) => sellerItems.find((i) => i.id === id))
    .filter((i): i is AuctionItem => !!i);

  const [showItems, setShowItems] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [mainExposedId, setMainExposedId] = useState<string | null>(null);
  const [auctionStartItem, setAuctionStartItem] = useState<AuctionItem | null>(null);
  const [editVideoUrl, setEditVideoUrl] = useState(live.videoUrl);

  const isOngoing = live.status === "live" || live.status === "paused" || live.status === "scheduled";
  const tone = liveTone[live.status];

  // 수익 계산 (종료 라이브용)
  const soldItems = liveItems.filter((i) => i.status === "sold");
  const totalRevenue = soldItems.reduce((sum, i) => sum + (i.finalPrice ?? i.startPrice), 0);
  const soldRate = liveItems.length > 0 ? Math.round((soldItems.length / liveItems.length) * 100) : 0;

  // 현재 경매 중 상품
  const currentItem = live.status === "live" ? liveItems[live.currentItemIndex] ?? null : null;

  const platformLabel = live.platform === "youtube" ? "YouTube" : "Instagram";
  const platformBg = live.platform === "youtube" ? "bg-red-600" : "bg-gradient-to-r from-purple-600 to-pink-500";

  function startAuction(item: AuctionItem, sec: number) {
    // duration을 먼저 설정해야 jumpToItem/setLiveStatus에서 올바른 endTime이 계산됨 (새로고침 후 타이머 유지)
    auctionService.setItemDuration(live.id, item.id, sec);
    if (live.status === "scheduled") {
      auctionService.setLiveStatus(live.id, "live");
    }
    const idx = live.itemIds.indexOf(item.id);
    if (idx >= 0) {
      auctionService.jumpToItem(live.id, idx);
    }
    setAuctionStartItem(null);
    toast(`"${item.name}" 경매를 ${AUCTION_TIME_OPTIONS.find(o => o.sec === sec)?.label ?? `${sec / 60}분`}으로 시작합니다.`);
  }

  function toggleMainExposed(itemId: string) {
    setMainExposedId((prev) => (prev === itemId ? null : itemId));
  }

  const startedAt = new Date(live.scheduledAt).toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={cn(
      "overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md",
      live.status === "live" ? "border-brand-300 ring-1 ring-brand-100" : "border-neutral-200"
    )}>
      {/* ── 썸네일 + 기본 정보 ── */}
      <div className="flex gap-3 p-4">
        {/* 썸네일 */}
        <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-neutral-100 sm:h-24 sm:w-32">
          {live.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={live.thumbnailUrl} alt={live.title} className="absolute inset-0 h-full w-full object-cover" />
          ) : liveItems[0] ? (
            <ItemThumb item={liveItems[0]} className="h-full w-full" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-neutral-100">
              <Radio className="h-7 w-7 text-neutral-300" strokeWidth={1.75} />
            </div>
          )}
          {/* 상태 배지 */}
          <div className="absolute left-1.5 top-1.5">
            <StatusPill tone={tone}>{liveStatusLabels[live.status]}</StatusPill>
          </div>
          {/* 플랫폼 배지 */}
          <span className={cn("absolute bottom-1.5 right-1.5 rounded px-1.5 py-0.5 text-[9px] font-bold text-white", platformBg)}>
            {platformLabel}
          </span>
        </div>

        {/* 텍스트 정보 */}
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-bold leading-snug text-neutral-900">{live.title}</p>

          {/* 태그 */}
          {live.tags && live.tags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {live.tags.slice(0, 3).map((t) => (
                <span key={t} className="inline-flex items-center gap-0.5 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-500">
                  <Tag className="h-2.5 w-2.5" strokeWidth={2} /> {t}
                </span>
              ))}
            </div>
          )}

          {/* 메타 정보 */}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-400">
            <span className="flex items-center gap-1">
              <CalendarClock className="h-3.5 w-3.5" strokeWidth={1.75} />
              {startedAt}
            </span>
            {live.viewers > 0 && (
              <span className={cn("flex items-center gap-1 font-semibold", live.status === "live" ? "text-brand-600" : "")}>
                <Eye className="h-3.5 w-3.5" strokeWidth={1.75} />
                {formatNumber(live.viewers)}명 {live.status === "live" ? "시청 중" : "시청"}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Gavel className="h-3.5 w-3.5" strokeWidth={1.75} />
              낙찰 {soldItems.length}/{liveItems.length}개
            </span>
          </div>

          {/* 종료 라이브: 수익 요약 */}
          {live.status === "ended" && liveItems.length > 0 && (
            <div className="mt-2.5 flex gap-2">
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-1.5">
                <p className="mb-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-500">낙찰 수익</p>
                <p className="text-sm font-extrabold text-emerald-700">{formatPrice(totalRevenue)}</p>
              </div>
              <div className="rounded-lg border border-neutral-100 bg-neutral-50 px-2.5 py-1.5">
                <p className="mb-0.5 text-[9px] font-bold uppercase tracking-wide text-neutral-400">낙찰률</p>
                <p className="text-sm font-extrabold text-neutral-700">{soldRate}%</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 라이브 진행 중: 현재 경매 상품 하이라이트 */}
      {live.status === "live" && currentItem && (
        <div className="mx-4 mb-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-brand-400">
            {live.currentItemIndex + 1}
          </span>
          <ItemThumb item={currentItem} className="h-10 w-10 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1">
            <p className="line-clamp-1 text-xs font-bold text-neutral-900">{currentItem.name}</p>
            <p className="text-[11px] text-neutral-500">{formatPrice(currentItem.startPrice)}</p>
          </div>
          <button
            type="button"
            onClick={() => toggleMainExposed(currentItem.id)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition-colors",
              mainExposedId === currentItem.id
                ? "border-amber-500 bg-amber-400 text-neutral-900"
                : "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
            )}
          >
            방송화면에 노출중
          </button>
        </div>
      )}

      {/* 외부 라이브 URL 섹션 (진행/일시정지 상태) */}
      {(live.status === "live" || live.status === "paused") && (
        <div className="mx-4 mb-3 space-y-2">
          <p className="text-xs font-bold text-neutral-700">
            외부 라이브 URL · {platformLabel}
          </p>
          <div className="flex gap-2">
            <input
              value={editVideoUrl}
              onChange={(e) => setEditVideoUrl(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-neutral-300 px-3 py-2 text-xs outline-none focus:border-brand-500"
              placeholder="https://..."
            />
            <button
              type="button"
              onClick={() => toast("URL이 저장되었습니다.")}
              className="shrink-0 rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-100"
            >
              저장
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => { navigator.clipboard.writeText(editVideoUrl); toast("URL을 복사했습니다."); }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-[11px] font-semibold text-neutral-600 hover:bg-neutral-50"
            >
              <Copy className="h-3.5 w-3.5" strokeWidth={1.75} /> URL 복사
            </button>
            <button
              type="button"
              onClick={() => toast("카카오독으로 공유합니다.")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-[11px] font-semibold text-neutral-600 hover:bg-neutral-50"
            >
              <Share2 className="h-3.5 w-3.5" strokeWidth={1.75} /> 카카오독 공유
            </button>
            <button
              type="button"
              onClick={() => { if (editVideoUrl) window.open(editVideoUrl, "_blank"); }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-[11px] font-semibold text-neutral-600 hover:bg-neutral-50"
            >
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} /> 열기
            </button>
          </div>
        </div>
      )}

      <div className="mx-4 border-t border-neutral-100" />

      {/* ── 새 액션 바: live / paused ── */}
      {(live.status === "live" || live.status === "paused") && (
        <div className="overflow-x-auto">
          <div className="flex min-w-max items-center gap-1 px-3 py-2.5">
            <button type="button" onClick={() => setShowDetail(true)} className="inline-flex flex-col items-center gap-0.5 rounded-lg border border-neutral-200 px-2.5 py-2 text-[10px] font-semibold text-neutral-600 hover:bg-neutral-50">
              <LayoutDashboard className="h-4 w-4" strokeWidth={1.75} />
              상세
            </button>
            <button type="button" onClick={() => toast("송출 설정 기능은 준비 중입니다.")} className="inline-flex flex-col items-center gap-0.5 rounded-lg border border-neutral-200 px-2.5 py-2 text-[10px] font-semibold text-neutral-600 hover:bg-neutral-50">
              <Cast className="h-4 w-4" strokeWidth={1.75} />
              송출 설정
            </button>
            <button type="button" onClick={() => setShowItems((v) => !v)} className={cn("inline-flex flex-col items-center gap-0.5 rounded-lg border px-2.5 py-2 text-[10px] font-semibold transition-colors", showItems ? "border-brand-400 bg-brand-50 text-brand-700" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50")}>
              <Hash className="h-4 w-4" strokeWidth={1.75} />
              상품번호 관리
            </button>
            <button type="button" onClick={() => toast("채팅 관리 기능은 준비 중입니다.")} className="inline-flex flex-col items-center gap-0.5 rounded-lg border border-neutral-200 px-2.5 py-2 text-[10px] font-semibold text-neutral-600 hover:bg-neutral-50">
              <MessageSquare className="h-4 w-4" strokeWidth={1.75} />
              채팅관리
            </button>
            <button type="button" onClick={() => toast("쿠폰 관리 기능은 준비 중입니다.")} className="inline-flex flex-col items-center gap-0.5 rounded-lg border border-neutral-200 px-2.5 py-2 text-[10px] font-semibold text-neutral-600 hover:bg-neutral-50">
              <Ticket className="h-4 w-4" strokeWidth={1.75} />
              쿠폰 관리
            </button>
            <button type="button" onClick={() => toast("카카오 알림 기능은 준비 중입니다.")} className="inline-flex flex-col items-center gap-0.5 rounded-lg border border-neutral-200 px-2.5 py-2 text-[10px] font-semibold text-neutral-600 hover:bg-neutral-50">
              <Bell className="h-4 w-4" strokeWidth={1.75} />
              카카오알림
            </button>
            <button type="button" onClick={() => { auctionService.setLiveStatus(live.id, "ended"); toast("경매를 종료했습니다."); }} className="inline-flex flex-col items-center gap-0.5 rounded-lg border border-neutral-900 bg-neutral-900 px-2.5 py-2 text-[10px] font-semibold text-white hover:bg-neutral-800">
              <Square className="h-4 w-4" strokeWidth={1.75} />
              종료
            </button>
            <a href={`/live-auction/${live.id}`} target="_blank" rel="noreferrer" className="inline-flex flex-col items-center gap-0.5 rounded-lg border border-neutral-200 px-2.5 py-2 text-[10px] font-semibold text-neutral-600 hover:bg-neutral-50">
              <ExternalLink className="h-4 w-4" strokeWidth={1.75} />
              시청페이지
            </a>
          </div>
        </div>
      )}

      {/* ── 새 액션 바: scheduled ── */}
      {live.status === "scheduled" && (
        <div className="overflow-x-auto">
          <div className="flex min-w-max items-center gap-1 px-3 py-2.5">
            <button type="button" onClick={() => { auctionService.setLiveStatus(live.id, "live"); toast("경매를 시작했습니다."); }} className="inline-flex flex-col items-center gap-0.5 rounded-lg border border-brand-500 bg-brand-500 px-2.5 py-2 text-[10px] font-semibold text-white hover:bg-brand-600">
              <Play className="h-4 w-4" strokeWidth={1.75} />
              경매 시작
            </button>
            <button type="button" onClick={() => setShowDetail(true)} className="inline-flex flex-col items-center gap-0.5 rounded-lg border border-neutral-200 px-2.5 py-2 text-[10px] font-semibold text-neutral-600 hover:bg-neutral-50">
              <LayoutDashboard className="h-4 w-4" strokeWidth={1.75} />
              상세
            </button>
            <button type="button" onClick={() => setShowItems((v) => !v)} className={cn("inline-flex flex-col items-center gap-0.5 rounded-lg border px-2.5 py-2 text-[10px] font-semibold transition-colors", showItems ? "border-brand-400 bg-brand-50 text-brand-700" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50")}>
              <Hash className="h-4 w-4" strokeWidth={1.75} />
              상품번호 관리
            </button>
            <a href={`/live-auction/${live.id}`} target="_blank" rel="noreferrer" className="inline-flex flex-col items-center gap-0.5 rounded-lg border border-neutral-200 px-2.5 py-2 text-[10px] font-semibold text-neutral-600 hover:bg-neutral-50">
              <ExternalLink className="h-4 w-4" strokeWidth={1.75} />
              시청페이지
            </a>
          </div>
        </div>
      )}

      {/* ── 새 액션 바: ended ── */}
      {live.status === "ended" && (
        <div className="overflow-x-auto">
          <div className="flex min-w-max items-center gap-1 px-3 py-2.5">
            <button type="button" onClick={() => setShowDetail(true)} className="inline-flex flex-col items-center gap-0.5 rounded-lg border border-neutral-200 px-2.5 py-2 text-[10px] font-semibold text-neutral-600 hover:bg-neutral-50">
              <LayoutDashboard className="h-4 w-4" strokeWidth={1.75} />
              상세
            </button>
            <button type="button" onClick={() => setShowItems((v) => !v)} className={cn("inline-flex flex-col items-center gap-0.5 rounded-lg border px-2.5 py-2 text-[10px] font-semibold transition-colors", showItems ? "border-brand-400 bg-brand-50 text-brand-700" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50")}>
              <Hash className="h-4 w-4" strokeWidth={1.75} />
              상품번호 관리
            </button>
            <a href={`/live-auction/${live.id}`} target="_blank" rel="noreferrer" className="inline-flex flex-col items-center gap-0.5 rounded-lg border border-neutral-200 px-2.5 py-2 text-[10px] font-semibold text-neutral-600 hover:bg-neutral-50">
              <ExternalLink className="h-4 w-4" strokeWidth={1.75} />
              결과 보기
            </a>
            <button
              type="button"
              onClick={() => { auctionService.deleteLive(live.id); toast("라이브를 삭제했습니다."); }}
              className="inline-flex flex-col items-center gap-0.5 rounded-lg border border-red-200 px-2.5 py-2 text-[10px] font-semibold text-red-500 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.75} />
              삭제
            </button>
          </div>
        </div>
      )}

      {/* ── 상세 정보 패널 ── */}
      {showDetail && (
        <div className="border-t border-neutral-100 space-y-3 px-4 py-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-neutral-50 px-2 py-2">
              <p className="text-[9px] font-bold uppercase tracking-wide text-neutral-400">전체 상품</p>
              <p className="text-sm font-extrabold text-neutral-800">{liveItems.length}개</p>
            </div>
            <div className="rounded-lg bg-emerald-50 px-2 py-2">
              <p className="text-[9px] font-bold uppercase tracking-wide text-emerald-500">낙찰</p>
              <p className="text-sm font-extrabold text-emerald-700">{soldItems.length}건</p>
            </div>
            <div className="rounded-lg bg-neutral-50 px-2 py-2">
              <p className="text-[9px] font-bold uppercase tracking-wide text-neutral-400">낙찰률</p>
              <p className="text-sm font-extrabold text-neutral-800">{soldRate}%</p>
            </div>
          </div>
          {totalRevenue > 0 && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5">
              <p className="text-[10px] font-bold text-emerald-500">총 낙찰 수익</p>
              <p className="text-base font-extrabold text-emerald-700">{formatPrice(totalRevenue)}</p>
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowDetail(false)}
            className="w-full rounded-xl border border-neutral-200 py-1.5 text-xs font-semibold text-neutral-500 hover:bg-neutral-50"
          >
            닫기
          </button>
        </div>
      )}

      {/* ── 상품 목록 패널 ── */}
      {showItems && (
        <div className="border-t border-neutral-100 px-4 py-3 space-y-2">
          <p className="text-xs font-bold text-neutral-700">
            경매 상품 <span className="text-neutral-400">({liveItems.length})</span>
          </p>
          <div className="space-y-1.5">
            {liveItems.map((it, idx) => {
              const isCurrent = live.status === "live" && idx === live.currentItemIndex;
              const done = it.status === "sold" || it.status === "failed";
              const isOngoing = live.status === "live" || live.status === "paused";
              return (
                <div
                  key={it.id}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border p-2 transition-colors",
                    isCurrent
                      ? "border-brand-300 bg-brand-50"
                      : "border-neutral-100 bg-white"
                  )}
                >
                  <span className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    isCurrent ? "bg-neutral-900 text-brand-400" : "bg-neutral-100 text-neutral-400"
                  )}>
                    {idx + 1}
                  </span>
                  <ItemThumb item={it} className="h-9 w-9 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-xs font-semibold text-neutral-900">{it.name}</p>
                    <p className="text-[10px] text-neutral-400">
                      시작가 {formatPrice(it.startPrice)}
                      {it.status === "sold" && it.finalPrice && ` · 낙찰 ${formatPrice(it.finalPrice)}`}
                    </p>
                  </div>
                  {it.suspended ? (
                    <Badge tone="red">판매중지</Badge>
                  ) : isCurrent ? (
                    <Badge tone="brand">진행 중</Badge>
                  ) : done ? (
                    <Badge tone={it.status === "sold" ? "green" : "neutral"}>
                      {auctionItemStatusLabels[it.status]}
                    </Badge>
                  ) : isOngoing && !done ? (
                    <button
                      type="button"
                      onClick={() => setAuctionStartItem(it)}
                      className="shrink-0 rounded-lg border border-brand-300 bg-brand-50 px-2 py-1 text-[10px] font-bold text-brand-700 hover:bg-brand-100"
                    >
                      경매 시작
                    </button>
                  ) : (
                    <Badge tone="amber">{auctionItemStatusLabels[it.status]}</Badge>
                  )}
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setShowItems(false)}
            className="w-full rounded-xl border border-neutral-200 py-1.5 text-xs font-semibold text-neutral-500 hover:bg-neutral-50"
          >
            닫기
          </button>
        </div>
      )}

      {/* 경매 시작 모달 */}
      {auctionStartItem && (
        <Modal
          open={!!auctionStartItem}
          onClose={() => setAuctionStartItem(null)}
          title="경매 시작"
        >
          <div className="space-y-4 pb-2">
            <div className="flex items-center gap-3 rounded-xl bg-neutral-50 p-3">
              <ItemThumb item={auctionStartItem} className="h-12 w-12 rounded-lg" />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm font-bold text-neutral-900">{auctionStartItem.name}</p>
                <p className="text-xs text-neutral-500">시작가 {formatPrice(auctionStartItem.startPrice)}</p>
              </div>
            </div>
            <p className="text-sm font-semibold text-neutral-700">경매 진행 시간 선택</p>
            <div className="grid grid-cols-3 gap-2">
              {AUCTION_TIME_OPTIONS.map((opt) => (
                <button
                  key={opt.sec}
                  type="button"
                  onClick={() => startAuction(auctionStartItem, opt.sec)}
                  className="rounded-xl border border-neutral-200 py-3 text-sm font-bold text-neutral-700 transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700"
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <Button variant="outline" fullWidth onClick={() => setAuctionStartItem(null)}>
              취소
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ==================== 보조 컴포넌트 ====================

const NO_IMAGE_STICKERS = [
  "/레어팜_이미지없음_공통.svg",
  "/레어팜_이미지없음_식물.svg",
  "/레어팜_이미지없음_파충류.svg",
] as const;

function getNoImageSticker(id: string): string {
  return NO_IMAGE_STICKERS[id.charCodeAt(0) % 3];
}

function ItemThumb({ item, className }: { item: AuctionItem; className?: string }) {
  const url = item.images?.[item.thumbIndex ?? 0];
  if (url)
    return (
      <div className={cn("relative shrink-0 overflow-hidden", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />
      </div>
    );
  return (
    <div className={cn("relative shrink-0 overflow-hidden bg-neutral-50", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={getNoImageSticker(item.id)} alt="이미지 없음" className="absolute inset-0 h-full w-full object-contain" />
    </div>
  );
}

function IconBtn({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg border border-neutral-200 bg-white p-1.5 text-neutral-500 transition-colors hover:border-brand-400 hover:bg-brand-50"
      aria-label={label}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-neutral-700">{label}</label>
      {children}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-xl border px-3.5 py-2 text-[13px] font-semibold transition-colors sm:px-5 sm:text-sm",
        active
          ? "border-neutral-900 bg-neutral-900 text-brand-400"
          : "border-neutral-200 text-neutral-500 hover:border-brand-400 hover:bg-brand-50"
      )}
    >
      {children}
    </button>
  );
}
