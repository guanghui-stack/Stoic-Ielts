"use client";

import { useState, useTransition } from "react";
import { CheckSquare, Square, ListChecks } from "lucide-react";
import { startCustomFeynmanReviewAction } from "@/lib/actions/feynman";
import { ErrorBanner } from "@/components/ui";

/**
 * Học viên tự tick câu muốn chữa cho lượt luyện này.
 *
 * Câu ĐÚNG cũng tick được. Đó không phải sơ suất: đoán mò trúng rồi tự giảng
 * lại là cách duy nhất để biết mình trúng do hiểu hay do may.
 *
 * Số câu tối đa nhận từ máy chủ qua prop chứ không viết cứng ở đây — máy chủ
 * vẫn kiểm lại một lần nữa, nên hai nơi phải nói cùng một con số.
 */

export type PickableQuestion = {
  id: string;
  numberLabel: string;
  questionType: string;
  partNumber: number;
  correct: boolean;
};

export function FeynmanQuestionPicker({
  attemptId,
  questions,
  maxQuestions,
}: {
  attemptId: string;
  questions: PickableQuestion[];
  maxQuestions: number;
}) {
  const [picked, setPicked] = useState<string[]>(() =>
    // Mặc định tick sẵn các câu SAI, tới hết hạn mức. Đó là lựa chọn đúng cho
    // phần lớn người dùng, và ai muốn khác thì bỏ tick nhanh hơn là tự tick.
    questions.filter((q) => !q.correct).slice(0, maxQuestions).map((q) => q.id)
  );
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  const toggle = (id: string) => {
    setError(undefined);
    setPicked((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      if (prev.length >= maxQuestions) {
        setError(`Mỗi lượt luyện chọn tối đa ${maxQuestions} câu.`);
        return prev;
      }
      return [...prev, id];
    });
  };

  const submit = () => {
    setError(undefined);
    startTransition(async () => {
      const result = await startCustomFeynmanReviewAction(attemptId, picked);
      // Thành công thì action tự chuyển trang, nên tới được đây nghĩa là hỏng.
      if (result?.error) setError(result.error);
    });
  };

  const byPart = new Map<number, PickableQuestion[]>();
  for (const question of questions) {
    const list = byPart.get(question.partNumber) ?? [];
    list.push(question);
    byPart.set(question.partNumber, list);
  }

  return (
    <section className="mt-8 border border-line-strong bg-paper">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
        <p className="flex items-center gap-2 font-ui text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-ink">
          <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
          Chọn câu muốn chữa
        </p>
        <p className="font-ui text-sm text-muted">
          Đã chọn <strong className="text-ink">{picked.length}</strong> /{" "}
          {maxQuestions}
        </p>
      </header>

      <div className="px-6 py-5">
        <p className="text-[0.95rem] leading-relaxed text-ink-soft">
          Các câu bạn làm sai đã được tick sẵn. Bạn tick thêm cả câu làm đúng
          nhưng còn chưa chắc — hiểu vì sao mình đúng cũng quan trọng như hiểu vì
          sao mình sai.
        </p>

        {[...byPart.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([partNumber, items]) => (
            <div key={partNumber} className="mt-5">
              <p className="font-ui text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-muted">
                Phần {partNumber}
              </p>
              <ul className="mt-2.5 grid gap-2 sm:grid-cols-2">
                {items.map((question) => {
                  const on = picked.includes(question.id);
                  return (
                    <li key={question.id}>
                      <button
                        type="button"
                        onClick={() => toggle(question.id)}
                        aria-pressed={on}
                        className={`flex w-full items-center gap-3 border px-4 py-2.5 text-left font-ui text-sm transition-colors ${
                          on
                            ? "border-navy bg-navy-pale text-navy-deep"
                            : "border-line text-ink-soft hover:border-line-strong"
                        }`}
                      >
                        {on ? (
                          <CheckSquare className="h-4 w-4 shrink-0" aria-hidden="true" />
                        ) : (
                          <Square className="h-4 w-4 shrink-0" aria-hidden="true" />
                        )}
                        <span className="flex-1">
                          Câu {question.numberLabel}
                          <span className="ml-2 text-muted">
                            {question.questionType}
                          </span>
                        </span>
                        <span
                          className={`shrink-0 text-[0.72rem] font-semibold uppercase tracking-[0.1em] ${
                            question.correct ? "text-success" : "text-danger"
                          }`}
                        >
                          {question.correct ? "Đúng" : "Sai"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

        <ErrorBanner message={error} />

        <button
          type="button"
          onClick={submit}
          disabled={pending || picked.length === 0}
          className="mt-6 border border-navy bg-navy px-6 py-3 font-ui text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-paper transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {pending ? "Đang mở phiên..." : "Bắt đầu chữa bài"}
        </button>
      </div>
    </section>
  );
}
