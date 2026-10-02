import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  images: {
    // WebP only: AVIF encoding of large photos takes seconds on first view.
    formats: ["image/webp"],
    qualities: [85, 92],
    localPatterns: [{ pathname: "/images/**" }, { pathname: "/media/**" }],
    deviceSizes: [640, 828, 1080, 1280, 1600, 1920, 2560],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return [{ source: "/calculator", destination: "/prices#calculator", permanent: false }];
  },
};

export default nextConfig;
