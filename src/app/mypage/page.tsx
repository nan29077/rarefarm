"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, ChevronRight, Store, Clock, Settings, Heart, X, CheckCircle } from "lucide-react";
import { CustomIcon } from "@/components/common/CustomIcon";
import { MobileShell } from "@/components/layout/MobileShell";
import { Avatar } from "@/components/common/Avatar";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Modal } from "@/components/common/Modal";
import { Placeholder } from "@/components/common/Placeholder";
import { EmptyState } from "@/components/common/EmptyState";
import { ProductCard } from "@/components/product/ProductCard";
import { marketService } from "@/lib/marketService";
import { communityService } from "@/lib/communityService";
import { auctionService } from "@/lib/auctionService";
import { couponService } from "@/lib/couponService";
import { settlementService, settlementStatusLabels } from "@/lib/settlementService";
import { sellerRequestService } from "@/lib/sellerRequestService";
import { purchases, pointHistories, coupons } from "@/lib/mockData";
import { getState, update, resetStore, togglePickSeller } from "@/lib/store";
import { useStoreVersion } from "@/lib/useStore";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/providers/ToastProvider";
import {
  formatPrice,
  formatDate,
  conditionLabels,
  timeAgo,
  cn,
} from "@/lib/utils";
import type { PurchaseStatus, Settlement } from "@/types";

type TradeTab = "purchases" | "auction" | "mySales" | "posts";

const purchaseStatusLabels: Record<PurchaseStatus, string> = {
  shipping: "배송중",
  delivered: "배송완료",
  canceled: "취소",
};

export default function MyPage() {
  useStoreVersion();
  const router = useRouter();
  const { user, ready, logout, isBuyer, isSeller, refreshUser } = useAuth();
  const { toast } = useToast();

  const isBuyerRole = !!user && user.role === "buyer";

  const [tradeTab, setTradeTab] = useState<TradeTab>("purchases");

  // 판매자 전환 신청 모달
  const [convertOpen, setConvertOpen] = useState(false);
  const [reqName, setReqName] = useState("");
  const [reqBiz, setReqBiz] = useState("");
  const [reqReason, setReqReason] = useState("");
  // 내 정보 수정 폼
  const [editNickname, setEditNickname] = useState("");
  const [editBio, setEditBio] = useState("");
  // 비밀번호 변경 폼
  const [pwCur, setPwCur] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwNew2, setPwNew2] = useState("");
  // 알림 설정 (mock)
  const [notif, setNotif] = useState({ bid: true, live: true, marketing: false });

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  useEffect(() => {
    if (user) {
      setEditNickname(user.nickname);
      setEditBio(user.bio ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (!user) return <MobileShell><div className="p-10" /></MobileShell>;

  const asks = marketService.getAsksForUser(user.id);
  const watch = marketService.getWatchlist(user.id);

  // 마이페이지 데이터
  const myPurchases = purchases.filter((p) => p.userId === user.id);
  const totalSpent = myPurchases
    .filter((p) => p.status !== "canceled")
    .reduce((sum, p) => sum + p.price, 0);
  const grade = totalSpent >= 500000 ? "VIP" : totalSpent >= 100000 ? "단골" : "새내기";
  const participations = auctionService.getParticipationsForUser(user.id);
  const mySettlements = settlementService.getSettlementsForBuyer(user.id);
  const [settlementNow, setSettlementNow] = useState(Date.now());
  const [payLoading, setPayLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [payTarget, setPayTarget] = useState<Settlement | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<Settlement | null>(null);

  const myPosts = communityService.getPosts("mine", user.id);
  const myComments = getState()
    .comments.filter((c) => c.userId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const myPoints = pointHistories.filter((p) => p.userId === user.id);
  const pointTotal = myPoints.reduce((sum, p) => sum + p.amount, 0);
  // 기존 쿠폰 + 라이브 경매 쿠폰을 통합 쿠폰함으로 표시
  const myLiveCoupons = couponService.getUserLiveCoupons(user.id);
  const allCoupons: {
    id: string;
    name: string;
    discountLabel: string;
    expiresAt: string;
    used: boolean;
  }[] = [
    ...coupons
      .filter((c) => c.userId === user.id)
      .map((c) => ({
        id: c.id,
        name: c.name,
        discountLabel: c.discountLabel,
        expiresAt: c.expiresAt,
        used: c.used,
      })),
    ...myLiveCoupons.map((c) => ({
      id: c.id,
      name: c.name,
      discountLabel:
        c.discountType === "percent"
          ? `${c.discountValue}%`
          : `${c.discountValue.toLocaleString("ko-KR")}원`,
      expiresAt: c.expiresAt,
      used: c.used,
    })),
  ];

  const sellerRequest = sellerRequestService.getForUser(user.id);

  // 내 PICK 파머 데이터
  const storeUser = getState().users.find((u) => u.id === user.id);
  const pickedSellerIds = storeUser?.pickedSellers ?? [];
  const liveNow = auctionService.getOngoingLives().filter((l) => l.isPublic !== false);
  const liveSellerIds = new Set(liveNow.map((l) => l.sellerId));
  const pickedFarmers = pickedSellerIds.map((id) => ({
    seller: marketService.getUser(id),
    live: liveNow.find((l) => l.sellerId === id),
    isLive: liveSellerIds.has(id),
  })).filter((f) => f.seller);

  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function goToTradeTab(tab: TradeTab) {
    setTradeTab(tab);
    setTimeout(() => {
      document.getElementById("mypage-sec-trades")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  function submitConvert() {
    if (!user) return;
    if (!reqName.trim()) return toast("이름을 입력해주세요.", "error");
    if (!reqBiz.trim()) return toast("사업자 정보를 입력해주세요.", "error");
    if (!reqReason.trim()) return toast("신청 이유를 입력해주세요.", "error");
    sellerRequestService.submit({
      userId: user.id,
      name: reqName.trim(),
      businessInfo: reqBiz.trim(),
      reason: reqReason.trim(),
    });
    setConvertOpen(false);
    setReqName("");
    setReqBiz("");
    setReqReason("");
    toast("판매자 전환 신청이 접수되었습니다. 심사 후 알려드릴게요.");
  }

  function saveProfile() {
    if (!user) return;
    if (!editNickname.trim()) return toast("닉네임을 입력해주세요.", "error");
    update((s) => {
      const u = s.users.find((x) => x.id === user.id);
      if (u) {
        u.nickname = editNickname.trim();
        u.bio = editBio.trim();
      }
    });
    refreshUser();
    toast("내 정보가 수정되었습니다.");
  }

  function changePassword() {
    if (!user) return;
    if (!pwCur) return toast("현재 비밀번호를 입력해주세요.", "error");
    if (user.password && pwCur !== user.password)
      return toast("현재 비밀번호가 일치하지 않습니다.", "error");
    if (pwNew.length < 4)
      return toast("새 비밀번호는 4자 이상 입력해주세요.", "error");
    if (pwNew !== pwNew2)
      return toast("새 비밀번호가 서로 일치하지 않습니다.", "error");
    update((s) => {
      const u = s.users.find((x) => x.id === user.id);
      if (u) u.password = pwNew;
    });
    setPwCur("");
    setPwNew("");
    setPwNew2("");
    toast("비밀번호가 변경되었습니다.");
  }

  // 6개 메뉴 카드
  const menuCards = [
    { icon: "rf-bid", label: "거래 내역", onClick: () => goToTradeTab("purchases") },
    { icon: "rf-bookmark", label: "관심 상품", onClick: () => scrollToSection("mypage-sec-watch") },
    { icon: "rf-rating", label: "포인트/쿠폰", onClick: () => scrollToSection("mypage-sec-points") },
    { icon: "rf-cert", label: "내 판매", onClick: () => goToTradeTab("mySales") },
    { icon: "rf-nav-community", label: "커뮤니티", onClick: () => goToTradeTab("posts") },
  ];

  const tradeTabs: { key: TradeTab; label: string }[] = [
    { key: "purchases", label: "구매 내역" },
    { key: "auction", label: "경매 참여" },
    { key: "mySales", label: "내 판매" },
    { key: "posts", label: "내 글/댓글" },
  ];


  useEffect(() => {
    const t = setInterval(() => setSettlementNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    settlementService.checkAutoConfirm();
    settlementService.checkExpiredPayments();
  }, []);

  async function handlePay(sv: Settlement) {
    setPayLoading(true);
    const res = await settlementService.pay(sv.id, user!.id);
    setPayLoading(false);
    if (res.ok) toast("결제가 완료되었습니다.");
    else toast(res.error ?? "결제 오류", "error");
    setPayTarget(null);
  }

  async function handleConfirm(sv: Settlement) {
    setConfirmLoading(true);
    const res = await settlementService.confirm(sv.id, user!.id);
    setConfirmLoading(false);
    if (res.ok) toast("구매 확정되었습니다.");
    else toast(res.error ?? "처리 오류", "error");
    setConfirmTarget(null);
  }

  function countdownText(deadline: number): string {
    const diff = deadline - settlementNow;
    if (diff <= 0) return "기한 초과";
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    return h > 0 ? `${h}시간 ${m}분 남음` : `${m}분 남음`;
  }

  return (
    <MobileShell>
      {/* 상단 헤더: 타이틀 + 설정 버튼 */}
      <div className="flex items-center justify-between px-4 pt-4">
        <h1 className="text-lg font-extrabold text-neutral-900">마이페이지</h1>
        <Link
          href="/mypage/settings"
          aria-label="설정"
          className="rounded-full p-2 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
        >
          <Settings className="h-5 w-5" strokeWidth={1.75} />
        </Link>
      </div>

      {/* 프로필 — 허니컴 프로필 카드 */}
      <div className="px-4 pb-4 pt-2">
        <div className="honeycomb-dark overflow-hidden rounded-2xl bg-gradient-to-br from-[#FFD700] to-brand-500 p-4">
          <div className="flex items-center gap-3">
            <Avatar
              seed={user.avatar}
              name={user.nickname}
              size={56}
              className="ring-2 ring-neutral-900/20"
            />
            <div className="flex-1">
              <p className="flex flex-wrap items-center gap-1.5 text-lg font-extrabold text-neutral-900">
                {user.nickname}
                <Badge tone="dark">{grade}</Badge>
                {user.role === "admin" && <Badge tone="dark">관리자</Badge>}
                {isSeller && <Badge tone="dark">판매자</Badge>}
                {isBuyer && <Badge tone="dark">구매자</Badge>}
              </p>
              <p className="text-xs text-neutral-900/60">{user.email}</p>
              <p className="mt-0.5 text-[11px] text-neutral-900/60">
                {formatDate(user.createdAt)} 가입 · 총 구매액{" "}
                <span className="font-bold text-neutral-900">{formatPrice(totalSpent)}</span>
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 divide-x divide-neutral-900/10 rounded-xl bg-white/70 py-3 text-center backdrop-blur-sm">
            <Stat label="팔로워" value={user.followers} />
            <Stat label="팔로잉" value={user.following} />
            <Stat label="관심상품" value={watch.length} />
          </div>
        </div>

        {user.role === "admin" && (
          <Link href="/admin">
            <div className="honeycomb-light mt-3 flex items-center justify-between overflow-hidden rounded-xl bg-[#111111] px-4 py-3">
              <span className="text-sm font-bold text-brand-400">
                관리자 콘솔로 이동
              </span>
              <ChevronRight className="h-4 w-4 text-brand-400" />
            </div>
          </Link>
        )}

        {/* 판매자: 라이브 경매 관리자 바로가기 */}
        {isSeller && (
          <Link href="/seller/live-auction">
            <div className="honeycomb-light mt-3 flex items-center justify-between overflow-hidden rounded-xl bg-[#111111] px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-bold text-brand-400">
                <Store className="h-4 w-4" strokeWidth={1.75} />
                라이브 경매 관리자 바로가기
              </span>
              <ChevronRight className="h-4 w-4 text-brand-400" />
            </div>
          </Link>
        )}

        {/* 구매자: 라이브 커머스 판매자 신청하기 */}
        {isBuyer && (
          sellerRequest?.status === "pending" ? (
            <div className="mt-3 flex items-center justify-between rounded-xl border border-brand-300 bg-brand-50 px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-bold text-brand-800">
                <Clock className="h-4 w-4" strokeWidth={1.75} />
                판매자 전환 심사 중
              </span>
              <span className="text-[11px] text-neutral-500">
                {formatDate(sellerRequest.createdAt)} 신청
              </span>
            </div>
          ) : (
            <button onClick={() => setConvertOpen(true)} className="w-full">
              <div className="honeycomb-light mt-3 flex items-center justify-between overflow-hidden rounded-xl bg-[#111111] px-4 py-3">
                <span className="flex items-center gap-2 text-sm font-bold text-brand-400">
                  <Store className="h-4 w-4" strokeWidth={1.75} />
                  라이브 커머스 판매자 신청하기
                  {sellerRequest?.status === "rejected" && (
                    <Badge tone="red">이전 신청 거절됨</Badge>
                  )}
                </span>
                <ChevronRight className="h-4 w-4 text-brand-400" />
              </div>
            </button>
          )
        )}
      </div>

      {/* 6개 메뉴 카드 그리드 */}
      <div className="border-y border-neutral-100 px-4 py-4">
        <p className="mb-3 text-sm font-bold text-neutral-900">전체 메뉴</p>
        <div className="grid grid-cols-3 gap-2">
          {menuCards.map((card) => (
            <button
              key={card.label}
              onClick={card.onClick}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-neutral-100 bg-white py-3.5 transition-colors hover:border-brand-400 hover:bg-brand-50"
            >
              <CustomIcon name={card.icon} size={24} className="h-6 w-6" />
              <span className="text-[11px] font-semibold text-neutral-700">{card.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 거래 내역 탭 섹션 */}
      <section id="mypage-sec-trades" className="scroll-mt-4 border-b border-neutral-100">
        {/* 탭 바 */}
        <div className="grid grid-cols-4 border-b border-neutral-100">
          {tradeTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTradeTab(t.key)}
              className={cn(
                "py-3 text-[12px] font-bold transition-colors",
                tradeTab === t.key
                  ? "border-b-2 border-neutral-900 text-neutral-900"
                  : "text-neutral-400"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="min-h-[160px] px-4 py-4">
          {/* 구매 내역 */}
          {tradeTab === "purchases" && (
            myPurchases.length ? (
              <div className="space-y-2">
                {myPurchases.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 rounded-xl border border-neutral-100 p-2.5"
                  >
                    <Placeholder seed={p.image} className="h-14 w-14 rounded-lg" />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-semibold text-neutral-900">
                        {p.productName}
                      </p>
                      <p className="text-xs text-neutral-400">
                        {formatDate(p.purchasedAt)} 구매
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-right">
                      <p className="text-sm font-bold text-neutral-900">
                        {formatPrice(p.price)}
                      </p>
                      <Badge
                        tone={
                          p.status === "delivered"
                            ? "green"
                            : p.status === "shipping"
                              ? "brand"
                              : "red"
                        }
                      >
                        {purchaseStatusLabels[p.status]}
                      </Badge>
                      {p.status === "delivered" && (
                        <button
                          onClick={() =>
                            toast("리뷰 작성 페이지는 준비 중입니다.", "info")
                          }
                          className="rounded-lg border border-neutral-200 px-2 py-1 text-[11px] font-semibold text-neutral-600 transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-neutral-900"
                        >
                          리뷰 작성
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon="rf-bid" title="구매 내역이 없어요" />
            )
          )}

          {/* 경매 참여 내역 */}
          {tradeTab === "auction" && (
            participations.length ? (
              <div className="space-y-2">
                {participations.map(({ bid, item, live, result }) => (
                  <Link
                    key={bid.id}
                    href={live ? `/live-auction/${live.id}` : "/live-auction"}
                    className="flex items-center gap-3 rounded-xl border border-neutral-100 p-2.5 transition-colors hover:border-brand-300 hover:bg-brand-50/40"
                  >
                    <Placeholder
                      seed={item?.image ?? bid.itemId}
                      className="h-14 w-14 rounded-lg"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-semibold text-neutral-900">
                        {item?.name ?? "경매 상품"}
                      </p>
                      <p className="line-clamp-1 text-xs text-neutral-400">
                        {live?.title ?? "라이브 경매"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-neutral-900">
                        {formatPrice(bid.price)}
                      </p>
                      <Badge
                        tone={
                          result === "won"
                            ? "green"
                            : result === "ongoing"
                              ? "brand"
                              : result === "failed"
                                ? "neutral"
                                : "red"
                        }
                      >
                        {result === "won"
                          ? "낙찰"
                          : result === "lost"
                            ? "패찰"
                            : result === "failed"
                              ? "유찰"
                              : "진행중"}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                icon="rf-auction"
                title="경매 참여 내역이 없어요"
                description="라이브 경매에서 득템에 도전해보세요!"
                action={
                  <Link href="/live-auction">
                    <Button size="sm">라이브 경매 보러가기</Button>
                  </Link>
                }
              />
            )
          )}


          {tradeTab === "auction" && mySettlements.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-bold text-neutral-500">낙찰 정산 현황</p>
              {mySettlements.map((sv) => (
                <div key={sv.id} className="rounded-xl border border-neutral-200 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-semibold text-neutral-900">{sv.itemName}</p>
                      <p className="text-xs text-neutral-400">낙찰가 {sv.salePrice.toLocaleString("ko-KR")}원</p>
                      {sv.status === "pending_payment" && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-amber-600">
                          <Clock className="h-3 w-3" strokeWidth={1.75} />
                          {countdownText(sv.paymentDeadline)}
                        </p>
                      )}
                      {sv.status === "shipping" && sv.deliveryMethod === "meetup" && sv.meetupLocation && (
                        <p className="mt-0.5 text-xs text-neutral-500">만남 장소: {sv.meetupLocation}</p>
                      )}
                      {sv.status === "shipping" && sv.deliveryMethod !== "meetup" && sv.trackingNumber && (
                        <p className="mt-0.5 text-xs text-neutral-500">운송장: {sv.trackingNumber}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className={"rounded-full px-2 py-0.5 text-[10px] font-semibold " + (
                        sv.status === "pending_payment" ? "bg-amber-100 text-amber-700"
                        : sv.status === "payment_done" ? "bg-neutral-100 text-neutral-600"
                        : sv.status === "shipping" ? "bg-blue-50 text-blue-600"
                        : sv.status === "withdrawable" || sv.status === "withdrawn" ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-600"
                      )}>
                        {settlementStatusLabels[sv.status] ?? sv.status}
                      </span>
                      {sv.status === "pending_payment" && (
                        <button onClick={() => setPayTarget(sv)} className="rounded-lg bg-brand-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-brand-700">
                          결제하기
                        </button>
                      )}
                      {sv.status === "shipping" && (
                        <button onClick={() => setConfirmTarget(sv)} className="flex items-center gap-1 rounded-lg bg-green-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-green-700">
                          <CheckCircle className="h-3 w-3" strokeWidth={1.75} />
                          구매 확정
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {payTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-xs rounded-2xl bg-white p-6 text-center">
                <p className="mb-1 text-base font-bold text-neutral-900">결제하기</p>
                <p className="mb-4 text-sm text-neutral-500">{payTarget.itemName}</p>
                <p className="mb-4 text-2xl font-extrabold text-neutral-900">{payTarget.salePrice.toLocaleString("ko-KR")}원</p>
                <div className="flex gap-2">
                  <button onClick={() => setPayTarget(null)} className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-semibold text-neutral-600 hover:bg-neutral-50">취소</button>
                  <button onClick={() => handlePay(payTarget!)} disabled={payLoading} className="flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-bold text-white disabled:opacity-50 hover:bg-brand-700">
                    {payLoading ? "처리 중..." : "결제 완료"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {confirmTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-xs rounded-2xl bg-white p-6 text-center">
                <p className="mb-1 text-base font-bold text-neutral-900">구매 확정</p>
                <p className="mb-4 text-sm text-neutral-500 line-clamp-2">{confirmTarget.itemName} 상품을 정상적으로 수령하셨나요?</p>
                <p className="mb-4 text-xs text-neutral-400">확정 후에는 취소할 수 없습니다.</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmTarget(null)} className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-semibold text-neutral-600 hover:bg-neutral-50">취소</button>
                  <button onClick={() => handleConfirm(confirmTarget!)} disabled={confirmLoading} className="flex-1 rounded-xl bg-green-600 py-2.5 text-sm font-bold text-white disabled:opacity-50 hover:bg-green-700">
                    {confirmLoading ? "처리 중..." : "구매 확정"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 내 판매 내역 */}
          {tradeTab === "mySales" && (
            !isBuyerRole && asks.length ? (
              <div className="space-y-2">
                {asks.map((a) => {
                  const p = marketService.getProduct(a.productId);
                  return (
                    <Row
                      key={a.id}
                      href={`/product/${a.productId}`}
                      seed={p?.images[0] ?? a.id}
                      title={p?.name ?? "상품"}
                      sub={p ? conditionLabels[p.condition] : ""}
                      right={formatPrice(a.price)}
                    />
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon="rf-cert"
                title="판매 내역이 없어요"
                description={isBuyerRole ? "라이브 커머스 판매자가 되면 판매할 수 있어요!" : undefined}
                action={
                  isBuyerRole ? (
                    <button onClick={() => setConvertOpen(true)}>
                      <Button size="sm">판매자 신청하기</Button>
                    </button>
                  ) : undefined
                }
              />
            )
          )}

          {/* 내 글/댓글 */}
          {tradeTab === "posts" && (
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-bold text-neutral-500">
                  내가 쓴 글 ({myPosts.length})
                </p>
                {myPosts.length ? (
                  <div className="space-y-2">
                    {myPosts.map((p) => (
                      <Link
                        key={p.id}
                        href={`/community/${p.id}`}
                        className="flex items-center gap-3 rounded-xl border border-neutral-100 p-2.5 transition-colors hover:border-brand-300 hover:bg-brand-50/40"
                      >
                        <Placeholder
                          seed={p.images[0] ?? p.id}
                          className="h-12 w-12 rounded-lg"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 text-sm text-neutral-800">
                            {p.content}
                          </p>
                          <p className="text-xs text-neutral-400">
                            좋아요 {p.likeCount} · 댓글 {p.commentCount} ·{" "}
                            {timeAgo(p.createdAt)}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-neutral-200 py-6 text-center text-xs text-neutral-400">
                    작성한 글이 없어요.
                  </p>
                )}
              </div>
              <div>
                <p className="mb-2 text-xs font-bold text-neutral-500">
                  내가 쓴 댓글 ({myComments.length})
                </p>
                {myComments.length ? (
                  <div className="space-y-2">
                    {myComments.map((c) => (
                      <Link
                        key={c.id}
                        href={`/community/${c.postId}`}
                        className="block rounded-xl border border-neutral-100 p-3 transition-colors hover:border-brand-300 hover:bg-brand-50/40"
                      >
                        <p className="line-clamp-1 text-sm text-neutral-800">
                          {c.content}
                        </p>
                        <p className="mt-0.5 text-xs text-neutral-400">
                          {timeAgo(c.createdAt)}
                        </p>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-neutral-200 py-6 text-center text-xs text-neutral-400">
                    작성한 댓글이 없어요.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 내 PICK 파머 */}
      <section id="mypage-sec-pick" className="scroll-mt-4 border-b border-neutral-100 px-4 py-5">
        <p className="mb-3 flex items-center gap-1.5 text-sm font-bold text-neutral-900">
          <Heart className="h-[18px] w-[18px] text-red-500" strokeWidth={1.75} />
          내 PICK 파머
        </p>
        {pickedFarmers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 py-8 text-center">
            <p className="text-sm text-neutral-400">아직 PICK한 파머가 없어요.</p>
            <p className="mt-1 text-xs text-neutral-400">라이브 경매에서 관심 파머를 PICK해보세요!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pickedFarmers.map(({ seller, live, isLive }) => (
              <div
                key={seller!.id}
                className="flex items-center gap-3 rounded-xl border border-neutral-100 bg-white p-3"
              >
                <div className="relative shrink-0">
                  <Avatar seed={seller!.avatar} name={seller!.nickname} size={44} />
                  {isLive && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-md bg-red-500 px-1 py-0.5 text-[8px] font-extrabold text-white">
                      LIVE
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-neutral-900">{seller!.nickname}</p>
                  {isLive && live ? (
                    <Link
                      href={`/live-auction/${live.id}`}
                      className="text-xs font-medium text-brand-600 hover:underline"
                    >
                      {live.title} →
                    </Link>
                  ) : (
                    <p className="text-xs text-neutral-400">라이브 없음</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    togglePickSeller(user.id, seller!.id);
                    toast("PICK 파머를 취소했습니다.");
                  }}
                  aria-label="PICK 취소"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-400"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 관심 상품 */}
      <Section id="mypage-sec-watch" icon="rf-bookmark" title="관심 상품">
        {watch.length ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-5">
            {watch.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <EmptyState icon="rf-bookmark" title="관심 상품이 없어요" />
        )}
      </Section>

      {/* 포인트/쿠폰 통합 섹션 */}
      <Section id="mypage-sec-points" icon="rf-rating" title="포인트/쿠폰">
        <div className="space-y-4">
          <div>
            <div className="honeycomb-light mb-3 overflow-hidden rounded-2xl bg-[#111111] p-4">
              <p className="text-xs text-neutral-400">보유 포인트</p>
              <p className="mt-0.5 text-2xl font-extrabold text-brand-400">
                {pointTotal.toLocaleString("ko-KR")}P
              </p>
            </div>
            {myPoints.length ? (
              <div className="space-y-2">
                {myPoints.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-xl border border-neutral-100 px-3 py-2.5"
                  >
                    <div>
                      <p className="text-sm text-neutral-800">{p.reason}</p>
                      <p className="text-xs text-neutral-400">
                        {formatDate(p.createdAt)}
                      </p>
                    </div>
                    <p
                      className={cn(
                        "text-sm font-bold",
                        p.amount >= 0 ? "text-emerald-600" : "text-red-500"
                      )}
                    >
                      {p.amount >= 0 ? "+" : ""}
                      {p.amount.toLocaleString("ko-KR")}P
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon="rf-rating" title="포인트 내역이 없어요" />
            )}
          </div>
          {/* 쿠폰함 통합 */}
          {allCoupons.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold text-neutral-500">쿠폰함 ({allCoupons.length})</p>
              <div className="space-y-2">
                {allCoupons.map((c) => (
                  <div
                    key={c.id}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border p-3",
                      c.used
                        ? "border-neutral-100 opacity-50"
                        : "border-brand-300 bg-brand-50/50"
                    )}
                  >
                    <div className="hex-clip flex h-12 w-12 shrink-0 items-center justify-center bg-brand-400">
                      <span className="text-[10px] font-extrabold text-neutral-900">
                        COUPON
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-semibold text-neutral-900">
                        {c.name}
                      </p>
                      <p className="text-xs text-neutral-400">
                        {formatDate(c.expiresAt)}까지
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-extrabold text-neutral-900">
                        {c.discountLabel}
                      </p>
                      <Badge tone={c.used ? "neutral" : "brand"}>
                        {c.used ? "사용완료" : "사용가능"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* 판매자 전환 신청 모달 */}
      <Modal
        open={convertOpen}
        onClose={() => setConvertOpen(false)}
        title="판매자 전환 신청"
      >
        <div className="space-y-3 pb-2">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-neutral-700">
              이름
            </label>
            <input
              value={reqName}
              onChange={(e) => setReqName(e.target.value)}
              placeholder="실명을 입력해주세요"
              className="w-full rounded-xl border border-neutral-300 px-3 py-3 text-sm outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-neutral-700">
              사업자 정보
            </label>
            <input
              value={reqBiz}
              onChange={(e) => setReqBiz(e.target.value)}
              placeholder="사업자등록번호 또는 개인 판매자"
              className="w-full rounded-xl border border-neutral-300 px-3 py-3 text-sm outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-neutral-700">
              신청 이유
            </label>
            <textarea
              value={reqReason}
              onChange={(e) => setReqReason(e.target.value)}
              rows={3}
              placeholder="어떤 상품을 판매하고 싶은지 알려주세요"
              className="w-full resize-none rounded-xl border border-neutral-300 px-3 py-3 text-sm outline-none focus:border-brand-500"
            />
          </div>
          <p className="text-[11px] leading-relaxed text-neutral-400">
            신청 후 관리자 심사를 거쳐 판매자로 전환됩니다. 심사는 영업일 기준
            1~3일 소요됩니다.
          </p>
          <Button fullWidth onClick={submitConvert}>
            신청하기
          </Button>
        </div>
      </Modal>
    </MobileShell>
  );
}

// 마이페이지 콘텐츠 섹션
function Section({
  id,
  icon,
  title,
  children,
}: {
  id: string;
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-4 border-b border-neutral-100 px-4 py-5">
      <p className="mb-3 flex items-center gap-1.5 text-sm font-bold text-neutral-900">
        <CustomIcon name={icon} size={18} className="h-[18px] w-[18px]" />
        {title}
      </p>
      {children}
    </section>
  );
}

// 알림 설정 토글 행
function NotifRow({
  label,
  desc,
  checked,
  onToggle,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-neutral-100 px-3 py-2.5">
      <div className="min-w-0 flex-1 pr-3">
        <p className="text-sm font-semibold text-neutral-800">{label}</p>
        <p className="text-[11px] text-neutral-400">{desc}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onToggle}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-brand-500" : "bg-neutral-300"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
            checked ? "left-[22px]" : "left-0.5"
          )}
        />
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-lg font-extrabold text-neutral-900">{value}</p>
      <p className="text-[11px] text-neutral-400">{label}</p>
    </div>
  );
}

function Row({
  href,
  seed,
  title,
  sub,
  right,
  badge,
}: {
  href: string;
  seed: string;
  title: string;
  sub: string;
  right: string;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-neutral-100 p-2.5 transition-colors hover:border-brand-300 hover:bg-brand-50/40"
    >
      <Placeholder seed={seed} className="h-14 w-14 rounded-lg" />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-sm font-semibold text-neutral-900">
          {title}
        </p>
        <p className="text-xs text-neutral-400">{sub}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-neutral-900">{right}</p>
        {badge && (
          <span className="text-[11px] text-brand-600">{badge}</span>
        )}
      </div>
    </Link>
  );
}