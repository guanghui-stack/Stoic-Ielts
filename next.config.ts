import type { NextConfig } from "next";
import {
  buildAllowedOrigins,
  PRODUCTION_SECURITY_HEADERS,
} from "./src/lib/production-hardening.ts";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    serverActions: {
      // Website chạy sau CDN/proxy của Hostinger — khai báo tên miền hợp lệ
      // để form (đăng nhập, nộp bài…) không bị chặn vì lệch origin.
      allowedOrigins: buildAllowedOrigins(process.env.ALLOWED_ORIGINS ?? ""),
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [...PRODUCTION_SECURITY_HEADERS],
      },
    ];
  },
};

export default nextConfig;
