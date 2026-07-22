"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Gavel, Tag, Timer } from "lucide-react";
import { CustomIcon } from "@/components/common/CustomIcon";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/common/Button";
import { marketService } from "@/lib/marketService";
import {
  auctionService,
  auctionCategories,
  auctionDurationOptions,
} from "@/lib/auctionService";
import { conditionLabels, cn } from "@/lib/utils";
import type { ProductCondition } from "@/types";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/providers/ToastProvider";

const conditions = Object.keys(conditionLabels) as ProductCondition[];

// 등록 방식: 일반 판매 / 경매 등록
type Mode = "normal" | "auction";

export default function BuyerSellRegisterPage() {
  const router = useRouter();
  const { user, ready } = useAuth();
  const { toast } = useToast();

  const [mode, setMode] = useState<Mode>("normal");

  // 공통 필드
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  // 일반 판매 필드
  const [categoryId, setCategoryId] = useState(marketService.categories[0].id);
  const [condition, setCondition] = useState<ProductCondition>("sealed");
  const [price, setPrice] = useState("");

  // 경매 등록 필드
  const [aucCategoryId, setAucCategoryId] = useState(auctionCategories[0].id);
  const [startPrice, setStartPrice] = useState("");
  const [bidUnit, setBidUnit] = useState("");
  const [durationSec, setDurationSec] = useState(auctionDurationOptions[1].sec);

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  function submit() {
    if (!user) return;
    if (!name.trim()) return toast("상품명을 입력해주세요.", "error");

    if (mode === "normal") {
      const p = Number(price.replace(/[^0-9]/g, ""));
      if (!p) return toast("판매 희망가를 입력해주세요.", "error");
      const product = marketService.addProduct({
        name: name.trim(),
        categoryId,
        brand: "",
        condition,
        price: p,
        description: desc.trim(),
        sellerId: user.id,
      });
      toast("상품이 등록되었습니다.");
      router.push(`/product/${product.id}`);
      return;
    }

    // 경매 등록
    const sp = Number(startPrice.replace(/[^0-9]/g, ""));
    const bu = Number(bidUnit.replace(/[^0-9]/g, ""));
    if (!sp) return toast("시작가를 입력해주세요.", "error");
    if (!bu) return toast("입찰 단위를 입력해주세요.", "error");
    auctionService.addItem({
      sellerId: user.id,
      name: name.trim(),
      description: desc.trim(),
      categoryId: aucCategoryId,
      startPrice: sp,
      bidUnit: bu,
      buyNowPrice: null,
      durationSec,
    });
    toast("경매 상품이 등록되었습니다. 마이페이지 > 판매내역에서 확인하세요.");
    router.push("/mypage");
  }

  return (
    <MobileShell>
      <PageHeader title="상품 등록" />
      <div className="space-y-5 px-4 py-4">
        {/* 등록 방식 선택 */}
        <div>
          <Label>등록 방식</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMode("normal")}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border py-3.5 transition-colors",
                mode === "normal"
                  ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500"
                  : "border-neutral-200 hover:border-brand-300 hover:bg-brand-50/40"
              )}
            >
              <Tag
                className={cn("h-5 w-5", mode === "normal" ? "text-brand-700" : "text-neutral-400")}
                strokeWidth={1.75}
              />
              <span
                className={cn(
                  "text-sm font-bold",
                  mode === "normal" ? "text-neutral-900" : "text-neutral-500"
                )}
              >
                일반 판매
              </span>
              <span className="text-[10px] text-neutral-400">정해진 가격으로 판매</span>
            </button>
            <button
              onClick={() => setMode("auction")}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border py-3.5 transition-colors",
                mode === "auction"
                  ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500"
                  : "border-neutral-200 hover:border-brand-300 hover:bg-brand-50/40"
              )}
            >
              <Gavel
                className={cn("h-5 w-5", mode === "auction" ? "text-brand-700" : "text-neutral-400")}
                strokeWidth={1.75}
              />
              <span
                className={cn(
                  "text-sm font-bold",
                  mode === "auction" ? "text-neutral-900" : "text-neutral-500"
                )}
              >
                경매 등록
              </span>
              <span className="text-[10px] text-neutral-400">입찰 경쟁으로 판매</span>
            </button>
          </div>
        </div>

        {/* 이미지 업로드 mock */}
        <div>
          <Label>상품 이미지</Label>
          <div className="flex gap-2">
            <button className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-brand-300 bg-brand-50/50 text-brand-700 transition-colors hover:border-brand-500 hover:bg-brand-50">
              <CustomIcon name="rf-cert" size={24} className="h-6 w-6" />
              <span className="text-[10px] font-semibold">사진 추가</span>
            </button>
            <div className="honeycomb-dark flex h-20 w-20 items-center justify-center rounded-xl bg-gradient-to-br from-brand-300 to-brand-500 text-[11px] font-bold text-neutral-900">
              미리보기
            </div>
          </div>
          <p className="mt-1 text-[11px] text-neutral-400">
            * mock UI · 실제 업로드는 API 연동 시 지원됩니다.
          </p>
        </div>

        <div>
          <Label>상품명</Label>
          <Input value={name} onChange={setName} placeholder="예: MG 프리덤 건담 Ver.2.0" />
        </div>

        {/* 카테고리 */}
        <div>
          <Label>카테고리</Label>
          {mode === "normal" ? (
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 px-3 py-3 text-sm outline-none focus:border-brand-500"
            >
              {marketService.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          ) : (
            <select
              value={aucCategoryId}
              onChange={(e) => setAucCategoryId(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 px-3 py-3 text-sm outline-none focus:border-brand-500"
            >
              {auctionCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {mode === "normal" ? (
          <>
            {/* 상태 */}
            <div>
              <Label>상품 상태</Label>
              <div className="grid grid-cols-3 gap-2">
                {conditions.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCondition(c)}
                    className={cn(
                      "rounded-lg border py-2.5 text-xs font-semibold",
                      condition === c
                        ? "border-neutral-900 bg-neutral-900 text-brand-400"
                        : "border-neutral-200 text-neutral-500 hover:border-brand-400 hover:bg-brand-50"
                    )}
                  >
                    {conditionLabels[c]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>판매 희망가</Label>
              <Input value={price} onChange={setPrice} placeholder="가격 (원)" inputMode="numeric" />
            </div>
          </>
        ) : (
          <>
            <div>
              <Label>시작가</Label>
              <Input
                value={startPrice}
                onChange={setStartPrice}
                placeholder="경매 시작가 (원)"
                inputMode="numeric"
              />
            </div>
            <div>
              <Label>입찰 단위</Label>
              <Input
                value={bidUnit}
                onChange={setBidUnit}
                placeholder="최소 입찰 단위 (원)"
                inputMode="numeric"
              />
            </div>
            <div>
              <Label>경매 시간</Label>
              <div className="grid grid-cols-5 gap-1.5">
                {auctionDurationOptions.map((d) => (
                  <button
                    key={d.sec}
                    onClick={() => setDurationSec(d.sec)}
                    className={cn(
                      "flex flex-col items-center gap-0.5 rounded-lg border py-2 text-xs font-semibold",
                      durationSec === d.sec
                        ? "border-neutral-900 bg-neutral-900 text-brand-400"
                        : "border-neutral-200 text-neutral-500 hover:border-brand-400 hover:bg-brand-50"
                    )}
                  >
                    <Timer className="h-3.5 w-3.5" strokeWidth={1.75} />
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <div>
          <Label>상품 설명</Label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={4}
            placeholder="상품 상태, 구성품 등을 자세히 적어주세요."
            className="w-full resize-none rounded-xl border border-neutral-300 px-3 py-3 text-sm outline-none focus:border-brand-500"
          />
        </div>

        <Button fullWidth size="lg" onClick={submit}>
          {mode === "normal" ? (
            <>
              <Tag className="h-4 w-4" strokeWidth={1.75} /> 판매 등록하기
            </>
          ) : (
            <>
              <Gavel className="h-4 w-4" strokeWidth={1.75} /> 경매 등록하기
            </>
          )}
        </Button>

        {/* 안내 카드 */}
        <div className="honeycomb-light overflow-hidden rounded-2xl bg-[#111111] p-4">
          <p className="text-sm font-bold text-brand-400">레어팜 판매 꿀팁</p>
          <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-neutral-300">
            <li className="flex gap-1.5">
              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-brand-400" />
              박스·설명서·특전 등 구성품을 빠짐없이 기재하면 체결율이 올라가요.
            </li>
            <li className="flex gap-1.5">
              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-brand-400" />
              경매는 시작가를 낮게, 입찰 단위를 적절히 설정하면 참여가 활발해져요.
            </li>
            <li className="flex gap-1.5">
              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-brand-400" />
              등록한 상품은 마이페이지 &gt; 판매내역에서 관리할 수 있어요.
            </li>
          </ul>
        </div>
      </div>
    </MobileShell>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-sm font-semibold text-neutral-700">
      {children}
    </label>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: "numeric" | "text";
}) {
  return (
    <input
      value={value}
      inputMode={inputMode}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-neutral-300 px-3 py-3 text-sm outline-none focus:border-brand-500"
    />
  );
}
