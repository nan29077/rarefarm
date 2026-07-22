"use client";

import { useState } from "react";
import { PenSquare } from "lucide-react";
import { CustomIcon } from "@/components/common/CustomIcon";
import { MobileShell } from "@/components/layout/MobileShell";
import { PostCard } from "@/components/community/PostCard";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/common/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { communityService, FeedTab } from "@/lib/communityService";
import { useStoreVersion } from "@/lib/useStore";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { cn } from "@/lib/utils";

const tabs: { key: FeedTab; label: string }[] = [
  { key: "feed", label: "피드" },
  { key: "popular", label: "인기" },
  { key: "mine", label: "내 게시물" },
];

export default function CommunityPage() {
  useStoreVersion();
  const { user, requireAuth } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<FeedTab>("feed");
  const [writing, setWriting] = useState(false);
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");

  const posts = communityService.getPosts(tab, user?.id);

  function openWrite() {
    if (!requireAuth()) return;
    setWriting(true);
  }
  function publish() {
    if (!content.trim()) return toast("내용을 입력해주세요.", "error");
    const hashtags = tags
      .split(/[,\s]+/)
      .map((t) => t.replace(/^#/, "").trim())
      .filter(Boolean);
    communityService.addPost(user!.id, content.trim(), hashtags);
    toast("게시물이 등록되었습니다.");
    setContent("");
    setTags("");
    setWriting(false);
    setTab("mine");
  }

  return (
    <MobileShell>
      {/* 헤더 */}
      <header className="sticky top-12 z-30 flex items-center justify-between border-b border-neutral-100 bg-white/95 px-4 py-3 backdrop-blur md:top-0">
        <h1 className="flex items-center gap-1.5 text-lg font-extrabold text-neutral-900">
          <span className="h-4 w-1.5 rounded-full bg-brand-500" />
          커뮤니티
        </h1>
        <button
          onClick={openWrite}
          className="flex items-center gap-1 rounded-full bg-neutral-900 px-3 py-1.5 text-xs font-bold text-brand-400 transition-colors hover:bg-neutral-800"
          aria-label="글쓰기"
        >
          <PenSquare className="h-4 w-4" strokeWidth={1.9} /> 글쓰기
        </button>
      </header>

      {/* 탭 */}
      <div className="flex border-b border-neutral-100">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex-1 py-3 text-sm font-semibold",
              tab === t.key
                ? "border-b-2 border-brand-500 text-neutral-900"
                : "text-neutral-400 hover:text-neutral-600"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 피드 */}
      {posts.length === 0 ? (
        <EmptyState
          icon="rf-nav-community"
          title={tab === "mine" ? "아직 게시물이 없어요" : "게시물이 없어요"}
          description="첫 득템 인증을 올려보세요!"
          action={
            <Button size="sm" onClick={openWrite}>
              글쓰기
            </Button>
          }
        />
      ) : (
        <div>
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}

      {/* 글쓰기 모달 (mock) */}
      <Modal open={writing} onClose={() => setWriting(false)} title="게시물 작성">
        <div className="space-y-3">
          <div className="flex h-32 items-center justify-center rounded-xl border-2 border-dashed border-brand-300 bg-brand-50/50 text-sm font-medium text-brand-700">
            <CustomIcon
              name="rf-nav-community"
              size={20}
              className="mr-1.5 h-5 w-5"
            />{" "}
            사진 추가 (mock)
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            placeholder="오늘의 득템을 자랑해보세요..."
            className="w-full resize-none rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500"
          />
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="해시태그 (예: 건프라 득템인증)"
            className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500"
          />
          <Button fullWidth onClick={publish}>
            게시하기
          </Button>
        </div>
      </Modal>
    </MobileShell>
  );
}
