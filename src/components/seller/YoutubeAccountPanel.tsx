"use client";

// 판매자 YouTube 계정/API 키 설정 패널 (서버 저장 · 라이브 채팅 통합용).
// - YouTube Data API 키를 .live-data/users.json 에 저장 (GET/POST /api/user/youtube-settings)
// - Google OAuth 로 YouTube 계정 연동 (/api/auth/youtube/connect · status · disconnect)
// 기존 라이브 경매 설정 UI는 그대로 두고, 이 패널만 추가로 표시된다.

import { useCallback, useEffect, useState } from "react";
import { Youtube, CheckCircle2, Link2, Unlink, AlertTriangle } from "lucide-react";
import { Button } from "@/components/common/Button";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { apiFetch, jsonAuthHeaders } from "@/lib/apiClient";
import { cn } from "@/lib/utils";

interface YoutubeStatus {
  hasApiKey: boolean;
  apiKeyMasked: string;
  connected: boolean;
  channelId: string | null;
  channelTitle: string | null;
  oauthConfigured?: boolean;
}

const inputCls =
  "w-full rounded-xl border border-neutral-300 px-3 py-3 text-sm outline-none focus:border-brand-500";

export function YoutubeAccountPanel() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [status, setStatus] = useState<YoutubeStatus | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadStatus = useCallback(async () => {
    if (!user) return;
    try {
      const res = await apiFetch("/api/auth/youtube/status");
      if (!res.ok) return;
      setStatus((await res.json()) as YoutubeStatus);
    } catch {
      /* noop — 네트워크 오류 시 기존 상태 유지 */
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // OAuth 콜백 결과(?youtube=connected / error) 처리.
  // useSearchParams 대신 window.location 을 읽어 정적 빌드 제약(Suspense)을 피한다.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const result = params.get("youtube");
    if (!result) return;
    if (result === "connected") {
      toast("YouTube 계정이 연동되었습니다.");
      loadStatus();
    } else if (result === "error") {
      const reason = params.get("reason");
      toast(
        reason === "config"
          ? "YouTube OAuth 설정(GOOGLE_CLIENT_ID/SECRET)이 필요합니다."
          : "YouTube 계정 연동에 실패했습니다. 다시 시도해주세요.",
        "error"
      );
    }
    // 쿼리스트링 정리 (새로고침 시 토스트 반복 방지)
    window.history.replaceState({}, "", window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveApiKey() {
    if (!user) return;
    setSaving(true);
    try {
      const res = await fetch("/api/user/youtube-settings", {
        method: "POST",
        headers: jsonAuthHeaders(),
        body: JSON.stringify({ youtubeApiKey: apiKey.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data?.error ?? "저장에 실패했습니다.", "error");
        return;
      }
      setApiKey("");
      await loadStatus();
      toast(
        apiKey.trim() ? "YouTube API 키가 저장되었습니다." : "YouTube API 키를 삭제했습니다."
      );
    } catch {
      toast("저장 중 오류가 발생했습니다.", "error");
    } finally {
      setSaving(false);
    }
  }

  function connect() {
    if (!user) return;
    // OAuth는 브라우저 최상위 이동이라 헤더를 실을 수 없어 userId를 쿼리로 전달한다
    window.location.href = `/api/auth/youtube/connect?userId=${encodeURIComponent(user.id)}`;
  }

  async function disconnect() {
    try {
      const res = await apiFetch("/api/auth/youtube/disconnect", { method: "POST" });
      if (!res.ok) {
        toast("연동 해제에 실패했습니다.", "error");
        return;
      }
      await loadStatus();
      toast("YouTube 계정 연동을 해제했습니다.");
    } catch {
      toast("연동 해제 중 오류가 발생했습니다.", "error");
    }
  }

  if (!user) return null;

  return (
    <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="flex items-center gap-2 border-b border-neutral-100 px-5 py-3.5">
        <span className="h-3.5 w-1 rounded-full bg-brand-500" />
        <h2 className="flex items-center gap-2 font-bold text-neutral-900">
          <Youtube className="h-4 w-4 text-red-500" strokeWidth={1.75} />
          YouTube 계정 연동 (서버 저장)
        </h2>
      </div>

      <div className="space-y-4 p-4">
        <p className="text-sm text-neutral-500">
          여기에 저장한 API 키와 연동 계정은 서버에 저장되어, 라이브 방송 중 YouTube 채팅을
          레어팜 채팅과 합쳐서 보여주는 데 사용됩니다.
        </p>

        {/* ── 계정 연동 상태 ── */}
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <p className="mb-3 text-sm font-bold text-neutral-900">YouTube 계정</p>

          {loading ? (
            <p className="text-sm text-neutral-400">불러오는 중…</p>
          ) : status?.connected ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" strokeWidth={2} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-neutral-900">
                    {status.channelTitle ?? "연동된 채널"}
                  </p>
                  {status.channelId && (
                    <p className="truncate text-xs text-neutral-500">{status.channelId}</p>
                  )}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={disconnect} className="shrink-0">
                <Unlink className="h-4 w-4" strokeWidth={1.75} />
                연동 해제
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-neutral-500">
                아직 연동된 YouTube 계정이 없습니다.
              </p>
              {status?.oauthConfigured === false && (
                <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                  서버에 GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET 환경변수가 설정되어야 연동할 수
                  있습니다.
                </p>
              )}
              <Button
                onClick={connect}
                disabled={status?.oauthConfigured === false}
                className="w-full sm:w-auto"
              >
                <Link2 className="h-4 w-4" strokeWidth={1.75} />
                YouTube 계정 연동
              </Button>
            </div>
          )}
        </div>

        {/* ── API 키 (서버 저장) ── */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-neutral-700">
            YouTube Data API 키 (서버 저장)
          </label>
          <div className="flex gap-2 md:pr-16">
            <input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={status?.hasApiKey ? status.apiKeyMasked : "AIza..."}
              className={cn(inputCls, "min-w-0 flex-1")}
            />
            <Button onClick={saveApiKey} disabled={saving} className="shrink-0">
              저장
            </Button>
          </div>
          <p className="mt-1.5 text-xs text-neutral-500">
            {status?.hasApiKey
              ? `현재 저장된 키: ${status.apiKeyMasked} · 새 키를 입력하면 교체됩니다. (빈 칸으로 저장하면 삭제)`
              : "키 발급 방법은 위 안내를 참고하세요. 저장된 키는 서버에만 보관되며 화면에는 마스킹되어 표시됩니다."}
          </p>
        </div>
      </div>
    </section>
  );
}
