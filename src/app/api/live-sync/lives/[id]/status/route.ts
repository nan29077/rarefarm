import { NextRequest, NextResponse } from "next/server";
import type { LiveAuctionStatus } from "@/types";
import { requireUser, isAdmin } from "@/lib/apiAuth";
import { auctionEngine } from "@/lib/auctionEngine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireUser(req);
  if (auth.response) return auth.response;
  try {
    const { status } = await req.json() as { status?: LiveAuctionStatus };
    if (!status || !["scheduled", "live", "paused", "ended"].includes(status)) {
      return NextResponse.json({ error: "올바른 경매 상태가 필요합니다." }, { status: 400 });
    }
    const { id } = await params;
    const result = await auctionEngine.setStatus(id, auth.requester.userId, isAdmin(auth.requester), status);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const status = code === "FORBIDDEN" ? 403 : code === "LIVE_NOT_FOUND" ? 404 : 409;
    return NextResponse.json({ error: "허용되지 않는 경매 상태 전환입니다." }, { status });
  }
}
