import { NextRequest, NextResponse } from "next/server";
import { serverStore, toPublicLive } from "@/lib/serverStore";
import { isAdmin, requireUser } from "@/lib/apiAuth";
import type { LiveAuction } from "@/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const editableKeys = [
  "title", "videoUrl", "thumbnailUrl", "tags", "expectedMinutes", "isPublic", "chatEnabled",
  "chatFilterWords", "pinnedNotice", "scheduledAt", "itemDurations", "couponIds", "badges",
] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireUser(req);
  if (auth.response) return auth.response;
  try {
    const { id } = await params;
    const raw = await req.json() as Partial<LiveAuction>;
    const updated = await serverStore.runExclusive(() => {
      const existing = serverStore.getLives()[id];
      if (!existing) throw new Error("NOT_FOUND");
      if (existing.sellerId !== auth.requester.userId && !isAdmin(auth.requester)) throw new Error("FORBIDDEN");
      const patch: Partial<LiveAuction> = {};
      editableKeys.forEach((key) => {
        if (raw[key] !== undefined) (patch as Record<string, unknown>)[key] = raw[key];
      });
      if (raw.itemIds !== undefined) {
        const requestedIds = raw.itemIds;
        const sameItems =
          existing.status === "scheduled" &&
          Array.isArray(requestedIds) &&
          requestedIds.length === existing.itemIds.length &&
          new Set(requestedIds).size === requestedIds.length &&
          requestedIds.every((itemId) => existing.itemIds.includes(itemId));
        if (!sameItems) throw new Error("INVALID_ORDER");
        patch.itemIds = requestedIds;
      }
      if (typeof patch.title === "string") patch.title = patch.title.trim().slice(0, 150);
      if (typeof patch.videoUrl === "string") patch.videoUrl = patch.videoUrl.slice(0, 500);
      if (typeof patch.pinnedNotice === "string") patch.pinnedNotice = patch.pinnedNotice.slice(0, 500);
      if (patch.tags) patch.tags = patch.tags.slice(0, 5).map((tag) => String(tag).slice(0, 30));
      if (patch.chatFilterWords) patch.chatFilterWords = patch.chatFilterWords.slice(0, 100).map((word) => String(word).slice(0, 50));
      const next = {
        ...existing,
        ...patch,
        id: existing.id,
        sellerId: existing.sellerId,
        status: existing.status,
        currentItemIndex: patch.itemIds ? 0 : existing.currentItemIndex,
      };
      serverStore.setLive(next);
      serverStore.broadcast("live_update", { live: toPublicLive(next), items: [] });
      return next;
    });
    return NextResponse.json({ ok: true, live: updated });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const status = code === "FORBIDDEN" ? 403 : code === "NOT_FOUND" ? 404 : 409;
    return NextResponse.json({ error: "라이브를 수정할 수 없습니다." }, { status });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireUser(req);
  if (auth.response) return auth.response;
  const { id } = await params;
  const live = serverStore.getLives()[id];
  if (!live) return NextResponse.json({ ok: true });
  if (live.sellerId !== auth.requester.userId && !isAdmin(auth.requester)) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  if (live.status !== "scheduled") return NextResponse.json({ error: "진행했거나 종료된 라이브는 기록 보존을 위해 삭제할 수 없습니다." }, { status: 409 });
  await serverStore.runExclusive(() => serverStore.deleteLive(id));
  serverStore.clearChats(id);
  return NextResponse.json({ ok: true });
}
