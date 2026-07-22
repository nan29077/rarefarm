"use client";

// 관리자 service layer (mock 상태 변경). 실제 API 연동 시 내부 구현만 교체.
import type { User, Report } from "@/types";
import { getState, update } from "./store";

export const adminService = {
  getStats() {
    const s = getState();
    const today = new Date().toISOString().slice(0, 10);
    return {
      totalMembers: s.users.length,
      todaySignups: s.users.filter((u) => u.createdAt.slice(0, 10) === today)
        .length,
      totalProducts: s.products.length,
      openBids: s.bids.filter((b) => b.status === "open").length,
      completedTrades: s.trades.length,
      totalPosts: s.posts.length,
      pendingReports: s.reports.filter((r) => r.status === "pending").length,
    };
  },

  getMembers: (): User[] => getState().users.slice(),

  setUserStatus(userId: string, status: User["status"]) {
    update((s) => {
      const u = s.users.find((x) => x.id === userId);
      if (u) u.status = status;
    });
  },

  getReports: (): Report[] =>
    getState()
      .reports.slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),

  setReportStatus(reportId: string, status: Report["status"]) {
    update((s) => {
      const r = s.reports.find((x) => x.id === reportId);
      if (r) r.status = status;
    });
  },

  getRecentTrades(limit = 6) {
    const s = getState();
    return s.trades
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit)
      .map((t) => ({
        ...t,
        productName:
          s.products.find((p) => p.id === t.productId)?.name ?? "삭제된 상품",
      }));
  },
};
