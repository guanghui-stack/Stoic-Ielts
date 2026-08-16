import Link from "next/link";
import { Plus, Pencil, Eye, EyeOff, Trash2, Lock, Globe } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import {
  toggleExercisePublishedAction,
  toggleExerciseAccessLevelAction,
  deleteExerciseAction,
  cycleDifficultyTierAction,
  toggleAchievementEligibleAction,
  toggleReadingTypeAction,
} from "@/lib/actions/admin";
import { AdminPageShell } from "@/components/admin/admin-page-shell";

export const metadata = { title: "Quản lý bài tập" };

const READING_TYPE_LABEL: Record<string, string> = {
  ACADEMIC: "Academic",
  GENERAL: "General",
};

const TIER_LABEL: Record<string, string> = {
  EASY: "Dễ",
  MEDIUM: "Vừa",
  HARD: "Khó",
  UNKNOWN: "Chưa xếp",
};

export default async function AdminExercisesPage() {
  await requireAdmin();
  const exercises = await db.exercise.findMany({
    where: { skill: "READING" },
    orderBy: [{ readingType: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { attempts: true } } },
  });

  return (
    <AdminPageShell
      eyebrow="Ngân hàng đề"
      title="Quản lý bài tập"
      actions={
        <Link
          href="/quan-tri/bai-tap/moi"
          className="flex items-center gap-2 border border-gold bg-gold px-6 py-3 font-ui text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-paper transition-colors hover:bg-[#9d7223]"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Tạo bài tập mới
        </Link>
      }
    >

      <div className="mt-10 overflow-x-auto">
        <table className="w-full min-w-[720px] border border-line font-ui text-sm">
          <thead>
            <tr className="bg-navy text-paper">
              <th className="px-4 py-3 text-left font-semibold">Bài tập</th>
              <th className="px-4 py-3 text-left font-semibold">Kho Reading</th>
              <th className="px-4 py-3 text-center font-semibold">Thời gian</th>
              <th className="px-4 py-3 text-center font-semibold">Lượt làm</th>
              <th className="px-4 py-3 text-center font-semibold">Danh hiệu</th>
              <th className="px-4 py-3 text-center font-semibold">Truy cập</th>
              <th className="px-4 py-3 text-center font-semibold">Trạng thái</th>
              <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {exercises.map((ex) => (
              <tr key={ex.id} className="bg-paper">
                <td className="max-w-[300px] px-4 py-3">
                  <p className="truncate font-semibold text-ink">{ex.title}</p>
                  <p className="truncate text-xs text-muted">{ex.description}</p>
                </td>
                <td className="px-4 py-3 text-ink-soft">
                  <form action={toggleReadingTypeAction.bind(null, ex.id)}>
                    <button
                      type="submit"
                      title="Bấm để chuyển bài này sang kho Reading còn lại"
                      className="cursor-pointer border border-navy px-2.5 py-0.5 font-ui text-[0.68rem] font-semibold uppercase tracking-[0.06em] text-navy transition-colors hover:bg-navy hover:text-paper"
                    >
                      {READING_TYPE_LABEL[ex.readingType] ?? ex.readingType}
                    </button>
                  </form>
                </td>
                <td className="px-4 py-3 text-center tabular-nums text-ink-soft">
                  {ex.durationMinutes}&apos;
                </td>
                <td className="px-4 py-3 text-center tabular-nums text-ink-soft">
                  {ex._count.attempts}
                </td>
                {/* Độ khó + tính danh hiệu: chỉ có ý nghĩa với đề Reading */}
                <td className="px-4 py-3 text-center">
                  <div className="flex flex-col items-center gap-1.5">
                      <form action={cycleDifficultyTierAction.bind(null, ex.id)}>
                        <button
                          type="submit"
                          title="Bấm để đổi mức độ khó — dùng khi ghép đề tự động"
                          className="cursor-pointer border border-line-strong px-2.5 py-0.5 font-ui text-[0.68rem] font-semibold uppercase tracking-[0.06em] text-ink-soft transition-colors hover:border-navy hover:text-navy"
                        >
                          {TIER_LABEL[ex.difficultyTier] ?? ex.difficultyTier}
                        </button>
                      </form>
                      <form action={toggleAchievementEligibleAction.bind(null, ex.id)}>
                        <button
                          type="submit"
                          title="Bài này có được tính vào danh hiệu không"
                          className={`cursor-pointer border px-2.5 py-0.5 font-ui text-[0.68rem] font-semibold uppercase tracking-[0.06em] transition-colors ${
                            ex.achievementEligible
                              ? "border-success bg-success-pale text-success"
                              : "border-line-strong text-muted"
                          }`}
                        >
                          {ex.achievementEligible ? "Tính danh hiệu" : "Không tính"}
                        </button>
                      </form>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <form action={toggleExerciseAccessLevelAction.bind(null, ex.id)}>
                    <button
                      type="submit"
                      title={
                        ex.accessLevel === "RESTRICTED"
                          ? "Đang yêu cầu mở khóa — bấm để cho mọi học viên làm được"
                          : "Mọi học viên đều làm được — bấm để yêu cầu quản trị viên mở khóa"
                      }
                      className={`inline-flex cursor-pointer items-center gap-1.5 border px-2.5 py-1 text-xs font-semibold transition-colors ${
                        ex.accessLevel === "RESTRICTED"
                          ? "border-gold bg-gold-pale text-gold hover:bg-cream-deep"
                          : "border-line bg-cream text-ink-soft hover:border-gold hover:text-gold"
                      }`}
                    >
                      {ex.accessLevel === "RESTRICTED" ? (
                        <>
                          <Lock className="h-3 w-3" aria-hidden="true" />
                          Cần mở khóa
                        </>
                      ) : (
                        <>
                          <Globe className="h-3 w-3" aria-hidden="true" />
                          Ai cũng làm
                        </>
                      )}
                    </button>
                  </form>
                </td>
                <td className="px-4 py-3 text-center">
                  {ex.published ? (
                    <span className="border border-success bg-success-pale px-2 py-0.5 text-xs font-semibold text-success">
                      Đang mở
                    </span>
                  ) : (
                    <span className="border border-line bg-cream px-2 py-0.5 text-xs font-semibold text-muted">
                      Ẩn
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    <Link
                      href={`/quan-tri/bai-tap/${ex.id}`}
                      title="Sửa bài tập"
                      className="flex h-9 w-9 items-center justify-center border border-line text-ink-soft transition-colors hover:border-navy hover:text-navy"
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                      <span className="sr-only">Sửa</span>
                    </Link>
                    <form action={toggleExercisePublishedAction.bind(null, ex.id)}>
                      <button
                        type="submit"
                        title={ex.published ? "Ẩn khỏi học viên" : "Mở cho học viên"}
                        className="flex h-9 w-9 cursor-pointer items-center justify-center border border-line text-ink-soft transition-colors hover:border-gold hover:text-gold"
                      >
                        {ex.published ? (
                          <EyeOff className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        )}
                        <span className="sr-only">
                          {ex.published ? "Ẩn" : "Hiện"}
                        </span>
                      </button>
                    </form>
                    {ex._count.attempts === 0 && (
                      <form action={deleteExerciseAction.bind(null, ex.id)}>
                        <button
                          type="submit"
                          title="Xóa bài tập (chỉ khi chưa có lượt làm)"
                          className="flex h-9 w-9 cursor-pointer items-center justify-center border border-line text-ink-soft transition-colors hover:border-danger hover:text-danger"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                          <span className="sr-only">Xóa</span>
                        </button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 font-ui text-xs text-muted">
        Bài tập đã có lượt làm không thể xóa để bảo toàn hồ sơ học viên — hãy
        dùng nút ẩn thay thế.
      </p>
    </AdminPageShell>
  );
}
