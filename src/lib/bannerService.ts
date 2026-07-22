"use client";

// 메인 슬라이드 배너 service layer (mock). 실제 API 연동 시 내부 구현만 교체.
import type { Banner } from "@/types";
import { getState, update, uid } from "./store";

export interface BannerInput {
  imageUrl: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  order: number;
}

export const bannerService = {
  // 전체 배너 (관리자용) — 순서 오름차순
  getBanners(): Banner[] {
    return getState()
      .banners.slice()
      .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
  },

  // 노출 배너 (메인 슬라이드용)
  getActiveBanners(): Banner[] {
    return bannerService.getBanners().filter((b) => b.isActive);
  },

  getBanner: (id: string): Banner | undefined =>
    getState().banners.find((b) => b.id === id),

  addBanner(input: BannerInput): Banner {
    const banner: Banner = {
      id: uid("bn"),
      ...input,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    update((s) => s.banners.push(banner));
    return banner;
  },

  updateBanner(id: string, patch: Partial<BannerInput>) {
    update((s) => {
      const b = s.banners.find((x) => x.id === id);
      if (b) Object.assign(b, patch);
    });
  },

  deleteBanner(id: string) {
    update((s) => {
      s.banners = s.banners.filter((b) => b.id !== id);
    });
  },

  setBannerActive(id: string, isActive: boolean) {
    update((s) => {
      const b = s.banners.find((x) => x.id === id);
      if (b) b.isActive = isActive;
    });
  },
};
