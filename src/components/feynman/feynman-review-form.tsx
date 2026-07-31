"use client";

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

const QUESTION_TYPE_LABELS: Record<string, string> = {
  TFNG: "True / False / Not Given",
  MC: "Multiple Choice",
  MC_MULTI: "Multiple Choice (nhiều đáp án)",
  GAP: "Gap Filling",
  MATCH_HEADINGS: "Matching Headings",
  MATCH_INFO: "Matching Information",
  MATCH_FEATURES: "Matching Features",
  MATCH_ENDINGS: "Matching Sentence Endings",
};

/* ===================== Khối dùng chung ===================== */

const labelCls =
  "block font-ui text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-ink";
const inputCls =
  "mt-2 w-full border border-line-strong bg-paper px-4 py-3 font-body text-[1rem] leading-relaxed text-ink placeholder:text-muted focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20";

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
        defaultValue={defaultValue}
        onChange={(e) => setLen(e.target.value.trim().length)}
        aria-describedby={`${name}-count${hint ? ` ${name}-hint` : ""}`}
        className={`${inputCls} resize-y`}
      />
      <p
        id={`${name}-count`}
        className={`mt-1 text-right font-ui text-xs tabular-nums ${
          showWarn ? "font-semibold text-danger" : "text-muted"
        }`}
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
            className="flex min-h-11 cursor-pointer items-center gap-2 border border-line bg-paper px-3 py-2 font-ui text-sm text-ink transition-colors hover:border-navy has-[:checked]:border-gold has-[:checked]:bg-gold-pale has-[:checked]:font-semibold"
          >
            <input
              type="radio"
              name={name}
              value={v}
              defaultChecked={defaultValue === v}
              className="h-4 w-4 shrink-0 accent-[#b8862b]"
            />
            <span>
              <span className="font-bold tabular-nums">{v}</span>
              <span className="ml-1.5 text-xs text-ink-soft">{CONFIDENCE_LABELS[v]}</span>
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
    <div className="border-b border-line bg-cream-deep px-5 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="border border-gold bg-gold-pale px-2.5 py-0.5 font-ui text-xs font-bold text-navy-deep">
          Câu {m.numberLabel}
        </span>
        <span className="font-ui text-xs text-muted">
          Part {m.partNumber} · {QUESTION_TYPE_LABELS[m.questionType] ?? m.questionType}
        </span>
      </div>
      <p className="mt-2.5 leading-relaxed text-ink">{m.prompt}</p>
      <p className="mt-2 font-ui text-sm text-danger">
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
    <ol className="grid gap-px border border-line bg-line sm:grid-cols-4">
      {steps.map((s, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li
            key={s}
            aria-current={active ? "step" : undefined}
            className={`flex items-center gap-2.5 px-4 py-3 ${
              active ? "bg-navy text-paper" : done ? "bg-cream-deep" : "bg-paper"
            }`}
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-ui text-xs font-bold ${
                active
                  ? "bg-gold text-paper"
                  : done
                    ? "bg-success text-paper"
                    : "border border-line-strong text-muted"
              }`}
            >
              {done ? "✓" : n}
            </span>
            <span
              className={`font-ui text-xs leading-tight ${
                active ? "font-semibold" : done ? "text-ink-soft" : "text-muted"
              }`}
            >
              {s}
            </span>
          </li>
        );
      })}
    </ol>
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
      <section className="border border-line bg-paper p-7 shadow-card md:p-8">
        <p className="label-caps">Bước 1</p>
        <h2 className="mt-2 font-display text-2xl font-bold text-navy-deep">
          Giải thích bài đọc từ trí nhớ
        </h2>
        <div className="rule-gold mt-4" />
        <p className="mt-4 text-[0.95rem] leading-relaxed text-ink-soft">
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
      <section className="border border-line bg-paper p-7 shadow-card md:p-8">
        <p className="label-caps">Bước 2</p>
        <h2 className="mt-2 font-display text-2xl font-bold text-navy-deep">
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
                <article key={m.id} className="border border-line-strong">
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
                            className="flex min-h-11 cursor-pointer items-start gap-2.5 border border-line bg-cream px-3 py-2.5 font-ui text-[0.85rem] leading-snug text-ink transition-colors hover:border-navy has-[:checked]:border-gold has-[:checked]:bg-gold-pale"
                          >
                            <input
                              type="radio"
                              name={`errorType_${m.id}`}
                              value={t}
                              defaultChecked={m.errorType === t}
                              className="mt-0.5 h-4 w-4 shrink-0 accent-[#b8862b]"
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

      <div className="border-l-4 border-gold bg-cream-deep px-6 py-5">
        <p className="font-ui text-sm leading-relaxed text-ink-soft">
          Nộp xong bước này, hệ thống mới mở lời giải mẫu và đáp án đúng. Bạn sẽ
          không sửa được phần đã viết ở trên — đó là điểm mấu chốt để so sánh
          cách nghĩ trước và sau.
        </p>
        <div className="mt-5">
          <SubmitButton disabled={pending} variant="gold">
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
      <section className="border border-line bg-paper p-7 shadow-card md:p-8">
        <p className="label-caps">Bước 3</p>
        <h2 className="mt-2 font-display text-2xl font-bold text-navy-deep">
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
              <article key={m.id} className="border border-line-strong">
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
                                <dt className="font-ui text-sm text-navy">{p.question}</dt>
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
                  <div className="border-b border-line bg-cream px-5 py-4">
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
      <section className="border border-line bg-paper p-7 shadow-card md:p-8">
        <p className="label-caps">Bước 4</p>
        <h2 className="mt-2 font-display text-2xl font-bold text-navy-deep">
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

      <div className="border-l-4 border-gold bg-cream-deep px-6 py-5">
        <p className="font-ui text-sm leading-relaxed text-ink-soft">
          Hoàn thành xong, toàn bộ đáp án đúng của bài sẽ được mở ở trang kết
          quả, và bản chữa bài này được lưu lại để bạn xem lại bất cứ lúc nào.
        </p>
        <div className="mt-5">
          <SubmitButton disabled={pending} variant="gold">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {pending ? "Đang lưu…" : "Hoàn thành chữa bài"}
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
