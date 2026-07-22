"use client";

import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { PostCard } from "./PostCard";
import { CommentList } from "./CommentList";
import { communityService } from "@/lib/communityService";
import { useStoreVersion } from "@/lib/useStore";

export function PostDetail({ postId }: { postId: string }) {
  useStoreVersion();
  const post = communityService.getPost(postId);
  if (!post) return notFound();

  return (
    <div>
      <PageHeader title="게시물" />
      <PostCard post={post} />
      <CommentList postId={post.id} />
    </div>
  );
}
