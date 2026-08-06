import { NextRequest, NextResponse } from "next/server";
import { requireUser, isAdmin } from "@/lib/apiAuth";
import { auctionEngine } from "@/lib/auctionEngine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireUser(req);
  if (auth.response) return auth.response;
  try {
    const body = await req.json().catch(() => ({})) as { sold?: boolean; advance?: boolean };
    const { id } = await params;
    const result = await auctionEngine.finalize(id, auth.requester.userId, isAdmin(auth.requester), body.sold !== false, body.advance === true);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const status = code === "FORBIDDEN" ? 403 : code === "LIVE_NOT_FOUND" ? 404 : 409;
    return NextResponse.json({ error: "경매를 확정할 수 없습니다." }, { status });
  }
}
