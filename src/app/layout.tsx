import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";

async function getSiteUrl() {
  const configuredUrl =
    process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL;

  if (configuredUrl) {
    try {
      return new URL(configuredUrl).origin;
    } catch {
      // 잘못된 환경 변수는 무시하고 실제 요청 주소를 사용한다.
    }
  }

  const requestHeaders = await headers();
  const host = (requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"))
    ?.split(",")[0]
    .trim();
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0].trim();
  const protocol =
    forwardedProtocol === "http" || forwardedProtocol === "https"
      ? forwardedProtocol
      : host?.startsWith("localhost") || host?.startsWith("127.0.0.1")
        ? "http"
        : "https";

  return host ? `${protocol}://${host}` : "http://localhost:3014";
}

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = await getSiteUrl();
  const shareImageUrl = new URL("/rarefarm-og.png", siteUrl).toString();

  return {
    metadataBase: new URL(siteUrl),
    title: "레어팜 | 희귀함을 발견하고, 함께 키우는 곳",
    description:
      "희귀식물·파충류·소동물 마켓부터 라이브 경매와 커뮤니티까지, 특별한 취향이 가치가 되는 희귀 동식물 전문 플랫폼.",
    applicationName: "레어팜",
    alternates: {
      canonical: siteUrl,
    },
    icons: {
      icon: "/레어팜_favicon_2a.png",
      shortcut: "/레어팜_favicon_2a.png",
      apple: "/레어팜_아이콘_2a.png",
    },
    openGraph: {
      title: "레어팜 | 희귀함을 발견하고, 함께 키우는 곳",
      description:
        "희귀식물·파충류·소동물 마켓부터 라이브 경매와 커뮤니티까지. 특별한 취향이 가치가 되는 희귀 동식물 전문 플랫폼.",
      type: "website",
      url: siteUrl,
      siteName: "레어팜",
      locale: "ko_KR",
      images: [
        {
          url: shareImageUrl,
          width: 1200,
          height: 630,
          type: "image/png",
          alt: "레어팜 - 희귀함을 발견하고, 함께 키우는 곳",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "레어팜 | 희귀함을 발견하고, 함께 키우는 곳",
      description:
        "희귀식물·파충류·소동물 마켓부터 라이브 경매와 커뮤니티까지. 특별한 취향이 가치가 되는 희귀 동식물 전문 플랫폼.",
      images: [shareImageUrl],
    },
  };
}

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
