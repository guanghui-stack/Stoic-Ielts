"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, destroySession } from "@/lib/session";
import { sendVerificationEmail } from "@/lib/auth/email-verification";
import {
  buildLoginRateLimits,
  buildRegistrationRateLimits,
  checkAuthRateLimits,
  getAuthClientAddress,
  recordAuthFailures,
  reserveAuthRateLimits,
  settleSuccessfulLoginRateLimits,
} from "@/lib/auth-rate-limit";

export type AuthState = { error?: string } | undefined;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DUMMY_PASSWORD_HASH =
  "$2b$10$0UhlQqSLPAYwPJbVvyDK7.cmDRzQaBzYhknArome1D5S0GRlkCxzC";

function rateLimitError(retryAfterSeconds: number): AuthState {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return {
    error: `Bạn đã thử quá nhiều lần. Vui lòng thử lại sau khoảng ${minutes} phút.`,
  };
}

function hasPrismaCode(error: unknown, code: string): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === code
  );
}

export async function registerAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (name.length < 2) return { error: "Vui lòng nhập họ tên đầy đủ." };
  if (!EMAIL_RE.test(email)) return { error: "Địa chỉ email không hợp lệ." };
  if (password.length < 8) return { error: "Mật khẩu cần tối thiểu 8 ký tự." };
  if (password !== confirm) return { error: "Mật khẩu nhập lại không khớp." };

  const clientAddress = await getAuthClientAddress();
  const rateLimits = buildRegistrationRateLimits(email, clientAddress);
  const limitStatus = await checkAuthRateLimits(rateLimits);
  if (limitStatus.blocked) {
    return rateLimitError(limitStatus.retryAfterSeconds);
  }
  // Tính mọi yêu cầu đăng ký hợp lệ, kể cả email đã tồn tại. Nếu chỉ tính bản
  // ghi tạo thành công, bot có thể dò email miễn phí không giới hạn.
  await recordAuthFailures(rateLimits);
  const recordedStatus = await checkAuthRateLimits(rateLimits);
  if (recordedStatus.blocked) {
    return rateLimitError(recordedStatus.retryAfterSeconds);
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { error: "Email này đã được đăng ký. Vui lòng đăng nhập." };

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await db.user
    .create({
      data: { email, name, passwordHash, role: "STUDENT" },
    })
    .catch((error: unknown) => {
      // Hai request đồng thời có thể cùng vượt qua findUnique; unique index là
      // hàng rào cuối và phải trở thành lỗi biểu mẫu, không phải HTTP 500.
      if (hasPrismaCode(error, "P2002")) return null;
      throw error;
    });
  if (!user) {
    return { error: "Email này đã được đăng ký. Vui lòng đăng nhập." };
  }

  // Gửi thư xác minh rồi VẪN cho vào luôn. Xác minh là hàng rào cho quà chào
  // mừng, không phải hàng rào đăng nhập — chặn đăng nhập sẽ biến một trục trặc
  // SMTP thành sự cố "không ai vào được website".
  //
  // Không await kết quả gửi: SMTP có thể chậm vài giây, và không đáng để học
  // viên ngồi nhìn màn hình trắng. Hàm này đã tự nuốt mọi lỗi.
  await sendVerificationEmail({ userId: user.id, email, name });

  const sessionCreated = await createSession({
    userId: user.id,
    role: "STUDENT",
  });
  if (!sessionCreated) {
    return { error: "Tài khoản chưa thể đăng nhập. Vui lòng thử lại." };
  }
  redirect("/hoc-vien");
}

export async function loginAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const clientAddress = await getAuthClientAddress();
  const rateLimits = buildLoginRateLimits(email, clientAddress);
  const reservation = await reserveAuthRateLimits(rateLimits.targets);
  if (!reservation.allowed) {
    return rateLimitError(reservation.retryAfterSeconds);
  }

  const user = await db.user.findUnique({ where: { email } });

  if (!user) {
    // Giữ thời gian phản hồi gần với tài khoản thật để không biến endpoint
    // thành công cụ dò danh sách email đã đăng ký.
    await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
    return { error: "Email hoặc mật khẩu không đúng." };
  }

  // Tai khoan tao bang Google chua co mat khau. Noi thang de hoc vien biet
  // duong nao dung, thay vi de ho go lai mot mat khau khong ton tai.
  if (user.passwordHash === null) {
    return {
      error:
        "Tài khoản này đăng nhập bằng Google. Bạn bấm nút Đăng nhập với Google bên dưới nhé.",
    };
  }

  if (!(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "Email hoặc mật khẩu không đúng." };
  }
  if (!user.active) {
    await settleSuccessfulLoginRateLimits(rateLimits);
    return { error: "Tài khoản đã bị khóa. Vui lòng liên hệ trung tâm." };
  }

  const sessionCreated = await createSession(
    {
      userId: user.id,
      role: user.role === "ADMIN" ? "ADMIN" : "STUDENT",
    },
    { expectedPasswordHash: user.passwordHash }
  );
  if (!sessionCreated) {
    await settleSuccessfulLoginRateLimits(rateLimits);
    return {
      error: "Thông tin đăng nhập vừa thay đổi. Vui lòng đăng nhập lại.",
    };
  }
  await settleSuccessfulLoginRateLimits(rateLimits);
  redirect(user.role === "ADMIN" ? "/quan-tri" : "/hoc-vien");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
