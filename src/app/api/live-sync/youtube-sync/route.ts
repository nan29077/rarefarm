import { NextRequest, NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";
import { userStore } from "@/lib/userStore";
import { isAdmin, requireUser } from "@/lib/apiAuth";
import {
  YoutubeApiError,
  fetchActiveLiveChatId,
  fetchLiveChatPage,
} from "@/lib/youtubeChat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// YouTube 채팅을 앱 채팅(SSE)에 통합하는 동기화 엔드포인트.
// 호스트(판매자) 브라우저가 방송 중에 주기적으로 호출하면, 서버가 YouTube 채팅을 폴링해
// 라이브 채팅 저장소에 { isYoutube: true } 플래그와 함께 추가하고 SSE로 브로드캐스트한다.

// YouTube API 쿼터 보호용 최소 폴링 간격
const SYNC_THROTTLE_MS = 4500;
// liveId 별로 기억하는 중복 방지 ID 최대 개수
const MAX_SEEN_IDS = 500;

interface SyncCursor {
  liveChatId: string;
  videoId: string;
  pageToken?: string;
  seenIds: string[]; // 이미 저장한 YouTube 메시지 ID (오래된 것부터 제거)
  lastSyncAt: number;
  /** 최초 폴링 여부 — 첫 응답은 커서만 저장하고 메시지는 버린다(백로그 방지) */
  primed: boolean;
}

declare global {
  // eslint-disable-next-line no-var
  var __yt_sync_cursors_rf: Map<string, SyncCursor>;
}
if (!global.__yt_sync_cursors_rf) global.__yt_sync_cursors_rf = new Map();

// POST: body { liveId, videoId }
export async function POST(req: NextRequest) {
  const auth = requireUser(req);
  if (auth.response) return auth.response;

  let body: { liveId?: string; videoId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const liveId = body?.liveId?.trim() ?? "";
  const videoId = body?.videoId?.trim() ?? "";
  if (!liveId || !videoId) {
    return NextResponse.json({ error: "liveId와 videoId가 필요합니다." }, { status: 400 });
  }

  const live = serverStore.getLives()[liveId];
  if (!live) return NextResponse.json({ error: "라이브를 찾을 수 없습니다." }, { status: 404 });
  // 방송 주인(판매자) 또는 관리자만 동기화를 트리거할 수 있다
  if (live.sellerId !== auth.requester.userId && !isAdmin(auth.requester)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const storedVideoId = live.videoUrl.match(/(?:v=|youtu\.be\/|\/live\/|\/embed\/|\/shorts\/)([\w-]{11})/)?.[1];
  if (!storedVideoId || storedVideoId !== videoId || live.status !== "live") {
    return NextResponse.json({ error: "현재 라이브 영상 정보가 일치하지 않습니다." }, { status: 409 });
  }

  // 기존 서버 폴링(yt-chat)이 같은 라이브를 이미 처리 중이면 중복 호출을 피한다.
  // (두 경로 모두 YouTube 메시지 ID를 채팅 ID로 쓰므로 메시지 중복은 발생하지 않지만,
  //  API 쿼터를 두 배로 쓰게 되므로 여기서 양보한다.)
  if (global.__yt_polls_rf?.has(liveId)) {
    return NextResponse.json({ ok: true, skipped: "legacy-poller-active", added: 0 });
  }

  // 판매자 유저 키 → 라이브에 저장된 키 → 서버 공용 env 키
  const apiKey =
    (live?.sellerId ? userStore.get(live.sellerId)?.youtubeApiKey : undefined) ||
    live?.youtubeApiKey ||
    process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "YouTube API 키가 설정되지 않았습니다. 판매자 설정에서 키를 등록해주세요." },
      { status: 400 }
    );
  }

  const cursors = global.__yt_sync_cursors_rf;
  let cursor = cursors.get(liveId);

  // 영상이 바뀌면 커서를 리셋한다
  if (cursor && cursor.videoId !== videoId) {
    cursors.delete(liveId);
    cursor = undefined;
  }

  // 쿼터 보호 — 최소 간격 이내 재호출은 그대로 통과시킨다
  if (cursor && Date.now() - cursor.lastSyncAt < SYNC_THROTTLE_MS) {
    return NextResponse.json({
      ok: true,
      throttled: true,
      liveChatId: cursor.liveChatId,
      added: 0,
    });
  }

  try {
    // liveChatId 확보 (없으면 videos.list 로 조회)
    let liveChatId = cursor?.liveChatId;
    if (!liveChatId) {
      const found = await fetchActiveLiveChatId(videoId, apiKey);
      if (!found) {
        return NextResponse.json(
          { error: "활성 라이브 채팅을 찾을 수 없습니다. 영상이 라이브 중인지 확인해주세요." },
          { status: 404 }
        );
      }
      liveChatId = found;
    }

    const page = await fetchLiveChatPage(liveChatId, apiKey, cursor?.pageToken);

    const isFirstPoll = !cursor?.primed;
    const seen = new Set(cursor?.seenIds ?? []);
    let added = 0;

    if (isFirstPoll) {
      // 최초 폴링은 커서만 저장 — 방송 시작 전 쌓인 과거 채팅이 한꺼번에 올라오는 것을 막는다
      page.messages.forEach((m) => seen.add(m.id));
    } else {
      for (const m of page.messages) {
        if (seen.has(m.id)) continue; // ytMessageId 기준 dedup
        seen.add(m.id);

        const chat = {
          // YouTube 메시지 ID를 채팅 ID로 사용 → 기존 폴링 경로와도 중복이 생기지 않는다
          id: m.id,
          name: m.nickname,
          text: m.message,
          source: "youtube" as const,
          isYoutube: true,
          ytMessageId: m.id,
          createdAt: m.createdAt,
        };
        serverStore.addChat(liveId, chat);
        // 기존 채팅 이벤트와 동일한 형식으로 브로드캐스트 (시청자 화면에 즉시 반영)
        serverStore.broadcast("chat", { liveId, chat });
        added++;
      }
    }

    // seenIds 무한 증가 방지 (최근 것 위주로 유지)
    const seenIds = Array.from(seen).slice(-MAX_SEEN_IDS);

    cursors.set(liveId, {
      liveChatId,
      videoId,
      pageToken: page.nextPageToken,
      seenIds,
      lastSyncAt: Date.now(),
      primed: true,
    });

    if (added > 0) {
      console.log("[YT-SYNC]", liveId, "새 YouTube 메시지", added, "건 통합");
    }

    return NextResponse.json({
      ok: true,
      liveChatId,
      added,
      primed: !isFirstPoll,
      pollingIntervalMillis: Math.max(page.pollingIntervalMillis, SYNC_THROTTLE_MS),
    });
  } catch (err) {
    const status = err instanceof YoutubeApiError ? err.status : 502;
    const message =
      err instanceof Error ? err.message : "YouTube 채팅 동기화 중 오류가 발생했습니다.";
    console.error("[YT-SYNC] 오류:", message);
    // 오류가 반복될 때 곧바로 재호출되지 않도록 커서의 시각만 갱신
    if (cursor) cursors.set(liveId, { ...cursor, lastSyncAt: Date.now() });
    return NextResponse.json({ error: message }, { status });
  }
}

// DELETE: 동기화 커서 정리 (라이브 종료 시 선택적으로 호출)
export async function DELETE(req: NextRequest) {
  const auth = requireUser(req);
  if (auth.response) return auth.response;

  const liveId = req.nextUrl.searchParams.get("liveId")?.trim() ?? "";
  if (!liveId) return NextResponse.json({ error: "liveId가 필요합니다." }, { status: 400 });

  const live = serverStore.getLives()[liveId];
  if (live && live.sellerId !== auth.requester.userId && !isAdmin(auth.requester)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  global.__yt_sync_cursors_rf.delete(liveId);
  return NextResponse.json({ ok: true });
}
