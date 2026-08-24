"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  destroySession,
  replacePasswordIfCurrentAndRevokeUserSessions,
  requireUser,
} from "@/lib/session";
import { sendVerificationEmail } from "@/lib/auth/email-verification";

export type AccountFormState = { error?: string; success?: string } | undefined;

/** Đọc band điểm từ form: rỗng → null; hợp lệ 0–9, bước 0.5. */
function parseBand(raw: FormDataEntryValue | null): number | null | "invalid" {
  const s = String(raw ?? "").trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0 || n > 9 || (n * 2) % 1 !== 0) return "invalid";
  return n;
}

/** Học viên cập nhật mục tiêu band điểm và ngày dự thi. */
export async function updateGoalsAction(
  _prev: AccountFormState,
  formData: FormData
): Promise<AccountFormState> {
  const user = await requireUser();

  const fields = [
    "targetOverall",
    "targetReading",
  ] as const;

  const data: Record<string, number | null | Date> = {};
  for (const f of fields) {
    const v = parseBand(formData.get(f));
    if (v === "invalid") {
      return { error: "Band điểm phải từ 0 đến 9, bước nhảy 0.5 (ví dụ 6.5)." };
    }
    data[f] = v;
  }

  const examRaw = String(formData.get("examDate") ?? "").trim();
  if (examRaw) {
    const d = new Date(`${examRaw}T00:00:00+07:00`);
    if (Number.isNaN(d.getTime())) return { error: "Ngày dự thi không hợp lệ." };
    data.examDate = d;
  } else {
    data.examDate = null;
  }

  await db.user.update({ where: { id: user.id }, data });
  revalidatePath("/hoc-vien");
  return { success: "Đã lưu mục tiêu của bạn." };
}

/** Người dùng (học viên hoặc admin) tự đổi mật khẩu của mình. */
export async function changePasswordAction(
  _prev: AccountFormState,
  formData: FormData
): Promise<AccountFormState> {
  const user = await requireUser();

  const current = String(formData.get("current") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  // Tai khoan chi dang nhap bang Google thi CHUA co mat khau nao de doi. Bat
  // nhap "mat khau hien tai" se khoa ho vinh vien khoi viec dat mat khau —
  // ho khong bao gio go dung mot chuoi khong ton tai.
  if (user.passwordHash !== null) {
    if (!(await bcrypt.compare(current, user.passwordHash))) {
      return { error: "Mật khẩu hiện tại không đúng." };
    }
  }
  if (password.length < 8) {
    return { error: "Mật khẩu mới cần tối thiểu 8 ký tự." };
  }
  if (password === current) {
    return { error: "Mật khẩu mới phải khác mật khẩu hiện tại." };
  }
  if (password !== confirm) {
    return { error: "Mật khẩu nhập lại không khớp." };
  }

  if (!user.activeSessionId) {
    await destroySession();
    return { error: "Phiên đăng nhập không còn hiệu lực. Vui lòng đăng nhập lại." };
  }

  const changed = await replacePasswordIfCurrentAndRevokeUserSessions({
    userId: user.id,
    passwordHash: await bcrypt.hash(password, 10),
    expectedPasswordHash: user.passwordHash,
    expectedActiveSessionId: user.activeSessionId,
  });
  if (!changed) {
    // Hash, trạng thái hoặc session đã đổi sau bước xác minh phía trên. Xóa
    // cookie cũ và tuyệt đối không ghi đè thay đổi vừa thắng race.
    await destroySession();
    return {
      error: "Tài khoản vừa thay đổi ở một phiên khác. Vui lòng đăng nhập lại.",
    };
  }
  await destroySession();

  return {
    success:
      "Đã đổi mật khẩu và đăng xuất các phiên cũ. Hãy đăng nhập lại bằng mật khẩu mới.",
  };
}

/**
 * Gửi lại thư xác minh.
 *
 * Chặn gửi dồn dập bằng chính bảng mã: mã mới nhất còn dưới hai phút thì bỏ
 * qua. Không dùng bộ đếm trong bộ nhớ — Hostinger khởi động lại mỗi lần triển
 * khai và bộ đếm đó sẽ về không, tức là chặn được đúng lúc không cần chặn.
 */
export async function resendVerificationAction(): Promise<void> {
  const user = await requireUser();

  const account = await db.user.findUnique({
    where: { id: user.id },
    select: { email: true, name: true, emailVerifiedAt: true },
  });
  if (!account || account.emailVerifiedAt) return;

  const recent = await db.emailVerification.findFirst({
    where: {
      userId: user.id,
      createdAt: { gt: new Date(Date.now() - 2 * 60 * 1000) },
    },
    select: { id: true },
  });
  if (recent) return;

  await sendVerificationEmail({
    userId: user.id,
    email: account.email,
    name: account.name,
  });
  revalidatePath("/hoc-vien");
}
