import { Flame, CalendarCheck } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { SectionHeading, NoteBox } from "@/components/ui";
import { StudentNav } from "@/components/student/student-nav";

export const metadata = { title: "Nhật Khóa — Ngày học thật" };
export const dynamic = "force-dynamic";

/**
 * Nhật Khóa — nhật ký ngày học thật.
 *
 * Định nghĩa "ngày học thật" là activeSeconds >= 600, do tầng StudyDay quyết
 * định và KHÔNG được đổi theo chủ đề Tam Quốc. Trang này chỉ kể lại bằng hình
 * ảnh lương thảo, không tự đặt ra ngưỡng riêng.
 *
 * Cố ý không thưởng cho việc mở tab hay xem bản đồ: chỉ thời gian thật sự làm
 * bài và chữa bài mới được cộng, nếu không chỉ số này thành thứ tự lừa mình.
 */

const REAL_DAY_SECONDS = 600;
const WINDOW_DAYS = 84; // 12 tuần, chia hết cho 7 nên lưới không lệch cột

function dateKeyOf(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Chuỗi ngày học thật liên tiếp tính ngược từ hôm nay. */
function currentStreak(realDays: Set<string>, today: Date): number {
  let streak = 0;
  const cursor = new Date(today);
  // Cho phép hôm nay chưa học mà chuỗi vẫn còn: đếm từ hôm qua nếu cần.
  if (!realDays.has(dateKeyOf(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  while (realDays.has(dateKeyOf(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export default async function StudyLogPage() {
  const user = await requireUser();
  const today = new Date();
  const from = new Date(today.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const days = await db.studyDay.findMany({
    where: { userId: user.id, dateKey: { gte: dateKeyOf(from) } },
    select: { dateKey: true, activeSeconds: true, readingSeconds: true, feynmanSeconds: true },
    orderBy: { dateKey: "asc" },
  });

  const byKey = new Map(days.map((day) => [day.dateKey, day]));
  const realDays = new Set(
    days.filter((day) => day.activeSeconds >= REAL_DAY_SECONDS).map((day) => day.dateKey),
  );

  const totalSeconds = days.reduce((sum, day) => sum + day.activeSeconds, 0);
  const streak = currentStreak(realDays, today);

  // Lưới 12 tuần, mỗi cột một tuần.
  const cells: Array<{ key: string; seconds: number; real: boolean }> = [];
  for (let i = WINDOW_DAYS - 1; i >= 0; i -= 1) {
    const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const key = dateKeyOf(date);
    const row = byKey.get(key);
    cells.push({
      key,
      seconds: row?.activeSeconds ?? 0,
      real: realDays.has(key),
    });
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <StudentNav current="studyDays" />


      <SectionHeading label="Nhật Khóa" title="Ngày học thật của bạn" />

      <p className="mt-4 max-w-2xl text-[0.95rem] leading-relaxed text-ink-soft">
        Một ngày được tính là <strong>ngày học thật</strong> khi bạn thật sự làm
        bài hoặc chữa bài từ 10 phút trở lên. Mở tab, xem bản đồ hay đọc bảng
        xếp hạng đều không được cộng — chỉ số này để bạn tự biết mình, nên nó
        phải nói thật.
      </p>

      <div className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-3">
        <div className="bg-paper p-6">
          <p className="label-caps flex items-center gap-2">
            <Flame className="h-3.5 w-3.5" aria-hidden />
            Chuỗi hiện tại
          </p>
          <p className="mt-3 font-display text-4xl font-bold text-navy-deep tabular-nums">
            {streak}
          </p>
          <p className="mt-1 font-ui text-xs text-muted">ngày liên tiếp</p>
        </div>
        <div className="bg-paper p-6">
          <p className="label-caps flex items-center gap-2">
            <CalendarCheck className="h-3.5 w-3.5" aria-hidden />
            Ngày học thật
          </p>
          <p className="mt-3 font-display text-4xl font-bold text-navy-deep tabular-nums">
            {realDays.size}
          </p>
          <p className="mt-1 font-ui text-xs text-muted">trong 12 tuần qua</p>
        </div>
        <div className="bg-paper p-6">
          <p className="label-caps">Tổng thời gian</p>
          <p className="mt-3 font-display text-4xl font-bold text-navy-deep tabular-nums">
            {Math.round(totalSeconds / 3600)}
          </p>
          <p className="mt-1 font-ui text-xs text-muted">giờ học thật</p>
        </div>
      </div>

      <section aria-label="Lịch 12 tuần" className="mt-8 border border-line bg-paper p-7">
        <p className="label-caps">Lương thảo 12 tuần</p>
        <ul className="mt-5 grid grid-flow-col grid-rows-7 gap-1" style={{ gridAutoColumns: "1fr" }}>
          {cells.map((cell) => {
            const minutes = Math.round(cell.seconds / 60);
            return (
              <li
                key={cell.key}
                title={`${cell.key}: ${minutes} phút`}
                aria-label={`${cell.key}: ${minutes} phút${cell.real ? ", ngày học thật" : ""}`}
                className={`aspect-square rounded-sm border ${
                  cell.real
                    ? "border-gold bg-gold-pale"
                    : cell.seconds > 0
                      ? "border-line bg-cream-deep"
                      : "border-line bg-cream"
                }`}
              />
            );
          })}
        </ul>
        <p className="mt-4 font-ui text-xs text-muted">
          Ô vàng là ngày học thật. Ô xám nhạt là ngày có mở bài nhưng chưa đủ 10
          phút.
        </p>
      </section>

      <NoteBox className="mt-8" title="Vì sao ngưỡng là 10 phút">
        Dưới 10 phút thường là mở ra xem rồi đóng lại, không đủ để hình thành
        thói quen hay để lại dấu vết trong trí nhớ. Ngưỡng này giống nhau cho
        mọi học viên và không đổi theo cấp bậc.
      </NoteBox>
    </main>
  );
}
