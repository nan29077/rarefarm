import { NextRequest, NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// YouTube 폴링 관리 (liveId → interval)
declare global {
  // eslint-disable-next-line no-var
  var __yt_polls_rf: Map<string, ReturnType<typeof setInterval>>;
  // eslint-disable-next-line no-var
  var __yt_poll_videos_rf: Map<string, string>; // liveId → 폴링 중인 videoId (영상 교체 감지용)
}
if (!global.__yt_polls_rf) global.__yt_polls_rf = new Map();
if (!global.__yt_poll_videos_rf) global.__yt_poll_videos_rf = new Map();

// POST: YouTube 채팅 폴링 시작 (이미 실행 중이면 스킵)
export async function POST(req: NextRequest) {
  const { liveId, videoId, apiKey } = await req.json();

  if (!liveId || !videoId || !apiKey) {
    return NextResponse.json({ error: "missing params" }, { status: 400 });
  }

  // apiKey를 serverStore의 live에 저장 (다른 브라우저도 사용 가능하도록)
  // 키가 변경된 경우에도 최신 키로 갱신 (구버전 키가 서버에 남아 폴링 실패하는 문제 방지)
  if (apiKey) {
    const currentLive = serverStore.getLives()[liveId];
    if (currentLive && currentLive.youtubeApiKey !== apiKey) {
      serverStore.setLive({ ...currentLive, youtubeApiKey: apiKey });
    }
  }

  // 이미 같은 영상으로 폴링 중이면 중복 시작 방지
  if (global.__yt_polls_rf.has(liveId)) {
    if (global.__yt_poll_videos_rf.get(liveId) === videoId) {
      console.log("[YT-CHAT] 이미 폴링 중 (cached):", liveId);
      return NextResponse.json({ ok: true, cached: true });
    }
    // 영상(videoId)이 바뀜 → 죽은 폴링을 정리하고 새 영상으로 재시작
    console.log("[YT-CHAT] videoId 변경 감지 — 기존 폴링 중지 후 재시작:", liveId);
    const old = global.__yt_polls_rf.get(liveId);
    if (old) clearInterval(old);
    global.__yt_polls_rf.delete(liveId);
    global.__yt_poll_videos_rf.delete(liveId);
  }

  // 경쟁 조건 방지: await 전에 슬롯을 즉시 예약해 동시 요청이 중복 폴링을 시작하지 못하게 함
  global.__yt_polls_rf.set(liveId, null as unknown as ReturnType<typeof setInterval>);
  global.__yt_poll_videos_rf.set(liveId, videoId);

  console.log("[YT-CHAT] Starting poll for liveId:", liveId, "videoId:", videoId);

  // liveChatId 조회
  let liveChatId: string | null = null;
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=liveStreamingDetails&key=${apiKey}`
    );
    const data = await res.json();
    liveChatId = data.items?.[0]?.liveStreamingDetails?.activeLiveChatId ?? null;
    if (!liveChatId) {
      console.log("[YT-CHAT] liveChatId 없음. YouTube 응답:", JSON.stringify(data).slice(0, 300));
    }
  } catch (err) {
    console.error("[YT-CHAT] YouTube API 호출 오류:", err);
  }

  if (!liveChatId) {
    global.__yt_polls_rf.delete(liveId); // 예약 슬롯 해제
    global.__yt_poll_videos_rf.delete(liveId);
    return NextResponse.json({ error: "liveChatId not found — 영상이 라이브 중인지, videoId/apiKey가 올바른지 확인" }, { status: 404 });
  }

  console.log("[YT-CHAT] liveChatId:", liveChatId);

  let nextPageToken: string | undefined;
  // 이미 처리한 YouTube 메시지 ID 추적 (중복 방지)
  const seenYtIds = new Set<string>();
  // 연속 오류 카운트 (채팅 종료·쿼터 초과 등으로 죽은 폴링을 정리해 재시작 가능하게 함)
  let consecutiveErrors = 0;

  // YouTube 메시지 텍스트 파싱 (일반 텍스트 + 커스텀 이모지 모두 포함)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function buildMessageText(item: any): string {
    const displayMsg: string = item.snippet?.displayMessage ?? "";
    const runs =
      item.snippet?.textMessageDetails?.messageText?.runs ??
      (item.snippet?.superChatDetails?.userComment
        ? [{ text: item.snippet.superChatDetails.userComment }]
        : null);
    if (!runs || !Array.isArray(runs)) return displayMsg;
    return runs
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((run: any) => {
        if (run.text) return run.text as string;
        if (run.emoji) {
          return (
            run.emoji.shortcuts?.[0] ??
            (run.emoji.emojiId ? run.emoji.emojiId : "") 
          );
        }
        return "";
      })
      .join("");
  }

  // 3초마다 채팅 폴링 후 SSE 브로드캐스트
  const interval = setInterval(async () => {
    try {
      const url = new URL("https://www.googleapis.com/youtube/v3/liveChat/messages");
      url.searchParams.set("liveChatId", liveChatId!);
      url.searchParams.set("part", "snippet,authorDetails");
      url.searchParams.set("key", apiKey);
      url.searchParams.set("maxResults", "200");
      if (nextPageToken) url.searchParams.set("pageToken", nextPageToken);

      const res = await fetch(url.toString());
      const data = await res.json();

      // YouTube API 오류 (채팅 종료, 쿼터 초과, 키 오류 등) — 연속 5회면 폴링 정리
      if (data.error) {
        consecutiveErrors++;
        console.error("[YT-CHAT] YouTube API 오류:", JSON.stringify(data.error).slice(0, 200));
        if (consecutiveErrors >= 5) {
          console.error("[YT-CHAT] 연속 오류 5회 — 폴링 중지 (재시작 대기):", liveId);
          clearInterval(interval);
          global.__yt_polls_rf.delete(liveId);
          global.__yt_poll_videos_rf.delete(liveId);
        }
        return;
      }
      consecutiveErrors = 0;

      if (data.nextPageToken) nextPageToken = data.nextPageToken;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newMsgs: Array<{ id: string; name: string; text: string; source: string; mine: boolean }> = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const item of (data.items ?? []) as any[]) {
        const ytMsgId = item.id as string;
        if (!ytMsgId || seenYtIds.has(ytMsgId)) continue;
        seenYtIds.add(ytMsgId);
        const text = buildMessageText(item);
        if (!text) continue;
        newMsgs.push({
          id: ytMsgId,
          name: (item.authorDetails?.displayName ?? "YouTube") as string,
          text,
          source: "youtube",
          mine: false,
        });
      }

      if (newMsgs.length > 0) {
        console.log("[YT-CHAT] Broadcasting", newMsgs.length, "messages ->", liveId);
        // 채팅을 파일에 저장 (SSE 브로드캐스트 실패 보완 — 클라이언트 폴링 폴백용)
        newMsgs.forEach((msg) => {
          serverStore.addChat(liveId, {
            id: msg.id,
            name: msg.name,
            text: msg.text,
            source: "youtube",
          });
        });
        serverStore.broadcast("yt_chat", { liveId, messages: newMsgs });
      }
    } catch (err) {
      console.error("[YT-CHAT] 폴링 오류:", err);
    }
  }, 3000);

  // 예약 슬롯을 실제 interval로 교체
  global.__yt_polls_rf.set(liveId, interval);

  return NextResponse.json({ ok: true, liveChatId });
}

// DELETE: YouTube 채팅 폴링 중지 (라이브 종료 시)
export async function DELETE(req: NextRequest) {
  let liveId = req.nextUrl.searchParams.get("liveId") ?? "";
  if (!liveId) {
    try {
      const body = await req.json();
      liveId = body?.liveId ?? "";
    } catch { /* noop */ }
  }
  if (!liveId) return NextResponse.json({ error: "missing liveId" }, { status: 400 });
  const interval = global.__yt_polls_rf.get(liveId);
  if (interval) clearInterval(interval);
  global.__yt_polls_rf.delete(liveId);
  global.__yt_poll_videos_rf.delete(liveId);
  console.log("[YT-CHAT] 폴링 중지:", liveId);
  return NextResponse.json({ ok: true });
}
