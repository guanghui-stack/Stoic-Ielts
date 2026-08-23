import { Users, BookOpen, CheckCircle2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { AdminPageShell } from "@/components/admin/admin-page-shell";

function fmt(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

export default async function AdminOverviewPage() {
  await requireAdmin();

  const [studentCount, exerciseCount, completedCount, recentAttempts] =
    await Promise.all([
      // Khong dem bot: con so nay la de chu trung tam biet minh co bao nhieu
      // hoc vien that, va cong them ba muoi bot vao la bao sai.
      db.user.count({ where: { role: "STUDENT", isBot: false } }),
      db.exercise.count({ where: { skill: "READING" } }),
      db.attempt.count({
        where: { status: "GRADED", exercise: { skill: "READING" } },
      }),
      db.attempt.findMany({
        where: {
          status: "GRADED",
          exercise: { skill: "READING" },
        },
        include: { user: true, exercise: true },
        orderBy: { submittedAt: "desc" },
        take: 8,
      }),
    ]);

  return (
    <AdminPageShell
      eyebrow="Tổng quan"
      title="Bảng điều khiển Reading"
      lede="Tình hình học viên, kho đề và các lượt Reading vừa hoàn thành."
    >

      <div className="mt-10 grid gap-px border border-line bg-line sm:grid-cols-3">
        <div className="bg-paper p-6">
          <p className="label-caps flex items-center gap-2">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            Học viên
          </p>
          <p className="mt-3 font-display text-4xl font-bold text-navy-deep">
            {studentCount}
          </p>
        </div>
        <div className="bg-paper p-6">
          <p className="label-caps flex items-center gap-2">
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            Đề Reading
          </p>
          <p className="mt-3 font-display text-4xl font-bold text-navy-deep">
            {exerciseCount}
          </p>
        </div>
        <div className="bg-paper p-6">
          <p className="label-caps flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            Lượt đã hoàn thành
          </p>
          <p className="mt-3 font-display text-4xl font-bold text-success">
            {completedCount}
          </p>
        </div>
      </div>

      <div className="mt-12">
        <h2 className="font-display text-2xl font-bold text-navy-deep">
          Bài Reading nộp gần đây
        </h2>
        {recentAttempts.length === 0 ? (
          <p className="mt-5 border border-line bg-paper p-6 text-ink-soft">
            Chưa có bài Reading nào được hoàn thành.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[600px] border border-line font-ui text-sm">
              <thead>
                <tr className="bg-navy text-paper">
                  <th className="px-4 py-3 text-left font-semibold">Học viên</th>
                  <th className="px-4 py-3 text-left font-semibold">Bài tập</th>
                  <th className="px-4 py-3 text-left font-semibold">Kho</th>
                  <th className="px-4 py-3 text-left font-semibold">Nộp lúc</th>
                  <th className="px-4 py-3 text-center font-semibold">Kết quả</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {recentAttempts.map((attempt) => (
                  <tr key={attempt.id} className="bg-paper">
                    <td className="px-4 py-3 font-semibold text-ink">
                      {attempt.user.name}
                    </td>
                    <td className="max-w-[260px] truncate px-4 py-3 text-ink-soft">
                      {attempt.exercise.title}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {attempt.exercise.readingType === "GENERAL"
                        ? "General"
                        : "Academic"}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-ink-soft">
                      {fmt(attempt.submittedAt)}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold tabular-nums text-success">
                      {attempt.scoreRaw}/{attempt.scoreTotal}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminPageShell>
  );
}
