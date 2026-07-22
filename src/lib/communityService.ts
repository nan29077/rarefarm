"use client";

// 커뮤니티 service layer (mock). 실제 API 연동 시 내부 구현만 교체.
import type { CommunityPost, Comment, User } from "@/types";
import { getState, update, uid } from "./store";

export type FeedTab = "feed" | "popular" | "mine";

export const communityService = {
  getUser: (id: string): User | undefined =>
    getState().users.find((u) => u.id === id),

  getPosts(tab: FeedTab, currentUserId?: string, includeHidden = false): CommunityPost[] {
    let list = getState().posts.slice();
    if (!includeHidden) list = list.filter((p) => p.status === "visible");
    if (tab === "popular") {
      list.sort((a, b) => b.likeCount - a.likeCount);
    } else if (tab === "mine") {
      list = list.filter((p) => p.userId === currentUserId);
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } else {
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return list;
  },

  getPost: (id: string) => getState().posts.find((p) => p.id === id),

  getComments: (postId: string): Comment[] =>
    getState()
      .comments.filter((c) => c.postId === postId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),

  isLiked: (userId: string, postId: string) =>
    (getState().likedPosts[userId] ?? []).includes(postId),

  toggleLike(userId: string, postId: string): boolean {
    let now = false;
    update((s) => {
      const list = s.likedPosts[userId] ?? [];
      const post = s.posts.find((p) => p.id === postId);
      if (list.includes(postId)) {
        s.likedPosts[userId] = list.filter((id) => id !== postId);
        if (post) post.likeCount = Math.max(0, post.likeCount - 1);
      } else {
        s.likedPosts[userId] = [...list, postId];
        if (post) post.likeCount += 1;
        now = true;
      }
    });
    return now;
  },

  isBookmarked: (userId: string, postId: string) =>
    (getState().bookmarkedPosts[userId] ?? []).includes(postId),

  toggleBookmark(userId: string, postId: string): boolean {
    let now = false;
    update((s) => {
      const list = s.bookmarkedPosts[userId] ?? [];
      if (list.includes(postId)) {
        s.bookmarkedPosts[userId] = list.filter((id) => id !== postId);
      } else {
        s.bookmarkedPosts[userId] = [...list, postId];
        now = true;
      }
    });
    return now;
  },

  getBookmarkedPosts: (userId: string): CommunityPost[] => {
    const ids = getState().bookmarkedPosts[userId] ?? [];
    return getState().posts.filter((p) => ids.includes(p.id));
  },

  addComment(postId: string, userId: string, content: string): Comment {
    const comment: Comment = {
      id: uid("cm"),
      postId,
      userId,
      content,
      createdAt: new Date().toISOString(),
    };
    update((s) => {
      s.comments.push(comment);
      const post = s.posts.find((p) => p.id === postId);
      if (post) post.commentCount += 1;
    });
    return comment;
  },

  addPost(userId: string, content: string, hashtags: string[]): CommunityPost {
    const post: CommunityPost = {
      id: uid("post"),
      userId,
      images: [uid("img"), uid("img")],
      content,
      hashtags,
      likeCount: 0,
      commentCount: 0,
      status: "visible",
      createdAt: new Date().toISOString(),
    };
    update((s) => s.posts.unshift(post));
    return post;
  },

  // ---- 관리자용 ----
  setPostStatus(postId: string, status: CommunityPost["status"]) {
    update((s) => {
      const p = s.posts.find((x) => x.id === postId);
      if (p) p.status = status;
    });
  },
};
