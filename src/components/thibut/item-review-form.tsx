"use client";

import { useActionState } from "react";
import { Check, X } from "lucide-react";
import {
  reviewThiButItemAction,
  type ReviewState,
} from "@/lib/actions/thibut";

/**
 * Một câu chờ duyệt.
 *
 * Đáp án và lời giải HIỆN ĐẦY ĐỦ ở đây, và đó là điều đúng: người duyệt phải
 * thấy hết mới duyệt được. Ranh giới "không để lộ đáp án" áp cho màn hình của
 * HỌC VIÊN, không áp cho màn hình này.
 */
export function ItemReviewForm({
  item,
}: {
  item: {
    id: string;
    type: string;
    typeLabel: string;
    difficulty: string;
    prompt: string;
    options: string[];
    answerIndex: number;
    explanation: string;
    sourceBatch: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState<ReviewState, FormData>(
    reviewThiButItemAction,
    undefined,
  );

  return (
    <form action={formAction} className="border border-line bg-paper p-6">
      <input type="hidden" name="itemId" value={item.id} />

      <div className="flex flex-wrap items-center gap-3">
        <span className="border border-line bg-cream-deep px-2.5 py-0.5 font-ui text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-ink-soft">
          {item.typeLabel}
        </span>
        <span className="font-ui text-xs text-muted">Độ khó {item.difficulty}</span>
        {item.sourceBatch ? (
          <span className="font-ui text-xs text-muted">Mẻ {item.sourceBatch}</span>
        ) : null}
      </div>

      <p className="mt-4 text-[1.02rem] leading-relaxed text-ink">{item.prompt}</p>

      <ol className="mt-4 flex flex-col gap-2">
        {item.options.map((option, index) => {
          const correct = index === item.answerIndex;
          return (
            <li
              key={index}
              className={
                correct
                  ? "flex items-start gap-2.5 border border-jade bg-jade-pale px-3.5 py-2 text-[0.95rem] text-jade-ink"
                  : "flex items-start gap-2.5 border border-line px-3.5 py-2 text-[0.95rem] text-ink-soft"
              }
            >
              <span className="font-ui text-xs font-semibold">
                {String.fromCharCode(65 + index)}
              </span>
              <span className="flex-1">{option}</span>
              {/* Màu không phải tín hiệu duy nhất: có cả chữ. */}
              {correct ? (
                <span className="font-ui text-[0.7rem] font-semibold uppercase tracking-[0.08em]">
                  Đáp án
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>

      <div className="mt-4 border-l-4 border-gold bg-cream-deep px-5 py-3.5">
        <p className="label-caps">Lời giải</p>
        <p className="mt-1.5 text-[0.94rem] leading-relaxed text-ink-soft">
          {item.explanation}
        </p>
      </div>

      <label className="mt-5 block">
        <span className="font-ui text-[0.8rem] font-semibold text-ink">
          Ghi chú của người duyệt
        </span>
        <input
          type="text"
          name="note"
          placeholder="Không bắt buộc. Ghi lại vì sao loại, để mẻ sau tránh."
          className="mt-2 w-full border border-line-strong bg-paper px-4 py-2.5 font-ui text-[0.92rem] text-ink placeholder:text-muted focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
        />
      </label>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="submit"
          name="decision"
          value="PUBLISH"
          disabled={pending}
          className="inline-flex cursor-pointer items-center gap-2 border border-navy bg-navy px-6 py-2.5 font-ui text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-paper transition-colors hover:bg-navy-deep disabled:opacity-50"
        >
          <Check className="h-4 w-4" aria-hidden="true" />
          Phát hành
        </button>
        <button
          type="submit"
          name="decision"
          value="RETIRE"
          disabled={pending}
          className="inline-flex cursor-pointer items-center gap-2 border border-line-strong px-6 py-2.5 font-ui text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-ink-soft transition-colors hover:border-danger hover:text-danger disabled:opacity-50"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          Loại
        </button>
      </div>

      {state?.error ? (
        <p className="mt-3 border border-danger bg-danger-pale px-4 py-2.5 font-ui text-[0.88rem] text-danger">
          {state.error}
        </p>
      ) : null}
      {state?.success ? (
        <p className="mt-3 border border-success bg-success-pale px-4 py-2.5 font-ui text-[0.88rem] text-success">
          {state.success}
        </p>
      ) : null}
    </form>
  );
}
