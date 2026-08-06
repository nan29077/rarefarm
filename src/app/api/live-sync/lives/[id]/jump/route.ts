import { NextRequest, NextResponse } from "next/server";
import { requireUser, isAdmin } from "@/lib/apiAuth";
import { auctionEngine } from "@/lib/auctionEngine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireUser(req);
  if (auth.response) return auth.response;
  try {
    const { index } = await req.json() as { index?: number };
    const { id } = await params;
    const result = await auctionEngine.jumpToItem(id, auth.requester.userId, isAdmin(auth.requester), Number(index));
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const status = code === "FORBIDDEN" ? 403 : code === "LIVE_NOT_FOUND" ? 404 : 409;
    return NextResponse.json({ error: "해당 상품으로 이동할 수 없습니다." }, { status });
  }
}
