import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/apiAuth";
import { userStore, toPublicYoutubeSettings } from "@/lib/userStore";
import { getOAuthConfig, originFromHeaders, refreshAccessToken, expiryFromNow } from "@/lib/youtubeOAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET: 현재 유저의 YouTube 연동 상태.
// access_token 이 만료됐고 refresh_token 이 있으면 조용히 갱신한다.
export async function GET(req: NextRequest) {
  const auth = requireUser(req);
  if (auth.response) return auth.response;

  const userId = auth.requester.userId;
  let profile = userStore.get(userId);

  const expired =
    !!profile?.youtubeTokenExpiry &&
    new Date(profile.youtubeTokenExpiry).getTime() <= Date.now() + 60_000; // 1분 여유

  if (expired && profile?.youtubeRefreshToken) {
    const cfg = getOAuthConfig(originFromHeaders(req.headers));
    if (cfg) {
      try {
        const token = await refreshAccessToken(cfg, profile.youtubeRefreshToken);
        if (token.access_token) {
          profile = userStore.saveYoutubeAuth(userId, {
            accessToken: token.access_token,
            refreshToken: token.refresh_token,
            expiryDate: expiryFromNow(token.expires_in),
          });
        } else {
          console.error("[YT-OAUTH] 토큰 갱신 실패:", token.error, token.error_description);
        }
      } catch (err) {
        console.error("[YT-OAUTH] 토큰 갱신 오류:", err);
      }
    }
  }

  return NextResponse.json({
    ...toPublicYoutubeSettings(userId, profile),
    // OAuth 앱 설정 여부 — 프론트에서 "연동" 버튼 비활성화 판단에 사용
    oauthConfigured: !!getOAuthConfig(originFromHeaders(req.headers)),
  });
}
