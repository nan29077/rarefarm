"use client";

import { useState } from "react";
import { Check, TrendingUp, TrendingDown } from "lucide-react";
import type { Product } from "@/types";
import { Button } from "@/components/common/Button";
import { Modal } from "@/components/common/Modal";
import { Badge } from "@/components/common/Badge";
import { formatPrice } from "@/lib/utils";
import { marketService } from "@/lib/marketService";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/providers/ToastProvider";

type Mode = "bid" | "ask" | null;

export function BidAskPanel({ product }: { product: Product }) {
  const { user, requireAuth } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>(null);
  const [price, setPrice] = useState("");
  const [days, setDays] = useState(7);

  const bids = marketService.getBidsForProduct(product.id);
  const asks = marketService.getAsksForProduct(product.id);
  const lowestAsk = product.lowestAsk;
  const highestBid = product.highestBid;

  function openBid() {
    if (!requireAuth()) return;
    setPrice(highestBid ? String(highestBid + 1000) : "");
    setMode("bid");
  }
  function openAsk() {
    if (!requireAuth()) return;
    setPrice(lowestAsk ? String(lowestAsk - 1000) : "");
    setMode("ask");
  }

  function submit() {
    const p = Number(price.replace(/[^0-9]/g, ""));
    if (!p || p <= 0) {
      toast("가격을 입력해주세요.", "error");
      return;
    }
    if (mode === "bid") {
      marketService.placeBid(product.id, user!.id, p, days);
      const matched = lowestAsk !== null && p >= lowestAsk;
      toast(matched ? "즉시 체결 가능한 구매입찰!" : "구매입찰이 등록되었습니다.");
    } else if (mode === "ask") {
      marketService.placeAsk(product.id, user!.id, p, days);
      const matched = highestBid !== null && p <= highestBid;
      toast(matched ? "즉시 체결 가능한 판매입찰!" : "판매입찰이 등록되었습니다.");
    }
    setMode(null);
  }

  function instantBuy() {
    if (!requireAuth()) return;
    marketService.instantBuy(product.id, user!.id);
    toast(`즉시구매 주문 생성 (${formatPrice(lowestAsk)})`, "info");
  }
  function instantSell() {
    if (!requireAuth()) return;
    marketService.instantSell(product.id, user!.id);
    toast(`즉시판매 주문 생성 (${formatPrice(highestBid)})`, "info");
  }

  const previewPrice = Number(price.replace(/[^0-9]/g, "")) || 0;
  const bidMatch = mode === "bid" && lowestAsk !== null && previewPrice >= lowestAsk;
  const askMatch = mode === "ask" && highestBid !== null && previewPrice <= highestBid;

  return (
    <div>
      {/* 가격 요약 */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={instantBuy}
          className="honeycomb-dark rounded-xl border border-brand-300 bg-gradient-to-br from-brand-100 to-brand-200 p-3 text-left transition hover:from-brand-200 hover:to-brand-300"
        >
          <p className="text-[11px] font-bold text-brand-800">즉시구매</p>
          <p className="text-lg font-extrabold text-neutral-900">
            {formatPrice(lowestAsk)}
          </p>
          <p className="text-[11px] text-neutral-500">최저 판매가</p>
        </button>
        <button
          onClick={instantSell}
          className="honeycomb-light rounded-xl border border-neutral-800 bg-[#1a1a1a] p-3 text-left transition hover:bg-black"
        >
          <p className="text-[11px] font-bold text-brand-400">즉시판매</p>
          <p className="text-lg font-extrabold text-white">
            {formatPrice(highestBid)}
          </p>
          <p className="text-[11px] text-neutral-400">최고 구매입찰가</p>
        </button>
      </div>

      {/* 입찰 버튼 */}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={openBid}>
          <TrendingUp className="h-4 w-4" /> 구매입찰
        </Button>
        <Button variant="outline" onClick={openAsk}>
          <TrendingDown className="h-4 w-4" /> 판매입찰
        </Button>
      </div>

      {/* 입찰 리스트 */}
      <div className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <p className="mb-2 text-sm font-bold text-neutral-800">구매 입찰</p>
          <div className="space-y-1">
            {bids.length === 0 && (
              <p className="text-xs text-neutral-400">입찰 없음</p>
            )}
            {bids.slice(0, 5).map((b) => {
              const canMatch = lowestAsk !== null && b.price >= lowestAsk;
              return (
                <div
                  key={b.id}
                  className="flex items-center justify-between rounded-lg bg-neutral-50 px-2.5 py-1.5 text-sm"
                >
                  <span className="font-semibold text-neutral-800">
                    {formatPrice(b.price)}
                  </span>
                  {canMatch ? (
                    <Badge tone="green">
                      <Check className="h-3 w-3" />
                      체결가능
                    </Badge>
                  ) : (
                    <span className="text-[11px] text-neutral-400">
                      {b.expirationDays}일
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-bold text-neutral-800">판매 입찰</p>
          <div className="space-y-1">
            {asks.length === 0 && (
              <p className="text-xs text-neutral-400">입찰 없음</p>
            )}
            {asks.slice(0, 5).map((a) => {
              const canMatch = highestBid !== null && a.price <= highestBid;
              return (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-lg bg-neutral-50 px-2.5 py-1.5 text-sm"
                >
                  <span className="font-semibold text-neutral-800">
                    {formatPrice(a.price)}
                  </span>
                  {canMatch ? (
                    <Badge tone="green">
                      <Check className="h-3 w-3" />
                      체결가능
                    </Badge>
                  ) : (
                    <span className="text-[11px] text-neutral-400">
                      {a.expirationDays}일
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 입찰 등록 모달 */}
      <Modal
        open={mode !== null}
        onClose={() => setMode(null)}
        title={mode === "bid" ? "구매입찰 등록" : "판매입찰 등록"}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-600">
              희망 가격
            </label>
            <input
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="가격 입력 (원)"
              className="w-full rounded-xl border border-neutral-300 px-3 py-3 text-lg font-bold outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-600">
              입찰 마감
            </label>
            <div className="flex gap-2">
              {[3, 7, 14, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={
                    "flex-1 rounded-lg border py-2 text-sm font-semibold " +
                    (days === d
                      ? "border-neutral-900 bg-neutral-900 text-brand-400"
                      : "border-neutral-200 text-neutral-500 hover:border-brand-400 hover:bg-brand-50")
                  }
                >
                  {d}일
                </button>
              ))}
            </div>
          </div>
          {(bidMatch || askMatch) && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
              <Check className="h-4 w-4" /> 현재 시세와 즉시 체결 가능한 가격입니다.
            </div>
          )}
          <Button
            fullWidth
            size="lg"
            variant={mode === "ask" ? "sell" : "primary"}
            onClick={submit}
          >
            {mode === "bid" ? "구매입찰 등록하기" : "판매입찰 등록하기"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
