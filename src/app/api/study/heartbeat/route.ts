import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import {
  dateKeyOf,
  processAchievementEvent,
  recordAchievementEvent,
} from "@/lib/achievements/engine";

/**
 * Ghi nhận thời gian học THẬT.
 *
 * Danh hiệu kỷ luật KHÔNG được dựa vào khoảng cách giữa lúc mở đề và lúc nộp,
 * cũng không dựa vào việc tab còn mở: để tab chạy qua đêm sẽ thành "học 8
 * tiếng", và danh hiệu kỷ luật khi đó chỉ đo được ai quên tắt trình duyệt.
 *
 * Ba lớp bảo vệ:
 *  1. Trình duyệt chỉ gửi nhịp khi tab đang hiển thị VÀ có tương tác gần đây.
 *  2. Máy chủ giữ một "chỗ" duy nhất cho mỗi học viên — mở mười tab thì chỉ
 *     một tab được cộng giờ.
 *  3. Mỗi nhịp cộng tối đa 60 giây, dù nhịp trước cách đó bao lâu.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Quá 90 giây không thấy nhịp thì coi như tab đó đã bỏ đi. */
const LEASE_MS = 90_000;
const MAX_CREDIT_SECONDS = 60;
/** Cứ thêm 5 phút học mới xét lại danh hiệu, thay vì mỗi phút một lần. */
const BUCKET_SECONDS = 300;

const KINDS = new Set(["READING", "FEYNMAN", "DASHBOARD"]);

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  // Quản trị viên thử nghiệm không được làm sai lệch số liệu học tập
  if (user.role !== "STUDENT") return NextResponse.json({ ok: true, credited: 0 });

  let body: { sessionId?: unknown; kind?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const sessionId = String(body.sessionId ?? "");
  const kind = String(body.kind ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!KINDS.has(kind)) return NextResponse.json({ ok: false }, { status: 400 });

  const now = new Date();
  const dateKey = dateKeyOf(now);

  const credited = await db.$transaction(async (tx) => {
    const presence = await tx.studyPresence.findUnique({ where: { userId: user.id } });
    const leaseAlive =
      presence && now.getTime() - presence.lastSeenAt.getTime() < LEASE_MS;

    // Tab khác đang giữ chỗ và vẫn còn sống → tab này không được cộng gì
    if (leaseAlive && presence.sessionId !== sessionId) return 0;

    const delta =
      presence && presence.sessionId === sessionId
        ? Math.min(
            MAX_CREDIT_SECONDS,
            Math.max(
              0,
              Math.floor((now.getTime() - presence.lastCreditedAt.getTime()) / 1000)
            )
          )
        : 0; // nhịp đầu tiên của phiên chỉ để nhận chỗ, chưa cộng giờ

    await tx.studyPresence.upsert({
      where: { userId: user.id },
      update: { sessionId, kind, lastSeenAt: now, lastCreditedAt: now },
      create: { userId: user.id, sessionId, kind, lastSeenAt: now, lastCreditedAt: now },
    });

    if (delta > 0) {
      await tx.studyDay.upsert({
        where: { userId_dateKey: { userId: user.id, dateKey } },
        update: {
          activeSeconds: { increment: delta },
          ...(kind === "READING" ? { readingSeconds: { increment: delta } } : {}),
          ...(kind === "FEYNMAN" ? { feynmanSeconds: { increment: delta } } : {}),
        },
        create: {
          userId: user.id,
          dateKey,
          activeSeconds: delta,
          readingSeconds: kind === "READING" ? delta : 0,
          feynmanSeconds: kind === "FEYNMAN" ? delta : 0,
          sessionsCount: 1,
        },
      });
    }
    return delta;
  });

  if (credited > 0) await maybeRecheckTitles(user.id, dateKey, credited);

  return NextResponse.json(
    { ok: true, credited },
    { headers: { "Cache-Control": "no-store" } }
  );
}

/**
 * Chỉ xét lại danh hiệu khi vừa vượt qua một mốc 5 phút.
 * Xét mỗi phút một lần sẽ tạo hàng nghìn sự kiện vô ích mỗi ngày.
 */
async function maybeRecheckTitles(userId: string, dateKey: string, credited: number) {
  const day = await db.studyDay.findUnique({
    where: { userId_dateKey: { userId, dateKey } },
    select: { activeSeconds: true },
  });
  if (!day) return;

  const bucketNow = Math.floor(day.activeSeconds / BUCKET_SECONDS);
  const bucketBefore = Math.floor((day.activeSeconds - credited) / BUCKET_SECONDS);
  if (bucketNow === bucketBefore) return;

  const eventId = await recordAchievementEvent({
    userId,
    type: "STUDY_TIME_UPDATED",
    key: `${dateKey}:${bucketNow}`,
    payload: { dateKey, bucket: bucketNow },
  });
  if (eventId) await processAchievementEvent(eventId);
}
