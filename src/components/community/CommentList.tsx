"use client";

import { useState } from "react";
import { CustomIcon } from "@/components/common/CustomIcon";
import { Avatar } from "@/components/common/Avatar";
import { communityService } from "@/lib/communityService";
import { useStoreVersion } from "@/lib/useStore";
import { useAuth } from "@/components/providers/AuthProvider";
import { timeAgo } from "@/lib/utils";

export function CommentList({ postId }: { postId: string }) {
  useStoreVersion();
  const { user, requireAuth } = useAuth();
  const [text, setText] = useState("");
  const comments = communityService.getComments(postId);

  function submit() {
    if (!requireAuth()) return;
    const t = text.trim();
    if (!t) return;
    communityService.addComment(postId, user!.id, t);
    setText("");
  }

  return (
    <div>
      <div className="space-y-4 px-4 py-3">
        {comments.length === 0 && (
          <p className="text-sm text-neutral-400">
            첫 번째 댓글을 남겨보세요.
          </p>
        )}
        {comments.map((c) => {
          const author = communityService.getUser(c.userId);
          return (
            <div key={c.id} className="flex gap-2.5">
              <Avatar
                seed={author?.avatar ?? "?"}
                name={author?.nickname}
                size={32}
              />
              <div className="flex-1">
                <p className="text-sm text-neutral-800">
                  <span className="font-bold">{author?.nickname}</span>{" "}
                  {c.content}
                </p>
                <p className="mt-0.5 text-[11px] text-neutral-400">
                  {timeAgo(c.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 댓글 입력 */}
      <div className="sticky bottom-0 flex items-center gap-2 border-t border-neutral-100 bg-white px-4 py-2.5">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="댓글 달기..."
          className="flex-1 rounded-full bg-neutral-100 px-4 py-2.5 text-sm outline-none"
        />
        <button
          onClick={submit}
          className="rounded-full bg-neutral-900 p-2.5 text-brand-400 transition-colors hover:bg-neutral-800 disabled:opacity-40"
          disabled={!text.trim()}
          aria-label="댓글 등록"
        >
          <CustomIcon name="rf-comment" size={16} className="h-4 w-4 brightness-0 invert" />
        </button>
      </div>
    </div>
  );
}
