import { NextResponse, type NextRequest } from "next/server";
import { consumeVerificationToken } from "@/lib/auth/email-verification";
import { appUrl } from "@/lib/mailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Đích của liên kết trong thư xác minh.
 *
 * Là GET vì người dùng bấm từ hộp thư — không có cách nào gửi POST từ đó. Đổi
 * lại, mã dùng MỘT LẦN và hết hạn sau 24 giờ, nên một lượt quét liên kết của
 * phần mềm chống thư rác cũng chỉ tiêu mất mã chứ không mở được gì thêm.
 *
 * Luôn chuyển hướng về trang hồ sơ kèm mã kết quả, không bao giờ trả JSON thô:
 * người bấm là học viên, thứ họ cần thấy là một trang có chữ.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("ma") ?? "";
  const result = await consumeVerificationToken(token);

  const target = new URL("/hoc-vien", appUrl());
  if (result.ok) {
    target.searchParams.set("xac-minh", result.coinsGranted ? "xong" : "da-co");
  } else {
    target.searchParams.set("xac-minh", "loi");
    target.searchParams.set("vi-sao", result.reason);
  }

  return NextResponse.redirect(target);
}
