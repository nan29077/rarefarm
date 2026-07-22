"use client";

// 판매자 전환 신청 service layer (mock). 실제 API 연동 시 내부 구현만 교체.
import type { SellerRequest, SellerRequestStatus } from "@/types";
import { getState, update, uid } from "./store";

export const sellerRequestStatusLabels: Record<SellerRequestStatus, string> = {
  pending: "심사 중",
  approved: "승인",
  rejected: "거절",
};

export const sellerRequestService = {
  getAll: (): SellerRequest[] =>
    getState()
      .sellerRequests.slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),

  // 해당 유저의 최근 신청 (심사중 표시용)
  getForUser: (userId: string): SellerRequest | undefined =>
    getState()
      .sellerRequests.slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .find((r) => r.userId === userId),

  submit(input: {
    userId: string;
    name: string;
    businessInfo: string;
    reason: string;
  }): SellerRequest {
    const req: SellerRequest = {
      id: uid("sr"),
      userId: input.userId,
      name: input.name,
      businessInfo: input.businessInfo,
      reason: input.reason,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    update((s) => s.sellerRequests.unshift(req));
    return req;
  },

  // 승인: buyer → seller 로 role 변경
  approve(requestId: string) {
    update((s) => {
      const r = s.sellerRequests.find((x) => x.id === requestId);
      if (!r) return;
      r.status = "approved";
      const u = s.users.find((x) => x.id === r.userId);
      if (u && u.role === "buyer") u.role = "seller";
    });
  },

  reject(requestId: string) {
    update((s) => {
      const r = s.sellerRequests.find((x) => x.id === requestId);
      if (r) r.status = "rejected";
    });
  },
};
