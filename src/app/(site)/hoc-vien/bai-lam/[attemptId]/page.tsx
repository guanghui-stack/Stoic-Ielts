import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  Hourglass,
  ArrowLeft,
  TimerOff,
  Brain,
  Lock,
} from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import {
  gradeReading,
  countWords,
  type ReadingContent,
  type WritingContent,
} from "@/lib/exercise-content";
import { NoteBox, SubmitButton } from "@/components/ui";
import { startFeynmanReviewAction } from "@/lib/actions/feynman";

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
      feynmanReview: { select: { id: true, status: true, mode: true } },
    },
  });
  if (!attempt || (attempt.userId !== user.id && user.role !== "ADMIN")) {
    redirect("/hoc-vien");
  }
  if (attempt.status === "IN_PROGRESS") redirect(`/lam-bai/${attempt.id}`);

  const isReading = attempt.exercise.skill === "READING";
  const isOwner = attempt.userId === user.id;

  /**
   * KHÓA ĐÁP ÁN: đáp án đúng của câu sai chỉ được hiện khi người xem là quản
   * trị viên, hoặc khi học viên đã hoàn thành phiên chữa bài Feynman. Đây là
   * cơ chế buộc người học tự giải thích trước khi biết đáp án.
   */
  const answersUnlocked =
    user.role === "ADMIN" || attempt.feynmanReview?.status === "COMPLETED";

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
          {isReading ? "Kết quả Reading" : "Bài Writing đã nộp"}
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-navy-deep md:text-4xl">
          {attempt.exercise.title}
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

      {isReading && isOwner && attempt.status === "GRADED" && (
        <FeynmanCta
          attemptId={attempt.id}
          status={attempt.feynmanReview?.status ?? null}
          mode={attempt.feynmanReview?.mode ?? null}
        />
      )}

      {isReading ? (
        <ReadingResult attempt={attempt} answersUnlocked={answersUnlocked} />
      ) : (
        <WritingResult attempt={attempt} />
      )}
    </section>
  );
}

/** Lời mời / tiếp tục / xem lại phiên chữa bài Feynman. */
function FeynmanCta({
  attemptId,
  status,
  mode,
}: {
  attemptId: string;
  status: string | null;
  mode: string | null;
}) {
  const href = `/hoc-vien/bai-lam/${attemptId}/feynman`;

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
          : "Biến bài này thành kiến thức dùng được cho bài sau"}
      </h2>
      <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-ink-soft">
        {started
          ? mode === "DEEP"
            ? "Tiếp tục phiên chữa sâu để mở toàn bộ đáp án."
            : "Tiếp tục phiên chữa nhanh để mở toàn bộ đáp án."
          : "Đáp án đúng của những câu bạn làm sai đang được giữ kín. Hãy tự giảng lại bài đọc và tự chẩn đoán lỗi trước — cách học này giúp bạn nhớ lâu hơn nhiều so với việc đọc đáp án ngay."}
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

function ReadingResult({
  attempt,
  answersUnlocked,
}: {
  answersUnlocked: boolean;
  attempt: {
    answers: string;
    scoreRaw: number | null;
    scoreTotal: number | null;
    exercise: { content: string };
  };
}) {
  const content = JSON.parse(attempt.exercise.content) as ReadingContent;
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

      <h2 className="mt-12 font-display text-2xl font-bold text-navy-deep">
        Chi tiết từng câu
      </h2>
      {!answersUnlocked && (
        <p className="mt-4 flex items-start gap-2.5 border-l-4 border-gold bg-cream-deep px-5 py-4 font-ui text-sm leading-relaxed text-ink-soft">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
          <span>
            Đáp án đúng của các câu sai đang được giữ kín. Hoàn thành phần chữa
            bài Feynman ở trên để mở toàn bộ đáp án.
          </span>
        </p>
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
                      Đáp án mở sau khi chữa bài
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

function WritingResult({
  attempt,
}: {
  attempt: {
    answers: string;
    status: string;
    band: number | null;
    feedback: string | null;
    gradedAt: Date | null;
    exercise: { content: string };
  };
}) {
  const content = JSON.parse(attempt.exercise.content) as WritingContent;
  const parsed = JSON.parse(attempt.answers || "{}") as { essay?: string };
  const essay = parsed.essay ?? "";
  const words = countWords(essay);
  const graded = attempt.status === "GRADED";

  return (
    <>
      <div className="mt-10 grid gap-px border border-line bg-line sm:grid-cols-3">
        <div className="bg-paper p-7 text-center">
          <p className="label-caps">Trạng thái</p>
          <p className="mt-3 flex items-center justify-center gap-2 font-display text-2xl font-bold text-ink">
            {graded ? (
              <>
                <CheckCircle2 className="h-6 w-6 text-success" aria-hidden="true" />
                Đã chấm
              </>
            ) : (
              <>
                <Hourglass className="h-6 w-6 text-gold" aria-hidden="true" />
                Chờ chấm
              </>
            )}
          </p>
        </div>
        <div className="bg-paper p-7 text-center">
          <p className="label-caps">Band điểm</p>
          <p className="mt-3 font-display text-5xl font-bold text-gold">
            {graded && attempt.band != null ? attempt.band.toFixed(1) : "—"}
          </p>
        </div>
        <div className="bg-paper p-7 text-center">
          <p className="label-caps">Số từ</p>
          <p className="mt-3 font-display text-5xl font-bold text-navy-deep">
            {words}
            <span className="text-2xl text-muted">/{content.minWords}</span>
          </p>
        </div>
      </div>

      {graded && attempt.feedback && (
        <div className="mt-10 border-l-4 border-gold bg-cream-deep p-7">
          <p className="label-caps">Nhận xét của giáo viên</p>
          <div className="mt-4 space-y-3 leading-relaxed text-ink">
            {attempt.feedback.split("\n").map(
              (line, i) => line.trim() && <p key={i}>{line}</p>
            )}
          </div>
          <p className="mt-4 font-ui text-xs text-muted">
            Chấm lúc {fmtDate(attempt.gradedAt)}
          </p>
        </div>
      )}

      {!graded && (
        <NoteBox className="mt-10" title="Đang trong hàng chờ">
          Giáo viên sẽ chấm bài theo rubric 4 tiêu chí và trả nhận xét trong
          vòng 48 giờ. Kết quả sẽ hiển thị ngay tại trang này.
        </NoteBox>
      )}

      <h2 className="mt-12 font-display text-2xl font-bold text-navy-deep">
        Bài viết của bạn
      </h2>
      <div className="mt-5 border border-line bg-paper p-7 shadow-card md:p-9">
        <p className="mb-5 border-b border-line pb-4 text-[0.92rem] italic leading-relaxed text-ink-soft">
          {content.prompt.split("\n\n")[0]}
        </p>
        {essay ? (
          <div className="space-y-4 leading-[1.9] text-ink">
            {essay.split(/\n+/).map((p, i) => p.trim() && <p key={i}>{p}</p>)}
          </div>
        ) : (
          <p className="italic text-muted">Bài nộp không có nội dung.</p>
        )}
      </div>
    </>
  );
}

function fmtDate(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}
