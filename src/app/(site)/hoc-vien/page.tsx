import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  LogOut,
  KeyRound,
  RotateCcw,
} from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { logoutAction } from "@/lib/actions/auth";
import { ButtonLink, NoteBox } from "@/components/ui";
import { StudentNav } from "@/components/student/student-nav";
import { GoalsCard } from "@/components/student/goals-card";
import { StudyCalendar } from "@/components/student/study-calendar";
import { WeeklyStats, type WeeklyRow } from "@/components/student/weekly-stats";
import { HistoryTabs, type HistoryItem } from "@/components/student/history-tabs";
import { AchievementSummaryCard } from "@/components/achievements/achievement-summary-card";
import { RankDashboardBlock } from "@/components/ranks/rank-dashboard-block";

export const metadata: Metadata = { title: "Hồ sơ học tập" };

const VN_TZ = "Asia/Ho_Chi_Minh";
const DAY_MS = 24 * 60 * 60 * 1000;

/** Khóa ngày dạng yyyy-mm-dd theo giờ Việt Nam. */
function dateKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: VN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function keyToLabel(key: string): string {
  const [y, m, d] = key.split("-");
  return `${d}/${m}/${y}`;
}

function fmt(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleString("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: VN_TZ,
  });
}

export default async function StudentDashboard() {
  const user = await requireUser();

  const attempts = await db.attempt.findMany({
    where: { userId: user.id, exercise: { skill: "READING" } },
    include: { exercise: true },
    orderBy: { startedAt: "desc" },
  });

  const finished = attempts.filter((a) => a.status !== "IN_PROGRESS");
  // Server Component: dựng lại mỗi lần tải trang nên đọc giờ hiện tại là đúng ý đồ.
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();
  const inProgress = attempts.filter(
    (a) => a.status === "IN_PROGRESS" && a.deadlineAt.getTime() > nowMs
  );
  const readingDone = finished.filter((a) => a.exercise.skill === "READING");
  const bestReading = readingDone.reduce<number | null>((best, a) => {
    if (a.scoreRaw == null || a.scoreTotal == null || a.scoreTotal === 0) return best;
    const pct = (a.scoreRaw / a.scoreTotal) * 100;
    return best == null || pct > best ? pct : best;
  }, null);

  /* ===== Lịch chuyên cần (tháng hiện tại, giờ VN) ===== */
  const now = new Date();
  const todayKey = dateKey(now);
  const [ty, tm, td] = todayKey.split("-").map(Number);
  const monthPrefix = todayKey.slice(0, 8); // "yyyy-mm-"
  const daysInMonth = new Date(ty, tm, 0).getDate();
  // Thứ của ngày 1 (lấy mốc 12:00 giờ VN để tránh lệch múi giờ)
  const firstWeekday = new Date(`${monthPrefix}01T12:00:00+07:00`).getUTCDay();
  const offset = (firstWeekday + 6) % 7; // tuần bắt đầu Thứ 2
  const monthLabel = `Tháng ${String(tm).padStart(2, "0")} / ${ty}`;

  const activeDays = [
    ...new Set(
      finished
        .filter((a) => a.submittedAt)
        .map((a) => dateKey(a.submittedAt!))
        .filter((k) => k.startsWith(monthPrefix))
        .map((k) => Number(k.slice(8)))
    ),
  ];

  /* ===== Thống kê 7 ngày gần nhất ===== */
  const weekKeys: string[] = [];
  for (let i = 6; i >= 0; i--) {
    weekKeys.push(dateKey(new Date(now.getTime() - i * DAY_MS)));
  }
  const weeklyRows: WeeklyRow[] = weekKeys.map((key) => {
    const dayAttempts = finished.filter(
      (a) => a.submittedAt && dateKey(a.submittedAt) === key
    );
    const minutes = dayAttempts.reduce((sum, a) => {
      const spent = Math.round(
        (a.submittedAt!.getTime() - a.startedAt.getTime()) / 60000
      );
      return sum + Math.min(Math.max(spent, 1), a.exercise.durationMinutes);
    }, 0);
    return {
      label: keyToLabel(key),
      r: dayAttempts.filter((a) => a.exercise.skill === "READING").length,
      minutes,
    };
  });

  /* ===== Lịch thi ===== */
  const examKey = user.examDate ? dateKey(user.examDate) : null;
  let daysLeft: number | null = null;
  if (examKey) {
    const toUtc = (k: string) => Date.parse(`${k}T00:00:00Z`);
    daysLeft = Math.round((toUtc(examKey) - toUtc(todayKey)) / DAY_MS);
  }

  /* ===== Lịch sử theo tab ===== */
  const historyItems: HistoryItem[] = finished.map((a) => ({
    id: a.id,
    title: a.exercise.title,
    submittedAtLabel: fmt(a.submittedAt),
    resultLabel: `${a.scoreRaw}/${a.scoreTotal}`,
    href: `/hoc-vien/bai-lam/${a.id}`,
  }));

  return (
    <>
      <section className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-6 px-6 py-12">
          <div>
            <p className="label-caps">Hồ sơ học tập</p>
            <h1 className="mt-3 font-display text-3xl font-bold text-navy-deep md:text-4xl">
              Xin chào, {user.name}
            </h1>
            <div className="rule-gold mt-5" />
            <p className="mt-4 font-ui text-sm text-muted">{user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/doi-mat-khau"
              className="flex items-center gap-2 border border-line px-5 py-2.5 font-ui text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-ink-soft transition-colors hover:border-navy hover:text-navy"
            >
              <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
              Đổi mật khẩu
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex cursor-pointer items-center gap-2 border border-line px-5 py-2.5 font-ui text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-ink-soft transition-colors hover:border-danger hover:text-danger"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                Đăng xuất
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl space-y-8 px-6 py-12">
        <StudentNav current="student" />

        {/* Cấp bậc đứng đầu vì nó trả lời câu hỏi "giờ làm gì tiếp". Tự ẩn khi
            cờ ENABLE_RANK_ENGINE còn tắt. */}
        <RankDashboardBlock userId={user.id} />

        {/* Danh hiệu: chỉ tóm tắt, KHÔNG truy vấn cả danh mục ở trang này */}
        <AchievementSummaryCard userId={user.id} />

        {/* Mục tiêu + lịch thi */}
        <GoalsCard
          targets={{
            overall: user.targetOverall,
            reading: user.targetReading,
          }}
          examDateValue={examKey ?? ""}
          examDateLabel={examKey ? keyToLabel(examKey) : "—"}
          daysLeft={daysLeft}
        />

        {/* Thống kê tổng */}
        <div className="grid gap-px border border-line bg-line sm:grid-cols-2">
          <div className="bg-paper p-6">
            <p className="label-caps flex items-center gap-2">
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              Reading đã làm
            </p>
            <p className="mt-3 font-display text-4xl font-bold text-navy-deep">
              {readingDone.length}
            </p>
          </div>
          <div className="bg-paper p-6">
            <p className="label-caps flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              Reading tốt nhất
            </p>
            <p className="mt-3 font-display text-4xl font-bold text-success">
              {bestReading != null ? `${Math.round(bestReading)}%` : "—"}
            </p>
          </div>
        </div>

        {/* Bài đang làm dở */}
        {inProgress.length > 0 && (
          <div className="space-y-4">
            {inProgress.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-4 border-l-4 border-gold bg-cream-deep px-6 py-4"
              >
                <div>
                  <p className="font-ui font-semibold text-ink">{a.exercise.title}</p>
                  <p className="mt-1 font-ui text-sm text-ink-soft">
                    Hạn nộp: {fmt(a.deadlineAt)} — đồng hồ vẫn đang chạy!
                  </p>
                </div>
                <Link
                  href={`/lam-bai/${a.id}`}
                  className="flex items-center gap-2 border border-gold bg-gold px-5 py-2 font-ui text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-paper hover:bg-[#9d7223]"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  Tiếp tục làm
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Lịch chuyên cần + thống kê tuần */}
        <div className="grid gap-6 lg:grid-cols-2">
          <StudyCalendar
            monthLabel={monthLabel}
            offset={offset}
            daysInMonth={daysInMonth}
            activeDays={activeDays}
            today={td}
          />
          <WeeklyStats rows={weeklyRows} />
        </div>

        {/* Lịch sử Reading */}
        {finished.length === 0 ? (
          <NoteBox title="Chưa có bài làm nào">
            Hãy bắt đầu với một bài Reading để làm quen với áp lực thời gian.{" "}
            <Link
              href="/luyen-tap/reading"
              className="font-semibold text-navy underline decoration-gold decoration-2 underline-offset-4"
            >
              Vào phòng luyện tập
            </Link>
            .
          </NoteBox>
        ) : (
          <HistoryTabs items={historyItems} />
        )}

        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/luyen-tap/reading" variant="primary">
            Reading Academic
          </ButtonLink>
          <ButtonLink href="/luyen-tap/reading/general" variant="outline">
            Reading General
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
