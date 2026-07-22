// 레어팜 공통 타입 정의

// user = 기존 판매자 계정(레거시), seller = 구매자에서 전환된 판매자, buyer = 구매자
export type Role = "admin" | "user" | "seller" | "buyer";
export type UserStatus = "active" | "suspended"; // 정상 / 정지

export interface User {
  id: string;
  email: string;
  password?: string; // mock 전용. 실제 API 연동 시 서버에서만 관리 (TODO)
  nickname: string;
  avatar: string; // gradient placeholder id 또는 url
  role: Role;
  status: UserStatus;
  bio?: string;
  createdAt: string; // ISO
  followers: number;
  following: number;
  pickedSellers?: string[]; // PICK한 판매자(파머) ID 목록
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string; // lucide icon name
  adultOnly?: boolean; // 성인/법규 확인 필요 (에어소프트건 등)
}

export type ProductCondition =
  | "sealed" // 미개봉
  | "like-new" // 거의 새것
  | "good" // 양호
  | "used" // 사용감 있음
  | "parts-missing" // 부품 누락
  | "box-damaged"; // 박스 손상

export type ProductStatus = "visible" | "hidden"; // 노출 / 숨김

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  brand: string;
  condition: ProductCondition;
  images: string[]; // gradient placeholder seed 문자열
  description: string;
  sellerId: string;
  status: ProductStatus;
  lastTradePrice: number | null; // 최근 거래가
  lowestAsk: number | null; // 최저 판매가
  highestBid: number | null; // 최고 구매입찰가
  likeCount: number;
  tradeCount: number;
  createdAt: string;
  adultOnly?: boolean;
}

// 구매입찰
export interface Bid {
  id: string;
  productId: string;
  userId: string;
  price: number;
  expirationDays: number;
  createdAt: string;
  status: "open" | "matched" | "canceled";
}

// 판매입찰
export interface Ask {
  id: string;
  productId: string;
  userId: string;
  price: number;
  expirationDays: number;
  createdAt: string;
  status: "open" | "matched" | "canceled";
}

export type OrderStatus =
  | "pending"
  | "matched"
  | "shipping"
  | "completed"
  | "canceled";
export type OrderSide = "buy" | "sell"; // 즉시구매 / 즉시판매 / 입찰 체결

export interface Order {
  id: string;
  productId: string;
  userId: string;
  side: OrderSide;
  price: number;
  status: OrderStatus;
  createdAt: string;
}

// 거래 체결 내역
export interface Trade {
  id: string;
  productId: string;
  price: number;
  createdAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string;
}

export interface CommunityPost {
  id: string;
  userId: string;
  images: string[];
  content: string;
  hashtags: string[];
  likeCount: number;
  commentCount: number;
  status: "visible" | "hidden";
  createdAt: string;
}

export interface Like {
  id: string;
  userId: string;
  targetType: "post" | "product";
  targetId: string;
}

export type ReportStatus = "pending" | "resolved"; // 대기 / 처리 완료
export interface Report {
  id: string;
  targetType: "product" | "post" | "user";
  targetId: string;
  targetLabel: string;
  reason: string;
  reporterId: string;
  status: ReportStatus;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: "bid" | "ask" | "order" | "community" | "system";
  message: string;
  read: boolean;
  createdAt: string;
}

// ================= 라이브 경매 =================

// 경매 상품 상태: 대기중 / 라이브중 / 낙찰완료 / 유찰
export type AuctionItemStatus = "waiting" | "live" | "sold" | "failed";

// 경매 상품 컨디션: 새상품 / 최상 / 상 / 중
export type AuctionItemCondition = "new" | "best" | "high" | "mid";

export interface AuctionItem {
  id: string;
  sellerId: string;
  name: string;
  description: string;
  categoryId: string;
  image: string; // placeholder seed
  startPrice: number; // 시작가
  bidUnit: number; // 최소 입찰 단위
  buyNowPrice: number | null; // 즉시 낙찰가
  status: AuctionItemStatus;
  suspended: boolean; // 관리자 판매중지 여부
  currentPrice: number; // 현재가 (시작 시 startPrice)
  winnerName: string | null; // 낙찰자 닉네임
  finalPrice: number | null; // 낙찰가
  createdAt: string;
  // ---- 등록 고도화 필드 (선택) ----
  condition?: AuctionItemCondition; // 상품 상태
  images?: string[]; // 이미지 URL 최대 5장
  thumbIndex?: number; // 썸네일로 쓸 이미지 인덱스
  components?: string; // 구성품 목록
  durationSec?: number; // 경매 제한 시간 (초)
  shippingFee?: number; // 배송비
  shippingMethod?: string; // 배송 방법
  shipLeadTime?: string; // 발송 예정일
  hasCertificate?: boolean; // 정품 인증서 여부
  isUnopened?: boolean; // 미개봉 여부
  endTime?: number; // 경매 종료 절대 시각 (timestamp ms, 서버 기준 — 크로스브라우저 타이머 동기화용)
}

export type LiveAuctionStatus = "scheduled" | "live" | "paused" | "ended"; // 예정 / 진행중 / 일시정지 / 종료
export type LivePlatform = "youtube" | "instagram";

export interface LiveAuction {
  id: string;
  sellerId: string;
  title: string;
  platform: LivePlatform;
  videoUrl: string; // YouTube/Instagram 라이브 URL
  itemIds: string[]; // 경매 진행 순서
  currentItemIndex: number; // 현재 경매 중인 상품 인덱스
  scheduledAt: string; // 예정 시작 시간 (ISO)
  status: LiveAuctionStatus;
  viewers: number; // mock 시청자 수
  createdAt: string;
  // ---- 방송 생성/관리 고도화 필드 (선택) ----
  thumbnailUrl?: string; // 썸네일 이미지 URL
  tags?: string[]; // 태그 (최대 5개)
  expectedMinutes?: number; // 예상 진행 시간 (분)
  isPublic?: boolean; // 공개/비공개 (undefined = 공개)
  chatEnabled?: boolean; // 채팅 허용 (undefined = 허용)
  chatFilterWords?: string[]; // 채팅 금칙어
  pinnedNotice?: string; // 고정 공지 메시지
  itemDurations?: Record<string, number>; // 상품별 경매 시간 (초)
  youtubeApiKey?: string; // 판매자 YouTube Data API 키
  couponIds?: string[]; // 이 라이브에 첨부된 쿠폰 ID 목록
  badges?: string[]; // 혜택 배지 (예: 무료배송, 적립금, 선착순 특가 등)
}

// ================= 라이브 경매 쿠폰 =================

// 판매자가 발급하는 라이브 경매 쿠폰 (원본)
export interface LiveCoupon {
  id: string;
  sellerId: string;
  name: string; // 쿠폰 이름 (예: "첫 참여 환영 쿠폰")
  discountType: "percent" | "fixed"; // 할인 유형
  discountValue: number; // 할인율(%) 또는 할인 금액(원)
  minOrderAmount?: number; // 최소 주문 금액
  maxDiscount?: number; // 최대 할인 금액 (percent 타입일 때)
  expiryDays: number; // 발급 후 유효 기간(일)
  totalCount?: number; // 발급 가능 수량 (undefined = 무제한)
  issuedCount: number; // 이미 발급된 수량
  createdAt: string;
}

// 사용자에게 발급된 라이브 경매 쿠폰
export interface UserLiveCoupon {
  id: string;
  userId: string;
  liveCouponId: string;
  liveId: string;
  name: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  minOrderAmount?: number;
  maxDiscount?: number;
  expiresAt: string;
  used: boolean;
  issuedAt: string;
}

// ================= 메인 배너 =================

export interface Banner {
  id: string;
  imageUrl: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  order: number;
  isActive: boolean;
  createdAt: string;
}

// 라이브 경매 입찰 기록
export interface AuctionBid {
  id: string;
  liveId: string;
  itemId: string;
  userId: string | null; // 실제 유저 입찰이면 userId, 시뮬레이션이면 null
  bidderName: string; // 닉네임 (마스킹 전 원본)
  price: number;
  createdAt: string;
}

// ================= 판매자 전환 신청 =================

export type SellerRequestStatus = "pending" | "approved" | "rejected";

export interface SellerRequest {
  id: string;
  userId: string;
  name: string; // 신청자 이름
  businessInfo: string; // 사업자 정보
  reason: string; // 신청 이유
  status: SellerRequestStatus;
  createdAt: string;
}

// ================= 구매자 마이페이지 mock =================

export type PurchaseStatus = "shipping" | "delivered" | "canceled"; // 배송중/배송완료/취소

export interface Purchase {
  id: string;
  userId: string;
  productName: string;
  image: string; // placeholder seed
  price: number;
  status: PurchaseStatus;
  purchasedAt: string;
}

export interface PointHistory {
  id: string;
  userId: string;
  amount: number; // +적립 / -사용
  reason: string;
  createdAt: string;
}

export interface Coupon {
  id: string;
  userId: string;
  name: string;
  discountLabel: string; // "10%", "5,000원" 등
  expiresAt: string;
  used: boolean;
}

export interface MyReview {
  id: string;
  userId: string;
  productName: string;
  rating: number;
  content: string;
  createdAt: string;
}

// ================= 경매 정산 시스템 =================

// 배송 방법 (레어팜: courier, special, meetup 모두 포함)
export type DeliveryMethod =
  | "courier"   // 일반 택배
  | "special"   // 특수 배달 (살아있는 생물 전문 배달)
  | "meetup";   // 만나서 전달 (레어팜 전용)

// 정산 상태
export type SettlementStatus =
  | "pending_payment"  // 낙찰 후 결제 대기 (24시간 이내 결제 필요)
  | "payment_done"     // 결제 완료 → 정산 예정 금액
  | "shipping"         // 배송 중
  | "withdrawable"     // 출금 가능 (구매 확정 완료)
  | "withdrawn"        // 출금 완료
  | "cancelled";       // 24시간 미결제로 낙찰 무효

// 출금 계좌 정보
export interface WithdrawAccount {
  bankName: string;       // 은행명
  accountNumber: string;  // 계좌번호
  accountHolder: string;  // 예금주명
}

// 정산 레코드
export interface Settlement {
  id: string;
  orderId: string;          // 주문/낙찰 ID (AuctionBid.id)
  itemId: string;
  itemName: string;
  sellerId: string;
  buyerId: string;
  salePrice: number;        // 낙찰가
  platformFee: number;      // 플랫폼 수수료 (salePrice × 0.11)
  settlementAmount: number; // 정산 예정 금액 (salePrice × 0.89)
  status: SettlementStatus;
  awardedAt: number;        // 낙찰 시각 (timestamp)
  paymentDeadline: number;  // 결제 기한 (awardedAt + 24h)
  paidAt?: number;
  shippedAt?: number;
  deliveryMethod?: DeliveryMethod;
  trackingNumber?: string;
  meetupLocation?: string;  // 만남 장소 (meetup 전용)
  confirmedAt?: number;
  autoConfirmAt?: number;   // 자동 구매 확정 예정 (shippedAt + 15일)
  withdrawRequestedAt?: number;
  withdrawnAt?: number;
  withdrawAccount?: WithdrawAccount;
}
