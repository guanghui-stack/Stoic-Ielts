"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { giftCoins } from "@/lib/payments/coin-service";
import { formatCoins } from "@/lib/payments/coins";

export type GiftCoinsState = { error?: string; success?: string } | undefined;

/**
 * Trần cho một lần tặng.
 *
 * Không phải vì sợ quản trị viên, mà vì gõ nhầm một số 0 là chuyện có thật:
 * 5.000 xu bằng năm triệu đồng nghĩa vụ, và xu đã vào ví thì không rút lại
 * được nếu học viên đã tiêu.
 */
const MAX_GIFT_PER_TIME = 1_000;

/**
 * Trung tâm tặng xu cho một học viên.
 *
 * Ghi `kind = GIFT` vào sổ cái, và trang doanh thu hiển thị nhóm này TÁCH HẲN
 * khỏi "đã thu" — xu tặng không có đồng tiền thật nào đối ứng.
 *
 * Mỗi lần bấm là một lần tặng thật (khóa ngẫu nhiên), khác hẳn quà chào mừng
 * vốn khóa theo `userId` để chỉ tặng một lần đời. Ở đây tặng nhiều lần là đúng
 * ý: hôm nay đền bù sự cố, tháng sau học phí đóng tại lớp.
 */
export async function giftCoinsAction(
  _prev: GiftCoinsState,
  formData: FormData
): Promise<GiftCoinsState> {
  const admin = await requireAdmin();

  const userId = String(formData.get("userId") ?? "").trim();
  const coins = Number.parseInt(String(formData.get("coins") ?? ""), 10);
  const reason = String(formData.get("reason") ?? "").trim();

  if (!userId) return { error: "Thiếu học viên." };
  if (!Number.isInteger(coins) || coins < 1) {
    return { error: "Số xu phải là số nguyên dương." };
  }
  if (coins > MAX_GIFT_PER_TIME) {
    return {
      error: `Một lần tặng tối đa ${formatCoins(MAX_GIFT_PER_TIME)}. Cần nhiều hơn thì tặng làm nhiều lần.`,
    };
  }
  if (reason.length < 5) {
    return {
      error: "Hãy ghi lý do (tối thiểu 5 ký tự) — sổ cái không có lý do thì vài tháng sau không ai đọc nổi.",
    };
  }

  const student = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true },
  });
  if (!student) return { error: "Không tìm thấy học viên này." };

  const result = await giftCoins({
    userId: student.id,
    coins,
    // Khóa ngẫu nhiên: mỗi lần bấm là một lần tặng riêng. Dùng khóa suy ra từ
    // (userId + số xu) sẽ khiến lần tặng thứ hai cùng số lặng lẽ không có tác
    // dụng — và không ai biết vì sao ví không tăng.
    giftKey: `ADMIN:${randomBytes(9).toString("hex")}`,
    note: `${reason} — do ${admin.email}`,
  });

  if (!result.ok) return { error: "Không tặng được. Vui lòng thử lại." };

  revalidatePath("/quan-tri/hoc-vien");
  revalidatePath("/quan-tri/thanh-toan");
  return {
    success: `Đã tặng ${formatCoins(coins)} cho ${student.name}. Ví còn ${formatCoins(result.balanceAfter)}.`,
  };
}
