import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { lookupDefinition, lookupSynonyms } from "@/lib/dictionary/service";
import { readDictionaryConfig } from "@/lib/dictionary/config";

/**
 * Tra từ vựng.
 *
 *   GET /api/tu-dien?tu=resilience            → định nghĩa
 *   GET /api/tu-dien?tu=resilience&loai=dong-nghia → từ đồng nghĩa
 *
 * CHẶN KHI ĐANG THI, ở TẦNG MÁY CHỦ chứ không chỉ ẩn nút. Phím tắt sẽ không
 * gắn vào phòng thi, nhưng ẩn giao diện không phải là chặn: học viên mở tab
 * khác gọi thẳng địa chỉ này là xong. Đây mới là chỗ chặn thật.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Bộ đếm theo giờ, giữ trong bộ nhớ tiến trình. */
const hits = new Map<string, { count: number; resetAt: number }>();

function overRateLimit(userId: string, limitPerHour: number): boolean {
  const now = Date.now();
  const entry = hits.get(userId);
  if (!entry || now >= entry.resetAt) {
    hits.set(userId, { count: 1, resetAt: now + 3_600_000 });
    return false;
  }
  entry.count += 1;
  // Dọn định kỳ để Map không phình theo số học viên đã từng tra.
  if (hits.size > 5_000) {
    for (const [key, value] of hits) if (now >= value.resetAt) hits.delete(key);
  }
  return entry.count > limitPerHour;
}

/**
 * Học viên có lượt làm bài chưa nộp và chưa hết giờ không.
 *
 * Chỉ tính lượt CÒN HẠN: một lượt bỏ dở từ tuần trước không nên khóa vĩnh viễn
 * quyền tra từ của người ta.
 */
async function dangThi(userId: string): Promise<boolean> {
  const open = await db.attempt.findFirst({
    where: { userId, status: "IN_PROGRESS", deadlineAt: { gt: new Date() } },
    select: { id: true },
  });
  return Boolean(open);
}

export async function GET(request: Request) {
  const config = readDictionaryConfig();
  if (!config.enabled) {
    return NextResponse.json({ error: "DICTIONARY_DISABLED" }, { status: 503 });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  if (await dangThi(user.id)) {
    return NextResponse.json({ error: "DANG_LAM_BAI" }, { status: 403 });
  }

  if (overRateLimit(user.id, config.perUserPerHour)) {
    return NextResponse.json({ error: "QUA_NHIEU_LUOT" }, { status: 429 });
  }

  const url = new URL(request.url);
  const term = url.searchParams.get("tu") ?? "";
  const wantSynonyms = url.searchParams.get("loai") === "dong-nghia";

  if (wantSynonyms) {
    const outcome = await lookupSynonyms(term);
    if (outcome.status === "OK") return NextResponse.json({ ok: true, ...outcome.result });
    return NextResponse.json({ ok: false, error: outcome.status }, { status: 200 });
  }

  const outcome = await lookupDefinition(term);
  switch (outcome.status) {
    case "OK":
      return NextResponse.json({ ok: true, fromCache: outcome.fromCache, ...outcome.result });
    case "NOT_FOUND":
      return NextResponse.json({ ok: false, error: "KHONG_TIM_THAY", term: outcome.term });
    case "BAD_TERM":
      return NextResponse.json({ ok: false, error: "TU_KHONG_HOP_LE" }, { status: 400 });
    default:
      // Nhà cung cấp chết hết. 200 chứ không 5xx: đây là kết quả bình thường
      // của một tính năng phụ, không phải sự cố của website.
      return NextResponse.json({ ok: false, error: "TAM_THOI_KHONG_TRA_DUOC" });
  }
}
