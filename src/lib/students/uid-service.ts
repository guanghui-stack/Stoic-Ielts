import "server-only";
import { randomInt } from "node:crypto";
import { db } from "@/lib/db";
import { generateUid, normalizeUid } from "@/lib/students/uid";

/** Số lần thử khi mã sinh ra trùng mã đã có. */
const MAX_ATTEMPTS = 8;

/**
 * Lấy mã UID của một học viên, cấp mới nếu chưa có.
 *
 * CẤP LƯỜI (lazy) chứ không chạy một lượt backfill: tài khoản cũ có thể rất
 * nhiều, và một vòng lặp cập nhật hàng loạt lúc khởi động máy chủ là đúng thứ
 * đã từng làm hỏng một lần triển khai. Ai mở trang cần tới mã thì được cấp
 * ngay tại đó, một hàng một lần.
 *
 * Va chạm mã được xử lý bằng RÀNG BUỘC UNIQUE của database chứ không bằng một
 * câu "kiểm tra rồi mới ghi": hai request cùng lúc đều thấy mã trống rồi cùng
 * ghi là chuyện có thật, và chỉ ràng buộc mới chặn được.
 */
export async function ensurePublicUid(userId: string): Promise<string | null> {
  const existing = await db.user.findUnique({
    where: { id: userId },
    select: { publicUid: true },
  });
  if (!existing) return null;
  if (existing.publicUid) return existing.publicUid;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidate = generateUid((maxExclusive) => randomInt(maxExclusive));
    try {
      const updated = await db.user.update({
        where: { id: userId },
        data: { publicUid: candidate },
        select: { publicUid: true },
      });
      return updated.publicUid;
    } catch {
      // Trùng mã hoặc một request khác vừa cấp mã trước. Đọc lại: nếu đã có mã
      // thì việc coi như xong, còn không thì bốc mã khác.
      const now = await db.user.findUnique({
        where: { id: userId },
        select: { publicUid: true },
      });
      if (now?.publicUid) return now.publicUid;
    }
  }

  // Hết lượt thử là chuyện gần như không xảy ra với 656 tỉ mã. Trả `null` để
  // trang vẫn dựng được — mã hiển thị là tiện ích, không phải thứ chặn đường.
  console.error("[wobridges] Khong cap duoc UID sau nhieu lan thu.");
  return null;
}

/** Tìm học viên theo mã UID. Trả `null` nếu chuỗi không có hình dạng UID. */
export async function findStudentByUid(raw: string) {
  const normalized = normalizeUid(raw);
  if (!normalized) return null;
  return db.user.findFirst({
    where: {
      publicUid: normalized,
      role: "STUDENT",
      active: true,
      isBot: false,
    },
    select: { id: true, name: true, email: true, publicUid: true, avatarUrl: true },
  });
}
