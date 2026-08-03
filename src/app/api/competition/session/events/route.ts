import { NextResponse } from "next/server";
import { authenticateExamSession } from "@/lib/integrity/auth";
import { ingestEvents, type IncomingEvent } from "@/lib/integrity/session-service";

/**
 * Nhận sự kiện liêm chính từ trình duyệt theo lô.
 *
 * Client gom sự kiện rồi gửi theo lô có SỐ THỨ TỰ tăng dần, thay vì gửi từng cái
 * một. Lý do: lúc mất mạng client vẫn phải ghi lại được hành vi, rồi gửi bù khi
 * có mạng — nếu gửi từng cái theo thời gian thực thì rút dây mạng là xóa sạch
 * dấu vết.
 *
 * Máy chủ không tin lô gửi lên: số thứ tự phải tăng, khóa chống trùng chặn đếm
 * hai lần, và thời điểm sự kiện bị kẹp trong khoảng phiên thi.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Chặn lô quá lớn — client bình thường không bao giờ gửi tới ngần này. */
const MAX_EVENTS_PER_BATCH = 100;

export async function POST(request: Request) {
  const auth = await authenticateExamSession(request);
  if (!auth) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  let body: { sequence?: number; events?: IncomingEvent[] };
  try {
    body = (await request.json()) as { sequence?: number; events?: IncomingEvent[] };
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const sequence = Number(body.sequence);
  if (!Number.isFinite(sequence) || sequence < 0) {
    return NextResponse.json({ error: "INVALID_SEQUENCE" }, { status: 400 });
  }

  const events = Array.isArray(body.events) ? body.events.slice(0, MAX_EVENTS_PER_BATCH) : [];

  const result = await ingestEvents({
    sessionId: auth.sessionId,
    sequence,
    events,
  });

  return NextResponse.json(result);
}
