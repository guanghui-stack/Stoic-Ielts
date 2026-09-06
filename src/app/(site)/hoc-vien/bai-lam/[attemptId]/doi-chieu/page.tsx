import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ListChecks, Lock } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { gradeReading, sanitizeReadingParts } from "@/lib/exercise-content";
import { assemblyTitle, readingContentForAttempt } from "@/lib/attempt-content";
import { buildReviewModel } from "@/lib/attempts/review";
import { revealBasicAnswersAction } from "@/lib/actions/attempts";
import { getAttemptDiscussionLinks } from "@/lib/forum/question-context";
import { ReadingReviewSheet } from "@/components/exam/reading-review";
import { SubmitButton } from "@/components/ui";

export const metadata = { title: "Đối chiếu đề và đáp án" };

/**
 * Đối chiếu đề và đáp án.
 *
 * Trang kết quả trả lời "tôi được bao nhiêu điểm"; trang này trả lời câu hỏi
 * đắt hơn: "tôi sai ở chỗ nào trong bài". Muốn trả lời được thì đề và đáp án
 * phải nằm cạnh nhau trên cùng một màn hình — đọc đáp án rời khỏi passage thì
 * học viên phải tự nhớ mình đã đọc câu nào, và đó chính là thứ họ đang sai.
 *
 * Đặt trong nhóm `(site)` chứ không phải `(exam)` là có chủ ý: đây KHÔNG phải
 * phòng thi. Học viên cần thanh lối tắt và ô tra từ ở đây hơn bất cứ đâu, còn
 * `(exam)` cố tình gỡ hết những thứ đó đi.
 *
 * Ba lớp bảo vệ giữ nguyên như trang kết quả: chỉ chủ lượt làm (hoặc quản trị)
 * xem được, chỉ Reading, và lượt còn đang làm dở thì đá về phòng thi — vì đối
 * chiếu giữa chừng là xem trước đáp án của chính bài mình đang thi.
 */
export default async function AttemptReviewPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const user = await requireUser();

  const attempt = await db.attempt.findUnique({
    where: { id: attemptId },
    include: {
      exercise: true,
      competitionAttempt: { select: { id: true } },
      feynmanReviews: {
        orderBy: { runNumber: "desc" },
        take: 1,
        select: { status: true },
      },
    },
  });
  if (!attempt || (attempt.userId !== user.id && user.role !== "ADMIN")) {
    redirect("/hoc-vien");
  }
  if (attempt.exercise.skill !== "READING") redirect("/hoc-vien");
  if (attempt.status === "IN_PROGRESS") redirect(`/lam-bai/${attempt.id}`);

  const isOwner = attempt.userId === user.id;

  // Cùng một luật mở đáp án với trang kết quả. Chép luật ra hai chỗ là mở đường
  // cho hai chỗ nói khác nhau, nên điều kiện dưới đây phải luôn khớp
  // `answersUnlocked` ở `../page.tsx`.
  const answersUnlocked =
    user.role === "ADMIN" ||
    attempt.answersRevealedAt !== null ||
    attempt.feynmanReviews[0]?.status === "COMPLETED";

  const content = await readingContentForAttempt(attempt);
  const answers = JSON.parse(attempt.answers || "{}");
  const { detail } = gradeReading(content, answers);

  const title = attempt.assemblyId
    ? await assemblyTitle(attempt.assemblyId)
    : attempt.exercise.title;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14">
      <Link
        href={`/hoc-vien/bai-lam/${attempt.id}`}
        className="inline-flex items-center gap-2 font-ui text-sm font-semibold text-navy hover:text-gold"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Kết quả bài làm
      </Link>

      <div className="mt-6">
        <p className="label-caps flex items-center gap-2">
          <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
          Đối chiếu đề và đáp án
        </p>
        <h1 className="mt-3 font-display text-2xl font-bold leading-tight text-navy-deep md:text-3xl">
          {title}
        </h1>
        <div className="rule-gold mt-5" />
        <p className="mt-5 max-w-3xl text-[0.98rem] leading-relaxed text-ink-soft">
          Bài đọc nằm bên trái, câu hỏi bên phải, và mỗi câu hiện thẳng đáp án
          bạn đã chọn cạnh đáp án đúng. Màn này chỉ để đọc lại —{" "}
          <strong>không tính điểm</strong> và không đổi kết quả đã lưu.
        </p>
      </div>

      {!answersUnlocked && (
        <div className="mt-6 border-l-4 border-gold bg-cream-deep px-5 py-5">
          <p className="flex items-start gap-2.5 font-ui text-sm leading-relaxed text-ink-soft">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
            <span>
              Bên dưới đang hiện đáp án <strong>bạn đã chọn</strong>. Trước khi mở
              đáp án đúng, hãy đọc lại passage và thử tự tìm câu chứa bằng chứng —
              vài phút đó đáng giá hơn cả trang đáp án.
            </span>
          </p>
          {isOwner && attempt.status === "GRADED" && (
            <form
              action={revealBasicAnswersAction.bind(null, attempt.id)}
              className="mt-4"
            >
              <SubmitButton variant="outline">
                Xem đáp án cơ bản — miễn phí
              </SubmitButton>
            </form>
          )}
        </div>
      )}

      <div className="mt-8">
        <ReadingReviewSheet
          parts={sanitizeReadingParts(content)}
          review={buildReviewModel(detail, answersUnlocked)}
          discussions={await getAttemptDiscussionLinks(user, attempt)}
        />
      </div>
    </section>
  );
}
