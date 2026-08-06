"use client";

import type { Settlement, SettlementStatus, DeliveryMethod, WithdrawAccount } from "@/types";
import { getState, update } from "./store";
import { authHeaders, jsonAuthHeaders } from "./apiClient";

export const settlementStatusLabels: Record<SettlementStatus, string> = {
  pending_payment: "결제 대기",
  payment_done: "결제 완료",
  shipping: "배송/전달 중",
  withdrawable: "출금 가능",
  withdrawal_requested: "출금 처리 중",
  withdrawn: "출금 완료",
  cancelled: "낙찰 취소",
};

export const deliveryMethodLabels: Record<DeliveryMethod, string> = {
  courier: "일반 택배",
  special: "특수 배달 (전문 생물 배달)",
  meetup: "만나서 전달",
};

export const settlementService = {
  /**
   * 서버(.live-data/settlements.json)의 정산 데이터를 로컬 store에 병합한다.
   * 정산은 서버 파일이 단일 기준이라 관리자·판매자·구매자 화면이 같은 데이터를 본다.
   * 필터 없이 호출하면 전체 조회(관리자 전용)다.
   */
  async syncFromServer(params?: { sellerId?: string; buyerId?: string }): Promise<boolean> {
    try {
      const qs = new URLSearchParams();
      if (params?.sellerId) qs.set("sellerId", params.sellerId);
      if (params?.buyerId) qs.set("buyerId", params.buyerId);
      const res = await fetch(`/api/settlement/create?${qs.toString()}`, {
        headers: authHeaders(),
      });
      if (!res.ok) return false;
      const { settlements } = (await res.json()) as { settlements: Settlement[] };
      if (!Array.isArray(settlements)) return false;
      update((s) => {
        settlements.forEach((sv) => {
          const idx = s.settlements.findIndex((x) => x.id === sv.id);
          if (idx >= 0) s.settlements[idx] = sv; // 서버가 기준
          else s.settlements.push(sv);
        });
      });
      return true;
    } catch {
      return false;
    }
  },

  getSettlementsForSeller(sellerId: string): Settlement[] {
    return getState()
      .settlements.filter((s) => s.sellerId === sellerId)
      .sort((a, b) => b.awardedAt - a.awardedAt);
  },

  getSettlementsForBuyer(buyerId: string): Settlement[] {
    return getState()
      .settlements.filter((s) => s.buyerId === buyerId)
      .sort((a, b) => b.awardedAt - a.awardedAt);
  },

  getSellerSummary(sellerId: string) {
    const settlements = this.getSettlementsForSeller(sellerId);
    const pendingAmount = settlements
      .filter((s) => s.status === "payment_done" || s.status === "shipping")
      .reduce((sum, s) => sum + s.settlementAmount, 0);
    const withdrawableAmount = settlements
      .filter((s) => s.status === "withdrawable")
      .reduce((sum, s) => sum + s.settlementAmount, 0);
    return { pendingAmount, withdrawableAmount };
  },

  async pay(settlementId: string, buyerId: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch("/api/settlement/pay", {
        method: "POST",
        headers: jsonAuthHeaders(),
        body: JSON.stringify({ settlementId, buyerId }),
      });
      const data = await res.json();
      if (data.ok) {
        update((s) => {
          const sv = s.settlements.find((x) => x.id === settlementId);
          if (sv) { sv.status = "payment_done"; sv.paidAt = Date.now(); }
        });
      }
      return data;
    } catch {
      return { ok: false, error: "네트워크 오류" };
    }
  },

  async ship(
    settlementId: string,
    sellerId: string,
    deliveryMethod: DeliveryMethod,
    trackingNumber?: string,
    meetupLocation?: string
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch("/api/settlement/ship", {
        method: "POST",
        headers: jsonAuthHeaders(),
        body: JSON.stringify({ settlementId, sellerId, deliveryMethod, trackingNumber, meetupLocation }),
      });
      const data = await res.json();
      if (data.ok) {
        update((s) => {
          const sv = s.settlements.find((x) => x.id === settlementId);
          if (sv) {
            sv.status = "shipping";
            sv.shippedAt = Date.now();
            sv.deliveryMethod = deliveryMethod;
            if (trackingNumber) sv.trackingNumber = trackingNumber;
            if (meetupLocation) sv.meetupLocation = meetupLocation;
            sv.autoConfirmAt = Date.now() + 15 * 24 * 60 * 60 * 1000;
          }
        });
      }
      return data;
    } catch {
      return { ok: false, error: "네트워크 오류" };
    }
  },

  async confirm(settlementId: string, buyerId: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch("/api/settlement/confirm", {
        method: "POST",
        headers: jsonAuthHeaders(),
        body: JSON.stringify({ settlementId, buyerId }),
      });
      const data = await res.json();
      if (data.ok) {
        update((s) => {
          const sv = s.settlements.find((x) => x.id === settlementId);
          if (sv) { sv.status = "withdrawable"; sv.confirmedAt = Date.now(); }
        });
      }
      return data;
    } catch {
      return { ok: false, error: "네트워크 오류" };
    }
  },

  async withdraw(
    sellerId: string,
    account: WithdrawAccount
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch("/api/settlement/withdraw", {
        method: "POST",
        headers: jsonAuthHeaders(),
        body: JSON.stringify({ sellerId, withdrawAccount: account }),
      });
      const data = await res.json();
      if (data.ok) {
        update((s) => {
          const now = Date.now();
          s.settlements
            .filter((sv) => sv.sellerId === sellerId && sv.status === "withdrawable")
            .forEach((sv) => {
              sv.status = "withdrawal_requested";
              sv.withdrawRequestedAt = now;
              sv.withdrawAccount = { ...account, accountNumber: `****${account.accountNumber.replace(/\D/g, "").slice(-4)}` };
            });
        });
      }
      return data;
    } catch {
      return { ok: false, error: "네트워크 오류" };
    }
  },

  checkAutoConfirm() {
    const now = Date.now();
    update((s) => {
      s.settlements
        .filter((sv) => sv.status === "shipping" && sv.autoConfirmAt && sv.autoConfirmAt < now)
        .forEach((sv) => { sv.status = "withdrawable"; sv.confirmedAt = now; });
    });
  },

  checkExpiredPayments() {
    const now = Date.now();
    update((s) => {
      s.settlements
        .filter((sv) => sv.status === "pending_payment" && sv.paymentDeadline < now)
        .forEach((sv) => { sv.status = "cancelled"; });
    });
  },
};
