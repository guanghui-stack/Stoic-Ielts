import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, Trophy } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import {
  FeynmanDraftForm,
  FeynmanRevealedForm,
  FeynmanStepper,
  type FeynmanMistakeView,
} from "@/components/feynman/feynman-review-form";
import {
  FEYNMAN_ERROR_LABELS,
  CONFIDENCE_LABELS,
  type FeynmanErrorType,
} from "@/lib/feynman-constants";

export const metadata = { title: "Chữa bài theo phương pháp Feynman" };

export default async function FeynmanPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const user = await requireUser();

  const review = await db.feynmanReview.findUnique({
    where: { attemptId },
    include: {
      attempt: { include: { exercise: { select: { title: true } } } },
      mistakes: { orderBy: { sortOrder: "asc" } },
    },
  });

  // Chưa có phiên chữa bài, hoặc không phải bài của mình → về trang kết quả
  if (!review || review.userId !== user.id || review.attempt.userId !== user.id) {
    redirect(`/hoc-vien/bai-lam/${attemptId}`);
  }

  const revealed = review.status === "REVEALED" || review.status === "COMPLETED";

  /**
   * BẢO MẬT: ở trạng thái DRAFT, đáp án đúng và lời giải mẫu KHÔNG được đưa vào
   * props của client component (chúng sẽ nằm trong HTML/RSC payload mà học viên
   * xem được). Chỉ khi đã REVEALED mới gắn các trường này.
   */
  const mistakes: FeynmanMistakeView[] = review.mistakes.map((m) => {
    const base: FeynmanMistakeView = {
      id: m.id,
      numberLabel: m.numberLabel,
      questionType: m.questionType,
      partNumber: m.partNumber,
      prompt: m.prompt,
      userAnswer: m.userAnswer,
      errorType: m.errorType,
      evidenceParagraph: m.evidenceParagraph,
      evidenceText: m.evidenceText,
      firstExplanation: m.firstExplanation,
      revisedExplanation: m.revisedExplanation,
      lessonRule: m.lessonRule,
    };
    if (!revealed) return base;

    let paraphrases: Array<{ question: string; passage: string }> | undefined;
    if (m.modelParaphrasesJson) {
      try {
        paraphrases = JSON.parse(m.modelParaphrasesJson);
      } catch {
        paraphrases = undefined;
      }
    }
    return {
      ...base,
      correctAnswer: m.correctAnswer,
      modelEvidenceParagraph: m.modelEvidenceParagraph,
      modelEvidence: m.modelEvidence,
      modelExplanation: m.modelExplanation,
      modelTrap: m.modelTrap,
      modelParaphrases: paraphrases,
    };
  });

  const isCompleted = review.status === "COMPLETED";

  return (
    <section className="mx-auto max-w-4xl px-6 py-12 md:py-14">
      <Link
        href={`/hoc-vien/bai-lam/${attemptId}`}
        className="inline-flex items-center gap-2 font-ui text-sm font-semibold text-navy hover:text-gold"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Kết quả bài làm
      </Link>

      <div className="mt-6">
        <p className="label-caps">
          Chữa bài theo phương pháp Feynman ·{" "}
          {review.mode === "DEEP" ? "Chữa sâu" : "Chữa nhanh"}
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-navy-deep md:text-4xl">
          {review.attempt.exercise.title}
        </h1>
        <div className="rule-gold mt-5" />
        <p className="mt-5 max-w-2xl text-[1rem] leading-relaxed text-ink-soft">
          {isCompleted
            ? "Bạn đã hoàn thành phiên chữa bài này. Toàn bộ đáp án đã được mở ở trang kết quả."
            : review.mode === "DEEP"
              ? "Chế độ chữa sâu: hệ thống chọn tối đa 6 câu đại diện để bạn phân tích kỹ (10–15 phút)."
              : "Chế độ chữa nhanh: hệ thống chọn tối đa 3 câu đại diện (5–8 phút)."}
        </p>
      </div>

      <div className="mt-8">
        <FeynmanStepper current={isCompleted ? 4 : revealed ? 3 : 1} />
      </div>

      <div className="mt-10">
        {isCompleted ? (
          <CompletedSummary review={review} mistakes={mistakes} attemptId={attemptId} />
        ) : revealed ? (
          <FeynmanRevealedForm reviewId={review.id} mistakes={mistakes} />
        ) : (
          <FeynmanDraftForm reviewId={review.id} mistakes={mistakes} />
        )}
      </div>
    </section>
  );
}

/* ===================== Xem lại sau khi hoàn thành ===================== */

function CompletedSummary({
  review,
  mistakes,
  attemptId,
}: {
  review: {
    passageSummary: string | null;
    paragraphMap: string | null;
    confusingPoint: string | null;
    finalTeachBack: string | null;
    finalRule: string | null;
    confidenceBefore: number | null;
    confidenceAfter: number | null;
  };
  mistakes: FeynmanMistakeView[];
  attemptId: string;
}) {
  const gain =
    review.confidenceBefore != null && review.confidenceAfter != null
      ? review.confidenceAfter - review.confidenceBefore
      : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-4 border-l-4 border-success bg-success-pale px-6 py-5">
        <Trophy className="h-6 w-6 shrink-0 text-success" aria-hidden="true" />
        <div>
          <p className="font-display text-lg font-bold text-success">
            Đã hoàn thành chữa bài
          </p>
          {gain != null && (
            <p className="mt-1 font-ui text-sm text-ink-soft">
              Mức tự tin: {review.confidenceBefore} → {review.confidenceAfter}
              {gain > 0 && ` (tăng ${gain} bậc)`} ·{" "}
              {CONFIDENCE_LABELS[review.confidenceAfter!]}
            </p>
          )}
        </div>
      </div>

      {review.finalRule && (
        <div className="border border-gold bg-gold-pale p-7">
          <p className="label-caps">Quy tắc bạn mang sang bài sau</p>
          <p className="mt-3 font-display text-xl font-bold leading-snug text-navy-deep">
            “{review.finalRule}”
          </p>
        </div>
      )}

      <ReadOnlyBlock title="Bài đọc nói về điều gì" body={review.passageSummary} />
      <ReadOnlyBlock title="Vai trò của từng đoạn" body={review.paragraphMap} />
      {review.confusingPoint && (
        <ReadOnlyBlock title="Điểm còn khó hiểu" body={review.confusingPoint} />
      )}

      {mistakes.length > 0 && (
        <div>
          <h2 className="font-display text-2xl font-bold text-navy-deep">
            Các lỗi đã chữa
          </h2>
          <div className="mt-5 space-y-5">
            {mistakes.map((m) => (
              <article key={m.id} className="border border-line bg-paper p-6 shadow-card">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="border border-gold bg-gold-pale px-2.5 py-0.5 font-ui text-xs font-bold text-navy-deep">
                    Câu {m.numberLabel}
                  </span>
                  {m.errorType && (
                    <span className="font-ui text-xs text-muted">
                      {FEYNMAN_ERROR_LABELS[m.errorType as FeynmanErrorType] ?? m.errorType}
                    </span>
                  )}
                </div>
                <p className="mt-3 font-ui text-sm">
                  <span className="text-danger">Bạn chọn: {m.userAnswer || "(bỏ trống)"}</span>
                  <span className="ml-4 text-success">Đáp án đúng: {m.correctAnswer}</span>
                </p>
                {m.revisedExplanation && (
                  <p className="mt-3 text-[0.95rem] leading-relaxed text-ink">
                    {m.revisedExplanation}
                  </p>
                )}
                {m.lessonRule && (
                  <p className="mt-3 border-l-4 border-gold bg-cream-deep px-4 py-2.5 text-[0.92rem] italic leading-relaxed text-ink-soft">
                    {m.lessonRule}
                  </p>
                )}
              </article>
            ))}
          </div>
        </div>
      )}

      <ReadOnlyBlock title="Phần giảng lại của bạn" body={review.finalTeachBack} />

      <Link
        href={`/hoc-vien/bai-lam/${attemptId}`}
        className="inline-flex items-center gap-2 border border-navy bg-navy px-7 py-3 font-ui text-[0.8rem] font-semibold uppercase tracking-[0.12em] text-paper transition-colors hover:bg-navy-deep"
      >
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        Xem toàn bộ đáp án ở trang kết quả
      </Link>
    </div>
  );
}

function ReadOnlyBlock({ title, body }: { title: string; body: string | null }) {
  if (!body) return null;
  return (
    <div className="border border-line bg-paper p-7 shadow-card">
      <p className="label-caps">{title}</p>
      <div className="mt-3 space-y-3 leading-relaxed text-ink">
        {body.split(/\n+/).map((p, i) => p.trim() && <p key={i}>{p}</p>)}
      </div>
    </div>
  );
}
