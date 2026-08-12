"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, destroySession } from "@/lib/session";
import { sendVerificationEmail } from "@/lib/auth/email-verification";

export type AuthState = { error?: string } | undefined;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { error: "Email này đã được đăng ký. Vui lòng đăng nhập." };

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await db.user.create({
    data: { email, name, passwordHash, role: "STUDENT" },
  });

  // Gửi thư xác minh rồi VẪN cho vào luôn. Xác minh là hàng rào cho quà chào
  // mừng, không phải hàng rào đăng nhập — chặn đăng nhập sẽ biến một trục trặc
  // SMTP thành sự cố "không ai vào được website".
  //
  // Không await kết quả gửi: SMTP có thể chậm vài giây, và không đáng để học
  // viên ngồi nhìn màn hình trắng. Hàm này đã tự nuốt mọi lỗi.
  await sendVerificationEmail({ userId: user.id, email, name });

  await createSession({ userId: user.id, role: "STUDENT" });
  redirect("/hoc-vien");
}

export async function loginAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = await db.user.findUnique({ where: { email } });

  if (!user) {
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
    return { error: "Tài khoản đã bị khóa. Vui lòng liên hệ trung tâm." };
  }

  await createSession({
    userId: user.id,
    role: user.role === "ADMIN" ? "ADMIN" : "STUDENT",
  });
  redirect(user.role === "ADMIN" ? "/quan-tri" : "/hoc-vien");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
