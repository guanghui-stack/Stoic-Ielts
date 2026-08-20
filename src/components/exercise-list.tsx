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
import { getCoinWallet } from "@/lib/payments/coin-service";
import { formatCoins } from "@/lib/payments/coins";
import { OFFERS } from "@/lib/payments/catalog";
import { CoinPurchaseButton } from "@/components/payments/purchase-button";
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

  const wallet = user ? await getCoinWallet(user.id) : null;
  const unlockCost = OFFERS.READING_UNLOCK.priceCoins;
  const canAfford = (wallet?.balance ?? 0) >= unlockCost;

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
                // Mở đề bằng xu, giữ vĩnh viễn — làm lại bao nhiêu lượt cũng
                // được. Thiếu xu thì dẫn thẳng tới chỗ nạp kèm số còn thiếu,
                // KHÔNG để họ bấm rồi bị đá vòng về đúng trang này.
                <div className="flex flex-col items-stretch gap-2 md:items-end">
                  {canAfford ? (
                    <CoinPurchaseButton
                      offerCode="READING_UNLOCK"
                      exerciseId={ex.id}
                      className="w-full md:w-auto"
                    >
                      <Lock className="h-4 w-4" aria-hidden="true" />
                      Mở đề này · {formatCoins(unlockCost)}
                    </CoinPurchaseButton>
                  ) : (
                    <Link
                      href="/thanh-toan"
                      className="inline-flex items-center justify-center gap-2 border border-gold bg-gold px-6 py-2.5 font-ui text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-navy-deep transition-colors hover:border-gold-soft hover:bg-gold-soft"
                    >
                      <Lock className="h-4 w-4" aria-hidden="true" />
                      Nạp xu để mở · {formatCoins(unlockCost)}
                    </Link>
                  )}
                  <p className="font-ui text-xs text-muted">
                    Mở một lần, làm lại không giới hạn
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
