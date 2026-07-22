"use client";

import { useId, useRef, useState } from "react";
import {
  Gavel,
  Ban,
  Trophy,
  Percent,
  Coins,
  Pencil,
  Trash2,
  Copy,
  Plus,
  X,
  Timer,
  BadgeCheck,
  PackageCheck,
  Wand2,
  ImagePlus,
  RotateCcw,
} from "lucide-react";
import { SellerLayout } from "@/components/seller/SellerLayout";
import { Panel, StatCard, StatusPill, FilterChip } from "@/components/admin/AdminUI";
import { Button } from "@/components/common/Button";
import { Badge } from "@/components/common/Badge";
import { Modal } from "@/components/common/Modal";
import {
  auctionService,
  auctionItemStatusLabels,
  auctionConditionLabels,
  auctionCategories,
  auctionCategoryName,
  auctionDurationOptions,
  durationLabel,
  recommendBidUnit,
} from "@/lib/auctionService";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { useStoreVersion } from "@/lib/useStore";
import { formatPrice, formatDate, cn } from "@/lib/utils";
import type { AuctionItem, AuctionItemCondition, AuctionItemStatus } from "@/types";

const NO_IMAGE_STICKERS = [
  "/레어팜_이미지없음_공통.svg",
  "/레어팜_이미지없음_식물.svg",
  "/레어팜_이미지없음_파충류.svg",
] as const;

function getNoImageSticker(id: string): string {
  return NO_IMAGE_STICKERS[id.charCodeAt(0) % 3];
}

const itemTone: Record<AuctionItemStatus, "green" | "red" | "amber" | "neutral"> = {
  waiting: "neutral",
  live: "amber",
  sold: "green",
  failed: "red",
};

type StatusFilter = "all" | AuctionItemStatus | "suspended";

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "waiting", label: "대기중" },
  { key: "live", label: "라이브중" },
  { key: "sold", label: "낙찰완료" },
  { key: "failed", label: "유찰" },
  { key: "suspended", label: "판매중지" },
];

const SHIPPING_METHODS = ["택배 배송", "직거래", "퀵/당일 배송", "편의점 택배"];
const SHIP_LEAD_TIMES = ["당일 발송", "1~2일 내 발송", "3~5일 내 발송", "7일 내 발송"];

// ---- 등록/수정 공용 폼 값 ----
interface ItemFormValues {
  name: string;
  categoryId: string;
  condition: AuctionItemCondition;
  startPrice: string;
  bidUnit: string;
  buyNowPrice: string;
  durationSec: number;
  images: string[];
  thumbIndex: number;
  description: string;
  components: string;
  shippingFee: string;
  shippingMethod: string;
  shipLeadTime: string;
  hasCertificate: boolean;
  isUnopened: boolean;
}

function emptyValues(): ItemFormValues {
  return {
    name: "",
    categoryId: auctionCategories[0].id,
    condition: "new",
    startPrice: "",
    bidUnit: "",
    buyNowPrice: "",
    durationSec: 300,
    images: [""],
    thumbIndex: 0,
    description: "",
    components: "",
    shippingFee: "",
    shippingMethod: SHIPPING_METHODS[0],
    shipLeadTime: SHIP_LEAD_TIMES[1],
    hasCertificate: false,
    isUnopened: false,
  };
}

function valuesFrom(item: AuctionItem): ItemFormValues {
  return {
    name: item.name,
    categoryId: item.categoryId,
    condition: item.condition ?? "new",
    startPrice: String(item.startPrice),
    bidUnit: String(item.bidUnit),
    buyNowPrice: item.buyNowPrice !== null ? String(item.buyNowPrice) : "",
    durationSec: item.durationSec ?? 300,
    images: item.images?.length ? item.images : [""],
    thumbIndex: item.thumbIndex ?? 0,
    description: item.description,
    components: item.components ?? "",
    shippingFee: item.shippingFee !== undefined ? String(item.shippingFee) : "",
    shippingMethod: item.shippingMethod ?? SHIPPING_METHODS[0],
    shipLeadTime: item.shipLeadTime ?? SHIP_LEAD_TIMES[1],
    hasCertificate: item.hasCertificate ?? false,
    isUnopened: item.isUnopened ?? false,
  };
}

export default function SellerAuctionItemsPage() {
  useStoreVersion();
  const { user } = useAuth();
  const { toast } = useToast();

  const [filter, setFilter] = useState<StatusFilter>("all");
  const [editTarget, setEditTarget] = useState<AuctionItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AuctionItem | null>(null);
  const [prefillValues, setPrefillValues] = useState<ItemFormValues | null>(null);
  const [prefillKey, setPrefillKey] = useState(0);

  const items = user ? auctionService.getItems({ sellerId: user.id }) : [];
  const filtered =
    filter === "all"
      ? items
      : filter === "suspended"
        ? items.filter((i) => i.suspended)
        : items.filter((i) => i.status === filter);

  // 통계
  const soldItems = items.filter((i) => i.status === "sold");
  const failedItems = items.filter((i) => i.status === "failed");
  const totalAmount = soldItems.reduce((sum, i) => sum + (i.finalPrice ?? 0), 0);
  const finished = soldItems.length + failedItems.length;
  const failRate = finished > 0 ? Math.round((failedItems.length / finished) * 100) : 0;

  function parseNum(v: string): number {
    return Number(v.replace(/[^0-9]/g, ""));
  }

  function validate(v: ItemFormValues): string | null {
    if (!v.name.trim()) return "상품명을 입력해주세요.";
    if (!parseNum(v.startPrice)) return "시작가를 입력해주세요.";
    if (!parseNum(v.bidUnit)) return "최소 입찰 단위를 입력해주세요.";
    if (v.buyNowPrice && parseNum(v.buyNowPrice) <= parseNum(v.startPrice))
      return "즉시 낙찰가는 시작가보다 높아야 합니다.";
    return null;
  }

  function toPayload(v: ItemFormValues) {
    const images = v.images.map((u) => u.trim()).filter(Boolean).slice(0, 5);
    return {
      name: v.name.trim(),
      description: v.description.trim(),
      categoryId: v.categoryId,
      startPrice: parseNum(v.startPrice),
      bidUnit: parseNum(v.bidUnit),
      buyNowPrice: v.buyNowPrice ? parseNum(v.buyNowPrice) : null,
      condition: v.condition,
      images,
      thumbIndex: Math.min(v.thumbIndex, Math.max(0, images.length - 1)),
      components: v.components.trim(),
      durationSec: v.durationSec,
      shippingFee: v.shippingFee ? parseNum(v.shippingFee) : 0,
      shippingMethod: v.shippingMethod,
      shipLeadTime: v.shipLeadTime,
      hasCertificate: v.hasCertificate,
      isUnopened: v.isUnopened,
    };
  }

  function submitNew(v: ItemFormValues, reset: () => void) {
    if (!user) return;
    const err = validate(v);
    if (err) return toast(err, "error");
    auctionService.addItem({ sellerId: user.id, ...toPayload(v) });
    reset();
    toast("경매 상품이 등록되었습니다.");
  }

  function submitEdit(v: ItemFormValues) {
    if (!editTarget) return;
    const err = validate(v);
    if (err) return toast(err, "error");
    auctionService.updateItem(editTarget.id, toPayload(v));
    setEditTarget(null);
    toast("경매 상품이 수정되었습니다.");
  }

  function duplicate(item: AuctionItem) {
    auctionService.duplicateItem(item.id);
    toast("상품이 복제되었습니다. 대기중 상태로 등록됩니다.");
  }

  function reregister(item: AuctionItem) {
    setPrefillValues(valuesFrom(item));
    setPrefillKey((k) => k + 1);
    toast("유찰 상품 정보를 등록 폼에 불러왔습니다. 내용을 확인 후 등록해주세요.");
  }

  function remove() {
    if (!deleteTarget) return;
    auctionService.deleteItem(deleteTarget.id);
    setDeleteTarget(null);
    toast("경매 상품이 삭제되었습니다.");
  }

  return (
    <SellerLayout title="경매 상품 등록">
      {/* 통계 카드 */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatCard icon={Gavel} label="총 등록 상품" value={items.length} accent />
        <StatCard icon={Trophy} label="낙찰 완료" value={soldItems.length} />
        <StatCard icon={Coins} label="총 낙찰금액" value={formatPrice(totalAmount)} />
        <StatCard
          icon={Percent}
          label="유찰률"
          value={`${failRate}%`}
          sub={`유찰 ${failedItems.length}건 / 종료 ${finished}건`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        {/* 등록 폼 */}
        <Panel title="새 경매 상품 등록">
          <NewItemForm key={prefillKey} prefill={prefillValues} onSubmit={submitNew} />
        </Panel>

        {/* 상품 목록 */}
        <Panel
          title={`내 경매 상품 (${items.length})`}
          action={
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((f) => (
                <FilterChip key={f.key} active={filter === f.key} onClick={() => setFilter(f.key)}>
                  {f.label}
                </FilterChip>
              ))}
            </div>
          }
        >
          <div className="space-y-3 p-3">
            {filtered.map((it) => (
              <ItemCard
                key={it.id}
                item={it}
                onEdit={() => setEditTarget(it)}
                onReregister={() => reregister(it)}
                onDuplicate={() => duplicate(it)}
                onDelete={() => setDeleteTarget(it)}
              />
            ))}
            {filtered.length === 0 && (
              <p className="py-10 text-center text-sm text-neutral-400">
                해당 상태의 경매 상품이 없습니다.
              </p>
            )}
          </div>
        </Panel>
      </div>

      {/* 수정 모달 */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="경매 상품 수정">
        {editTarget && (
          <div className="max-h-[70vh] overflow-y-auto pr-1">
            <ItemForm
              initial={valuesFrom(editTarget)}
              submitLabel="수정 내용 저장"
              onSubmit={(v) => submitEdit(v)}
            />
          </div>
        )}
      </Modal>

      {/* 삭제 확인 모달 */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="상품 삭제">
        <div className="pb-2">
          <p className="text-sm text-neutral-600">
            <span className="font-bold text-neutral-900">{deleteTarget?.name}</span> 상품을
            삭제할까요? 예정된 라이브의 상품 목록에서도 함께 제거됩니다.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              취소
            </Button>
            <Button variant="danger" onClick={remove}>
              삭제하기
            </Button>
          </div>
        </div>
      </Modal>
    </SellerLayout>
  );
}

// ==================== 상품 카드 ====================

function ItemCard({
  item,
  onEdit,
  onReregister,
  onDuplicate,
  onDelete,
}: {
  item: AuctionItem;
  onEdit: () => void;
  onReregister: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const bidCount = auctionService.getBidsForItem(item.id).length;
  const thumbUrl = item.images?.[item.thumbIndex ?? 0];
  const locked = item.status === "live"; // 라이브 진행 중엔 수정/삭제 잠금

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3 transition-colors hover:border-brand-300",
        item.suspended && "opacity-70"
      )}
    >
      {/* 썸네일 */}
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-neutral-50">
        {thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={getNoImageSticker(item.id)} alt="이미지 없음" className="absolute inset-0 h-full w-full object-contain" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="line-clamp-1 text-sm font-bold text-neutral-900">{item.name}</p>
          <StatusPill tone={itemTone[item.status]}>
            {auctionItemStatusLabels[item.status]}
          </StatusPill>
          {item.suspended && (
            <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-red-500">
              <Ban className="h-3 w-3" strokeWidth={2} /> 판매중지
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-neutral-400">
          {auctionCategoryName(item.categoryId)}
          {item.condition && ` · ${auctionConditionLabels[item.condition]}`}
          {item.durationSec && (
            <>
              {" "}
              · <Timer className="inline h-3 w-3" strokeWidth={2} /> {durationLabel(item.durationSec)}
            </>
          )}
          {" · "}
          {formatDate(item.createdAt)}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
          <span className="text-neutral-500">
            시작가 <span className="font-semibold text-neutral-800">{formatPrice(item.startPrice)}</span>
          </span>
          <span className="text-neutral-500">
            현재 입찰가{" "}
            <span className="font-bold text-brand-700">
              {formatPrice(item.finalPrice ?? item.currentPrice)}
            </span>
          </span>
          <span className="text-neutral-500">
            입찰 <span className="font-semibold text-neutral-800">{bidCount}회</span>
          </span>
          {item.hasCertificate && (
            <Badge tone="brand">
              <BadgeCheck className="h-3 w-3" strokeWidth={2} /> 정품 인증서
            </Badge>
          )}
          {item.isUnopened && (
            <Badge tone="dark">
              <PackageCheck className="h-3 w-3" strokeWidth={2} /> 미개봉
            </Badge>
          )}
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex items-center gap-1.5">
        {item.status === "failed" && (
          <button
            onClick={onReregister}
            className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-amber-600 transition-colors hover:border-amber-500 hover:bg-amber-100 sm:p-1.5"
            aria-label="재등록"
            title="유찰 상품 재등록"
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        )}
        <button
          onClick={onEdit}
          disabled={locked}
          className="rounded-lg border border-neutral-200 p-2 text-neutral-500 transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-40 sm:p-1.5"
          aria-label="수정"
          title="수정"
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
        <button
          onClick={onDuplicate}
          className="rounded-lg border border-neutral-200 p-2 text-neutral-500 transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-neutral-900 sm:p-1.5"
          aria-label="복제"
          title="복제"
        >
          <Copy className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
        <button
          onClick={onDelete}
          disabled={locked}
          className="rounded-lg border border-neutral-200 p-2 text-neutral-500 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 sm:p-1.5"
          aria-label="삭제"
          title="삭제"
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

// ==================== 등록 폼 (신규) ====================

function NewItemForm({
  prefill,
  onSubmit,
}: {
  prefill?: ItemFormValues | null;
  onSubmit: (v: ItemFormValues, reset: () => void) => void;
}) {
  const [values, setValues] = useState<ItemFormValues>(prefill ?? emptyValues());
  return (
    <ItemForm
      initial={values}
      controlled
      onChange={setValues}
      submitLabel="경매 상품 등록하기"
      onSubmit={(v) => onSubmit(v, () => setValues(emptyValues()))}
    />
  );
}

// ==================== 등록/수정 공용 폼 ====================

function ItemForm({
  initial,
  controlled,
  onChange,
  onSubmit,
  submitLabel,
}: {
  initial: ItemFormValues;
  controlled?: boolean;
  onChange?: (v: ItemFormValues) => void;
  onSubmit: (v: ItemFormValues) => void;
  submitLabel: string;
}) {
  const [inner, setInner] = useState<ItemFormValues>(initial);
  const radioName = useId(); // 폼 인스턴스별 라디오 그룹 분리
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const v = controlled ? initial : inner;
  const set = (patch: Partial<ItemFormValues>) => {
    const next = { ...v, ...patch };
    if (controlled) onChange?.(next);
    else setInner(next);
  };

  const startNum = Number(v.startPrice.replace(/[^0-9]/g, ""));
  const recommended = recommendBidUnit(startNum);

  function setImage(i: number, url: string) {
    const images = v.images.slice();
    images[i] = url;
    set({ images });
  }
  function addImage() {
    if (v.images.length >= 5) return;
    set({ images: [...v.images, ""] });
  }
  function removeImage(i: number) {
    const images = v.images.filter((_, idx) => idx !== i);
    set({
      images: images.length ? images : [""],
      thumbIndex: v.thumbIndex >= i && v.thumbIndex > 0 ? v.thumbIndex - 1 : v.thumbIndex,
    });
  }

  function onFileSelect(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(i, URL.createObjectURL(file));
    e.target.value = "";
  }

  return (
    <div className="space-y-5 p-3">
      {/* ---- 기본 정보 ---- */}
      <FormSection title="기본 정보">
        <Field label="상품명">
          <input
            value={v.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="예: MGEX 스트라이크 프리덤 (미개봉)"
            className={inputCls}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="카테고리">
            <select
              value={v.categoryId}
              onChange={(e) => set({ categoryId: e.target.value })}
              className={inputCls}
            >
              {auctionCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="상품 상태">
            <select
              value={v.condition}
              onChange={(e) => set({ condition: e.target.value as AuctionItemCondition })}
              className={inputCls}
            >
              {(Object.keys(auctionConditionLabels) as AuctionItemCondition[]).map((c) => (
                <option key={c} value={c}>
                  {auctionConditionLabels[c]}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </FormSection>

      {/* ---- 경매 설정 ---- */}
      <FormSection title="경매 설정">
        <div className="grid grid-cols-2 gap-3">
          <Field label="시작가 (원)">
            <input
              value={v.startPrice}
              onChange={(e) => set({ startPrice: e.target.value.replace(/[^0-9]/g, "") })}
              placeholder="50000"
              inputMode="numeric"
              className={inputCls}
            />
          </Field>
          <Field label="최소 입찰 단위 (원)">
            <input
              value={v.bidUnit}
              onChange={(e) => set({ bidUnit: e.target.value.replace(/[^0-9]/g, "") })}
              placeholder="5000"
              inputMode="numeric"
              className={inputCls}
            />
          </Field>
        </div>
        {recommended > 0 && (
          <button
            type="button"
            onClick={() => set({ bidUnit: String(recommended) })}
            className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-800 transition-colors hover:bg-brand-100"
          >
            <Wand2 className="h-3 w-3" strokeWidth={2} />
            추천 입찰 단위 {formatPrice(recommended)} 적용 (시작가의 2~5%)
          </button>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="즉시 낙찰가 (선택)">
            <input
              value={v.buyNowPrice}
              onChange={(e) => set({ buyNowPrice: e.target.value.replace(/[^0-9]/g, "") })}
              placeholder="미입력 시 즉낙 불가"
              inputMode="numeric"
              className={inputCls}
            />
          </Field>
          <Field label="경매 제한 시간">
            <select
              value={v.durationSec}
              onChange={(e) => set({ durationSec: Number(e.target.value) })}
              className={inputCls}
            >
              {auctionDurationOptions.map((d) => (
                <option key={d.sec} value={d.sec}>
                  {d.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </FormSection>

      {/* ---- 상품 이미지 ---- */}
      <FormSection title="상품 이미지 (최대 5장 · 썸네일 선택)">
        <div className="space-y-2">
          {v.images.map((url, i) => (
            <div key={i} className="flex items-center gap-2">
              <label
                className="flex shrink-0 cursor-pointer items-center gap-1 text-[11px] font-semibold text-neutral-500"
                title="썸네일로 사용"
              >
                <input
                  type="radio"
                  name={radioName}
                  checked={v.thumbIndex === i}
                  onChange={() => set({ thumbIndex: i })}
                  className="h-3.5 w-3.5 accent-[#F5C518]"
                />
                썸네일
              </label>
              <input
                value={url}
                onChange={(e) => setImage(i, e.target.value)}
                placeholder={`이미지 URL ${i + 1}`}
                className={cn(inputCls, "min-w-0 flex-1 !py-2.5")}
              />
              <button
                type="button"
                onClick={() => fileInputRefs.current[i]?.click()}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-neutral-300 px-2 py-1.5 text-xs font-semibold text-neutral-600 transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-neutral-900"
                title="파일에서 이미지 선택"
              >
                <ImagePlus className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
              <input
                ref={(el) => { fileInputRefs.current[i] = el; }}
                type="file"
                accept="image/*"
                onChange={(e) => onFileSelect(i, e)}
                className="hidden"
                aria-label={`이미지 ${i + 1} 파일 첨부`}
              />
              {url.trim() && (
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                </div>
              )}
              {v.images.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="shrink-0 rounded-lg border border-neutral-200 p-1.5 text-neutral-400 transition-colors hover:border-red-300 hover:text-red-500"
                  aria-label="이미지 제거"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              )}
            </div>
          ))}
          {v.images.length < 5 && (
            <button
              type="button"
              onClick={addImage}
              className="inline-flex items-center gap-1 rounded-lg border border-dashed border-brand-300 px-3 py-1.5 text-xs font-semibold text-brand-700 transition-colors hover:border-brand-500 hover:bg-brand-50"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} /> 이미지 URL 추가 ({v.images.length}/5)
            </button>
          )}
        </div>
      </FormSection>

      {/* ---- 상세 설명 ---- */}
      <FormSection title="상세 설명">
        <Field label="상품 설명 (마크다운 지원)">
          <textarea
            value={v.description}
            onChange={(e) => set({ description: e.target.value })}
            rows={4}
            placeholder={"상품 상태, 특이사항 등을 적어주세요.\n**굵게**, - 목록 등 마크다운 문법을 지원합니다."}
            className={cn(inputCls, "resize-none")}
          />
        </Field>
        <Field label="구성품 목록">
          <textarea
            value={v.components}
            onChange={(e) => set({ components: e.target.value })}
            rows={2}
            placeholder="예: 본체, 박스, 설명서, 데칼, 특전 파츠"
            className={cn(inputCls, "resize-none")}
          />
        </Field>
      </FormSection>

      {/* ---- 배송 정보 ---- */}
      <FormSection title="배송 정보">
        <div className="grid grid-cols-2 gap-3">
          <Field label="배송비 (원)">
            <input
              value={v.shippingFee}
              onChange={(e) => set({ shippingFee: e.target.value.replace(/[^0-9]/g, "") })}
              placeholder="0 = 무료배송"
              inputMode="numeric"
              className={inputCls}
            />
          </Field>
          <Field label="배송 방법">
            <select
              value={v.shippingMethod}
              onChange={(e) => set({ shippingMethod: e.target.value })}
              className={inputCls}
            >
              {SHIPPING_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="발송 예정일">
          <select
            value={v.shipLeadTime}
            onChange={(e) => set({ shipLeadTime: e.target.value })}
            className={inputCls}
          >
            {SHIP_LEAD_TIMES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
      </FormSection>

      {/* ---- 인증/보증 ---- */}
      <FormSection title="인증 / 보증">
        <div className="flex flex-wrap gap-2">
          <CheckChip
            checked={v.hasCertificate}
            onToggle={() => set({ hasCertificate: !v.hasCertificate })}
            icon={<BadgeCheck className="h-3.5 w-3.5" strokeWidth={2} />}
            label="정품 인증서 보유"
          />
          <CheckChip
            checked={v.isUnopened}
            onToggle={() => set({ isUnopened: !v.isUnopened })}
            icon={<PackageCheck className="h-3.5 w-3.5" strokeWidth={2} />}
            label="미개봉 상품"
          />
        </div>
      </FormSection>

      <Button fullWidth onClick={() => onSubmit(v)}>
        <Gavel className="h-4 w-4" strokeWidth={1.75} /> {submitLabel}
      </Button>
    </div>
  );
}

// ==================== 폼 보조 컴포넌트 ====================

const inputCls =
  "w-full rounded-xl border border-neutral-300 px-3 py-3 text-sm outline-none focus:border-brand-500";

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <p className="flex items-center gap-1.5 text-[13px] font-bold text-neutral-900">
        <span className="h-3 w-1 rounded-full bg-brand-500" />
        {title}
      </p>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-neutral-600">{label}</label>
      {children}
    </div>
  );
}

function CheckChip({
  checked,
  onToggle,
  icon,
  label,
}: {
  checked: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
        checked
          ? "border-neutral-900 bg-neutral-900 text-brand-400"
          : "border-neutral-200 bg-white text-neutral-500 hover:border-brand-400 hover:bg-brand-50"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
