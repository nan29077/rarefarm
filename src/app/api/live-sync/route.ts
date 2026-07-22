import { NextRequest } from "next/server";
import { serverStore } from "@/lib/serverStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // Edge 런타임 방지 — 파일 I/O 필요

// YouTube 폴링 Map (yt-chat/route.ts 와 동일한 전역 변수 공유)
declare global {
  // eslint-disable-next-line no-var
  var __yt_polls_rf: Map<string, ReturnType<typeof setInterval>>;
  // eslint-disable-next-line no-var
  var __yt_poll_videos_rf: Map<string, string>; // liveId → 폴링 중인 videoId (영상 교체 감지용)
}
if (!global.__yt_polls_rf) global.__yt_polls_rf = new Map();
if (!global.__yt_poll_videos_rf) global.__yt_poll_videos_rf = new Map();

/** YouTube URL에서 videoId 추출 */
function extractVideoIdFromUrl(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/|\/live\/)([a-zA-Z0-9_-]{11})/);
  return m?.[1] ?? null;
}

export async function GET(req: NextRequest) {
  // SSE 연결 시 YouTube 폴링 자동 시작 (서버에 apiKey가 저장된 경우)
  const host = req.headers.get("host") ?? "localhost:3000";
  // 프록시(클라우드플레어 터널 등) 뒤에서는 x-forwarded-proto 우선, 로컬 호스트는 http
  const protocol =
    req.headers.get("x-forwarded-proto") ??
    (/^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(host) ? "http" : "https");
  const livesMap = serverStore.getLives();
  for (const live of Object.values(livesMap)) {
    if (
      live.status === "live" &&
      live.platform === "youtube" &&
      live.youtubeApiKey &&
      live.videoUrl
    ) {
      const videoId = extractVideoIdFromUrl(live.videoUrl);
      // 폴링 미시작 또는 영상(videoId)이 바뀐 경우 재시작 요청 (yt-chat POST가 중복은 자체 차단)
      if (videoId && (!global.__yt_polls_rf.has(live.id) || global.__yt_poll_videos_rf.get(live.id) !== videoId)) {
        fetch(`${protocol}://${host}/api/live-sync/yt-chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ liveId: live.id, videoId, apiKey: live.youtubeApiKey }),
        }).catch(() => {});
      }
    }
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (data: string) => {
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          /* noop — 클라이언트가 이미 연결 해제한 경우 */
        }
      };

      // 연결 즉시 파일에서 현재 서버 상태 읽어서 전송
      const lives = Object.values(serverStore.getLives());
      const items = Object.values(serverStore.getItems());
      const bids = serverStore.getBids();
      const chats = serverStore.getAllChats();
      console.log("[SSE] 클라이언트 연결 — init 전송:", { lives: lives.length, items: items.length, bids: bids.length });
      send(
        `event: init\ndata: ${JSON.stringify({ lives, items, bids, chats })}\n\n`
      );

      // keepalive 핑 (20초마다, Whale·IE 등 연결 유지)
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          clearInterval(pingInterval);
        }
      }, 20000);

      // SSE 클라이언트 등록 (브로드캐스트 대상에 추가)
      const remove = serverStore.addSSEClient(send);

      // 연결 종료 시 정리
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
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
