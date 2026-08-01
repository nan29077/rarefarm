import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/apiAuth";
import { userStore, toPublicYoutubeSettings } from "@/lib/userStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 유저(판매자)별 YouTube 설정 조회/저장.
// 인증은 기존 방식과 동일하게 X-User-Id 헤더(mock 세션)를 사용한다. (lib/apiAuth.ts 참고)

// GET: 현재 로그인 유저의 YouTube 설정 (API 키 원문은 절대 내보내지 않음)
export async function GET(req: NextRequest) {
  const auth = requireUser(req);
  if (auth.response) return auth.response;

  const profile = userStore.get(auth.requester.userId);
  return NextResponse.json(toPublicYoutubeSettings(auth.requester.userId, profile));
}

// POST: YouTube Data API 키 저장  body: { youtubeApiKey: string }
export async function POST(req: NextRequest) {
  const auth = requireUser(req);
  if (auth.response) return auth.response;

  let body: { youtubeApiKey?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const raw = body?.youtubeApiKey;
  if (typeof raw !== "string") {
    return NextResponse.json({ error: "youtubeApiKey가 필요합니다." }, { status: 400 });
  }

  const apiKey = raw.trim();
  // 빈 문자열이면 키 삭제로 처리
  if (apiKey && apiKey.length > 200) {
    return NextResponse.json({ error: "API 키 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const profile = userStore.saveApiKey(auth.requester.userId, apiKey);
  return NextResponse.json({
    ok: true,
    ...toPublicYoutubeSettings(auth.requester.userId, profile),
  });
}
