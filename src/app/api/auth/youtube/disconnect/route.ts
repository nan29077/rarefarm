import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/apiAuth";
import { userStore, toPublicYoutubeSettings } from "@/lib/userStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST: YouTube 계정 연동 해제 (토큰·채널 정보 삭제, API 키는 유지)
export async function POST(req: NextRequest) {
  const auth = requireUser(req);
  if (auth.response) return auth.response;

  const profile = userStore.disconnectYoutube(auth.requester.userId);
  console.log("[YT-OAUTH] 연동 해제:", auth.requester.userId);
  return NextResponse.json({
    ok: true,
    ...toPublicYoutubeSettings(auth.requester.userId, profile),
  });
}
