import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";

export const metadata: Metadata = {
  // 실제 도메인 확정 시 아래 URL 교체 (OG/트위터 이미지 절대경로 기준이 된다)
  metadataBase: new URL("https://rarefarm.kr"),
  title: "레어팜 — 희귀 동식물 거래 마켓",
  description:
    "희귀식물, 파충류, 소동물까지. 희귀 동식물을 사고팔고 교류하는 마켓 & 커뮤니티.",
  icons: {
    icon: "/레어팜_favicon_2a.png",
    shortcut: "/레어팜_favicon_2a.png",
    apple: "/레어팜_아이콘_2a.png",
  },
  openGraph: {
    title: "레어팜 — 희귀 동식물 거래 마켓",
    description: "희귀식물, 파충류, 소동물 등 희귀 동식물을 라이브 경매로 득템!",
    type: "website",
    siteName: "레어팜",
    locale: "ko_KR",
    images: [
      { url: "/레어팜_로고_2a_가로.png", width: 1200, height: 630, alt: "레어팜" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "레어팜 — 희귀 동식물 거래 마켓",
    description: "희귀식물, 파충류, 소동물 등 희귀 동식물을 라이브 경매로 득템!",
    images: ["/레어팜_로고_2a_가로.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#22c55e",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="antialiased">
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
