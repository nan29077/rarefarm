"use client";

import { useState } from "react";
import { Images, Eye, EyeOff, Heart } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  StatCard,
  Panel,
  Table,
  StatusPill,
  ActionButton,
  AdminSearch,
  FilterChip,
} from "@/components/admin/AdminUI";
import { Placeholder } from "@/components/common/Placeholder";
import { communityService } from "@/lib/communityService";
import { useStoreVersion } from "@/lib/useStore";
import { useToast } from "@/components/providers/ToastProvider";
import { formatNumber, timeAgo } from "@/lib/utils";

type VisFilter = "all" | "visible" | "hidden";

export default function AdminCommunityPage() {
  useStoreVersion();
  const { toast } = useToast();
  const posts = communityService.getPosts("feed", undefined, true);

  const [query, setQuery] = useState("");
  const [visFilter, setVisFilter] = useState<VisFilter>("all");

  const visibleCount = posts.filter((p) => p.status === "visible").length;
  const hiddenCount = posts.filter((p) => p.status === "hidden").length;
  const totalLikes = posts.reduce((sum, p) => sum + p.likeCount, 0);

  const filtered = posts.filter((p) => {
    if (visFilter !== "all" && p.status !== visFilter) return false;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      const author = communityService.getUser(p.userId);
      return (
        p.content.toLowerCase().includes(q) ||
        (author?.nickname ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  function toggle(id: string, current: "visible" | "hidden") {
    const next = current === "visible" ? "hidden" : "visible";
    communityService.setPostStatus(id, next);
    toast(next === "hidden" ? "게시물을 숨김 처리했습니다." : "게시물을 정상 처리했습니다.");
  }

  return (
    <AdminLayout title="커뮤니티 관리">
      {/* 통계 카드 */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Images} label="전체 게시물" value={posts.length} accent />
        <StatCard icon={Eye} label="정상 게시물" value={visibleCount} />
        <StatCard icon={EyeOff} label="숨김 게시물" value={hiddenCount} />
        <StatCard
          icon={Heart}
          label="누적 좋아요"
          value={formatNumber(totalLikes)}
        />
      </div>

      <Panel
        title={`게시물 목록 (${filtered.length}개)`}
        action={
          <div className="flex items-center gap-2">
            <FilterChip
              active={visFilter === "all"}
              onClick={() => setVisFilter("all")}
            >
              전체
            </FilterChip>
            <FilterChip
              active={visFilter === "visible"}
              onClick={() => setVisFilter("visible")}
            >
              정상
            </FilterChip>
            <FilterChip
              active={visFilter === "hidden"}
              onClick={() => setVisFilter("hidden")}
            >
              숨김
            </FilterChip>
            <AdminSearch
              value={query}
              onChange={setQuery}
              placeholder="내용/작성자 검색"
            />
          </div>
        }
      >
        <Table head={["게시물", "작성자", "좋아요", "작성일", "상태", "관리"]}>
          {filtered.map((p) => {
            const author = communityService.getUser(p.userId);
            return (
              <tr key={p.id}>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2.5">
                    <Placeholder
                      seed={p.images[0]}
                      className="h-10 w-10 rounded-lg"
                    />
                    <span className="line-clamp-1 max-w-[240px] text-neutral-800">
                      {p.content}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3 text-neutral-500">{author?.nickname}</td>
                <td className="px-3 py-3 text-neutral-500">
                  {formatNumber(p.likeCount)}
                </td>
                <td className="px-3 py-3 text-neutral-400">
                  {timeAgo(p.createdAt)}
                </td>
                <td className="px-3 py-3">
                  <StatusPill tone={p.status === "visible" ? "green" : "neutral"}>
                    {p.status === "visible" ? "정상" : "숨김"}
                  </StatusPill>
                </td>
                <td className="px-3 py-3">
                  <ActionButton onClick={() => toggle(p.id, p.status)}>
                    {p.status === "visible" ? "숨김" : "정상 전환"}
                  </ActionButton>
                </td>
              </tr>
            );
          })}
        </Table>
        {filtered.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-neutral-400">
            조건에 맞는 게시물이 없습니다.
          </p>
        )}
      </Panel>
    </AdminLayout>
  );
}
