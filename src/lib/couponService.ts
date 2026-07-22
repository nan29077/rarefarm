"use client";

// 라이브 경매 쿠폰 service layer (mock). 실제 API 연동 시 내부 구현만 교체하면 된다.
import type { LiveCoupon, UserLiveCoupon } from "@/types";
import { getState, update, uid } from "./store";

// 쿠폰 할인 내용을 사람이 읽는 라벨로 변환 ("10% 할인" / "5,000원 할인")
export function couponDiscountLabel(
  discountType: "percent" | "fixed",
  discountValue: number
): string {
  return discountType === "percent"
    ? `${discountValue}% 할인`
    : `${discountValue.toLocaleString("ko-KR")}원 할인`;
}

// 쿠폰 발급 결과
export type IssueResult =
  | { ok: true; coupon: UserLiveCoupon }
  | { ok: false; reason: "duplicate" | "soldout" | "notfound" };

export const couponService = {
  // ================= 판매자 쿠폰 (원본) =================

  // 판매자의 쿠폰 목록 (최신순)
  getLiveCoupons(sellerId: string): LiveCoupon[] {
    return getState()
      .liveCoupons.filter((c) => c.sellerId === sellerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  getLiveCoupon: (id: string): LiveCoupon | undefined =>
    getState().liveCoupons.find((c) => c.id === id),

  // 쿠폰 생성
  createLiveCoupon(input: {
    sellerId: string;
    name: string;
    discountType: "percent" | "fixed";
    discountValue: number;
    minOrderAmount?: number;
    maxDiscount?: number;
    expiryDays: number;
    totalCount?: number;
  }): LiveCoupon {
    const coupon: LiveCoupon = {
      id: uid("lc"),
      sellerId: input.sellerId,
      name: input.name,
      discountType: input.discountType,
      discountValue: input.discountValue,
      minOrderAmount: input.minOrderAmount,
      maxDiscount: input.maxDiscount,
      expiryDays: input.expiryDays,
      totalCount: input.totalCount,
      issuedCount: 0,
      createdAt: new Date().toISOString(),
    };
    update((s) => s.liveCoupons.unshift(coupon));
    return coupon;
  },

  // 쿠폰 삭제 — 라이브에 첨부된 참조도 함께 제거
  deleteLiveCoupon(id: string) {
    update((s) => {
      s.liveCoupons = s.liveCoupons.filter((c) => c.id !== id);
      s.liveAuctions.forEach((l) => {
        if (l.couponIds)
          l.couponIds = l.couponIds.filter((cid) => cid !== id);
      });
    });
  },

  // ================= 사용자 발급 쿠폰 =================

  // 사용자에게 쿠폰 발급 (중복/수량 체크)
  issueLiveCouponToUser(
    liveCouponId: string,
    userId: string,
    liveId: string
  ): IssueResult {
    const s = getState();
    const src = s.liveCoupons.find((c) => c.id === liveCouponId);
    if (!src) return { ok: false, reason: "notfound" };
    // 이미 발급받은 쿠폰인지 확인
    const already = s.userLiveCoupons.find(
      (uc) => uc.userId === userId && uc.liveCouponId === liveCouponId
    );
    if (already) return { ok: false, reason: "duplicate" };
    // 수량 제한 초과 확인
    if (src.totalCount !== undefined && src.issuedCount >= src.totalCount)
      return { ok: false, reason: "soldout" };

    const expiresAt = new Date(
      Date.now() + src.expiryDays * 24 * 60 * 60 * 1000
    ).toISOString();
    const coupon: UserLiveCoupon = {
      id: uid("uc"),
      userId,
      liveCouponId,
      liveId,
      name: src.name,
      discountType: src.discountType,
      discountValue: src.discountValue,
      minOrderAmount: src.minOrderAmount,
      maxDiscount: src.maxDiscount,
      expiresAt,
      used: false,
      issuedAt: new Date().toISOString(),
    };
    update((st) => {
      st.userLiveCoupons.push(coupon);
      const c = st.liveCoupons.find((x) => x.id === liveCouponId);
      if (c) c.issuedCount += 1;
    });
    return { ok: true, coupon };
  },

  // 사용자의 보유 쿠폰 (최신 발급순)
  getUserLiveCoupons(userId: string): UserLiveCoupon[] {
    return getState()
      .userLiveCoupons.filter((c) => c.userId === userId)
      .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  },

  // 사용자가 특정 라이브에서 이미 받은 쿠폰 ID 목록
  getIssuedCouponIds(userId: string, liveCouponIds: string[]): string[] {
    const mine = getState().userLiveCoupons.filter((c) => c.userId === userId);
    return liveCouponIds.filter((id) =>
      mine.some((uc) => uc.liveCouponId === id)
    );
  },

  // 쿠폰 사용 처리
  useLiveCoupon(couponId: string) {
    update((s) => {
      const c = s.userLiveCoupons.find((x) => x.id === couponId);
      if (c) c.used = true;
    });
  },

  // ================= 판매자 YouTube API 키 =================

  getSellerYoutubeApiKey: (sellerId: string): string =>
    getState().sellerYoutubeApiKeys[sellerId] ?? "",

  saveSellerYoutubeApiKey(sellerId: string, key: string) {
    update((s) => {
      s.sellerYoutubeApiKeys = { ...s.sellerYoutubeApiKeys, [sellerId]: key };
    });
  },
};
