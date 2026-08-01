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
import { isSePayConfigured } from "@/lib/payments/sepay";
import { OFFERS, formatVnd } from "@/lib/payments/catalog";
import { PurchaseButton } from "@/components/payments/purchase-button";
import { SubmitButton } from "@/components/ui";

/** Danh sách bài luyện của một kỹ năng, kèm trạng thái bài làm của học viên. */
export async function ExerciseList({ skill }: { skill: "READING" | "WRITING" }) {
  const user = await getCurrentUser();
  const exercises = await db.exercise.findMany({
    where: { skill, published: true },
    orderBy: { createdAt: "asc" },
  });

  const attempts = user
    ? await db.attempt.findMany({
        where: { userId: user.id, exercise: { skill } },
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

  const canBuy = isSePayConfigured();

  if (exercises.length === 0) {
    return (
      <div className="border border-line bg-paper p-10 text-center text-ink-soft">
        Chưa có bài luyện nào được mở — vui lòng quay lại sau.
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
                {best && ex.skill === "READING" && best.scoreRaw != null && (
                  <span className="flex items-center gap-1.5 text-success">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Kết quả tốt nhất: {best.scoreRaw}/{best.scoreTotal}
                  </span>
                )}
                {best && ex.skill === "WRITING" && (
                  <span className="flex items-center gap-1.5 text-success">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {best.status === "GRADED" && best.band != null
                      ? `Đã chấm: Band ${best.band.toFixed(1)}`
                      : "Đã nộp — đang chờ chấm"}
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
                // Bài cần mở khóa: hai lựa chọn — mua đúng bài này, hoặc gói
                // 30 ngày. Số tiền chỉ để hiển thị; giá thật lấy ở máy chủ.
                canBuy && ex.skill === "READING" ? (
                  <div className="flex flex-col items-stretch gap-2.5 md:items-end">
                    <PurchaseButton
                      offerCode="READING_SINGLE"
                      exerciseId={ex.id}
                      className="w-full md:w-auto"
                    >
                      Mở bài này · {formatVnd(OFFERS.READING_SINGLE.amount)}
                    </PurchaseButton>
                    <PurchaseButton
                      offerCode="READING_ALL_30D"
                      variant="outline"
                      className="w-full md:w-auto"
                    >
                      Mở toàn bộ 30 ngày · {formatVnd(OFFERS.READING_ALL_30D.amount)}
                    </PurchaseButton>
                  </div>
                ) : (
                  <div className="text-right">
                    <span className="inline-flex cursor-not-allowed items-center gap-2 border border-line-strong bg-cream-deep px-6 py-2.5 font-ui text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-muted">
                      <Lock className="h-4 w-4" aria-hidden="true" />
                      Chưa được mở khóa
                    </span>
                    <p className="mt-2 max-w-[15rem] font-ui text-xs leading-relaxed text-muted">
                      Liên hệ trung tâm để được cấp quyền làm bài này.
                    </p>
                  </div>
                )
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
