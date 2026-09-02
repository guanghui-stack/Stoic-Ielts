"use client";

import { QUESTION_TYPE_LABELS } from "@/lib/exercise-content";
import { useActionState, useState } from "react";
import {
  Eye,
  CheckCircle2,
  Lightbulb,
  Quote,
  AlertTriangle,
  ArrowRightLeft,
} from "lucide-react";
import {
  revealFeynmanReviewAction,
  completeFeynmanReviewAction,
  type FeynmanFormState,
} from "@/lib/actions/feynman";
import {
  FEYNMAN_ERROR_TYPES,
  FEYNMAN_ERROR_LABELS,
  FEYNMAN_LIMITS,
  CONFIDENCE_LABELS,
} from "@/lib/feynman-constants";
import { ErrorBanner, SubmitButton } from "@/components/ui";

/* ===================== Kiểu dữ liệu ===================== */

/** Dữ liệu một câu chữa sâu. Các trường model* CHỈ có mặt khi đã REVEALED. */
export type FeynmanMistakeView = {
  id: string;
  numberLabel: string;
  questionType: string;
  partNumber: number;
  prompt: string;
  userAnswer: string;
  errorType?: string | null;
  evidenceParagraph?: string | null;
  evidenceText?: string | null;
  firstExplanation?: string | null;
  revisedExplanation?: string | null;
  lessonRule?: string | null;
  correctAnswer?: string;
  modelEvidenceParagraph?: string | null;
  modelEvidence?: string | null;
  modelExplanation?: string | null;
  modelTrap?: string | null;
  modelParaphrases?: Array<{ question: string; passage: string }>;
};


/* ===================== Khối dùng chung ===================== */

const labelCls =
  "block text-[0.72rem] font-semibold uppercase tracking-[0.09em] text-stoic-ink";
const inputCls =
  "mt-2 min-h-11 w-full rounded-stoic-md border border-stoic-line-strong bg-stoic-canvas px-4 py-3 text-base leading-relaxed text-stoic-ink placeholder:text-stoic-ink-muted focus:border-stoic-primary focus:outline-none focus:ring-2 focus:ring-stoic-primary/20";

/** Ô nhập dài kèm bộ đếm ký tự trực tiếp — học viên biết ngay còn thiếu bao nhiêu. */
function CountedTextarea({
  name,
  label,
  hint,
  limits,
  rows = 4,
  defaultValue = "",
  optional = false,
}: {
  name: string;
  label: string;
  hint?: string;
  limits: { min: number; max: number };
  rows?: number;
  defaultValue?: string;
  optional?: boolean;
}) {
  const [len, setLen] = useState(defaultValue.length);
  const tooShort = len < limits.min;
  const tooLong = len > limits.max;
  const empty = len === 0;
  const showWarn = tooLong || (tooShort && !(optional && empty));

  return (
    <div>
      <label htmlFor={name} className={labelCls}>
        {label}
        {!optional && <span className="ml-1 text-danger" aria-hidden="true">*</span>}
      </label>
      {hint && (
        <p id={`${name}-hint`} className="mt-1 font-ui text-xs leading-relaxed text-muted">
          {hint}
        </p>
      )}
      <textarea
        id={name}
        name={name}
        rows={rows}
        required={!optional}
        minLength={limits.min}
        maxLength={limits.max}
        defaultValue={defaultValue}
        onChange={(e) => setLen(e.target.value.trim().length)}
        aria-required={!optional}
        aria-invalid={showWarn || undefined}
        aria-describedby={`${name}-count${hint ? ` ${name}-hint` : ""}`}
        className={`${inputCls} resize-y`}
      />
      <p
        id={`${name}-count`}
        className={`mt-1 text-right text-xs tabular-nums ${
          showWarn ? "font-semibold text-stoic-danger" : "text-stoic-ink-muted"
        }`}
        aria-live="polite"
      >
        {len}/{limits.max} ký tự
        {tooShort && !(optional && empty) && ` — cần thêm ${limits.min - len}`}
        {tooLong && ` — vượt ${len - limits.max}`}
      </p>
    </div>
  );
}

/** Thang tự tin 1–5. Mỗi ô cao 44px để bấm dễ trên điện thoại. */
function ConfidenceScale({
  name,
  legend,
  defaultValue,
}: {
  name: string;
  legend: string;
  defaultValue?: number | null;
}) {
  return (
    <fieldset>
      <legend className={labelCls}>
        {legend}
        <span className="ml-1 text-danger" aria-hidden="true">*</span>
      </legend>
      <div className="mt-3 grid gap-2 sm:grid-cols-5">
        {[1, 2, 3, 4, 5].map((v) => (
          <label
            key={v}
            className="flex min-h-12 cursor-pointer items-center gap-2 rounded-stoic-md border border-stoic-line bg-stoic-canvas px-3 py-2 text-sm text-stoic-ink transition-colors hover:border-stoic-primary has-[:checked]:border-stoic-primary has-[:checked]:bg-stoic-primary-soft/55 has-[:checked]:font-semibold"
          >
            <input
              type="radio"
              name={name}
              value={v}
              required
              defaultChecked={defaultValue === v}
              className="h-4 w-4 shrink-0 accent-[var(--color-stoic-primary)]"
            />
            <span>
              <span className="font-bold tabular-nums">{v}</span>
              <span className="ml-1.5 text-xs text-stoic-ink-secondary">{CONFIDENCE_LABELS[v]}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Thẻ tiêu đề của một câu chữa sâu. */
function MistakeHeader({ m }: { m: FeynmanMistakeView }) {
  return (
    <div className="border-b border-stoic-line bg-stoic-canvas-soft px-5 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-stoic-primary bg-stoic-primary-soft px-2.5 py-0.5 font-ui text-xs font-bold text-stoic-primary-deep">
          Câu {m.numberLabel}
        </span>
        <span className="text-xs text-stoic-ink-muted">
          Part {m.partNumber} · {QUESTION_TYPE_LABELS[m.questionType] ?? m.questionType}
        </span>
      </div>
      <p className="mt-2.5 leading-relaxed text-stoic-ink">{m.prompt}</p>
      <p className="mt-2 text-sm text-stoic-danger">
        Bạn đã trả lời: <strong>{m.userAnswer || "(bỏ trống)"}</strong>
      </p>
    </div>
  );
}

/** Thanh 4 bước — cho học viên biết đang ở đâu trong quy trình. */
export function FeynmanStepper({ current }: { current: 1 | 2 | 3 | 4 }) {
  const steps = [
    "Giải thích từ trí nhớ",
    "Chẩn đoán lỗi sai",
    "Đối chiếu & sửa lại",
    "Giảng lại",
  ];
  return (
    <div
      className="rounded-stoic-lg border border-stoic-line bg-stoic-canvas p-1.5 shadow-stoic-1"
      role="region"
      aria-label="Tiến trình chữa bài Feynman"
    >
      <ol className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {steps.map((s, i) => {
          const n = i + 1;
          const done = n < current;
          const active = n === current;
          return (
            <li
              key={s}
              aria-current={active ? "step" : undefined}
              aria-label={
                done
                  ? `${s} — đã hoàn thành`
                  : active
                    ? `${s} — đang thực hiện`
                    : s
              }
              className={`flex min-h-12 items-center gap-2.5 rounded-stoic-md px-3.5 py-2.5 ${
                active
                  ? "bg-stoic-primary-soft/65 text-stoic-primary-deep"
                  : done
                    ? "bg-success-pale text-success"
                    : "bg-stoic-canvas-soft text-stoic-ink-muted"
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  active
                    ? "bg-stoic-primary text-white"
                    : done
                      ? "bg-success text-white"
                      : "border border-stoic-line-strong bg-stoic-canvas text-stoic-ink-muted"
                }`}
              >
                {done ? (
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                ) : (
                  n
                )}
              </span>
              <span className={`text-xs leading-tight ${active || done ? "font-semibold" : ""}`}>
                {s}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ===================== Giai đoạn 1: DRAFT ===================== */

export function FeynmanDraftForm({
  reviewId,
  mistakes,
}: {
  reviewId: string;
  mistakes: FeynmanMistakeView[];
}) {
  const action = revealFeynmanReviewAction.bind(null, reviewId);
  const [state, formAction, pending] = useActionState<FeynmanFormState, FormData>(
    action,
    undefined
  );

  return (
    <form action={formAction} className="space-y-10">
      {state?.error && (
        <div className="sticky top-4 z-10">
          <ErrorBanner message={state.error} />
        </div>
      )}

      {/* ---- Bước 1 ---- */}
      <section className="rounded-stoic-lg border border-stoic-line bg-stoic-canvas p-6 shadow-stoic-1 sm:p-7 md:p-8">
        <p className="label-caps">Bước 1</p>
        <h2 className="mt-2 text-2xl font-medium tracking-[-0.025em] text-stoic-ink">
          Giải thích bài đọc từ trí nhớ
        </h2>
        <div className="rule-gold mt-4" />
        <p className="mt-4 text-[0.95rem] leading-relaxed text-stoic-ink-secondary">
          Chưa xem đáp án vội. Hãy viết như thể bạn đang giảng cho một người chưa
          đọc bài này — dùng từ ngữ đơn giản của chính bạn.
        </p>

        <div className="mt-7 space-y-6">
          <CountedTextarea
            name="passageSummary"
            label="Bài đọc nói về điều gì?"
            hint="Tách ý chính khỏi chi tiết. Nếu phải dùng nguyên câu trong bài mới diễn đạt được, đó là dấu hiệu bạn chưa thực sự hiểu."
            limits={FEYNMAN_LIMITS.passageSummary}
            rows={5}
          />
          <CountedTextarea
            name="paragraphMap"
            label="Vai trò của từng đoạn"
            hint="Ví dụ: A — giới thiệu nhân vật · B — các tác phẩm đầu tiên · C — lập luận chính…"
            limits={FEYNMAN_LIMITS.paragraphMap}
            rows={5}
          />
          <CountedTextarea
            name="confusingPoint"
            label="Chỗ bạn vẫn thấy khó hiểu (không bắt buộc)"
            hint="Ghi lại đúng chỗ còn mơ hồ — đây thường là nơi lỗi sai bắt nguồn."
            limits={FEYNMAN_LIMITS.confusingPoint}
            rows={3}
            optional
          />
          <ConfidenceScale
            name="confidenceBefore"
            legend="Mức độ tự tin của bạn lúc này"
          />
        </div>
      </section>

      {/* ---- Bước 2 ---- */}
      <section className="rounded-stoic-lg border border-stoic-line bg-stoic-canvas p-6 shadow-stoic-1 sm:p-7 md:p-8">
        <p className="label-caps">Bước 2</p>
        <h2 className="mt-2 text-2xl font-medium tracking-[-0.025em] text-stoic-ink">
          Tự chẩn đoán {mistakes.length} câu quan trọng nhất
        </h2>
        <div className="rule-gold mt-4" />
        {mistakes.length === 0 ? (
          <p className="mt-5 border-l-4 border-success bg-success-pale px-5 py-4 text-[0.95rem] leading-relaxed text-success">
            Bạn làm đúng tất cả các câu — không có lỗi nào cần chẩn đoán. Hãy
            hoàn thành phần giải thích ở trên để ghi lại chiến lược đã giúp bạn
            đạt kết quả này.
          </p>
        ) : (
          <>
            <p className="mt-4 text-[0.95rem] leading-relaxed text-ink-soft">
              Với mỗi câu: quay lại bài đọc, tìm bằng chứng, rồi tự giải thích vì
              sao mình chọn sai. <strong className="text-ink">Đáp án đúng
              vẫn đang được giữ kín</strong> — bạn phải tự suy luận trước.
            </p>
            <div className="mt-7 space-y-8">
              {mistakes.map((m) => (
                <article
                  key={m.id}
                  className="overflow-hidden rounded-stoic-lg border border-stoic-line"
                >
                  <MistakeHeader m={m} />
                  <div className="space-y-5 p-5">
                    <fieldset>
                      <legend className={labelCls}>
                        Vì sao bạn nghĩ mình sai?
                        <span className="ml-1 text-danger" aria-hidden="true">*</span>
                      </legend>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {FEYNMAN_ERROR_TYPES.map((t) => (
                          <label
                            key={t}
                            className="flex min-h-12 cursor-pointer items-start gap-2.5 rounded-stoic-md border border-stoic-line bg-stoic-canvas-soft px-3 py-2.5 text-[0.85rem] leading-snug text-stoic-ink transition-colors hover:border-stoic-primary has-[:checked]:border-stoic-primary has-[:checked]:bg-stoic-primary-soft/60"
                          >
                            <input
                              type="radio"
                              name={`errorType_${m.id}`}
                              value={t}
                              required
                              defaultChecked={m.errorType === t}
                              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-stoic-primary)]"
                            />
                            {FEYNMAN_ERROR_LABELS[t]}
                          </label>
                        ))}
                      </div>
                    </fieldset>

                    <div>
                      <label htmlFor={`evidenceParagraph_${m.id}`} className={labelCls}>
                        Bằng chứng nằm ở đoạn nào?
                        <span className="ml-1 text-danger" aria-hidden="true">*</span>
                      </label>
                      <input
                        id={`evidenceParagraph_${m.id}`}
                        name={`evidenceParagraph_${m.id}`}
                        required
                        aria-required="true"
                        defaultValue={m.evidenceParagraph ?? ""}
                        placeholder="Ví dụ: C  ·  Part 2 — đoạn B"
                        maxLength={FEYNMAN_LIMITS.evidenceParagraph.max}
                        className={`${inputCls} max-w-xs font-ui`}
                      />
                    </div>

                    <CountedTextarea
                      name={`evidenceText_${m.id}`}
                      label="Câu/cụm nào trong bài là bằng chứng?"
                      hint="Chép ngắn hoặc diễn giải lại — quan trọng là quay về đúng chỗ trong bài."
                      limits={FEYNMAN_LIMITS.evidenceText}
                      rows={3}
                      defaultValue={m.evidenceText ?? ""}
                    />
                    <CountedTextarea
                      name={`firstExplanation_${m.id}`}
                      label="Lúc làm bài bạn đã suy luận thế nào?"
                      hint="Viết thật thà suy nghĩ ban đầu — kể cả khi biết nó sai. Đây là dữ liệu quý nhất để sửa."
                      limits={FEYNMAN_LIMITS.firstExplanation}
                      rows={4}
                      defaultValue={m.firstExplanation ?? ""}
                    />
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <div className="rounded-stoic-lg border border-stoic-primary/20 bg-stoic-primary-soft/35 px-5 py-5 sm:px-6">
        <p className="font-ui text-sm leading-relaxed text-ink-soft">
          Nộp xong bước này, hệ thống mới mở lời giải mẫu và đáp án đúng. Bạn sẽ
          không sửa được phần đã viết ở trên — đó là điểm mấu chốt để so sánh
          cách nghĩ trước và sau.
        </p>
        <div className="mt-5">
          <SubmitButton disabled={pending} variant="stoicPrimary">
            <Eye className="h-4 w-4" aria-hidden="true" />
            {pending ? "Đang lưu…" : "Nộp và xem lời giải"}
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}

/* ===================== Giai đoạn 2: REVEALED ===================== */

export function FeynmanRevealedForm({
  reviewId,
  mistakes,
}: {
  reviewId: string;
  mistakes: FeynmanMistakeView[];
}) {
  const action = completeFeynmanReviewAction.bind(null, reviewId);
  const [state, formAction, pending] = useActionState<FeynmanFormState, FormData>(
    action,
    undefined
  );

  return (
    <form action={formAction} className="space-y-10">
      {state?.error && (
        <div className="sticky top-4 z-10">
          <ErrorBanner message={state.error} />
        </div>
      )}

      {/* ---- Bước 3 ---- */}
      <section className="rounded-stoic-lg border border-stoic-line bg-stoic-canvas p-6 shadow-stoic-1 sm:p-7 md:p-8">
        <p className="label-caps">Bước 3</p>
        <h2 className="mt-2 text-2xl font-medium tracking-[-0.025em] text-stoic-ink">
          Đối chiếu lời giải và sửa lại cách nghĩ
        </h2>
        <div className="rule-gold mt-4" />

        {mistakes.length === 0 ? (
          <p className="mt-5 border-l-4 border-success bg-success-pale px-5 py-4 text-[0.95rem] leading-relaxed text-success">
            Không có câu sai nào — bạn chỉ cần hoàn thành phần giảng lại bên dưới.
          </p>
        ) : (
          <div className="mt-7 space-y-8">
            {mistakes.map((m) => (
              <article
                key={m.id}
                className="overflow-hidden rounded-stoic-lg border border-stoic-line"
              >
                <MistakeHeader m={m} />

                {/* Đáp án đúng + lời giải mẫu — chỉ xuất hiện ở giai đoạn này */}
                <div className="border-b border-line bg-success-pale/50 px-5 py-4">
                  <p className="font-ui text-sm text-success">
                    <CheckCircle2 className="mr-1.5 inline h-4 w-4" aria-hidden="true" />
                    Đáp án đúng: <strong>{m.correctAnswer}</strong>
                  </p>
                </div>

                <div className="space-y-4 border-b border-line px-5 py-5">
                  {m.modelExplanation || m.modelEvidence || m.modelTrap ? (
                    <>
                      {m.modelEvidence && (
                        <div>
                          <p className="label-caps flex items-center gap-1.5">
                            <Quote className="h-3 w-3" aria-hidden="true" />
                            Bằng chứng
                            {m.modelEvidenceParagraph && ` · đoạn ${m.modelEvidenceParagraph}`}
                          </p>
                          <p className="mt-1.5 text-[0.95rem] italic leading-relaxed text-ink-soft">
                            {m.modelEvidence}
                          </p>
                        </div>
                      )}
                      {m.modelExplanation && (
                        <div>
                          <p className="label-caps flex items-center gap-1.5">
                            <Lightbulb className="h-3 w-3" aria-hidden="true" />
                            Vì sao đáp án này đúng
                          </p>
                          <p className="mt-1.5 text-[0.95rem] leading-relaxed text-ink">
                            {m.modelExplanation}
                          </p>
                        </div>
                      )}
                      {m.modelTrap && (
                        <div>
                          <p className="label-caps flex items-center gap-1.5">
                            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                            Bẫy của câu này
                          </p>
                          <p className="mt-1.5 text-[0.95rem] leading-relaxed text-ink-soft">
                            {m.modelTrap}
                          </p>
                        </div>
                      )}
                      {m.modelParaphrases && m.modelParaphrases.length > 0 && (
                        <div>
                          <p className="label-caps flex items-center gap-1.5">
                            <ArrowRightLeft className="h-3 w-3" aria-hidden="true" />
                            Cặp paraphrase
                          </p>
                          <dl className="mt-2 divide-y divide-line border-y border-line">
                            {m.modelParaphrases.map((p, i) => (
                              <div key={i} className="grid gap-1 py-2 sm:grid-cols-2 sm:gap-4">
                                <dt className="text-sm font-medium text-stoic-primary-deep">
                                  {p.question}
                                </dt>
                                <dd className="font-ui text-sm text-ink-soft">→ {p.passage}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-[0.92rem] leading-relaxed text-muted">
                      Đề này chưa có lời giải mẫu của giáo viên. Hãy tự đối chiếu
                      đáp án đúng ở trên với đoạn bằng chứng bạn đã tìm, rồi viết
                      lại chuỗi suy luận đúng.
                    </p>
                  )}
                </div>

                {/* So sánh: suy luận ban đầu của học viên */}
                {m.firstExplanation && (
                  <div className="border-b border-stoic-line bg-stoic-canvas-soft px-5 py-4">
                    <p className="label-caps">Suy luận ban đầu của bạn</p>
                    <p className="mt-1.5 text-[0.92rem] leading-relaxed text-muted">
                      {m.firstExplanation}
                    </p>
                  </div>
                )}

                <div className="space-y-5 p-5">
                  <CountedTextarea
                    name={`revisedExplanation_${m.id}`}
                    label="Viết lại chuỗi suy luận ĐÚNG"
                    hint="Không chép lời giải mẫu. Diễn đạt lại bằng lời của bạn, nêu rõ chỗ nào trong cách nghĩ cũ đã sai."
                    limits={FEYNMAN_LIMITS.revisedExplanation}
                    rows={4}
                    defaultValue={m.revisedExplanation ?? ""}
                  />
                  <CountedTextarea
                    name={`lessonRule_${m.id}`}
                    label="Quy tắc rút ra để không lặp lại"
                    hint="Một câu ngắn áp dụng được cho bài khác. Ví dụ: “Chỉ chọn YES khi passage xác nhận TOÀN BỘ mệnh đề.”"
                    limits={FEYNMAN_LIMITS.lessonRule}
                    rows={2}
                    defaultValue={m.lessonRule ?? ""}
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ---- Bước 4 ---- */}
      <section className="rounded-stoic-lg border border-stoic-line bg-stoic-canvas p-6 shadow-stoic-1 sm:p-7 md:p-8">
        <p className="label-caps">Bước 4</p>
        <h2 className="mt-2 text-2xl font-medium tracking-[-0.025em] text-stoic-ink">
          Giảng lại toàn bài bằng ngôn ngữ đơn giản
        </h2>
        <div className="rule-gold mt-4" />
        <p className="mt-4 text-[0.95rem] leading-relaxed text-ink-soft">
          Đây là bước quyết định của phương pháp Feynman: nếu bạn giảng lại được
          mạch lạc mà không cần nhìn bài, kiến thức đã thực sự là của bạn.
        </p>

        <div className="mt-7 space-y-6">
          <CountedTextarea
            name="finalTeachBack"
            label="Giảng lại cho một người chưa đọc bài này"
            hint="Gồm: bài đọc nói gì, bạn đã sai ở đâu, và cách đọc đúng cho lần sau."
            limits={FEYNMAN_LIMITS.finalTeachBack}
            rows={7}
          />
          <CountedTextarea
            name="finalRule"
            label="Một quy tắc quan trọng nhất bạn mang sang bài sau"
            limits={FEYNMAN_LIMITS.finalRule}
            rows={2}
          />
          <ConfidenceScale
            name="confidenceAfter"
            legend="Mức độ tự tin sau khi chữa bài"
          />
        </div>
      </section>

      <div className="rounded-stoic-lg border border-stoic-primary/20 bg-stoic-primary-soft/35 px-5 py-5 sm:px-6">
        <p className="font-ui text-sm leading-relaxed text-ink-soft">
          Hoàn thành xong, toàn bộ đáp án đúng của bài sẽ được mở ở trang kết
          quả, và bản chữa bài này được lưu lại để bạn xem lại bất cứ lúc nào.
        </p>
        <div className="mt-5">
          <SubmitButton disabled={pending} variant="stoicPrimary">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {pending ? "Đang lưu…" : "Hoàn thành chữa bài"}
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
