"use client";

import type { Settlement, SettlementStatus, DeliveryMethod, WithdrawAccount } from "@/types";
import { getState, update } from "./store";

export const settlementStatusLabels: Record<SettlementStatus, string> = {
  pending_payment: "결제 대기",
  payment_done: "결제 완료",
  shipping: "배송/전달 중",
  withdrawable: "출금 가능",
  withdrawn: "출금 완료",
  cancelled: "낙찰 취소",
};

export const deliveryMethodLabels: Record<DeliveryMethod, string> = {
  courier: "일반 택배",
  special: "특수 배달 (전문 생물 배달)",
  meetup: "만나서 전달",
};

export const settlementService = {
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
        headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sellerId, withdrawAccount: account }),
      });
      const data = await res.json();
      if (data.ok) {
        update((s) => {
          const now = Date.now();
          s.settlements
            .filter((sv) => sv.sellerId === sellerId && sv.status === "withdrawable")
            .forEach((sv) => {
              sv.status = "withdrawn";
              sv.withdrawRequestedAt = now;
              sv.withdrawnAt = now;
              sv.withdrawAccount = account;
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
