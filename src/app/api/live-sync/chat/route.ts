import { NextRequest, NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST: 채팅 메시지 수신 후 모든 SSE 클라이언트에 브로드캐스트
export async function POST(req: NextRequest) {
  const { liveId, chat } = await req.json();

  if (!liveId || !chat?.id || !chat?.text) {
    return NextResponse.json({ error: "missing params" }, { status: 400 });
  }

  serverStore.addChat(liveId, chat);
  serverStore.broadcast("chat", { liveId, chat });
  return NextResponse.json({ ok: true });
}
