import { NextRequest, NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET: 특정 라이브의 저장된 채팅 목록 조회 (SSE 브로드캐스트 실패 보완용 폴링 엔드포인트)
export async function GET(req: NextRequest) {
  const liveId = req.nextUrl.searchParams.get("liveId") ?? "";
  if (!liveId) return NextResponse.json({ chats: [] });
  const chats = serverStore.getChats(liveId);
  return NextResponse.json({ chats });
}
