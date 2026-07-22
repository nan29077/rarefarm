"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { CustomIcon } from "@/components/common/CustomIcon";
import type { CommunityPost } from "@/types";
import { Placeholder } from "@/components/common/Placeholder";
import { Avatar } from "@/components/common/Avatar";

import { formatNumber, timeAgo } from "@/lib/utils";
import { communityService } from "@/lib/communityService";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { useStoreVersion } from "@/lib/useStore";

const NO_IMAGE_STICKERS = [
  "/레어팜_이미지없음_공통.svg",
  "/레어팜_이미지없음_식물.svg",
  "/레어팜_이미지없음_파충류.svg",
] as const;

function getNoImageSticker(postId: string): string {
  return NO_IMAGE_STICKERS[postId.charCodeAt(0) % 3];
}

export function PostCard({ post }: { post: CommunityPost }) {
  useStoreVersion();
  const { user, requireAuth } = useAuth();
  const { toast } = useToast();
  const [slide, setSlide] = useState(0);

  const author = communityService.getUser(post.userId);
  const liked = user ? communityService.isLiked(user.id, post.id) : false;
  const bookmarked = user
    ? communityService.isBookmarked(user.id, post.id)
    : false;

  function like() {
    if (!requireAuth()) return;
    communityService.toggleLike(user!.id, post.id);
  }
  function bookmark() {
    if (!requireAuth()) return;
    const now = communityService.toggleBookmark(user!.id, post.id);
    toast(now ? "북마크에 저장했어요." : "북마크를 해제했어요.");
  }
  function share() {
    toast("게시물 링크가 복사되었습니다.", "info");
  }

  return (
    <article className="border-b border-neutral-100 pb-3">
      {/* 헤더 */}
      <div className="flex items-center gap-2.5 px-4 py-3">
        <Avatar seed={author?.avatar ?? "?"} name={author?.nickname} size={36} />
        <div className="flex-1">
          <p className="text-sm font-bold text-neutral-900">
            {author?.nickname}
          </p>
          <p className="text-[11px] text-neutral-400">{timeAgo(post.createdAt)}</p>
        </div>
        <button className="text-neutral-400" aria-label="더보기">
          <CustomIcon name="rf-view" size={20} className="h-5 w-5 grayscale opacity-60" />
        </button>
      </div>

      {/* 이미지 */}
      <Link href={`/community/${post.id}`} className="relative block">
        {post.images.length === 0 ? (
          <div className="relative aspect-square w-full bg-neutral-50">
            <Image
              src={getNoImageSticker(post.id)}
              alt="이미지 없음"
              fill
              className="object-contain"
            />
          </div>
        ) : (
          <>
            <div className="flex snap-x snap-mandatory overflow-x-auto no-scrollbar">
              {post.images.map((img, i) => (
                <Placeholder
                  key={i}
                  seed={img}
                  className="aspect-square w-full shrink-0 snap-center"
                />
              ))}
            </div>
            {post.images.length > 1 && (
              <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1">
                {post.images.map((_, i) => (
                  <span
                    key={i}
                    className={
                      "h-1.5 w-1.5 rounded-full " +
                      (i === slide ? "bg-white" : "bg-white/50")
                    }
                    onClick={() => setSlide(i)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </Link>

      {/* 액션 */}
      <div className="flex items-center gap-4 px-4 pt-3">
        <button onClick={like} className="flex items-center gap-1">
          <CustomIcon
            name="rf-like"
            size={24}
            className={"h-6 w-6 " + (liked ? "" : "grayscale")}
          />
          <span className="text-sm font-semibold text-neutral-700">
            {formatNumber(post.likeCount)}
          </span>
        </button>
        <Link
          href={`/community/${post.id}`}
          className="flex items-center gap-1"
        >
          <CustomIcon name="rf-comment" size={24} className="h-6 w-6" />
          <span className="text-sm font-semibold text-neutral-700">
            {post.commentCount}
          </span>
        </Link>
        <button onClick={share}>
          <CustomIcon name="rf-share" size={24} className="h-6 w-6" />
        </button>
        <button onClick={bookmark} className="ml-auto">
          <CustomIcon
            name="sns-bookmark"
            size={24}
            className={"h-6 w-6 " + (bookmarked ? "" : "grayscale")}
          />
        </button>
      </div>

      {/* 본문 */}
      <div className="px-4 pt-2">
        <p className="text-sm leading-relaxed text-neutral-800">
          <span className="font-bold">{author?.nickname}</span>{" "}
          {post.content}
        </p>
        <p className="mt-1 text-sm font-semibold text-brand-700">
          {post.hashtags.map((h) => `#${h}`).join(" ")}
        </p>
        {post.commentCount > 0 && (
          <Link
            href={`/community/${post.id}`}
            className="mt-1 inline-block text-xs text-neutral-400"
          >
            댓글 {post.commentCount}개 모두 보기
          </Link>
        )}
      </div>
    </article>
  );
}
