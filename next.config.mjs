/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://www.googleapis.com https://oauth2.googleapis.com",
      "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://www.instagram.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; ");
    return [{
      source: "/:path*",
      headers: [
        { key: "Content-Security-Policy", value: csp },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self)" },
        { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
        { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
      ],
    }];
  },
};
export default nextConfig;
