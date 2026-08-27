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
import { StudyHeartbeat } from "@/components/study/study-heartbeat";
import { FeynmanAiPanel } from "@/components/feynman/feynman-ai-panel";
import type { AiEvaluationView } from "@/components/feynman/feynman-ai-evaluation";
import type { ChatTurn } from "@/components/feynman/feynman-ai-chat";
import { readFeynmanAiConfig } from "@/lib/feynman-ai/config";
import { walletRemaining } from "@/lib/feynman-ai/rules";

export const metadata = { title: "Chữa bài theo phương pháp Feynman" };

export default async function FeynmanPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const user = await requireUser();

  // Một lượt làm bài có thể có nhiều phiên luyện; trang này luôn mở phiên MỚI
  // NHẤT. Các phiên cũ vẫn nằm nguyên trong database để tra lại lịch sử.
  const review = await db.feynmanReview.findFirst({
    where: { attemptId },
    orderBy: { runNumber: "desc" },
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
  const aiPanel = await loadAiPanel({
    userId: user.id,
    reviewId: review.id,
    attemptId,
    mistakes: review.mistakes,
  });

  return (
    <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 md:py-14">
      {/* Chữa bài là học thật — thời gian ở đây được tính vào danh hiệu kỷ luật */}
      <StudyHeartbeat kind="FEYNMAN" />
      <Link
        href={`/hoc-vien/bai-lam/${attemptId}`}
        className="inline-flex items-center gap-2 rounded-lg font-ui text-sm font-semibold text-navy transition-colors hover:text-stoic-primary-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stoic-primary/40"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Kết quả bài làm
      </Link>

      <div className="mt-6">
        <p className="label-caps">
          Tự giảng · Feynman AI ·{" "}
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

      {/* Khối AI nằm SAU phần tự giảng, không nằm trước: học viên phải tự viết
          xong đã. Đặt trước thì cái nút sẽ trở thành lối tắt bỏ qua việc học. */}
      {aiPanel && (
        <FeynmanAiPanel
          reviewId={review.id}
          evaluation={aiPanel.evaluation}
          turns={aiPanel.turns}
          questionLimit={aiPanel.questionLimit}
          questionUsed={aiPanel.questionUsed}
          walletRemaining={aiPanel.walletRemaining}
          reviewCompleted={isCompleted}
          topUpHref={aiPanel.topUpHref}
        />
      )}
    </section>
  );
}

/* ===================== Khối AI ===================== */

type AiPanelData = {
  evaluation: AiEvaluationView | null;
  turns: ChatTurn[];
  questionLimit: number;
  questionUsed: number;
  walletRemaining: number;
  topUpHref: string;
};

/**
 * Gom dữ liệu cho khối AI. Trả về null khi tính năng đang tắt — khi đó trang
 * chữa bài vẫn chạy đầy đủ, chỉ không có khối AI.
 *
 * Đọc `reasonJson` ở ĐÂY chứ không ở thành phần client: chuỗi JSON thô của
 * model không nên đi vào payload gửi xuống trình duyệt.
 */
async function loadAiPanel(input: {
  userId: string;
  reviewId: string;
  attemptId: string;
  mistakes: Array<{ questionId: string; numberLabel: string }>;
}): Promise<AiPanelData | null> {
  if (!readFeynmanAiConfig().enabled) return null;

  const [evaluation, budget] = await Promise.all([
    db.feynmanAiEvaluation.findUnique({
      where: { reviewId: input.reviewId },
      include: {
        messages: {
          where: { status: "COMPLETED" },
          orderBy: { createdAt: "asc" },
          select: { id: true, question: true, answer: true },
        },
      },
    }),
    db.feynmanAiBudget.findUnique({ where: { userId: input.userId } }),
  ]);

  const labels: Record<string, string> = {};
  for (const mistake of input.mistakes) {
    labels[mistake.questionId] = `Câu ${mistake.numberLabel}`;
  }

  let view: AiEvaluationView | null = null;
  if (evaluation && evaluation.status === "COMPLETED") {
    view = {
      id: evaluation.id,
      verdict: evaluation.verdict ?? "KHONG_DAT",
      similarityPercent: evaluation.similarityPercent ?? 0,
      perQuestion: safeJsonArray(evaluation.reasonJson),
      advice: safeJsonObject(evaluation.overallAdviceJson),
      labels,
    };
  }

  return {
    evaluation: view,
    turns: (evaluation?.messages ?? []).map((m) => ({
      id: m.id,
      question: m.question,
      answer: m.answer ?? "",
    })),
    questionLimit: evaluation?.questionLimit ?? 0,
    questionUsed: evaluation?.questionUsed ?? 0,
    walletRemaining: walletRemaining(budget ?? { grantedTotal: 0, usedTotal: 0 }),
    topUpHref: `/thanh-toan?luot=${input.attemptId}`,
  };
}

/** JSON hỏng thì trả về rỗng: một bản chấm thiếu chi tiết vẫn hơn một trang trắng. */
function safeJsonArray(text: string | null): AiEvaluationView["perQuestion"] {
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeJsonObject(text: string | null): AiEvaluationView["advice"] {
  if (!text) return null;
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
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
