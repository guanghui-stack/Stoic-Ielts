"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import {
  createExerciseAction,
  updateExerciseAction,
  type AdminFormState,
} from "@/lib/actions/admin";
import { ErrorBanner, SubmitButton } from "@/components/ui";
import { ReadingBuilder } from "@/components/admin/reading-builder";

const inputCls =
  "mt-2 w-full border border-line-strong bg-paper px-4 py-3 font-ui text-[0.95rem] text-ink placeholder:text-muted focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20";
const labelCls =
  "block font-ui text-[0.8rem] font-semibold uppercase tracking-[0.1em] text-ink";

type Defaults = {
  readingType?: string;
  title?: string;
  description?: string;
  durationMinutes?: number;
  published?: boolean;
  content?: string;
};

export function ExerciseForm({
  exerciseId,
  defaults,
}: {
  exerciseId?: string;
  defaults?: Defaults;
}) {
  const action = exerciseId
    ? updateExerciseAction.bind(null, exerciseId)
    : createExerciseAction;
  const [state, formAction, pending] = useActionState<AdminFormState, FormData>(
    action,
    undefined
  );

  return (
    <form action={formAction} className="space-y-6">
      <ErrorBanner message={state?.error} />
      <input type="hidden" name="skill" value="READING" />

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="readingType" className={labelCls}>
            Kho Reading <span className="text-danger">*</span>
          </label>
          <select
            id="readingType"
            name="readingType"
            defaultValue={defaults?.readingType ?? "ACADEMIC"}
            className={inputCls}
          >
            <option value="ACADEMIC">Academic</option>
            <option value="GENERAL">General</option>
          </select>
          <p className="mt-1.5 font-ui text-xs text-muted">
            Đề chỉ xuất hiện trong đúng kho đã chọn.
          </p>
        </div>
        <div>
          <label htmlFor="durationMinutes" className={labelCls}>
            Thời gian làm bài (phút) <span className="text-danger">*</span>
          </label>
          <input
            id="durationMinutes"
            name="durationMinutes"
            type="number"
            min={1}
            max={240}
            required
            defaultValue={defaults?.durationMinutes ?? 20}
            className={inputCls}
          />
          <p className="mt-1.5 font-ui text-xs text-muted">
            Một passage thường là 20 phút; Full Test Academic là 60 phút.
          </p>
        </div>
      </div>

      <div>
        <label htmlFor="title" className={labelCls}>
          Tiêu đề bài tập <span className="text-danger">*</span>
        </label>
        <input
          id="title"
          name="title"
          required
          defaultValue={defaults?.title}
          placeholder="Ví dụ: Academic Reading — The Future of Cities"
          className={inputCls}
        />
      </div>

      <div>
        <label htmlFor="description" className={labelCls}>
          Mô tả ngắn
        </label>
        <input
          id="description"
          name="description"
          defaultValue={defaults?.description}
          placeholder="Ví dụ: Passage 1 · 13 câu · 20 phút."
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls}>
          Nội dung bài Reading <span className="text-danger">*</span>
        </label>
        <div className="mt-2">
          <ReadingBuilder name="content" defaultJson={defaults?.content} />
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-3 font-ui text-sm text-ink">
        <input
          type="checkbox"
          name="published"
          defaultChecked={defaults?.published ?? true}
          className="h-4 w-4 accent-[#1e3a5c]"
        />
        Mở cho học viên làm ngay sau khi lưu
      </label>

      <SubmitButton disabled={pending} variant="gold">
        <Save className="h-4 w-4" aria-hidden="true" />
        {pending ? "Đang lưu…" : exerciseId ? "Cập nhật bài tập" : "Tạo bài tập"}
      </SubmitButton>
    </form>
  );
}
