"use client";

import { useActionState, useState } from "react";
import { Ban, Plus, Trophy } from "lucide-react";
import {
  createCompetitionAction,
  disqualifyEntryAction,
  finalizeCompetitionAction,
  type CompetitionState,
} from "@/lib/actions/competition";

/** Tạo một kỳ thi mới với đúng ba đề. */
export function CompetitionCreateForm({
  candidates,
}: {
  candidates: Array<{ id: string; title: string }>;
}) {
  const [state, formAction, pending] = useActionState<CompetitionState, FormData>(
    createCompetitionAction,
    undefined
  );

  if (candidates.length < 3) {
    return (
      <p className="mt-8 border border-line bg-paper p-6 font-ui text-sm leading-relaxed text-ink-soft">
        Cần ít nhất <strong>3 đề</strong> được đánh dấu &ldquo;chỉ dùng cho cuộc
        thi&rdquo; mới tạo được kỳ thi. Vào <strong>Bài tập</strong>, tạo đề
        Reading mới và bật cờ đó trước.
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-8 border border-line bg-paper p-7">
      <p className="label-caps flex items-center gap-2">
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        Tạo kỳ thi mới
      </p>

      <div className="mt-5 flex flex-wrap gap-4">
        <label className="min-w-[10rem] flex-1">
          <span className="block font-ui text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-ink">
            Mã kỳ thi
          </span>
          <input
            name="code"
            required
            placeholder="NT202609"
            className="mt-1.5 w-full border border-line-strong bg-paper px-3 py-2.5 font-ui text-sm text-ink"
          />
        </label>
        <label className="min-w-[14rem] flex-[2]">
          <span className="block font-ui text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-ink">
            Tên hiển thị
          </span>
          <input
            name="name"
            required
            placeholder="Nguyệt Thí tháng 9/2026"
            className="mt-1.5 w-full border border-line-strong bg-paper px-3 py-2.5 font-ui text-sm text-ink"
          />
        </label>
        <label className="min-w-[12rem]">
          <span className="block font-ui text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-ink">
            Ngày bắt đầu thi
          </span>
          <input
            name="startAt"
            type="datetime-local"
            required
            className="mt-1.5 w-full border border-line-strong bg-paper px-3 py-2.5 font-ui text-sm text-ink"
          />
        </label>
      </div>

      <fieldset className="mt-5">
        <legend className="font-ui text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-ink">
          Chọn đúng 3 đề (thứ tự chọn là thứ tự mở: ngày 1 · 3 · 5)
        </legend>
        <div className="mt-2.5 space-y-1.5">
          {candidates.map((c) => (
            <label key={c.id} className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                name="exerciseId"
                value={c.id}
                className="h-4 w-4 cursor-pointer accent-[#1e3a5f]"
              />
              <span className="font-ui text-sm text-ink">{c.title}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <p className="mt-4 font-ui text-xs leading-relaxed text-muted">
        Đăng ký tự mở trước 7 ngày và đóng đúng giờ thi. Kỳ thi kéo dài 7 ngày.
      </p>

      <button
        type="submit"
        disabled={pending}
        className="mt-5 inline-flex cursor-pointer items-center gap-2 border border-navy bg-navy px-6 py-2.5 font-ui text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-paper transition-colors hover:bg-navy-deep disabled:opacity-50"
      >
        {pending ? "Đang tạo…" : "Tạo kỳ thi"}
      </button>

      {state?.error && <p className="mt-3 font-ui text-sm text-danger">{state.error}</p>}
      {state?.success && <p className="mt-3 font-ui text-sm text-success">{state.success}</p>}
    </form>
  );
}

/** Chốt kết quả — bước không thể hoàn tác, nên bắt gõ xác nhận. */
export function FinalizeForm({ competitionId }: { competitionId: string }) {
  const [state, formAction, pending] = useActionState<CompetitionState, FormData>(
    finalizeCompetitionAction,
    undefined
  );

  return (
    <form action={formAction} className="mt-6 border border-gold bg-gold-pale p-6">
      <input type="hidden" name="competitionId" value={competitionId} />
      <p className="flex items-start gap-2 font-ui text-sm leading-relaxed text-ink">
        <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
        <span>
          <strong>Chốt kết quả và công bố Bảng Vàng.</strong> Hãy rà soát xong
          trước: kiểm tra thời gian làm bài bất thường, tài khoản trùng, và các
          cờ liêm chính. Sau bước này thứ hạng được công khai và huy hiệu 30
          ngày được trao. Tiền thưởng bạn vẫn phải <strong>tự chuyển</strong>.
        </span>
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label>
          <span className="block font-ui text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-ink">
            Gõ CHOT để xác nhận
          </span>
          <input
            name="confirm"
            required
            placeholder="CHOT"
            className="mt-1.5 w-40 border border-line-strong bg-paper px-3 py-2 font-ui text-sm text-ink"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="cursor-pointer border border-gold bg-gold px-6 py-2.5 font-ui text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-paper transition-colors hover:bg-[#9d7223] disabled:opacity-50"
        >
          {pending ? "Đang chốt…" : "Chốt kết quả"}
        </button>
      </div>

      {state?.error && <p className="mt-3 font-ui text-sm text-danger">{state.error}</p>}
      {state?.success && <p className="mt-3 font-ui text-sm text-success">{state.success}</p>}
    </form>
  );
}

/** Loại một thí sinh — luôn kèm lý do, và không xóa dữ liệu bài làm. */
export function DisqualifyForm({ entryId }: { entryId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<CompetitionState, FormData>(
    disqualifyEntryAction,
    undefined
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex cursor-pointer items-center gap-1.5 border border-line-strong px-2.5 py-1 font-ui text-[0.68rem] font-semibold uppercase tracking-[0.06em] text-ink-soft transition-colors hover:border-danger hover:text-danger"
      >
        <Ban className="h-3 w-3" aria-hidden="true" />
        Loại
      </button>
    );
  }

  return (
    <form action={formAction} className="max-w-[16rem] space-y-2 text-left">
      <input type="hidden" name="entryId" value={entryId} />
      <input
        name="reason"
        required
        minLength={10}
        placeholder="Lý do loại (bắt buộc)"
        className="w-full border border-line-strong bg-paper px-2 py-1.5 font-ui text-[0.72rem] text-ink"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="cursor-pointer border border-danger px-2.5 py-1 font-ui text-[0.68rem] font-semibold uppercase text-danger disabled:opacity-50"
        >
          Xác nhận
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="cursor-pointer border border-line-strong px-2.5 py-1 font-ui text-[0.68rem] font-semibold uppercase text-ink-soft"
        >
          Thôi
        </button>
      </div>
      {state?.error && <p className="font-ui text-[0.68rem] text-danger">{state.error}</p>}
      {state?.success && <p className="font-ui text-[0.68rem] text-success">{state.success}</p>}
    </form>
  );
}
