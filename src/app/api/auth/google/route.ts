import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { STATE_COOKIE, authorizeUrl, googleEnabled } from "@/lib/google-oauth";

/**
 * Bắt đầu đăng nhập Google.
 *
 * `state` là chuỗi ngẫu nhiên vừa gửi cho Google vừa cất vào cookie; lúc quay
 * về phải khớp. Thiếu bước này thì kẻ khác dựng được một liên kết khiến nạn
 * nhân vô tình đăng nhập vào TÀI KHOẢN CỦA KẺ ĐÓ, rồi mọi bài làm sau đó nằm
 * trong tay chúng.
 */
export async function GET() {
  if (!googleEnabled()) {
    return NextResponse.redirect(
      new URL("/dang-nhap?loi=google-chua-cau-hinh", process.env.APP_URL || "http://localhost:3000")
    );
  }

  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });

  return NextResponse.redirect(authorizeUrl(state));
}
