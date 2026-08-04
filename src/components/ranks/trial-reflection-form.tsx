"use client";

import { useActionState } from "react";
import { PenLine } from "lucide-react";
import { submitTrialReflectionAction, type ReflectionState } from "@/lib/actions/ranks";
import { ErrorBanner, SubmitButton } from "@/components/ui";
import { REFLECTION_MIN_LENGTH } from "@/lib/ranks/rules";

/**
 * Phục bàn miễn phí trong thí luyện.
 *
 * Đây là đường KHÔNG MẤT TIỀN để thỏa điều kiện chữa bài của mọi cửa ải. Nó
 * phải luôn tồn tại và luôn dùng được, kể cả với tài khoản chưa mua Feynman —
 * nếu không, hệ cấp bậc trở thành trả tiền để mạnh hơn, thứ mà quyết định số
 * 7 và số 10 của đặc tả cấm.
 *
 * Ba ô hỏi đúng ba việc mà một lượt chữa bài tử tế phải trả lời: bằng chứng
 * nằm ở đâu, mình đã sai ở bước suy luận nào, và lần sau gặp lại thì làm khác
 * đi thế nào. Ô thứ ba là ô quan trọng nhất — không có nó thì đây chỉ là chép
 * lại đáp án.
 */

const FIELDS = [
  {
    name: "evidenceText",
    label: "Vị trí bằng chứng trong bài",
    hint: "Câu hoặc đoạn nào trong passage chứa đáp án đúng? Chép lại cụm từ khóa.",
    rows: 3,
  },
  {
    name: "explanation",
    label: "Vì sao đáp án cũ sai",
    hint: "Bạn đã hiểu nhầm ở bước nào? Bẫy nằm ở đâu?",
    rows: 4,
  },
  {
    name: "lessonRule",
    label: "Quy tắc rút ra cho bài sau",
    hint: "Lần sau gặp dạng này, bạn sẽ làm khác đi thế nào?",
    rows: 3,
  },
] as const;

export function TrialReflectionForm({
  trialCode,
  questionTypes = [],
}: {
  trialCode: string;
  questionTypes?: string[];
}) {
  const [state, formAction, pending] = useActionState<ReflectionState, FormData>(
    submitTrialReflectionAction,
    undefined,
  );

  return (
    <section
      aria-label="Phục bàn miễn phí"
      className="border border-vermilion bg-paper p-7"
    >
      <p className="label-caps flex items-center gap-2">
        <PenLine className="h-3.5 w-3.5" aria-hidden />
        Phục bàn · miễn phí
      </p>
      <h2 className="mt-2.5 font-display text-xl font-bold text-navy-deep">
        Tự chữa một câu sai
      </h2>
      <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-ink-soft">
        Lượt phục bàn này hoàn toàn miễn phí và được tính cho cửa ải y như một
        lượt Feynman. Bạn không cần mua gì để thăng cấp.
      </p>

      {state?.error && (
        <div className="mt-4">
          <ErrorBanner message={state.error} />
        </div>
      )}
      {state?.success && (
        <p role="status" className="mt-4 font-ui text-sm text-jade-ink">
          {state.success}
        </p>
      )}

      <form action={formAction} className="mt-5 space-y-5">
        <input type="hidden" name="trialCode" value={trialCode} />

        {questionTypes.length > 0 && (
          <label className="block">
            <span className="font-ui text-sm font-medium text-navy-deep">
              Dạng câu
            </span>
            <select
              name="questionType"
              className="mt-1 w-full border border-line bg-paper px-3 py-2 font-ui text-sm text-ink focus:border-navy focus:outline-none"
            >
              <option value="">Không rõ dạng</option>
              {questionTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
        )}

        {FIELDS.map((field) => {
          const fieldError = state?.fieldErrors?.[field.name];
          return (
            <label key={field.name} className="block">
              <span className="font-ui text-sm font-medium text-navy-deep">
                {field.label}
              </span>
              <span className="mt-0.5 block font-ui text-xs text-muted">
                {field.hint} Tối thiểu {REFLECTION_MIN_LENGTH[field.name]} ký tự.
              </span>
              <textarea
                name={field.name}
                rows={field.rows}
                required
                aria-invalid={fieldError ? true : undefined}
                aria-describedby={fieldError ? `${field.name}-loi` : undefined}
                className={`mt-1.5 w-full resize-y border bg-paper px-3 py-2 font-ui text-sm leading-relaxed text-ink focus:outline-none ${
                  fieldError
                    ? "border-danger focus:border-danger"
                    : "border-line focus:border-navy"
                }`}
              />
              {fieldError && (
                <span
                  id={`${field.name}-loi`}
                  role="alert"
                  className="mt-1 block font-ui text-xs text-danger"
                >
                  {fieldError}
                </span>
              )}
            </label>
          );
        })}

        <SubmitButton disabled={pending}>
          {pending ? "Đang ghi..." : "Ghi lượt phục bàn"}
        </SubmitButton>
      </form>
    </section>
  );
}
