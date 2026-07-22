import type {
  User,
  Category,
  Product,
  Bid,
  Ask,
  Order,
  Trade,
  CommunityPost,
  Comment,
  Report,
  Notification,
  AuctionItem,
  LiveAuction,
  AuctionBid,
  LiveCoupon,
  UserLiveCoupon,
  SellerRequest,
  Purchase,
  PointHistory,
  Coupon,
  MyReview,
  Banner,
} from "@/types";
import { getCharacterAvatar } from "./avatarUtils";

// ---- 카테고리 ----
export const categories: Category[] = [
  { id: "c1",  name: "몬스테라",    slug: "monstera",     icon: "rf:rf-cat-monstera"    },
  { id: "c2",  name: "다육/선인장", slug: "succulent",    icon: "rf:rf-cat-succulent"   },
  { id: "c3",  name: "희귀난",      slug: "orchid",       icon: "rf:rf-cat-orchid"      },
  { id: "c4",  name: "괴근식물",    slug: "caudex",       icon: "rf:rf-cat-caudex"      },
  { id: "c5",  name: "분재",        slug: "bonsai",       icon: "rf:rf-cat-bonsai"      },
  { id: "c6",  name: "거북이",      slug: "turtle",       icon: "rf:rf-cat-turtle"      },
  { id: "c7",  name: "육지거북",    slug: "tortoise",     icon: "rf:rf-cat-tortoise"    },
  { id: "c8",  name: "도마뱀/게코", slug: "lizard",       icon: "rf:rf-cat-gecko"       },
  { id: "c9",  name: "카멜레온",    slug: "chameleon",    icon: "rf:rf-cat-chameleon"   },
  { id: "c10", name: "뱀",          slug: "snake",        icon: "rf:rf-cat-snake"       },
  { id: "c11", name: "소동물",      slug: "small-animal", icon: "rf:rf-cat-hedgehog"    },
  { id: "c12", name: "앵무새",      slug: "parrot",       icon: "rf:rf-cat-parrot"      },
  { id: "c13", name: "곤충",        slug: "insect",       icon: "rf:rf-cat-beetle"      },
  { id: "c14", name: "사육장/용품", slug: "supplies",     icon: "rf:rf-cat-terrarium"   },
  { id: "c15", name: "먹이/영양제", slug: "food",         icon: "rf:rf-food"            },
  { id: "c16", name: "CITES 희귀종",slug: "cites",        icon: "rf:rf-cites"           },
  { id: "c17", name: "묘목/씨앗",   slug: "sapling",      icon: "rf:rf-cat-sapling"     },
  { id: "c18", name: "기타 수집",   slug: "etc",          icon: "rf:rf-cert"            },
];

// ---- 유저 ----
export const users: User[] = [
  {
    id: "u-admin",
    email: "admin@rarefarm.kr",
    password: "Admin1234!",
    nickname: "레어팜관리자",
    avatar: getCharacterAvatar("u-admin"),
    role: "admin",
    status: "active",
    bio: "레어팜 운영팀",
    createdAt: "2025-01-02T09:00:00Z",
    followers: 0,
    following: 0,
  },
  {
    id: "u-user",
    email: "user@rarefarm.kr",
    password: "User1234!",
    nickname: "식물사냥꾼",
    avatar: getCharacterAvatar("u-user"),
    role: "user",
    status: "active",
    bio: "몬스테라 · 희귀식물 수집 중",
    createdAt: "2025-03-11T09:00:00Z",
    followers: 128,
    following: 74,
  },
  {
    id: "u2",
    email: "reptile@rarefarm.kr",
    password: "test",
    nickname: "파충류마스터",
    avatar: getCharacterAvatar("u2"),
    role: "user",
    status: "active",
    bio: "볼파이톤 브리더 · 게코 전문",
    createdAt: "2025-04-01T09:00:00Z",
    followers: 512,
    following: 33,
  },
  {
    id: "u3",
    email: "cactus@rarefarm.kr",
    password: "test",
    nickname: "다육이집사",
    avatar: getCharacterAvatar("u3"),
    role: "user",
    status: "suspended",
    bio: "다육식물 · 선인장 700종 컬렉터",
    createdAt: "2025-05-20T09:00:00Z",
    followers: 88,
    following: 120,
  },
  {
    id: "u4",
    email: "breeder@rarefarm.kr",
    password: "test",
    nickname: "레어팜브리더",
    avatar: getCharacterAvatar("u4"),
    role: "user",
    status: "active",
    bio: "희귀 파충류 브리더 · CITES 인증",
    createdAt: "2026-06-30T09:00:00Z",
    followers: 41,
    following: 12,
  },
  {
    id: "u-buyer",
    email: "buyer@rarefarm.kr",
    password: "Buyer1234!",
    nickname: "희귀생물수집가",
    avatar: getCharacterAvatar("u-buyer"),
    role: "buyer",
    status: "active",
    bio: "라이브 경매로 희귀 동식물 득템",
    createdAt: "2026-07-01T09:00:00Z",
    followers: 12,
    following: 48,
  },
  {
    id: "u5",
    email: "newbie@rarefarm.kr",
    password: "test",
    nickname: "레어팜초보",
    avatar: getCharacterAvatar("u5"),
    role: "buyer",
    status: "active",
    bio: "이제 막 입문한 파충류 초보",
    createdAt: "2026-07-10T09:00:00Z",
    followers: 2,
    following: 15,
  },
];

// ---- 상품 ----
export const products: Product[] = [
  {
    id: "p1",
    name: "몬스테라 알보 바리에가타 (고착 무늬)",
    categoryId: "c1",
    brand: "국내 직접 분리",
    condition: "sealed",
    images: ["p1-a", "p1-b", "p1-c"],
    description:
      "알보 바리에가타 고착 무늬 개체. 뿌리 발달 양호, 흰색 비율 70% 이상. 화분 포함 배송.",
    sellerId: "u2",
    status: "visible",
    lastTradePrice: 320000,
    lowestAsk: 350000,
    highestBid: 310000,
    likeCount: 421,
    tradeCount: 38,
    createdAt: "2026-06-20T10:00:00Z",
  },
  {
    id: "p2",
    name: "아가베 블루 차크라 (대품)",
    categoryId: "c2",
    brand: "멕시코산 직수입",
    condition: "like-new",
    images: ["p2-a", "p2-b"],
    description: "블루 차크라 대품 30cm급. 건강한 상태, 분갈이 후 안정된 개체.",
    sellerId: "u2",
    status: "visible",
    lastTradePrice: 85000,
    lowestAsk: 95000,
    highestBid: 78000,
    likeCount: 156,
    tradeCount: 72,
    createdAt: "2026-06-25T10:00:00Z",
  },
  {
    id: "p3",
    name: "안스리움 아마조니카 (M사이즈)",
    categoryId: "c1",
    brand: "태국산",
    condition: "sealed",
    images: ["p3-a", "p3-b"],
    description: "아마조니카 벨벳 잎 M사이즈. 잎 5장 이상, 뿌리 건강.",
    sellerId: "u4",
    status: "visible",
    lastTradePrice: 48000,
    lowestAsk: 55000,
    highestBid: 42000,
    likeCount: 189,
    tradeCount: 64,
    createdAt: "2026-06-28T10:00:00Z",
  },
  {
    id: "p4",
    name: "레오파드게코 슈퍼설 CB개체",
    categoryId: "c8",
    brand: "국내 브리딩",
    condition: "sealed",
    images: ["p4-a", "p4-b"],
    description: "슈퍼설 모프 레오파드게코 CB개체. 사육일지 포함, CITES 서류 발급 가능.",
    sellerId: "u3",
    status: "visible",
    lastTradePrice: 180000,
    lowestAsk: 200000,
    highestBid: 170000,
    likeCount: 302,
    tradeCount: 21,
    createdAt: "2026-06-27T10:00:00Z",
  },
  {
    id: "p5",
    name: "볼파이톤 차이나백 (암컷)",
    categoryId: "c10",
    brand: "국내 브리딩",
    condition: "good",
    images: ["p5-a", "p5-b", "p5-c"],
    description: "차이나백 볼파이톤 암컷 2년령. 먹이 반응 좋음. CITES 부속서 II 서류 포함.",
    sellerId: "u2",
    status: "visible",
    lastTradePrice: 280000,
    lowestAsk: 310000,
    highestBid: 260000,
    likeCount: 198,
    tradeCount: 15,
    createdAt: "2026-06-22T10:00:00Z",
  },
  {
    id: "p6",
    name: "헤르만 육지거북 (5cm급 CB)",
    categoryId: "c7",
    brand: "독일 CB",
    condition: "sealed",
    images: ["p6-a", "p6-b"],
    description: "헤르만 육지거북 5cm급 CB개체. 건강 검진 완료. 검역증 포함.",
    sellerId: "u4",
    status: "visible",
    lastTradePrice: 95000,
    lowestAsk: 110000,
    highestBid: 88000,
    likeCount: 83,
    tradeCount: 29,
    createdAt: "2026-06-26T10:00:00Z",
  },
  {
    id: "p7",
    name: "엘로에 디코토마 (나무알로에 대품)",
    categoryId: "c4",
    brand: "남아공 직수입",
    condition: "like-new",
    images: ["p7-a", "p7-b"],
    description: "나무알로에(엘로에 디코토마) 50cm급 대품. 분갈이 완료. 희귀 괴근식물.",
    sellerId: "u4",
    status: "visible",
    lastTradePrice: 550000,
    lowestAsk: 620000,
    highestBid: 510000,
    likeCount: 271,
    tradeCount: 8,
    createdAt: "2026-06-21T10:00:00Z",
  },
  {
    id: "p8",
    name: "알비노 볼파이톤 (수컷)",
    categoryId: "c10",
    brand: "국내 브리딩",
    condition: "used",
    images: ["p8-a", "p8-b"],
    description: "알비노 모프 볼파이톤 수컷 3년령. 건강 상태 양호. CITES 서류 포함.",
    sellerId: "u2",
    status: "visible",
    lastTradePrice: 350000,
    lowestAsk: 390000,
    highestBid: 320000,
    likeCount: 147,
    tradeCount: 6,
    createdAt: "2026-06-19T10:00:00Z",
  },
  {
    id: "p9",
    name: "알비노 슈가글라이더 (쌍)",
    categoryId: "c11",
    brand: "국내 브리딩",
    condition: "sealed",
    images: ["p9-a", "p9-b"],
    description: "알비노 슈가글라이더 암수 한 쌍. 핸들링 가능 개체. 건강 검진 완료.",
    sellerId: "u3",
    status: "visible",
    lastTradePrice: 480000,
    lowestAsk: 550000,
    highestBid: 450000,
    likeCount: 389,
    tradeCount: 11,
    createdAt: "2026-06-29T10:00:00Z",
  },
  {
    id: "p10",
    name: "에우포르비아 오베사 (무늬종)",
    categoryId: "c4",
    brand: "일본산",
    condition: "box-damaged",
    images: ["p10-a", "p10-b"],
    description: "에우포르비아 오베사 무늬종 희귀 개체. 상태 양호, 화분 손상 있음.",
    sellerId: "u2",
    status: "hidden",
    lastTradePrice: 220000,
    lowestAsk: 260000,
    highestBid: 200000,
    likeCount: 94,
    tradeCount: 4,
    createdAt: "2026-06-18T10:00:00Z",
  },
];

// ---- 구매입찰 ----
export const bids: Bid[] = [
  { id: "b1", productId: "p1", userId: "u-user", price: 310000, expirationDays: 7,  createdAt: "2026-07-01T08:00:00Z", status: "open" },
  { id: "b2", productId: "p1", userId: "u4",     price: 300000, expirationDays: 3,  createdAt: "2026-07-01T07:00:00Z", status: "open" },
  { id: "b3", productId: "p1", userId: "u3",     price: 290000, expirationDays: 14, createdAt: "2026-06-30T07:00:00Z", status: "open" },
  { id: "b4", productId: "p2", userId: "u-user", price: 78000,  expirationDays: 7,  createdAt: "2026-07-01T06:00:00Z", status: "open" },
  { id: "b5", productId: "p9", userId: "u-user", price: 450000, expirationDays: 2,  createdAt: "2026-07-01T05:00:00Z", status: "open" },
];

// ---- 판매입찰 ----
export const asks: Ask[] = [
  { id: "a1", productId: "p1", userId: "u2",     price: 350000, expirationDays: 30, createdAt: "2026-06-30T08:00:00Z", status: "open" },
  { id: "a2", productId: "p1", userId: "u4",     price: 370000, expirationDays: 14, createdAt: "2026-06-29T08:00:00Z", status: "open" },
  { id: "a3", productId: "p2", userId: "u2",     price: 95000,  expirationDays: 30, createdAt: "2026-06-28T08:00:00Z", status: "open" },
  { id: "a4", productId: "p9", userId: "u3",     price: 550000, expirationDays: 30, createdAt: "2026-06-27T08:00:00Z", status: "open" },
];

// ---- 거래 체결 내역 ----
export const trades: Trade[] = [
  { id: "t1", productId: "p1", price: 320000, createdAt: "2026-06-29T12:00:00Z" },
  { id: "t2", productId: "p1", price: 310000, createdAt: "2026-06-25T12:00:00Z" },
  { id: "t3", productId: "p1", price: 335000, createdAt: "2026-06-20T12:00:00Z" },
  { id: "t4", productId: "p2", price: 85000,  createdAt: "2026-06-28T12:00:00Z" },
  { id: "t5", productId: "p9", price: 480000, createdAt: "2026-06-29T12:00:00Z" },
];

// ---- 주문 ----
export const orders: Order[] = [
  { id: "o1", productId: "p2", userId: "u-user", side: "buy", price: 95000,  status: "completed", createdAt: "2026-06-28T12:00:00Z" },
  { id: "o2", productId: "p5", userId: "u-user", side: "buy", price: 310000, status: "shipping",  createdAt: "2026-06-30T12:00:00Z" },
  { id: "o3", productId: "p7", userId: "u-user", side: "buy", price: 620000, status: "pending",   createdAt: "2026-07-01T12:00:00Z" },
];

// ---- 커뮤니티 게시물 ----
export const posts: CommunityPost[] = [
  {
    id: "post1",
    userId: "u2",
    images: ["post1-a", "post1-b"],
    content: "드디어 알보 바리에가타 분갈이 완료! 무늬 고착 확인 🌿 뿌리 상태 최상",
    hashtags: ["몬스테라알보", "희귀식물", "분갈이"],
    likeCount: 1024,
    commentCount: 3,
    status: "visible",
    createdAt: "2026-07-01T09:00:00Z",
  },
  {
    id: "post2",
    userId: "u3",
    images: ["post2-a"],
    content: "슈퍼설 게코 신생 개체 부화 성공! 색감 진짜 예쁘다...",
    hashtags: ["레오파드게코", "슈퍼설", "부화성공"],
    likeCount: 640,
    commentCount: 2,
    status: "visible",
    createdAt: "2026-06-30T09:00:00Z",
  },
  {
    id: "post3",
    userId: "u4",
    images: ["post3-a", "post3-b", "post3-c"],
    content: "사육장 리모델링 완료. 테라리움 세팅에 이 맛에 파충류 키웁니다.",
    hashtags: ["테라리움", "사육장세팅", "파충류"],
    likeCount: 388,
    commentCount: 1,
    status: "visible",
    createdAt: "2026-06-29T09:00:00Z",
  },
  {
    id: "post4",
    userId: "u2",
    images: ["post4-a"],
    content: "안스리움 수집 현황 공유. 아마조니카 잎 전개 중.",
    hashtags: ["안스리움", "희귀식물", "잎전개"],
    likeCount: 205,
    commentCount: 0,
    status: "hidden",
    createdAt: "2026-06-28T09:00:00Z",
  },
];

// ---- 댓글 ----
export const comments: Comment[] = [
  { id: "cm1", postId: "post1", userId: "u-user", content: "와 무늬 고착 비율 미쳤다...", createdAt: "2026-07-01T10:00:00Z" },
  { id: "cm2", postId: "post1", userId: "u4",     content: "분갈이 흙 배합 어떻게 하셨나요?", createdAt: "2026-07-01T10:30:00Z" },
  { id: "cm3", postId: "post1", userId: "u3",     content: "부럽습니다 👏", createdAt: "2026-07-01T11:00:00Z" },
  { id: "cm4", postId: "post2", userId: "u-user", content: "슈퍼설 분양 예정 있나요?", createdAt: "2026-06-30T10:00:00Z" },
  { id: "cm5", postId: "post2", userId: "u4",     content: "색감 진짜 희귀하네요", createdAt: "2026-06-30T11:00:00Z" },
  { id: "cm6", postId: "post3", userId: "u2",     content: "테라리움 세팅 너무 예뻐요!", createdAt: "2026-06-29T10:00:00Z" },
];

// ---- 신고 ----
export const reports: Report[] = [
  { id: "r1", targetType: "product", targetId: "p10", targetLabel: "에우포르비아 오베사 무늬종", reason: "허위 개체 의심", reporterId: "u-user", status: "pending", createdAt: "2026-07-01T13:00:00Z" },
  { id: "r2", targetType: "post",    targetId: "post4", targetLabel: "안스리움 게시물", reason: "스팸/광고성", reporterId: "u4", status: "pending", createdAt: "2026-06-30T13:00:00Z" },
  { id: "r3", targetType: "user",    targetId: "u3",    targetLabel: "다육이집사", reason: "거래 후 연락 두절", reporterId: "u2", status: "resolved", createdAt: "2026-06-25T13:00:00Z" },
];

// ================= 라이브 경매 =================

// ---- 경매 상품 ----
export const auctionItems: AuctionItem[] = [
  // live1 (진행중 — 식물사냥꾼) 상품 5개
  { id: "ai1",  sellerId: "u-user", name: "몬스테라 알보 바리에가타 (고착 무늬)", description: "라이브 단독 특가. 뿌리 양호.", categoryId: "c1",  image: "p1-a", startPrice: 200000, bidUnit: 10000, buyNowPrice: 400000, status: "sold",    suspended: false, currentPrice: 320000, winnerName: "파충류마스터", finalPrice: 320000, createdAt: "2026-07-12T09:00:00Z" },
  { id: "ai2",  sellerId: "u-user", name: "필로덴드론 글로리오숨 (L사이즈)",     description: "벨벳 잎 L사이즈, 뿌리 건강.",  categoryId: "c1",  image: "p3-a", startPrice: 80000,  bidUnit: 5000,  buyNowPrice: 180000, status: "live",    suspended: false, currentPrice: 105000, winnerName: null, finalPrice: null, createdAt: "2026-07-12T09:05:00Z" },
  { id: "ai3",  sellerId: "u-user", name: "아글라오네마 레드 스타 (희귀 무늬)",   description: "레드 무늬 희귀 개체.",          categoryId: "c1",  image: "p2-a", startPrice: 60000,  bidUnit: 3000,  buyNowPrice: null,   status: "waiting", suspended: true,  currentPrice: 60000,  winnerName: null, finalPrice: null, createdAt: "2026-07-12T09:10:00Z" },
  { id: "ai4",  sellerId: "u-user", name: "호야 오블로바타 (무늬종)",              description: "무늬 호야 희귀 개체.",           categoryId: "c1",  image: "p1-b", startPrice: 45000,  bidUnit: 3000,  buyNowPrice: 90000,  status: "waiting", suspended: false, currentPrice: 45000,  winnerName: null, finalPrice: null, createdAt: "2026-07-12T09:15:00Z" },
  { id: "ai5",  sellerId: "u-user", name: "분갈이용 나무껍질 믹스 5L",             description: "희귀식물 전용 배합 흙.",         categoryId: "c14", image: "au5",  startPrice: 15000,  bidUnit: 1000,  buyNowPrice: 35000,  status: "waiting", suspended: false, currentPrice: 15000,  winnerName: null, finalPrice: null, createdAt: "2026-07-12T09:20:00Z" },

  // live2 (진행중 — 파충류마스터) 상품 4개
  { id: "ai6",  sellerId: "u2", name: "레오파드게코 슈퍼설 CB (암컷)",     description: "고품질 CB 개체. CITES 서류 포함.", categoryId: "c8",  image: "p4-a", startPrice: 120000, bidUnit: 5000,  buyNowPrice: 250000, status: "live",    suspended: false, currentPrice: 155000, winnerName: null, finalPrice: null, createdAt: "2026-07-13T09:00:00Z" },
  { id: "ai7",  sellerId: "u2", name: "크레스티드게코 달마시안 모프",       description: "달마 모프 건강 개체.",              categoryId: "c8",  image: "p5-a", startPrice: 80000,  bidUnit: 3000,  buyNowPrice: 160000, status: "waiting", suspended: false, currentPrice: 80000,  winnerName: null, finalPrice: null, createdAt: "2026-07-13T09:05:00Z" },
  { id: "ai8",  sellerId: "u2", name: "볼파이톤 파이볼 모프 (수컷)",        description: "파이볼 희귀 모프.",                 categoryId: "c10", image: "au8",  startPrice: 250000, bidUnit: 10000, buyNowPrice: 500000, status: "waiting", suspended: false, currentPrice: 250000, winnerName: null, finalPrice: null, createdAt: "2026-07-13T09:10:00Z" },
  { id: "ai9",  sellerId: "u2", name: "테라리움 완성 세트 (60cm)",          description: "파충류 전용 60cm 테라리움.",        categoryId: "c14", image: "au9",  startPrice: 80000,  bidUnit: 5000,  buyNowPrice: 180000, status: "waiting", suspended: false, currentPrice: 80000,  winnerName: null, finalPrice: null, createdAt: "2026-07-13T09:15:00Z" },

  // live3 (예정 — 레어팜브리더) 상품 3개
  { id: "ai10", sellerId: "u4", name: "헤르만 육지거북 CB 쌍",              description: "암수 한 쌍. 검역증 포함.",            categoryId: "c7",  image: "p6-a", startPrice: 150000, bidUnit: 10000, buyNowPrice: 300000, status: "waiting", suspended: false, currentPrice: 150000, winnerName: null, finalPrice: null, createdAt: "2026-07-14T09:00:00Z" },
  { id: "ai11", sellerId: "u4", name: "카멜레온 팬서 (수컷 발색 개체)",     description: "발색 완성 수컷. CITES 포함.",         categoryId: "c9",  image: "au11", startPrice: 300000, bidUnit: 10000, buyNowPrice: null,   status: "waiting", suspended: false, currentPrice: 300000, winnerName: null, finalPrice: null, createdAt: "2026-07-14T09:05:00Z" },
  { id: "ai12", sellerId: "u4", name: "블루텅 스킨크 (인도네시안 CB)",      description: "블루텅 CB 건강 개체.",                categoryId: "c8",  image: "au12", startPrice: 200000, bidUnit: 10000, buyNowPrice: 400000, status: "waiting", suspended: false, currentPrice: 200000, winnerName: null, finalPrice: null, createdAt: "2026-07-14T09:10:00Z" },

  // live4 (예정 — 식물사냥꾼) 상품 3개
  { id: "ai13", sellerId: "u-user", name: "알비노 슈가글라이더 쌍",          description: "알비노 암수 한 쌍.",                   categoryId: "c11", image: "p8-a", startPrice: 350000, bidUnit: 10000, buyNowPrice: 650000, status: "waiting", suspended: false, currentPrice: 350000, winnerName: null, finalPrice: null, createdAt: "2026-07-15T09:00:00Z" },
  { id: "ai14", sellerId: "u-user", name: "엘로에 디코토마 (나무알로에 소품)", description: "15cm급 소품. 희귀 괴근식물.",          categoryId: "c4",  image: "p10-a",startPrice: 120000, bidUnit: 5000,  buyNowPrice: 250000, status: "waiting", suspended: false, currentPrice: 120000, winnerName: null, finalPrice: null, createdAt: "2026-07-15T09:05:00Z" },
  { id: "ai15", sellerId: "u-user", name: "희귀 다육 랜덤박스 (S급 보장)",   description: "S급 희귀 다육 1종 이상 보장.",          categoryId: "c2",  image: "au15", startPrice: 20000,  bidUnit: 2000,  buyNowPrice: 45000,  status: "waiting", suspended: false, currentPrice: 20000,  winnerName: null, finalPrice: null, createdAt: "2026-07-15T09:10:00Z" },

  // live5 (종료 — 식물사냥꾼) 상품 4개
  { id: "ai16", sellerId: "u-user", name: "몬스테라 알보 스탠다드 무늬",     description: "미개봉.",                              categoryId: "c1",  image: "p2-a", startPrice: 150000, bidUnit: 5000,  buyNowPrice: 300000, status: "sold",    suspended: false, currentPrice: 220000, winnerName: "희귀생물수집가", finalPrice: 220000, createdAt: "2026-07-05T09:00:00Z" },
  { id: "ai17", sellerId: "u-user", name: "호야 희귀 3종 세트",              description: "무늬 호야 3종 일괄.",                  categoryId: "c1",  image: "au17", startPrice: 30000,  bidUnit: 2000,  buyNowPrice: null,   status: "sold",    suspended: false, currentPrice: 55000,  winnerName: "레어팜브리더", finalPrice: 55000, createdAt: "2026-07-05T09:05:00Z" },
  { id: "ai18", sellerId: "u-user", name: "아가베 특선 3종 세트",             description: "희귀 아가베 3종.",                     categoryId: "c2",  image: "au18", startPrice: 60000,  bidUnit: 3000,  buyNowPrice: 130000, status: "failed",  suspended: false, currentPrice: 60000,  winnerName: null, finalPrice: null, createdAt: "2026-07-05T09:10:00Z" },
  { id: "ai19", sellerId: "u-user", name: "안스리움 컬렉션 5종",              description: "희귀 안스리움 5종 일괄.",              categoryId: "c1",  image: "au19", startPrice: 200000, bidUnit: 10000, buyNowPrice: 420000, status: "sold",    suspended: false, currentPrice: 350000, winnerName: "다육이집사", finalPrice: 350000, createdAt: "2026-07-05T09:15:00Z" },

  // live6 (종료 — 파충류마스터) 상품 3개
  { id: "ai20", sellerId: "u2", name: "레오파드게코 5종 일괄",               description: "인기 모프 5종 일괄 경매.",             categoryId: "c8",  image: "p4-a", startPrice: 300000, bidUnit: 10000, buyNowPrice: 600000, status: "sold",    suspended: false, currentPrice: 420000, winnerName: "희귀생물수집가", finalPrice: 420000, createdAt: "2026-06-28T09:00:00Z" },
  { id: "ai21", sellerId: "u2", name: "크레스티드게코 파이어워터 모프",       description: "희귀 파이어워터 모프.",                 categoryId: "c8",  image: "au21", startPrice: 180000, bidUnit: 5000,  buyNowPrice: null,   status: "failed",  suspended: false, currentPrice: 180000, winnerName: null, finalPrice: null, createdAt: "2026-06-28T09:05:00Z" },
  { id: "ai22", sellerId: "u2", name: "볼파이톤 컬렉션 3종",                  description: "희귀 모프 볼파이톤 3종 일괄.",         categoryId: "c10", image: "p5-a", startPrice: 400000, bidUnit: 20000, buyNowPrice: 800000, status: "sold",    suspended: false, currentPrice: 620000, winnerName: "식물사냥꾼", finalPrice: 620000, createdAt: "2026-06-28T09:10:00Z" },

  // live7 (종료 — 레어팜브리더) 상품 3개
  { id: "ai23", sellerId: "u4", name: "헤르만 육지거북 CITES 개체",           description: "CITES 부속서 II 서류 포함.",           categoryId: "c7",  image: "p6-a", startPrice: 500000, bidUnit: 20000, buyNowPrice: 1000000, status: "sold",   suspended: false, currentPrice: 780000, winnerName: "파충류마스터", finalPrice: 780000, createdAt: "2026-06-20T09:00:00Z" },
  { id: "ai24", sellerId: "u4", name: "카멜레온 미니 팬서 2종",               description: "소형 팬서 2종 일괄.",                  categoryId: "c9",  image: "au24", startPrice: 250000, bidUnit: 10000, buyNowPrice: 500000, status: "sold",    suspended: false, currentPrice: 380000, winnerName: "레어팜초보", finalPrice: 380000, createdAt: "2026-06-20T09:05:00Z" },
  { id: "ai25", sellerId: "u4", name: "파충류 먹이 패키지 (1개월분)",          description: "귀뚜라미 + 밀웜 혼합 1개월분.",       categoryId: "c15", image: "au25", startPrice: 30000,  bidUnit: 2000,  buyNowPrice: 60000,  status: "failed",  suspended: false, currentPrice: 30000,  winnerName: null, finalPrice: null, createdAt: "2026-06-20T09:10:00Z" },

  // live8 (진행중 — 레어팜브리더) 심야 라이브
  { id: "ai26", sellerId: "u4", name: "야행성 희귀 도마뱀 레드아이 크록",     description: "야간 라이브 한정 특가.", categoryId: "c8",  image: "au9",  startPrice: 150000, bidUnit: 5000,  buyNowPrice: 300000, status: "live",    suspended: false, currentPrice: 178000, winnerName: null, finalPrice: null, createdAt: "2026-07-17T09:00:00Z" },
  { id: "ai27", sellerId: "u4", name: "희귀 괴근식물 랜덤 스페셜 에디션",      description: "야간 라이브 단독. 넘버링 포함.", categoryId: "c4",  image: "au12", startPrice: 80000,  bidUnit: 3000,  buyNowPrice: 180000, status: "waiting", suspended: false, currentPrice: 80000,  winnerName: null, finalPrice: null, createdAt: "2026-07-17T09:05:00Z" },
];

// ---- 라이브 경매 방송 ----
export const liveAuctions: LiveAuction[] = [
  { id: "live1", sellerId: "u-user", title: "식물사냥꾼의 희귀식물 심야 라이브 경매",         platform: "youtube",   videoUrl: "https://www.youtube.com/watch?v=jfKfPfyJRdk",     itemIds: ["ai1","ai2","ai3","ai4","ai5"],       currentItemIndex: 1, scheduledAt: "2026-07-16T11:00:00Z", status: "live",      viewers: 342, createdAt: "2026-07-12T09:00:00Z", couponIds: ["lc1","lc2"] },
  { id: "live2", sellerId: "u2",     title: "파충류마스터의 게코 & 볼파이톤 단독 라이브",     platform: "youtube",   videoUrl: "https://www.youtube.com/watch?v=5qap5aO4i9A",     itemIds: ["ai6","ai7","ai8","ai9"],             currentItemIndex: 0, scheduledAt: "2026-07-16T10:30:00Z", status: "live",      viewers: 187, createdAt: "2026-07-13T09:00:00Z" },
  { id: "live3", sellerId: "u4",     title: "레어팜브리더 거북이 & 카멜레온 경매 라이브",     platform: "youtube",   videoUrl: "https://www.youtube.com/watch?v=21X5lGlDOfg",     itemIds: ["ai10","ai11","ai12"],                currentItemIndex: 0, scheduledAt: "2026-07-17T12:00:00Z", status: "scheduled", viewers: 0,   createdAt: "2026-07-14T09:00:00Z" },
  { id: "live4", sellerId: "u-user", title: "주말 밤 희귀 동식물 복불복 랜덤박스 라이브",     platform: "instagram", videoUrl: "https://www.instagram.com/rarefarm_kr/live",      itemIds: ["ai13","ai14","ai15"],                currentItemIndex: 0, scheduledAt: "2026-07-19T12:00:00Z", status: "scheduled", viewers: 0,   createdAt: "2026-07-15T09:00:00Z" },
  { id: "live5", sellerId: "u-user", title: "7월 첫째주 희귀식물 정리 라이브",                platform: "youtube",   videoUrl: "https://www.youtube.com/watch?v=jfKfPfyJRdk",     itemIds: ["ai16","ai17","ai18","ai19"],         currentItemIndex: 3, scheduledAt: "2026-07-05T12:00:00Z", status: "ended",     viewers: 264, createdAt: "2026-07-04T09:00:00Z" },
  { id: "live6", sellerId: "u2",     title: "파충류마스터 컬렉션 대방출 라이브",              platform: "youtube",   videoUrl: "https://www.youtube.com/watch?v=5qap5aO4i9A",     itemIds: ["ai20","ai21","ai22"],                currentItemIndex: 2, scheduledAt: "2026-06-28T12:00:00Z", status: "ended",     viewers: 198, createdAt: "2026-06-27T09:00:00Z" },
  { id: "live7", sellerId: "u4",     title: "레어팜브리더 희귀 파충류 창고 대개방 라이브",    platform: "instagram", videoUrl: "https://www.instagram.com/rarefarm_kr/live",      itemIds: ["ai23","ai24","ai25"],                currentItemIndex: 2, scheduledAt: "2026-06-20T12:00:00Z", status: "ended",     viewers: 451, createdAt: "2026-06-19T09:00:00Z" },
  { id: "live8", sellerId: "u4",     title: "레어팜브리더 야심야 희귀 도마뱀 라이브 경매",    platform: "youtube",   videoUrl: "https://www.youtube.com/watch?v=DWcJFNfaw9c",     itemIds: ["ai26","ai27"],                       currentItemIndex: 0, scheduledAt: "2026-07-17T09:00:00Z", status: "live",      viewers: 98,  createdAt: "2026-07-17T09:00:00Z" },
];

// ---- 경매 입찰 기록 ----
export const auctionBids: AuctionBid[] = [
  { id: "ab1", liveId: "live1", itemId: "ai2", userId: null, bidderName: "파충류마스터",  price: 88000,  createdAt: "2026-07-16T11:20:00Z" },
  { id: "ab2", liveId: "live1", itemId: "ai2", userId: null, bidderName: "다육이집사",    price: 96000,  createdAt: "2026-07-16T11:22:00Z" },
  { id: "ab3", liveId: "live1", itemId: "ai2", userId: null, bidderName: "레어팜브리더",  price: 100000, createdAt: "2026-07-16T11:24:00Z" },
  { id: "ab4", liveId: "live1", itemId: "ai2", userId: null, bidderName: "파충류마스터",  price: 105000, createdAt: "2026-07-16T11:26:00Z" },
  { id: "ab5", liveId: "live2", itemId: "ai6", userId: null, bidderName: "식물사냥꾼",    price: 130000, createdAt: "2026-07-16T11:10:00Z" },
  { id: "ab6", liveId: "live2", itemId: "ai6", userId: null, bidderName: "레어팜초보",    price: 143000, createdAt: "2026-07-16T11:15:00Z" },
  { id: "ab7", liveId: "live2", itemId: "ai6", userId: null, bidderName: "다육이집사",    price: 155000, createdAt: "2026-07-16T11:21:00Z" },
  // 구매자 테스트 계정의 지난 경매 참여 기록
  { id: "ab8",  liveId: "live5", itemId: "ai16", userId: "u-buyer", bidderName: "희귀생물수집가", price: 220000, createdAt: "2026-07-05T12:30:00Z" },
  { id: "ab9",  liveId: "live5", itemId: "ai19", userId: "u-buyer", bidderName: "희귀생물수집가", price: 310000, createdAt: "2026-07-05T13:00:00Z" },
  { id: "ab10", liveId: "live6", itemId: "ai20", userId: "u-buyer", bidderName: "희귀생물수집가", price: 420000, createdAt: "2026-06-28T12:40:00Z" },
];

// ---- 라이브 경매 쿠폰 (판매자 발급 원본) ----
export const liveCoupons: LiveCoupon[] = [
  { id: "lc1", sellerId: "u-user", name: "라이브 첫 참여 환영 쿠폰",     discountType: "fixed",   discountValue: 5000, minOrderAmount: 30000,                         expiryDays: 30, totalCount: 100, issuedCount: 12, createdAt: "2026-07-12T09:00:00Z" },
  { id: "lc2", sellerId: "u-user", name: "레어팜 라이브 10% 할인 쿠폰",  discountType: "percent", discountValue: 10,   minOrderAmount: 50000, maxDiscount: 30000,    expiryDays: 14,                  issuedCount: 34, createdAt: "2026-07-12T09:00:00Z" },
];

// ---- 사용자에게 발급된 라이브 경매 쿠폰 ----
export const userLiveCoupons: UserLiveCoupon[] = [];

// ---- 메인 슬라이드 배너 ----
export const banners: Banner[] = [
  {
    id: "bn1",
    imageUrl: "https://images.unsplash.com/photo-1518335935020-cfd6580c1ab4?w=1400&q=80",
    title: "희귀 동식물의 성지, 레어팜",
    subtitle: "몬스테라 알보부터 볼파이톤까지, 오늘의 희귀 생물을 만나보세요",
    ctaText: "마켓 둘러보기",
    ctaLink: "/market",
    order: 1,
    isActive: true,
    createdAt: "2026-07-01T09:00:00Z",
  },
  {
    id: "bn2",
    imageUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=1400&q=80",
    title: "희귀 파충류 라이브 경매",
    subtitle: "게코 · 볼파이톤 · 카멜레온 한정 경매가 지금 진행 중",
    ctaText: "라이브 경매 보기",
    ctaLink: "/live-auction",
    order: 2,
    isActive: true,
    createdAt: "2026-07-01T09:05:00Z",
  },
  {
    id: "bn3",
    imageUrl: "https://images.unsplash.com/photo-1463936575829-25148e1db1b8?w=1400&q=80",
    title: "CITES 인증 거래 안심 마켓",
    subtitle: "정품 인증 · 혈통서 · 검역증으로 안전하게 거래하세요",
    ctaText: "커뮤니티 구경하기",
    ctaLink: "/community",
    order: 3,
    isActive: true,
    createdAt: "2026-07-01T09:10:00Z",
  },
];

// ---- 판매자 전환 신청 ----
export const sellerRequests: SellerRequest[] = [
  { id: "sr1", userId: "u5", name: "김초보", businessInfo: "개인 판매자 (사업자 준비 중)", reason: "희귀 파충류 브리딩 결과물을 레어팜에서 판매하고 싶습니다.", status: "pending", createdAt: "2026-07-14T09:00:00Z" },
];

// ================= 마이페이지 mock (구매자/판매자) =================

export const purchases: Purchase[] = [
  { id: "pu1", userId: "u-buyer", productName: "몬스테라 알보 스탠다드 무늬 (경매 낙찰)",   image: "p2-a", price: 220000, status: "delivered",  purchasedAt: "2026-07-06T09:00:00Z" },
  { id: "pu2", userId: "u-buyer", productName: "레오파드게코 5종 일괄 (경매 낙찰)",         image: "p4-a", price: 420000, status: "shipping",   purchasedAt: "2026-06-29T09:00:00Z" },
  { id: "pu3", userId: "u-buyer", productName: "볼파이톤 차이나백 암컷",                    image: "p5-a", price: 298000, status: "delivered",  purchasedAt: "2026-06-15T09:00:00Z" },
  { id: "pu4", userId: "u-buyer", productName: "알비노 슈가글라이더 쌍",                    image: "p8-a", price: 380000, status: "canceled",   purchasedAt: "2026-06-10T09:00:00Z" },
  { id: "pu5", userId: "u-buyer", productName: "헤르만 육지거북 CITES 개체 (경매 낙찰)",   image: "p6-a", price: 780000, status: "delivered",  purchasedAt: "2026-05-22T09:00:00Z" },
  { id: "pu6", userId: "u-user",  productName: "안스리움 컬렉션 5종 (경매 낙찰)",          image: "p1-a", price: 350000, status: "delivered",  purchasedAt: "2026-07-03T09:00:00Z" },
  { id: "pu7", userId: "u-user",  productName: "필로덴드론 글로리오숨 L사이즈",            image: "p3-a", price: 148000, status: "shipping",   purchasedAt: "2026-06-27T09:00:00Z" },
  { id: "pu8", userId: "u-user",  productName: "아가베 블루 차크라 대품",                  image: "p7-a", price: 88000,  status: "delivered",  purchasedAt: "2026-06-12T09:00:00Z" },
];

export const pointHistories: PointHistory[] = [
  { id: "pt1", userId: "u-buyer", amount: 11000,  reason: "구매 적립 (몬스테라 알보)",          createdAt: "2026-07-06T09:00:00Z" },
  { id: "pt2", userId: "u-buyer", amount: 21000,  reason: "구매 적립 (레오파드게코 5종)",        createdAt: "2026-06-29T09:00:00Z" },
  { id: "pt3", userId: "u-buyer", amount: -5000,  reason: "포인트 사용 (볼파이톤 차이나백)",    createdAt: "2026-06-15T09:00:00Z" },
  { id: "pt4", userId: "u-buyer", amount: 5000,   reason: "신규 가입 축하 적립금",               createdAt: "2026-06-01T09:00:00Z" },
];

export const coupons: Coupon[] = [
  { id: "cp1", userId: "u-buyer", name: "라이브 경매 첫 낙찰 축하 쿠폰",  discountLabel: "5,000원", expiresAt: "2026-08-31T14:59:00Z", used: false },
  { id: "cp2", userId: "u-buyer", name: "레어팜 여름 맞이 할인 쿠폰",     discountLabel: "10%",     expiresAt: "2026-07-31T14:59:00Z", used: false },
  { id: "cp3", userId: "u-buyer", name: "신규 가입 웰컴 쿠폰",            discountLabel: "3,000원", expiresAt: "2026-06-30T14:59:00Z", used: true  },
];

export const myReviews: MyReview[] = [
  { id: "rv1", userId: "u-buyer", productName: "몬스테라 알보 스탠다드 무늬", rating: 5, content: "라이브 경매로 시세보다 싸게 득템했어요. 포장도 꼼꼼하고 식물 상태 최상!", createdAt: "2026-07-08T09:00:00Z" },
  { id: "rv2", userId: "u-buyer", productName: "볼파이톤 차이나백 암컷",      rating: 4, content: "상태 양호해요. 배송이 조금 늦었지만 개체 상태 만족합니다.", createdAt: "2026-06-18T09:00:00Z" },
  { id: "rv3", userId: "u-buyer", productName: "헤르만 육지거북 CITES 개체",  rating: 5, content: "CITES 서류 완벽. 거북이 상태 건강해요. 최고의 거래였습니다.", createdAt: "2026-05-25T09:00:00Z" },
  { id: "rv4", userId: "u-user",  productName: "안스리움 컬렉션 5종",         rating: 5, content: "라이브에서 잎 상태 꼼꼼히 보여주셔서 믿고 낙찰받았습니다.", createdAt: "2026-07-05T09:00:00Z" },
  { id: "rv5", userId: "u-user",  productName: "아가베 블루 차크라 대품",     rating: 4, content: "상태 좋고 포장 꼼꼼해요. 재구매 의사 있습니다.", createdAt: "2026-06-14T09:00:00Z" },
];

// ---- 알림 ----
export const notifications: Notification[] = [
  { id: "n1", userId: "u-user", type: "bid",       message: "몬스테라 알보 바리에가타 구매입찰이 최저 판매가에 근접했습니다.", read: false, createdAt: "2026-07-01T14:00:00Z" },
  { id: "n2", userId: "u-user", type: "order",     message: "볼파이톤 차이나백 주문이 배송 중입니다.",                         read: false, createdAt: "2026-06-30T14:00:00Z" },
  { id: "n3", userId: "u-user", type: "community", message: "파충류마스터님이 회원님의 댓글에 좋아요를 눌렀습니다.", read: true, createdAt: "2026-06-29T14:00:00Z" },
];
