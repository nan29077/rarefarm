// YouTube 라이브 채팅 조회 헬퍼 (서버 전용).
// /api/live-sync/youtube-chat (프록시) 와 /api/live-sync/youtube-sync (SSE 통합) 가 함께 사용한다.

export interface YoutubeChatMessage {
  id: string;
  nickname: string;
  message: string;
  createdAt: string; // ISO
  isYoutube: true;
}

export interface YoutubeChatPage {
  liveChatId: string;
  nextPageToken?: string;
  pollingIntervalMillis: number;
  messages: YoutubeChatMessage[];
}

export class YoutubeApiError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = "YoutubeApiError";
    this.status = status;
  }
}

/** videoId → activeLiveChatId 조회 (라이브 중이 아니면 null) */
export async function fetchActiveLiveChatId(
  videoId: string,
  apiKey: string
): Promise<string | null> {
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("id", videoId);
  url.searchParams.set("part", "liveStreamingDetails");
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString());
  const data = await res.json();
  if (data?.error) {
    throw new YoutubeApiError(
      data.error?.message ?? "YouTube videos.list 호출에 실패했습니다.",
      res.status === 403 ? 403 : 502
    );
  }
  return data?.items?.[0]?.liveStreamingDetails?.activeLiveChatId ?? null;
}

/** YouTube liveChat/messages.list 응답 아이템 (필요한 필드만) */
interface LiveChatItem {
  id?: string;
  snippet?: {
    displayMessage?: string;
    publishedAt?: string;
    textMessageDetails?: {
      messageText?: { runs?: Array<{ text?: string; emoji?: { shortcuts?: string[]; emojiId?: string } }> };
    };
    superChatDetails?: { userComment?: string };
  };
  authorDetails?: { displayName?: string };
}

/**
 * 메시지 텍스트 조합 — 일반 텍스트 + 커스텀 이모지(runs) + 슈퍼챗 코멘트까지 포함.
 * (기존 yt-chat 라우트와 동일한 파싱 규칙)
 */
export function buildMessageText(item: LiveChatItem): string {
  const displayMsg = item?.snippet?.displayMessage ?? "";
  const runs =
    item?.snippet?.textMessageDetails?.messageText?.runs ??
    (item?.snippet?.superChatDetails?.userComment
      ? [{ text: item.snippet.superChatDetails.userComment }]
      : null);
  if (!runs || !Array.isArray(runs)) return displayMsg;
  return runs
    .map((run) => {
      if (run.text) return run.text;
      if (run.emoji) return run.emoji.shortcuts?.[0] ?? run.emoji.emojiId ?? "";
      return "";
    })
    .join("");
}

/** liveChat/messages.list 폴링 (1페이지) */
export async function fetchLiveChatPage(
  liveChatId: string,
  apiKey: string,
  pageToken?: string
): Promise<YoutubeChatPage> {
  const url = new URL("https://www.googleapis.com/youtube/v3/liveChat/messages");
  url.searchParams.set("liveChatId", liveChatId);
  url.searchParams.set("part", "snippet,authorDetails");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("maxResults", "200");
  if (pageToken) url.searchParams.set("pageToken", pageToken);

  const res = await fetch(url.toString());
  const data = await res.json();
  if (data?.error) {
    throw new YoutubeApiError(
      data.error?.message ?? "YouTube liveChat.messages 호출에 실패했습니다.",
      res.status === 403 ? 403 : 502
    );
  }

  const messages: YoutubeChatMessage[] = [];
  for (const item of (data?.items ?? []) as LiveChatItem[]) {
    const id = item?.id;
    if (!id) continue;
    const message = buildMessageText(item);
    if (!message) continue;
    messages.push({
      id,
      nickname: item?.authorDetails?.displayName ?? "YouTube",
      message,
      createdAt: item?.snippet?.publishedAt ?? new Date().toISOString(),
      isYoutube: true,
    });
  }

  return {
    liveChatId,
    nextPageToken: data?.nextPageToken,
    pollingIntervalMillis: Number(data?.pollingIntervalMillis) || 5000,
    messages,
  };
}
