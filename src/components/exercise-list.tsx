import Link from "next/link";
import {
  CalendarClock,
  CheckCircle2,
  PlayCircle,
  RotateCcw,
  Lock,
} from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { startAttemptAction } from "@/lib/actions/attempts";
import { readingAccessOf, isAdminRole } from "@/lib/exercise-access";
import { SubmitButton } from "@/components/ui";

/** Danh sách bài Reading của một kho, kèm trạng thái bài làm của học viên. */
export async function ExerciseList({
  readingType,
}: {
  readingType: "ACADEMIC" | "GENERAL";
}) {
  const user = await getCurrentUser();
  const exercises = await db.exercise.findMany({
    // Đề Nguyệt Thí bị loại khỏi khu luyện tập: luyện trước bằng chính đề thi
    // thì cuộc thi mất hết ý nghĩa.
    where: {
      skill: "READING",
      readingType,
      published: true,
      competitionOnly: false,
    },
    orderBy: { createdAt: "asc" },
  });

  const attempts = user
    ? await db.attempt.findMany({
        where: {
          userId: user.id,
          exercise: { skill: "READING", readingType },
        },
        orderBy: { startedAt: "desc" },
      })
    : [];

  // Bài "Cần mở khóa" chỉ làm được khi học viên đã mua, hoặc admin đã cấp
  const access = user
    ? await readingAccessOf(user.id)
    : { hasAll: false, exerciseIds: new Set<string>(), allExpiresAt: null };
  const canDo = (ex: { id: string; accessLevel: string }) =>
    ex.accessLevel !== "RESTRICTED" ||
    (user
      ? isAdminRole(user.role) || access.hasAll || access.exerciseIds.has(ex.id)
      : false);

  if (exercises.length === 0) {
    return (
      <div className="border border-line bg-paper p-10 text-center text-ink-soft">
        {readingType === "GENERAL"
          ? "Kho Reading General hiện chưa có đề — vui lòng quay lại sau."
          : "Chưa có bài luyện Academic nào được mở — vui lòng quay lại sau."}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {exercises.map((ex, idx) => {
        const mine = attempts.filter((a) => a.exerciseId === ex.id);
        const inProgress = mine.find((a) => a.status === "IN_PROGRESS");
        const best = mine
          .filter((a) => a.status !== "IN_PROGRESS")
          .sort((a, b) => (b.scoreRaw ?? -1) - (a.scoreRaw ?? -1))[0];

        return (
          <article
            key={ex.id}
            className="flex flex-col gap-5 border border-line bg-paper p-7 shadow-card md:flex-row md:items-center md:justify-between"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-ui text-sm font-bold tabular-nums text-gold">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <h3 className="font-display text-xl font-bold text-navy-deep">
                  {ex.title}
                </h3>
                {ex.accessLevel === "RESTRICTED" && (
                  <span
                    className={`inline-flex items-center gap-1.5 border px-2.5 py-0.5 font-ui text-[0.68rem] font-semibold uppercase tracking-[0.08em] ${
                      canDo(ex)
                        ? "border-success bg-success-pale text-success"
                        : "border-line-strong bg-cream-deep text-ink-soft"
                    }`}
                  >
                    <Lock className="h-3 w-3" aria-hidden="true" />
                    {canDo(ex) ? "Đã mở khóa cho bạn" : "Cần mở khóa"}
                  </span>
                )}
              </div>
              <p className="mt-2 text-[0.92rem] leading-relaxed text-ink-soft">
                {ex.description}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-4 font-ui text-xs text-muted">
                <span className="flex items-center gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                  {ex.durationMinutes} phút · tự nộp khi hết giờ
                </span>
                {best && best.scoreRaw != null && (
                  <span className="flex items-center gap-1.5 text-success">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Kết quả tốt nhất: {best.scoreRaw}/{best.scoreTotal}
                  </span>
                )}
              </div>
            </div>

            <div className="shrink-0">
              {!user ? (
                <Link
                  href="/dang-nhap"
                  className="inline-flex items-center gap-2 border border-navy px-6 py-2.5 font-ui text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-navy transition-colors hover:bg-navy hover:text-paper"
                >
                  <PlayCircle className="h-4 w-4" aria-hidden="true" />
                  Đăng nhập để làm bài
                </Link>
              ) : !canDo(ex) ? (
                // Đề Reading không còn bán (đặc tả §2.1: đề thi miễn phí). Bài
                // nào còn ở mức "cần mở khóa" là do quản trị viên chủ động khóa,
                // nên đường duy nhất là xin cấp quyền — KHÔNG mời mua ở đây.
                // Trước đây chỗ này bán READING_SINGLE 9.000đ đã dừng bán, bấm
                // vào chỉ bị đá về trang bảng giá mà không hiện lỗi gì.
                <div className="text-right">
                  <span className="inline-flex cursor-not-allowed items-center gap-2 border border-line-strong bg-cream-deep px-6 py-2.5 font-ui text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-muted">
                    <Lock className="h-4 w-4" aria-hidden="true" />
                    Chưa được mở khóa
                  </span>
                  <p className="mt-2 max-w-[15rem] font-ui text-xs leading-relaxed text-muted">
                    Liên hệ trung tâm để được cấp quyền làm bài này.
                  </p>
                </div>
              ) : (
                <form action={startAttemptAction.bind(null, ex.id)}>
                  <SubmitButton variant={inProgress ? "gold" : "primary"}>
                    {inProgress ? (
                      <>
                        <RotateCcw className="h-4 w-4" aria-hidden="true" />
                        Tiếp tục bài dang dở
                      </>
                    ) : (
                      <>
                        <PlayCircle className="h-4 w-4" aria-hidden="true" />
                        {mine.length > 0 ? "Làm lại" : "Bắt đầu làm bài"}
                      </>
                    )}
                  </SubmitButton>
                </form>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
