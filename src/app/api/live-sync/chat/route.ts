import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";
import { requireUser } from "@/lib/apiAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

declare global {
  // eslint-disable-next-line no-var
  var __rf_chat_attempts: Map<string, number[]>;
}
if (!global.__rf_chat_attempts) global.__rf_chat_attempts = new Map();

export async function POST(req: NextRequest) {
  const auth = requireUser(req);
  if (auth.response) return auth.response;
  try {
    const { liveId, text: rawText } = await req.json() as { liveId?: string; text?: string };
    const text = rawText?.trim() ?? "";
    if (!liveId || !text || text.length > 500) return NextResponse.json({ error: "1~500자의 채팅 내용을 입력해주세요." }, { status: 400 });
    const live = serverStore.getLives()[liveId];
    if (!live || live.status === "ended" || live.chatEnabled === false) return NextResponse.json({ error: "현재 채팅을 보낼 수 없습니다." }, { status: 409 });
    const banned = (live.chatFilterWords ?? []).find((word) => word && text.toLowerCase().includes(word.toLowerCase()));
    if (banned) return NextResponse.json({ error: "금칙어가 포함되어 있습니다." }, { status: 400 });

    const key = `${liveId}:${auth.requester.userId}`;
    const now = Date.now();
    const attempts = (global.__rf_chat_attempts.get(key) ?? []).filter((time) => now - time < 10_000);
    if (attempts.length >= 8) return NextResponse.json({ error: "채팅 전송이 너무 빠릅니다." }, { status: 429 });
    attempts.push(now);
    global.__rf_chat_attempts.set(key, attempts);

    const chat = { id: `chat-${crypto.randomUUID()}`, name: auth.requester.nickname, text, source: "app" as const, createdAt: new Date(now).toISOString() };
    serverStore.addChat(liveId, chat);
    serverStore.broadcast("chat", { liveId, chat });
    return NextResponse.json({ ok: true, chat });
  } catch {
    return NextResponse.json({ error: "채팅을 처리할 수 없습니다." }, { status: 400 });
  }
}
