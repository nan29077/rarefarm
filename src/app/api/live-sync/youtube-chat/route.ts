import { NextRequest, NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";
import { userStore } from "@/lib/userStore";
import {
  YoutubeApiError,
  fetchActiveLiveChatId,
  fetchLiveChatPage,
} from "@/lib/youtubeChat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET: YouTube 라이브 채팅 프록시
//   params: liveId(필수), videoId?, liveChatId?, pageToken?
//   - liveId 로 해당 라이브의 판매자를 찾아 그 판매자의 YouTube API 키를 사용한다.
//   - 판매자 키가 없으면 서버 공용 env(YOUTUBE_API_KEY) 로 폴백.
//   - API 키는 응답에 절대 포함되지 않는다.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const liveId = q.get("liveId")?.trim() ?? "";
  const videoId = q.get("videoId")?.trim() ?? "";
  const liveChatIdParam = q.get("liveChatId")?.trim() ?? "";
  const pageToken = q.get("pageToken")?.trim() || undefined;

  if (!liveId) {
    return NextResponse.json({ error: "liveId가 필요합니다." }, { status: 400 });
  }

  const live = serverStore.getLives()[liveId];
  // 판매자 유저 키 → 라이브에 저장된 키 → 서버 공용 env 키 순으로 폴백
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

  try {
    let liveChatId = liveChatIdParam;
    if (!liveChatId) {
      const targetVideoId = videoId || extractVideoId(live?.videoUrl ?? "");
      if (!targetVideoId) {
        return NextResponse.json(
          { error: "videoId 또는 liveChatId가 필요합니다." },
          { status: 400 }
        );
      }
      const found = await fetchActiveLiveChatId(targetVideoId, apiKey);
      if (!found) {
        return NextResponse.json(
          { error: "활성 라이브 채팅을 찾을 수 없습니다. 영상이 라이브 중인지 확인해주세요." },
          { status: 404 }
        );
      }
      liveChatId = found;
    }

    const page = await fetchLiveChatPage(liveChatId, apiKey, pageToken);
    return NextResponse.json(page);
  } catch (err) {
    const status = err instanceof YoutubeApiError ? err.status : 502;
    const message =
      err instanceof Error ? err.message : "YouTube 채팅 조회 중 오류가 발생했습니다.";
    console.error("[YT-CHAT-PROXY] 오류:", message);
    return NextResponse.json({ error: message }, { status });
  }
}

/** 라이브 videoUrl 에서 videoId 추출 (watch?v= / youtu.be / live / embed / shorts) */
function extractVideoId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/|\/live\/|\/embed\/|\/shorts\/)([\w-]{11})/);
  return m?.[1] ?? null;
}
