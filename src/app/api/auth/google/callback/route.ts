import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { markVerifiedByProvider } from "@/lib/auth/email-verification";
import { createSession } from "@/lib/session";
import {
  STATE_COOKIE,
  fetchGoogleProfile,
  googleEnabled,
} from "@/lib/google-oauth";

function back(loi: string) {
  const base = process.env.APP_URL || "http://localhost:3000";
  return NextResponse.redirect(new URL(`/dang-nhap?loi=${loi}`, base));
}

export async function GET(request: NextRequest) {
  if (!googleEnabled()) return back("google-chua-cau-hinh");

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookieStore = await cookies();
  const saved = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  // Dùng một lần: thiếu, lệch, hoặc người dùng bấm Hủy đều dừng ở đây.
  if (!code || !state || !saved || state !== saved) return back("google-that-bai");

  let profile;
  try {
    profile = await fetchGoogleProfile(code);
  } catch {
    return back("google-that-bai");
  }

  // Google trả email chưa xác minh nghĩa là chủ nhân email đó CHƯA chứng minh
  // được mình sở hữu nó. Nhận vào là mở đường cho người khác chiếm tài khoản
  // cũ chỉ bằng cách khai email của nạn nhân.
  if (!profile.emailVerified) return back("google-email-chua-xac-minh");

  // Đã liên kết trước đó thì vào thẳng, đồng thời làm mới ảnh đại diện
  // nếu Google đã thay đổi ảnh. URL đã được whitelist ở fetchGoogleProfile.
  let user = await db.user.findUnique({ where: { googleId: profile.sub } });

  if (user) {
    user = await db.user.update({
      where: { id: user.id },
      data: { avatarUrl: profile.picture },
    });
  } else {
    const sameEmail = await db.user.findUnique({
      where: { email: profile.email },
    });

    if (sameEmail) {
      // Gộp vào tài khoản cũ — giữ nguyên lịch sử làm bài và cấp bậc. An toàn
      // vì Google đã xác minh email ở trên.
      user = await db.user.update({
        where: { id: sameEmail.id },
        data: { googleId: profile.sub, avatarUrl: profile.picture },
      });
    } else {
      user = await db.user.create({
        data: {
          email: profile.email,
          name: profile.name,
          googleId: profile.sub,
          avatarUrl: profile.picture,
          // Không có mật khẩu: tài khoản này chỉ vào bằng Google cho tới khi
          // tự đặt mật khẩu ở trang đổi mật khẩu.
          passwordHash: null,
          role: "STUDENT",
        },
      });
    }
  }

  if (!user.active) return back("tai-khoan-bi-khoa");

  // Google đã kiểm `email_verified` ở trên nên không cần gửi thêm thư nào.
  // Hàm này cũng tặng quà chào mừng, và tự chống tặng hai lần bằng khóa riêng.
  await markVerifiedByProvider(user.id);

  const sessionCreated = await createSession({
    userId: user.id,
    role: user.role === "ADMIN" ? "ADMIN" : "STUDENT",
  });
  if (!sessionCreated) return back("tai-khoan-bi-khoa");

  const base = process.env.APP_URL || "http://localhost:3000";
  return NextResponse.redirect(
    new URL(user.role === "ADMIN" ? "/quan-tri" : "/hoc-vien", base)
  );
}
