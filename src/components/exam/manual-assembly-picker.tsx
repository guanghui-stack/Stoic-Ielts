"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, Lock } from "lucide-react";

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
  const ready = picked.length === REQUIRED;
  const hasLocked = candidates.some((c) => c.restricted && !c.owned);

  return (
    <form action={action}>
      <input type="hidden" name="mode" value="MANUAL" />
      <input type="hidden" name="readingType" value={readingType} />
      {picked.map((id) => (
        <input key={id} type="hidden" name="exerciseId" value={id} />
      ))}

      <ul className="overflow-hidden rounded-stoic-md border border-stoic-line">
        {candidates.map((item) => {
          const checked = picked.includes(item.exerciseId);
          const full = !checked && picked.length >= REQUIRED;
          const locked = item.restricted && !item.owned;
          const disabled = full || locked;
          return (
            <li
              key={item.exerciseId}
              className="border-b border-stoic-line last:border-b-0"
            >
              <button
                type="button"
                onClick={() => toggle(item.exerciseId)}
                disabled={disabled}
                aria-pressed={checked}
                className={`flex min-h-16 w-full flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 text-left transition-colors sm:px-5 ${
                  disabled
                    ? "cursor-not-allowed bg-stoic-canvas-soft/55"
                    : checked
                      ? "cursor-pointer bg-stoic-primary-soft/30"
                      : "cursor-pointer bg-stoic-canvas hover:bg-stoic-primary-soft/15"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-stoic-sm border ${
                    checked
                      ? "border-stoic-primary bg-stoic-primary text-white"
                      : "border-stoic-line-strong bg-stoic-canvas text-stoic-ink-muted"
                  }`}
                >
                  {checked && <Check className="h-4 w-4" />}
                </span>
                <span className={`min-w-0 flex-1 font-medium ${locked ? "text-stoic-ink-muted" : "text-stoic-ink"}`}>
                  {item.title}
                </span>
                <span className="text-xs text-stoic-ink-muted">
                  <span className="tabular-nums">{item.questionCount}</span> câu · {item.tierLabel}
                  {item.attemptCount > 0 && (
                    <> · đã làm <span className="tabular-nums">{item.attemptCount}</span> lần</>
                  )}
                </span>
                {item.restricted && (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-stoic-pill border px-2.5 py-1 text-xs font-semibold ${
                      item.owned
                        ? "border-success/20 bg-success-pale text-success"
                        : "border-stoic-warning/20 bg-stoic-canvas-cream text-stoic-warning"
                    }`}
                  >
                    <Lock className="h-3 w-3" aria-hidden="true" />
                    {item.owned ? "Đã mở" : "Chưa mở"}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-5 flex flex-col justify-between gap-4 rounded-stoic-md border border-stoic-line bg-stoic-canvas-soft px-4 py-4 sm:flex-row sm:items-center sm:px-5">
        <div aria-live="polite">
          <p className="text-sm font-semibold text-stoic-ink">
            Đã chọn <span className="tabular-nums text-stoic-primary-deep">{picked.length}/{REQUIRED}</span>
            {picked.length > 0 && (
              <span className="font-normal text-stoic-ink-secondary">
                {" "}· <span className="tabular-nums">{totalQuestions}</span> câu
              </span>
            )}
          </p>
          <div className="mt-2 flex gap-1.5" aria-hidden="true">
            {Array.from({ length: REQUIRED }, (_, index) => (
              <span
                key={index}
                className={`h-1.5 w-10 rounded-full ${
                  index < picked.length ? "bg-stoic-primary" : "bg-stoic-line"
                }`}
              />
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={!ready}
          className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-stoic-pill border border-stoic-primary bg-stoic-primary px-6 py-2.5 text-sm font-semibold text-white shadow-stoic-1 transition-colors hover:border-stoic-primary-deep hover:bg-stoic-primary-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stoic-primary/35 disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"
        >
          Bắt đầu đề tự chọn
        </button>
      </div>

      {hasLocked ? (
        <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-relaxed text-stoic-ink-muted">
          Bài chưa mở không thể chọn tại đây.
          <Link
            href={readingType === "GENERAL" ? "/luyen-tap/reading/general" : "/luyen-tap/reading"}
            className="inline-flex min-h-10 items-center gap-1 font-semibold text-stoic-primary-deep hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stoic-primary/35"
          >
            Mở bài trong Kho Reading
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </p>
      ) : null}
    </form>
  );
}
