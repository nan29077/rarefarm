# 키득마켓 (키덜트 득템 마켓)

키덜트 수집품을 사고팔고(KREAM 스타일 입찰/즉시거래), 사진 중심 커뮤니티까지 이용하는 MVP 앱입니다.
실제 API 없이 **mock data + localStorage**로 동작하며, 추후 API 연동이 쉽도록 **service layer**로 분리되어 있습니다.

## 실행 방법

```bash
npm install
npm run dev
# http://localhost:3000
```

빌드/실행:

```bash
npm run build && npm start
```

## 기술 스택

- Next.js 14 (App Router) · TypeScript · Tailwind CSS
- 아이콘: lucide-react (라인형 통일)
- 상태/데이터: localStorage 기반 mock 스토어 + `useSyncExternalStore`

## 테스트 계정

로그인 화면 하단의 **테스트 계정 바로 로그인** 버튼을 사용하세요.

| 구분 | 이메일 | 비밀번호 | 이동 |
|------|--------|----------|------|
| 관리자 | admin@kideuk.market | Admin1234! | `/admin` |
| 사용자 | user@kideuk.market | User1234! | 홈 |

로그인 상태는 localStorage에 저장되어 새로고침 후에도 유지됩니다.

## 레이아웃 정책

- **모바일**: 하단 고정 네비게이션(홈·마켓·판매·커뮤니티·마이). 콘텐츠는 `padding-bottom`으로 가림 방지.
- **PC(일반)**: 중앙 430px 앱 프레임 + 프레임 **오른쪽 세로 라인 아이콘 네비게이션**.
- **PC(관리자)**: `/admin` 전체 대시보드 + **오른쪽 세로 관리자 메뉴 고정**. 하단 네비 미사용.

## 주요 기능

- 인증: 이메일 로그인/회원가입, 소셜(카카오·네이버·Google) 버튼 **mock**, 테스트 계정
- 마켓: 카테고리 필터, 5종 정렬, 검색, 상품 카드
- 상품 상세: 이미지 슬라이더, 시세(최근/최저판매/최고입찰), mock 가격 그래프, 거래 체결 내역
- 거래(KREAM 스타일): 구매입찰/판매입찰(가격·마감일), 즉시구매/즉시판매 → 주문 생성, 체결 가능 표시
- 판매 등록: 카테고리·상태등급·희망가·이미지 업로드 mock
- 커뮤니티: 피드/인기/내 게시물 탭, 좋아요·댓글·공유·북마크·해시태그, 게시물 작성 mock
- 마이페이지: 내 입찰/판매/구매/관심상품/북마크, 설정, 로그아웃, 데모 초기화
- 관리자: 대시보드 통계, 회원/상품/거래/커뮤니티/신고 관리(상태 변경 mock), 설정
- 성인 상품군(에어소프트건): "성인 확인 필요", "관련 법규 준수 필요" 뱃지 표시

## 폴더 구조

```
src/
  app/                # 라우트 (홈, 마켓, 상품, 판매, 커뮤니티, 마이, 로그인, 관리자)
  components/
    common/           # Button, Badge, Card, Modal, Avatar, Placeholder, Icon 등
    layout/           # MobileShell, ResponsiveNav, AdminLayout, PageHeader
    product/          # ProductCard, ProductDetail, BidAskPanel, PriceChart
    community/        # PostCard, PostDetail, CommentList
    auth/             # LoginForm
    admin/            # AdminSidebar, AdminUI
    providers/        # AuthProvider, ToastProvider
  lib/                # mockData, store, auth, marketService, communityService, adminService, utils
  types/              # 공통 타입 정의
```

## 실제 API 연동 시 바꿔야 할 부분

모든 데이터 접근은 service layer를 거치므로, **아래 파일들의 내부 구현만 교체**하면 됩니다. UI는 수정 불필요.

- `src/lib/store.ts` — localStorage 스토어 → REST/GraphQL 클라이언트로 교체
- `src/lib/auth.ts` — `authService`의 이메일/소셜 로그인을 실제 서버 인증으로 교체.
  `socialProviders`의 각 `signIn()`에 카카오/네이버/Google **SDK·OAuth**를 붙이면 됨 (`// TODO` 주석 위치)
- `src/lib/marketService.ts` — 상품/입찰/주문 CRUD를 서버 API로 교체
- `src/lib/communityService.ts` — 게시물/댓글/좋아요를 서버 API로 교체
- `src/lib/adminService.ts` — 관리자 통계/상태 변경을 서버 API로 교체
- 이미지: 현재 `Placeholder`(gradient) 사용 → 실제 업로드/CDN URL로 교체
- 결제: 주문은 생성(mock)까지만. 실제 결제 PG 연동 필요

포인트 컬러는 보라색(`brand`, Tailwind에 정의)으로 일관 적용되어 있습니다.
