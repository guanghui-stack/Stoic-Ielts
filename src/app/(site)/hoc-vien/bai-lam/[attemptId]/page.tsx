import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  ArrowLeft,
  TimerOff,
  Brain,
  Lock,
  Sparkles,
} from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import {
  gradeReading,
  type ReadingContent,
} from "@/lib/exercise-content";
import { NoteBox, SubmitButton } from "@/components/ui";
import { startFeynmanReviewAction } from "@/lib/actions/feynman";
import { revealBasicAnswersAction } from "@/lib/actions/attempts";
import { hasActiveAccess } from "@/lib/access-grants";
import { feynmanSinglePrice } from "@/lib/payments/quote";
import { isSePayConfigured } from "@/lib/payments/sepay";
import { OFFERS, formatVnd, INTRO_PROMO_NOTICE } from "@/lib/payments/catalog";
import { PurchaseButton } from "@/components/payments/purchase-button";
import { assemblyTitle, readingContentForAttempt } from "@/lib/attempt-content";

export const metadata = { title: "Kết quả bài làm" };

function fmt(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

export default async function AttemptResultPage({
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
      // Phiên luyện mới nhất. Trang này chỉ cần biết tình trạng hiện tại, còn
      // các phiên cũ thuộc về lịch sử.
      feynmanReviews: {
        orderBy: { runNumber: "desc" },
        take: 1,
        select: { id: true, status: true, mode: true },
      },
    },
  });
  if (!attempt || (attempt.userId !== user.id && user.role !== "ADMIN")) {
    redirect("/hoc-vien");
  }
  if (attempt.exercise.skill !== "READING") redirect("/hoc-vien");
  if (attempt.status === "IN_PROGRESS") redirect(`/lam-bai/${attempt.id}`);

  const isOwner = attempt.userId === user.id;
  const feynmanReview = attempt.feynmanReviews[0] ?? null;

  /**
   * ĐÁP ÁN CƠ BẢN LÀ MIỄN PHÍ. Học viên chỉ cần bấm một lần để mở — cú bấm đó
   * giữ lại khoảnh khắc dừng suy nghĩ, chứ không phải hàng rào bán hàng.
   * Feynman bán lớp chữa sâu (lời giải mẫu, bẫy, bằng chứng), không bán đáp án.
   */
  const answersUnlocked =
    user.role === "ADMIN" ||
    attempt.answersRevealedAt !== null ||
    feynmanReview?.status === "COMPLETED";

  // Quyền Feynman chỉ cần hỏi khi thật sự sắp hiển thị lời mời chữa bài
  const showFeynman = isOwner && attempt.status === "GRADED";
  const [feynmanAccess, feynmanPrice] = showFeynman
    ? await Promise.all([
        hasActiveAccess({
          userId: user.id,
          feature: "FEYNMAN",
          exerciseId: attempt.exerciseId,
          attemptId: attempt.id,
        }),
        feynmanSinglePrice(user.id),
      ])
    : [false, null];

  return (
    <section className="mx-auto max-w-4xl px-6 py-12 md:py-16">
      <Link
        href="/hoc-vien"
        className="inline-flex items-center gap-2 font-ui text-sm font-semibold text-navy hover:text-gold"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Hồ sơ học tập
      </Link>

      <div className="mt-6">
        <p className="label-caps">
          Kết quả Reading
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-navy-deep md:text-4xl">
          {attempt.assemblyId
            ? await assemblyTitle(attempt.assemblyId)
            : attempt.exercise.title}
        </h1>
        <div className="rule-gold mt-5" />
        <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-3 font-ui text-sm text-ink-soft">
          <div>
            <dt className="inline font-semibold text-ink">Nộp lúc: </dt>
            <dd className="inline">{fmt(attempt.submittedAt)}</dd>
          </div>
          {attempt.autoSubmitted && (
            <div className="flex items-center gap-1.5 text-danger">
              <TimerOff className="h-4 w-4" aria-hidden="true" />
              Tự động nộp khi hết giờ
            </div>
          )}
        </dl>
      </div>

      {showFeynman && (
        <FeynmanCta
          attemptId={attempt.id}
          exerciseId={attempt.exerciseId}
          status={feynmanReview?.status ?? null}
          mode={feynmanReview?.mode ?? null}
          hasAccess={feynmanAccess}
          price={feynmanPrice}
          canBuy={isSePayConfigured()}
        />
      )}

      <ReadingResult
        attempt={attempt}
        content={await readingContentForAttempt(attempt)}
        answersUnlocked={answersUnlocked}
        canReveal={isOwner && attempt.status === "GRADED"}
      />
    </section>
  );
}

/**
 * Khối Feynman ở đầu trang kết quả, có năm hình thái:
 * đang chữa dở · đã chữa xong · có quyền chưa bắt đầu · chưa có quyền (còn ưu
 * đãi lần đầu) · chưa có quyền (đã dùng ưu đãi).
 */
function FeynmanCta({
  attemptId,
  exerciseId,
  status,
  mode,
  hasAccess,
  price,
  canBuy,
}: {
  attemptId: string;
  exerciseId: string;
  status: string | null;
  mode: string | null;
  hasAccess: boolean;
  price: { amount: number; isIntro: boolean } | null;
  canBuy: boolean;
}) {
  const href = `/hoc-vien/bai-lam/${attemptId}/feynman`;

  // Chưa mua thì mời mua — nhưng chỉ khi chưa có phiên nào đang dở dang.
  if (!hasAccess && !status) {
    return (
      <FeynmanPurchaseCta
        exerciseId={exerciseId}
        attemptId={attemptId}
        price={price}
        canBuy={canBuy}
      />
    );
  }

  if (status === "COMPLETED") {
    return (
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-l-4 border-success bg-success-pale px-6 py-5">
        <p className="flex items-center gap-2.5 font-ui text-sm text-success">
          <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>
            <strong>Đã chữa bài xong</strong> — toàn bộ đáp án bên dưới đã được mở.
          </span>
        </p>
        <Link
          href={href}
          className="border border-success px-5 py-2.5 font-ui text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-success transition-colors hover:bg-success hover:text-paper"
        >
          Xem lại bản chữa bài
        </Link>
      </div>
    );
  }

  const started = status === "DRAFT" || status === "REVEALED";
  return (
    <div className="mt-8 border border-gold bg-gold-pale p-7">
      <p className="label-caps flex items-center gap-2">
        <Brain className="h-3.5 w-3.5" aria-hidden="true" />
        Phương pháp Feynman
      </p>
      <h2 className="mt-2.5 font-display text-xl font-bold text-navy-deep md:text-2xl">
        {started
          ? "Bạn đang chữa bài dở dang"
          : "Chữa sâu bài này bằng Feynman"}
      </h2>
      <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-ink-soft">
        {started
          ? mode === "DEEP"
            ? "Tiếp tục phiên chữa sâu — bạn đang ở giữa chừng."
            : "Tiếp tục phiên chữa nhanh — bạn đang ở giữa chừng."
          : "Tự giảng lại, tìm bằng chứng, nhận diện bẫy và rút quy tắc cho bài sau. Bạn đã có quyền chữa bài này."}
      </p>
      <div className="mt-5">
        {started ? (
          <Link
            href={href}
            className="inline-flex items-center gap-2 border border-gold bg-gold px-7 py-3 font-ui text-[0.8rem] font-semibold uppercase tracking-[0.12em] text-paper transition-colors hover:bg-[#9d7223]"
          >
            <Brain className="h-4 w-4" aria-hidden="true" />
            Tiếp tục chữa bài
          </Link>
        ) : (
          // Tạo phiên chữa bài rồi chuyển sang trang Feynman.
          // Idempotent theo attemptId nên bấm nhiều lần cũng chỉ có một phiên.
          <form action={startFeynmanReviewAction.bind(null, attemptId)}>
            <SubmitButton variant="gold">
              <Brain className="h-4 w-4" aria-hidden="true" />
              Bắt đầu chữa bài
            </SubmitButton>
          </form>
        )}
      </div>
    </div>
  );
}

/** Mời mua lớp chữa sâu Feynman, hiển thị đúng giá của tài khoản này. */
function FeynmanPurchaseCta({
  exerciseId,
  attemptId,
  price,
  canBuy,
}: {
  exerciseId: string;
  attemptId: string;
  price: { amount: number; isIntro: boolean } | null;
  canBuy: boolean;
}) {
  return (
    <div className="mt-8 border border-gold bg-gold-pale p-7">
      <p className="label-caps flex items-center gap-2">
        <Brain className="h-3.5 w-3.5" aria-hidden="true" />
        Phương pháp Feynman
      </p>
      <h2 className="mt-2.5 font-display text-xl font-bold text-navy-deep md:text-2xl">
        Chữa sâu bài này bằng Feynman
      </h2>
      <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-ink-soft">
        Tự giảng lại, tìm bằng chứng, nhận diện bẫy và rút quy tắc cho bài sau.
        Kèm lời giải mẫu của giáo viên cho từng câu bạn làm sai.
      </p>

      {price?.isIntro && (
        <p className="mt-4 flex items-start gap-2 font-ui text-sm leading-relaxed text-ink">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
          {INTRO_PROMO_NOTICE}
        </p>
      )}

      {canBuy ? (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <PurchaseButton
            offerCode="FEYNMAN_SINGLE"
            exerciseId={exerciseId}
            attemptId={attemptId}
            variant="gold"
          >
            <Brain className="h-4 w-4" aria-hidden="true" />
            {price?.isIntro ? "Mở bài Feynman đầu tiên" : "Mở Feynman bài này"} ·{" "}
            {formatVnd(price?.amount ?? OFFERS.FEYNMAN_SINGLE.amount)}
          </PurchaseButton>
          <PurchaseButton offerCode="FEYNMAN_ALL_30D" variant="outline">
            Mở toàn bộ 30 ngày · {formatVnd(OFFERS.FEYNMAN_ALL_30D.amount)}
          </PurchaseButton>
        </div>
      ) : (
        <p className="mt-5 font-ui text-sm text-ink-soft">
          Thanh toán trực tuyến đang tạm đóng — liên hệ trung tâm để được mở
          khóa phần chữa bài này.
        </p>
      )}

      <p className="mt-4 font-ui text-xs leading-relaxed text-muted">
        Đáp án đúng của bài Reading luôn miễn phí — bạn xem được ngay bên dưới
        mà không cần mua gì.
      </p>
    </div>
  );
}

function ReadingResult({
  attempt,
  content,
  answersUnlocked,
  canReveal,
}: {
  answersUnlocked: boolean;
  canReveal: boolean;
  content: ReadingContent;
  attempt: {
    id: string;
    answers: string;
    scoreRaw: number | null;
    scoreTotal: number | null;
  };
}) {
  const answers = JSON.parse(attempt.answers || "{}");
  const { detail } = gradeReading(content, answers);

  const pct =
    attempt.scoreTotal && attempt.scoreTotal > 0
      ? Math.round(((attempt.scoreRaw ?? 0) / attempt.scoreTotal) * 100)
      : 0;

  return (
    <>
      <div className="mt-10 grid gap-px border border-line bg-line sm:grid-cols-3">
        <div className="bg-paper p-7 text-center">
          <p className="label-caps">Số câu đúng</p>
          <p className="mt-3 font-display text-5xl font-bold text-navy-deep">
            {attempt.scoreRaw}
            <span className="text-2xl text-muted">/{attempt.scoreTotal}</span>
          </p>
        </div>
        <div className="bg-paper p-7 text-center">
          <p className="label-caps">Tỷ lệ chính xác</p>
          <p className="mt-3 font-display text-5xl font-bold text-gold">{pct}%</p>
        </div>
        <div className="bg-paper p-7 text-center">
          <p className="label-caps">Đánh giá</p>
          <p className="mt-3 font-display text-2xl font-bold leading-snug text-ink">
            {pct >= 85
              ? "Xuất sắc"
              : pct >= 65
                ? "Vững vàng"
                : pct >= 45
                  ? "Cần luyện thêm"
                  : "Nền tảng"}
          </p>
        </div>
      </div>

      <h2 id="chi-tiet" className="mt-12 font-display text-2xl font-bold text-navy-deep">
        Chi tiết từng câu
      </h2>
      {!answersUnlocked && (
        // Không phải hàng rào bán hàng: đáp án miễn phí, chỉ cách một cú bấm.
        // Cú bấm đó để học viên kịp tự đoán trước khi nhìn đáp án.
        <div className="mt-4 border-l-4 border-gold bg-cream-deep px-5 py-5">
          <p className="flex items-start gap-2.5 font-ui text-sm leading-relaxed text-ink-soft">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
            <span>
              Trước khi xem đáp án, hãy thử tự nhớ lại xem mình đã chọn dựa vào
              câu nào trong bài. Vài giây đó đáng giá hơn cả trang đáp án.
            </span>
          </p>
          {canReveal && (
            <form
              action={revealBasicAnswersAction.bind(null, attempt.id)}
              className="mt-4"
            >
              <SubmitButton variant="outline">Xem đáp án cơ bản — miễn phí</SubmitButton>
            </form>
          )}
        </div>
      )}
      <ol className="mt-6 divide-y divide-line border-y border-line">
        {detail.map((q) => (
          <li key={q.id} className="flex gap-4 py-4">
            {q.correct ? (
              <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
            ) : (
              <XCircle className="mt-1 h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
            )}
            <div className="min-w-0">
              <p className="leading-relaxed text-ink">
                <span className="font-ui text-sm font-bold tabular-nums text-gold">
                  {q.numberLabel}.
                </span>{" "}
                {q.prompt}
              </p>
              <p className="mt-1.5 font-ui text-sm">
                <span className={q.correct ? "text-success" : "text-danger"}>
                  Bạn trả lời: {q.userAnswer || "(bỏ trống)"}
                  {q.maxScore > 1 && ` — đúng ${q.score}/${q.maxScore}`}
                </span>
                {!q.correct &&
                  (answersUnlocked ? (
                    <span className="ml-4 text-success">
                      Đáp án đúng: {q.correctAnswer}
                    </span>
                  ) : (
                    <span className="ml-4 inline-flex items-center gap-1 text-muted">
                      <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                      Bấm nút ở trên để xem đáp án
                    </span>
                  ))}
              </p>
            </div>
          </li>
        ))}
      </ol>
      <NoteBox className="mt-10" title="Bước tiếp theo">
        Đọc lại passage và đối chiếu những câu sai — xác định bạn sai vì từ vựng,
        vì kỹ thuật định vị hay vì suy diễn. Làm lại bài sau 2–3 ngày để kiểm tra
        mức tiến bộ thật.
      </NoteBox>
    </>
  );
}
