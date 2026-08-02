"use client";

import { useState } from "react";
import { Lock, SquareCheck } from "lucide-react";

/**
 * Chọn đúng ba bài đọc để ghép thành đề.
 *
 * Cần chạy phía trình duyệt vì phải đếm số ô đã tick ngay khi người dùng bấm.
 * Việc kiểm tra thật (đúng ba bài, có quyền, bài hợp lệ) vẫn nằm ở máy chủ —
 * đây chỉ là lớp giúp học viên không bấm nhầm.
 */

export type PickerItem = {
  exerciseId: string;
  title: string;
  questionCount: number;
  tierLabel: string;
  owned: boolean;
  restricted: boolean;
  attemptCount: number;
};

const REQUIRED = 3;

export function ManualAssemblyPicker({
  candidates,
  action,
  readingType,
}: {
  candidates: PickerItem[];
  action: (formData: FormData) => void;
  readingType: "ACADEMIC" | "GENERAL";
}) {
  const [picked, setPicked] = useState<string[]>([]);

  const toggle = (id: string) => {
    setPicked((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id)
        : current.length >= REQUIRED
          ? current
          : [...current, id]
    );
  };

  const chosen = candidates.filter((c) => picked.includes(c.exerciseId));
  const totalQuestions = chosen.reduce((sum, c) => sum + c.questionCount, 0);
  const missing = chosen.filter((c) => c.restricted && !c.owned);
  const ready = picked.length === REQUIRED && missing.length === 0;

  return (
    <form action={action} className="mt-6">
      <input type="hidden" name="mode" value="MANUAL" />
      <input type="hidden" name="readingType" value={readingType} />
      {picked.map((id) => (
        <input key={id} type="hidden" name="exerciseId" value={id} />
      ))}

      <ul className="divide-y divide-line border-y border-line">
        {candidates.map((item) => {
          const checked = picked.includes(item.exerciseId);
          const full = !checked && picked.length >= REQUIRED;
          return (
            <li key={item.exerciseId}>
              <button
                type="button"
                onClick={() => toggle(item.exerciseId)}
                disabled={full}
                aria-pressed={checked}
                className={`flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-1 py-3 text-left transition-colors ${
                  full ? "cursor-not-allowed opacity-40" : "cursor-pointer hover:bg-cream"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`flex h-5 w-5 shrink-0 items-center justify-center border ${
                    checked ? "border-navy bg-navy text-paper" : "border-line-strong"
                  }`}
                >
                  {checked && <SquareCheck className="h-3.5 w-3.5" />}
                </span>
                <span className="min-w-0 flex-1 text-ink">{item.title}</span>
                <span className="font-ui text-xs text-muted">
                  {item.questionCount} câu · {item.tierLabel}
                  {item.attemptCount > 0 && ` · đã làm ${item.attemptCount} lần`}
                </span>
                {item.restricted && (
                  <span
                    className={`inline-flex items-center gap-1 border px-2 py-0.5 font-ui text-[0.68rem] font-semibold uppercase ${
                      item.owned
                        ? "border-success bg-success-pale text-success"
                        : "border-line-strong bg-cream-deep text-ink-soft"
                    }`}
                  >
                    <Lock className="h-3 w-3" aria-hidden="true" />
                    {item.owned ? "Đã mở" : "Cần mở khóa"}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 font-ui text-sm text-ink-soft" aria-live="polite">
        Đã chọn {picked.length}/{REQUIRED}
        {picked.length > 0 && ` · ${totalQuestions} câu`}
        {missing.length > 0 && (
          <span className="text-danger">
            {" "}
            · còn {missing.length} bài chưa mở khóa
          </span>
        )}
      </p>

      <button
        type="submit"
        disabled={!ready}
        className="mt-4 inline-flex cursor-pointer items-center justify-center gap-2 border border-navy bg-navy px-7 py-3 font-ui text-[0.8rem] font-semibold uppercase tracking-[0.12em] text-paper transition-colors hover:bg-navy-deep disabled:cursor-not-allowed disabled:opacity-50"
      >
        Bắt đầu đề tự chọn
      </button>
    </form>
  );
}
