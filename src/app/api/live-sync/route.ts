import { NextRequest } from "next/server";
import { getRequester, isAdmin } from "@/lib/apiAuth";
import { auctionEngine } from "@/lib/auctionEngine";
import { serverStore, toPublicBids, toPublicLives } from "@/lib/serverStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  await auctionEngine.sweepExpired();
  const requester = getRequester(req);

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (data: string) => {
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          // The connection may already be closed.
        }
      };

      const visibleLives = Object.values(serverStore.getLives()).filter(
        (live) =>
          live.isPublic !== false ||
          live.sellerId === requester?.userId ||
          isAdmin(requester)
      );
      const liveIds = new Set(visibleLives.map((live) => live.id));
      const itemIds = new Set(visibleLives.flatMap((live) => live.itemIds));
      const lives = toPublicLives(visibleLives);
      const items = Object.values(serverStore.getItems()).filter((item) => itemIds.has(item.id));
      const bids = toPublicBids(serverStore.getBids().filter((bid) => liveIds.has(bid.liveId)));
      const chats = Object.fromEntries(
        Object.entries(serverStore.getAllChats()).filter(([liveId]) => liveIds.has(liveId))
      );
      send(`event: init\ndata: ${JSON.stringify({ lives, items, bids, chats })}\n\n`);

      const pingInterval = setInterval(() => {
        void auctionEngine.sweepExpired();
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          clearInterval(pingInterval);
        }
      }, 20_000);

      const remove = serverStore.addSSEClient(send, {
        userId: requester?.userId,
        isAdmin: isAdmin(requester),
      });
      req.signal.addEventListener("abort", () => {
        clearInterval(pingInterval);
        remove();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
