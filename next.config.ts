import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Website chạy sau CDN/proxy của Hostinger — khai báo tên miền hợp lệ
      // để form (đăng nhập, nộp bài…) không bị chặn vì lệch origin.
      allowedOrigins: [
        "stoic-ielts.online",
        "www.stoic-ielts.online",
        "wobridgeacademy.com",
        "www.wobridgeacademy.com",
        "wobridges.com",
        "www.wobridges.com",
        "*.hostingersite.com",
        "localhost:3000",
        // Đổi tên miền sau này chỉ cần thêm biến môi trường ALLOWED_ORIGINS
        // (nhiều tên miền cách nhau dấu phẩy), không phải sửa mã nguồn.
        ...(process.env.ALLOWED_ORIGINS ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      ],
    },
  },
};

export default nextConfig;
