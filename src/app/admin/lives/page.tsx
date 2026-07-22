"use client";

import { useState } from "react";
import Link from "next/link";
import { Radio, Clock, PauseCircle, CheckCircle2, ExternalLink, Eye } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  StatCard,
  Panel,
  Table,
  StatusPill,
  FilterChip,
  AdminSearch,
} from "@/components/admin/AdminUI";
import { marketService } from "@/lib/marketService";
import { auctionService, liveStatusLabels } from "@/lib/auctionService";
import { useStoreVersion } from "@/lib/useStore";
import { formatNumber, formatDate } from "@/lib/utils";
import type { LiveAuctionStatus } from "@/types";

const statusTone: Record<LiveAuctionStatus, "green" | "amber" | "neutral" | "red"> = {
  scheduled: "neutral",
  live: "amber",
  paused: "red",
  ended: "neutral",
};

const statusList: LiveAuctionStatus[] = ["scheduled", "live", "paused", "ended"];

export default function AdminLivesPage() {
  useStoreVersion();
  const lives = auctionService.getLives();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LiveAuctionStatus | "all">("all");

  const counts = {
    all: lives.length,
    scheduled: lives.filter((l) => l.status === "scheduled").length,
    live: lives.filter((l) => l.status === "live").length,
    paused: lives.filter((l) => l.status === "paused").length,
    ended: lives.filter((l) => l.status === "ended").length,
  };

  const totalViewers = lives.reduce((sum, l) => sum + l.viewers, 0);

  const filtered = lives
    .filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const seller = marketService.getUser(l.sellerId);
        return (
          l.title.toLowerCase().includes(q) ||
          (seller?.nickname ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <AdminLayout title="라이브 목록">
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Radio} label="전체 라이브" value={counts.all} accent />
        <StatCard icon={Radio} label="진행중" value={counts.live} sub="LIVE" />
        <StatCard icon={Clock} label="예정" value={counts.scheduled} />
        <StatCard icon={Eye} label="누적 시청자" value={formatNumber(totalViewers)} />
      </div>

      <Panel
        title={`라이브 목록 (${filtered.length}건)`}
        action={
          <AdminSearch value={query} onChange={setQuery} placeholder="제목/판매자 검색..." />
        }
      >
        <div className="flex flex-wrap gap-2 px-3 pt-2">
          <FilterChip active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>
            전체 ({counts.all})
          </FilterChip>
          {statusList.map((s) => (
            <FilterChip
              key={s}
              active={statusFilter === s}
              onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
            >
              {liveStatusLabels[s]} ({counts[s]})
            </FilterChip>
          ))}
        </div>

        {/* PC 테이블 */}
        <div className="hidden md:block">
          <Table head={["제목", "판매자", "플랫폼", "예정 시각", "시청자", "상품수", "상태", "보기"]}>
            {filtered.map((l) => {
              const seller = marketService.getUser(l.sellerId);
              return (
                <tr key={l.id}>
                  <td className="px-3 py-2.5">
                    <p className="line-clamp-1 font-medium text-neutral-800">{l.title}</p>
                  </td>
                  <td className="px-3 py-2.5 text-neutral-600">{seller?.nickname ?? "-"}</td>
                  <td className="px-3 py-2.5">
                    <StatusPill tone="neutral">
                      {l.platform === "youtube" ? "YouTube" : "Instagram"}
                    </StatusPill>
                  </td>
                  <td className="px-3 py-2.5 text-neutral-400">{formatDate(l.scheduledAt)}</td>
                  <td className="px-3 py-2.5 text-neutral-600">{formatNumber(l.viewers)}</td>
                  <td className="px-3 py-2.5 text-neutral-600">{l.itemIds.length}개</td>
                  <td className="px-3 py-2.5">
                    <StatusPill tone={statusTone[l.status]}>
                      {liveStatusLabels[l.status]}
                    </StatusPill>
                  </td>
                  <td className="px-3 py-2.5">
                    {(l.status === "live" || l.status === "paused") && (
                      <Link
                        href={`/live-auction/${l.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-2 py-1 text-xs text-neutral-600 hover:border-brand-400 hover:bg-brand-50"
                      >
                        <ExternalLink className="h-3 w-3" strokeWidth={2} /> 입장
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-sm text-neutral-400">
                  조건에 맞는 라이브가 없습니다.
                </td>
              </tr>
            )}
          </Table>
        </div>

        {/* 모바일 카드 */}
        <div className="space-y-3 p-3 md:hidden">
          {filtered.map((l) => {
            const seller = marketService.getUser(l.sellerId);
            return (
              <div key={l.id} className="rounded-xl border border-neutral-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-bold text-neutral-900">{l.title}</p>
                    <p className="text-xs text-neutral-400">{seller?.nickname} · {l.platform === "youtube" ? "YouTube" : "Instagram"}</p>
                    <p className="text-xs text-neutral-500">{formatDate(l.scheduledAt)} · 시청자 {formatNumber(l.viewers)}</p>
                  </div>
                  <StatusPill tone={statusTone[l.status]}>{liveStatusLabels[l.status]}</StatusPill>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-neutral-400">상품 {l.itemIds.length}개</span>
                  {(l.status === "live" || l.status === "paused") && (
                    <Link
                      href={`/live-auction/${l.id}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-2 py-1 text-neutral-600 hover:border-brand-400"
                    >
                      <ExternalLink className="h-3 w-3" strokeWidth={2} /> 입장
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-neutral-400">조건에 맞는 라이브가 없습니다.</p>
          )}
        </div>
      </Panel>
    </AdminLayout>
  );
}
