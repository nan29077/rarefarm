"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Gavel,
  Radio,
  CalendarClock,
  Trophy,
  Wallet,
  CreditCard,
  Truck,
  Users,
  Clock,
  X,
} from "lucide-react";
import { SellerLayout } from "@/components/seller/SellerLayout";
import { StatCard, Panel, Table, StatusPill } from "@/components/admin/AdminUI";
import { Placeholder } from "@/components/common/Placeholder";
import { auctionService, auctionItemStatusLabels, liveStatusLabels } from "@/lib/auctionService";
import { settlementService, settlementStatusLabels, deliveryMethodLabels } from "@/lib/settlementService";
import { useAuth } from "@/components/providers/AuthProvider";
import { useStoreVersion } from "@/lib/useStore";
import { formatPrice, formatDate } from "@/lib/utils";
import type { AuctionItemStatus, LiveAuctionStatus, Settlement, DeliveryMethod } from "@/types";

const itemTone: Record<AuctionItemStatus, "green" | "red" | "amber" | "neutral"> = {
  waiting: "neutral",
  live: "amber",
  sold: "green",
  failed: "red",
};
const liveTone: Record<LiveAuctionStatus, "green" | "red" | "amber" | "neutral"> = {
  scheduled: "neutral",
  live: "amber",
  paused: "red",
  ended: "green",
};

const settlementTone: Record<string, "green" | "red" | "amber" | "neutral"> = {
  pending_payment: "amber",
  payment_done: "neutral",
  shipping: "neutral",
  withdrawable: "green",
  withdrawn: "neutral",
  cancelled: "red",
};

function formatCountdown(deadline: number): string {
  const diff = deadline - Date.now();
  if (diff <= 0) return "기한 초과";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return `${h}시간 ${m}분 남음`;
}

export default function SellerDashboardPage() {
  useStoreVersion();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"dashboard" | "settlement">("dashboard");
  const [now, setNow] = useState(Date.now());
  const [shipModal, setShipModal] = useState<Settlement | null>(null);
  const [trackingNum, setTrackingNum] = useState("");
  const [meetupLoc, setMeetupLoc] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("courier");
  const [shipLoading, setShipLoading] = useState(false);
  const [withdrawModal, setWithdrawModal] = useState(false);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    settlementService.checkAutoConfirm();
    settlementService.checkExpiredPayments();
  }, []);

  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const items = user ? auctionService.getItems({ sellerId: user.id }) : [];
  const lives = user ? auctionService.getLivesForSeller(user.id) : [];
  const settlements = user ? settlementService.getSettlementsForSeller(user.id) : [];
  const summary = user ? settlementService.getSellerSummary(user.id) : { pendingAmount: 0, withdrawableAmount: 0 };

  const soldCount = items.filter((i) => i.status === "sold").length;
  const liveCount = lives.filter((l) => l.status === "live").length;
  const scheduledCount = lives.filter((l) => l.status === "scheduled").length;

  async function handleShip() {
    if (!shipModal || !user) return;
    setShipLoading(true);
    const res = await settlementService.ship(
      shipModal.id,
      user.id,
      deliveryMethod,
      deliveryMethod !== "meetup" ? trackingNum : undefined,
      deliveryMethod === "meetup" ? meetupLoc : undefined
    );
    setShipLoading(false);
    if (res.ok) {
      showToast("배송/전달 정보가 등록되었습니다.");
      setShipModal(null);
      setTrackingNum(""); setMeetupLoc(""); setDeliveryMethod("courier");
    } else {
      showToast(res.error ?? "처리 중 오류", "error");
    }
  }

  async function handleWithdraw() {
    if (!user) return;
    if (!bankName || !accountNumber || !accountHolder) {
      showToast("계좌 정보를 모두 입력해주세요.", "error");
      return;
    }
    setWithdrawLoading(true);
    const res = await settlementService.withdraw(user.id, { bankName, accountNumber, accountHolder });
    setWithdrawLoading(false);
    if (res.ok) {
      showToast("출금 신청이 완료되었습니다.");
      setWithdrawModal(false);
      setBankName(""); setAccountNumber(""); setAccountHolder("");
    } else {
      showToast(res.error ?? "출금 처리 중 오류", "error");
    }
  }

  return (
    <SellerLayout title="판매자 대시보드">
      {toast && (
        <div className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-lg ${toast.type === "error" ? "bg-red-500" : "bg-green-600"}`}>
          {toast.msg}
        </div>
      )}

      {/* 탭 */}
      <div className="mb-6 flex gap-2 border-b border-neutral-200">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`pb-2 px-1 text-sm font-semibold transition-colors ${activeTab === "dashboard" ? "border-b-2 border-green-600 text-green-700" : "text-neutral-500 hover:text-neutral-800"}`}
        >
          대시보드
        </button>
        <button
          onClick={() => setActiveTab("settlement")}
          className={`pb-2 px-1 text-sm font-semibold transition-colors ${activeTab === "settlement" ? "border-b-2 border-green-600 text-green-700" : "text-neutral-500 hover:text-neutral-800"}`}
        >
          정산 현황
          {settlements.filter((s) => s.status === "payment_done").length > 0 && (
            <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-green-500 px-1 text-[10px] font-bold text-white">
              {settlements.filter((s) => s.status === "payment_done").length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "dashboard" && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            <StatCard icon={Gavel} label="내 경매 상품" value={items.length} accent />
            <StatCard icon={Trophy} label="낙찰 완료" value={soldCount} />
            <StatCard icon={Radio} label="진행중 라이브" value={liveCount} />
            <StatCard icon={CalendarClock} label="예정 라이브" value={scheduledCount} />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Panel
              title="최근 경매 상품"
              action={<Link href="/seller/auction-items" className="text-xs font-semibold text-green-700 hover:underline">전체 보기</Link>}
            >
              <div className="hidden md:block">
                <Table head={["상품", "시작가", "현재가", "상태"]}>
                  {items.slice(0, 5).map((it) => (
                    <tr key={it.id}>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <Placeholder seed={it.image} className="h-9 w-9 rounded-lg" showIcon={false} />
                          <span className="line-clamp-1 font-medium text-neutral-800">{it.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-neutral-500">{formatPrice(it.startPrice)}</td>
                      <td className="px-3 py-2.5 font-semibold text-neutral-900">{formatPrice(it.currentPrice)}</td>
                      <td className="px-3 py-2.5">
                        <StatusPill tone={itemTone[it.status]}>{auctionItemStatusLabels[it.status]}</StatusPill>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr><td colSpan={4} className="px-3 py-8 text-center text-sm text-neutral-400">등록된 경매 상품이 없습니다.</td></tr>
                  )}
                </Table>
              </div>
              <div className="space-y-2 p-3 md:hidden">
                {items.slice(0, 5).map((it) => (
                  <div key={it.id} className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3">
                    <Placeholder seed={it.image} className="h-10 w-10 shrink-0 rounded-lg" showIcon={false} />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-medium text-neutral-800">{it.name}</p>
                      <p className="text-xs text-neutral-400">시작 {formatPrice(it.startPrice)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-neutral-900">{formatPrice(it.currentPrice)}</p>
                      <StatusPill tone={itemTone[it.status]}>{auctionItemStatusLabels[it.status]}</StatusPill>
                    </div>
                  </div>
                ))}
                {items.length === 0 && <p className="py-8 text-center text-sm text-neutral-400">등록된 경매 상품이 없습니다.</p>}
              </div>
            </Panel>

            <Panel
              title="내 라이브 경매"
              action={<Link href="/seller/live-auction" className="text-xs font-semibold text-green-700 hover:underline">전체 보기</Link>}
            >
              <div className="hidden md:block">
                <Table head={["제목", "예정 시간", "상품 수", "상태"]}>
                  {lives.slice(0, 5).map((l) => (
                    <tr key={l.id}>
                      <td className="px-3 py-2.5">
                        <Link href={`/live-auction/${l.id}`} className="line-clamp-1 font-medium text-neutral-800 hover:text-green-700">{l.title}</Link>
                      </td>
                      <td className="px-3 py-2.5 text-neutral-500">{formatDate(l.scheduledAt)}</td>
                      <td className="px-3 py-2.5 text-neutral-500">{l.itemIds.length}개</td>
                      <td className="px-3 py-2.5">
                        <StatusPill tone={liveTone[l.status]}>{liveStatusLabels[l.status]}</StatusPill>
                      </td>
                    </tr>
                  ))}
                  {lives.length === 0 && <tr><td colSpan={4} className="px-3 py-8 text-center text-sm text-neutral-400">생성된 라이브 경매가 없습니다.</td></tr>}
                </Table>
              </div>
              <div className="space-y-2 p-3 md:hidden">
                {lives.slice(0, 5).map((l) => (
                  <Link key={l.id} href={`/live-auction/${l.id}`} className="block rounded-xl border border-neutral-200 p-3 hover:border-green-400">
                    <div className="flex items-center justify-between gap-2">
                      <p className="min-w-0 line-clamp-1 text-sm font-medium text-neutral-800">{l.title}</p>
                      <StatusPill tone={liveTone[l.status]}>{liveStatusLabels[l.status]}</StatusPill>
                    </div>
                    <div className="mt-1 flex gap-3 text-xs text-neutral-400">
                      <span>{formatDate(l.scheduledAt)}</span>
                      <span>상품 {l.itemIds.length}개</span>
                    </div>
                  </Link>
                ))}
                {lives.length === 0 && <p className="py-8 text-center text-sm text-neutral-400">생성된 라이브 경매가 없습니다.</p>}
              </div>
            </Panel>
          </div>
        </>
      )}

      {activeTab === "settlement" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <div className="rounded-2xl border border-neutral-200 bg-white p-4">
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <Wallet className="h-4 w-4" strokeWidth={1.75} />
                정산 예정 금액
              </div>
              <p className="mt-1 text-xl font-extrabold text-neutral-900 sm:text-2xl">{formatPrice(summary.pendingAmount)}</p>
              <p className="mt-0.5 text-xs text-neutral-400">결제완료 + 배송중 합계</p>
            </div>
            <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
              <div className="flex items-center gap-2 text-sm text-green-700">
                <CreditCard className="h-4 w-4" strokeWidth={1.75} />
                출금 가능 금액
              </div>
              <p className="mt-1 text-xl font-extrabold text-green-700 sm:text-2xl">{formatPrice(summary.withdrawableAmount)}</p>
              <p className="mt-0.5 text-xs text-green-400">구매 확정 완료</p>
            </div>
          </div>

          {summary.withdrawableAmount > 0 && (
            <button
              onClick={() => setWithdrawModal(true)}
              className="w-full rounded-xl bg-green-600 py-3 text-sm font-bold text-white transition-colors hover:bg-green-700"
            >
              <Wallet className="mr-2 inline h-4 w-4" strokeWidth={1.75} />
              출금 신청하기 ({formatPrice(summary.withdrawableAmount)})
            </button>
          )}

          <Panel title="정산 목록">
            {settlements.length === 0 ? (
              <p className="py-8 text-center text-sm text-neutral-400">정산 내역이 없습니다.</p>
            ) : (
              <div className="divide-y divide-neutral-100">
                {settlements.map((sv) => (
                  <div key={sv.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-semibold text-neutral-900">{sv.itemName}</p>
                        <p className="mt-0.5 text-xs text-neutral-400">
                          낙찰가 {formatPrice(sv.salePrice)} · 정산예정 {formatPrice(sv.settlementAmount)}
                        </p>
                        {sv.status === "pending_payment" && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-amber-600">
                            <Clock className="h-3 w-3" strokeWidth={1.75} />
                            {formatCountdown(sv.paymentDeadline)}
                          </p>
                        )}
                        {sv.status === "shipping" && sv.deliveryMethod === "meetup" && sv.meetupLocation && (
                          <p className="mt-0.5 text-xs text-neutral-500">만남 장소: {sv.meetupLocation}</p>
                        )}
                        {sv.status === "shipping" && sv.deliveryMethod !== "meetup" && sv.trackingNumber && (
                          <p className="mt-0.5 text-xs text-neutral-500">운송장: {sv.trackingNumber}</p>
                        )}
                        {sv.deliveryMethod && (
                          <p className="mt-0.5 text-xs text-neutral-400">배송 방법: {deliveryMethodLabels[sv.deliveryMethod]}</p>
                        )}
                        <p className="mt-0.5 text-[11px] text-neutral-400">
                          낙찰일: {new Date(sv.awardedAt).toLocaleDateString("ko-KR")}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <StatusPill tone={settlementTone[sv.status] ?? "neutral"}>
                          {settlementStatusLabels[sv.status] ?? sv.status}
                        </StatusPill>
                        {sv.status === "payment_done" && (
                          <button
                            onClick={() => { setShipModal(sv); setTrackingNum(""); setMeetupLoc(""); setDeliveryMethod("courier"); }}
                            className="flex items-center gap-1 rounded-lg bg-neutral-800 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-neutral-700 sm:py-1"
                          >
                            <Truck className="h-3 w-3" strokeWidth={1.75} />
                            배송 정보 입력
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* 배송 정보 입력 모달 */}
      {shipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-neutral-900">배송/전달 정보 입력</h3>
              <button onClick={() => setShipModal(null)} className="rounded-full p-1.5 hover:bg-neutral-100">
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
            <p className="mb-4 text-sm text-neutral-600 line-clamp-1">{shipModal.itemName}</p>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-700">배송/전달 방법</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["courier", "special", "meetup"] as DeliveryMethod[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setDeliveryMethod(m)}
                      className={`rounded-xl border py-2 text-[11px] font-semibold transition-colors ${deliveryMethod === m ? "border-green-500 bg-green-50 text-green-700" : "border-neutral-200 text-neutral-600 hover:border-green-300"}`}
                    >
                      {m === "courier" ? "일반 택배" : m === "special" ? "특수 배달" : (
                        <span className="flex flex-col items-center">
                          <Users className="mb-0.5 h-3 w-3" strokeWidth={1.75} />
                          만남 전달
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              {deliveryMethod === "meetup" ? (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-neutral-700">만남 장소</label>
                  <input type="text" placeholder="예: OO역 2번 출구, OO카페" value={meetupLoc} onChange={(e) => setMeetupLoc(e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-green-400" />
                </div>
              ) : (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-neutral-700">운송장 번호 (선택)</label>
                  <input type="text" placeholder="운송장 번호 입력" value={trackingNum} onChange={(e) => setTrackingNum(e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-green-400" />
                </div>
              )}
            </div>
            <button onClick={handleShip} disabled={shipLoading}
              className="mt-4 w-full rounded-xl bg-green-600 py-3 text-sm font-bold text-white disabled:opacity-50 hover:bg-green-700">
              {shipLoading ? "처리 중..." : "등록"}
            </button>
          </div>
        </div>
      )}

      {/* 출금 요청 모달 */}
      {withdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-neutral-900">출금 신청</h3>
              <button onClick={() => setWithdrawModal(false)} className="rounded-full p-1.5 hover:bg-neutral-100">
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
            <p className="mb-4 text-sm text-neutral-600">출금 금액: <span className="font-bold text-green-700">{formatPrice(summary.withdrawableAmount)}</span></p>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-700">은행명</label>
                <input type="text" placeholder="예: 국민은행" value={bankName} onChange={(e) => setBankName(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-green-400" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-700">계좌번호</label>
                <input type="text" placeholder="계좌번호 입력" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-green-400" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-700">예금주명</label>
                <input type="text" placeholder="예금주명 입력" value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-green-400" />
              </div>
            </div>
            <button onClick={handleWithdraw} disabled={withdrawLoading}
              className="mt-4 w-full rounded-xl bg-green-600 py-3 text-sm font-bold text-white disabled:opacity-50 hover:bg-green-700">
              {withdrawLoading ? "처리 중..." : "출금 신청"}
            </button>
          </div>
        </div>
      )}
    </SellerLayout>
  );
}
