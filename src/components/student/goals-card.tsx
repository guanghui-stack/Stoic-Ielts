"use client";

import { useActionState, useEffect, useState } from "react";
import { Pencil, Save, X, Target, CalendarClock } from "lucide-react";
import { updateGoalsAction, type AccountFormState } from "@/lib/actions/account";
import { ErrorBanner, SubmitButton } from "@/components/ui";

export type GoalValues = {
  overall: number | null;
  reading: number | null;
  listening: number | null;
  writing: number | null;
  speaking: number | null;
};

const BAND_FIELDS = [
  { name: "targetOverall", key: "overall", label: "Overall" },
  { name: "targetReading", key: "reading", label: "Reading" },
  { name: "targetListening", key: "listening", label: "Listening" },
  { name: "targetWriting", key: "writing", label: "Writing" },
  { name: "targetSpeaking", key: "speaking", label: "Speaking" },
] as const;

function band(v: number | null) {
  return v != null ? v.toFixed(1) : "—";
}

export function GoalsCard({
  targets,
  examDateValue,
  examDateLabel,
  daysLeft,
}: {
  targets: GoalValues;
  examDateValue: string; // yyyy-mm-dd hoặc ""
  examDateLabel: string; // dd/mm/yyyy hoặc "—"
  daysLeft: number | null;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState<AccountFormState, FormData>(
    updateGoalsAction,
    undefined
  );

  // Lưu thành công thì đóng form. Cố ý dùng effect: nếu suy ra trực tiếp từ
  // `state.success` thì form sẽ không mở lại được ở lần sửa kế tiếp (state vẫn
  // giữ kết quả cũ), còn khi lưu LỖI thì form phải ở nguyên để hiện thông báo.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state?.success) setEditing(false);
  }, [state]);

  if (editing) {
    return (
      <form
        action={formAction}
        className="border border-line bg-paper p-7 shadow-card"
      >
        <div className="flex items-center justify-between gap-4">
          <p className="label-caps flex items-center gap-2">
            <Target className="h-3.5 w-3.5" aria-hidden="true" />
            Đặt mục tiêu &amp; lịch thi
          </p>
          <button
            type="button"
            onClick={() => setEditing(false)}
            aria-label="Hủy chỉnh sửa"
            className="flex h-9 w-9 cursor-pointer items-center justify-center border border-line text-ink-soft hover:border-danger hover:text-danger"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-4">
          <ErrorBanner message={state?.error} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {BAND_FIELDS.map((f) => (
            <div key={f.name}>
              <label
                htmlFor={f.name}
                className="block font-ui text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-ink"
              >
                {f.label}
              </label>
              <input
                id={f.name}
                name={f.name}
                type="number"
                min={0}
                max={9}
                step={0.5}
                defaultValue={targets[f.key] ?? undefined}
                placeholder="—"
                className="mt-1.5 w-full border border-line-strong bg-paper px-3 py-2 text-center font-display text-lg font-bold tabular-nums text-navy-deep focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
              />
            </div>
          ))}
          <div>
            <label
              htmlFor="examDate"
              className="block font-ui text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-ink"
            >
              Ngày dự thi
            </label>
            <input
              id="examDate"
              name="examDate"
              type="date"
              defaultValue={examDateValue}
              className="mt-1.5 w-full border border-line-strong bg-paper px-3 py-2 font-ui text-sm text-ink focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
            />
          </div>
        </div>
        <div className="mt-5">
          <SubmitButton disabled={pending} variant="gold">
            <Save className="h-4 w-4" aria-hidden="true" />
            {pending ? "Đang lưu…" : "Lưu mục tiêu"}
          </SubmitButton>
        </div>
      </form>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
      {/* Mục tiêu band điểm */}
      <div className="border border-line bg-paper p-7 shadow-card">
        <div className="flex items-center justify-between gap-4">
          <p className="label-caps flex items-center gap-2">
            <Target className="h-3.5 w-3.5" aria-hidden="true" />
            Mục tiêu của bạn
          </p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label="Chỉnh sửa mục tiêu"
            title="Chỉnh sửa mục tiêu"
            className="flex h-9 w-9 cursor-pointer items-center justify-center border border-line text-ink-soft transition-colors hover:border-gold hover:text-gold"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        {state?.success && (
          <p role="status" className="mt-3 font-ui text-xs text-success">
            {state.success}
          </p>
        )}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {BAND_FIELDS.map((f, i) => (
            <div
              key={f.name}
              className={`border px-3 py-4 text-center ${
                i === 0
                  ? "border-gold bg-gold-pale"
                  : "border-line bg-cream"
              }`}
            >
              <p
                className={`font-ui text-[0.65rem] font-semibold uppercase tracking-[0.12em] ${
                  i === 0 ? "text-gold" : "text-muted"
                }`}
              >
                {f.label}
              </p>
              <p className="mt-2 font-display text-2xl font-bold tabular-nums text-navy-deep">
                {band(targets[f.key])}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Lịch thi */}
      <div className="border border-line bg-paper p-7 shadow-card">
        <p className="label-caps flex items-center gap-2">
          <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
          Lịch thi
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="border border-line bg-cream px-3 py-4 text-center">
            <p className="font-ui text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted">
              Ngày dự thi
            </p>
            <p className="mt-2 font-display text-lg font-bold tabular-nums text-navy-deep">
              {examDateLabel}
            </p>
          </div>
          <div
            className={`border px-3 py-4 text-center ${
              daysLeft != null && daysLeft <= 30
                ? "border-danger bg-danger-pale"
                : "border-line bg-cream"
            }`}
          >
            <p className="font-ui text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted">
              Còn lại
            </p>
            <p
              className={`mt-2 font-display text-2xl font-bold tabular-nums ${
                daysLeft != null && daysLeft <= 30 ? "text-danger" : "text-gold"
              }`}
            >
              {daysLeft != null ? `${daysLeft} ngày` : "—"}
            </p>
          </div>
        </div>
        <p className="mt-4 font-ui text-xs leading-relaxed text-muted">
          Bấm nút chỉnh sửa ở thẻ Mục tiêu để cập nhật ngày dự thi.
        </p>
      </div>
    </div>
  );
}
