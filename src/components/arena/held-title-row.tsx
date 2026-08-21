"use client";

import { useActionState } from "react";
import { Undo2 } from "lucide-react";
import {
  revokeTitleAction,
  type IntegrityActionState,
} from "@/lib/actions/arena-integrity";

/**
 * Một danh hiệu chất vấn đang có người mang, kèm nút gỡ.
 *
 * Đây là ĐƯỜNG KHIẾU NẠI, và nó phải nằm ngay cạnh danh sách chứ không giấu
 * trong một trang khác. Một hệ thống gắn được mà gỡ khó là một hệ thống chỉ có
 * một chiều, và chiều đó luôn là chiều xấu cho người học.
 *
 * Máy tự gỡ được năm danh hiệu chất vấn khi điều kiện hết đúng. Nút này dành
 * cho hai danh hiệu người xử, và cho những lần máy sai mà người học khiếu nại
 * đúng.
 */
export function HeldTitleRow({
  item,
}: {
  item: {
    userId: string;
    userLabel: string;
    code: string;
    titleName: string;
    category: string;
    earnedAt: string;
  };
}) {
  const [state, formAction, pending] = useActionState<
    IntegrityActionState,
    FormData
  >(revokeTitleAction, undefined);

  return (
    <div className="border border-line bg-paper p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="font-ui text-[0.92rem] font-semibold text-ink">
            {item.userLabel}
          </p>
          <p className="mt-0.5 font-display text-[1.02rem] font-bold text-navy-deep">
            {item.titleName}
          </p>
        </div>
        <span className="border border-line-strong px-2 py-0.5 font-ui text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-ink-soft">
          {item.category === "ARENA_MANUAL" ? "Người xử gắn" : "Máy gắn"}
        </span>
      </div>
      <p className="mt-1 font-ui text-xs text-muted">Gắn lúc {item.earnedAt}</p>

      <form action={formAction} className="mt-4 flex flex-wrap items-end gap-3">
        <input type="hidden" name="userId" value={item.userId} />
        <input type="hidden" name="code" value={item.code} />
        <label className="min-w-0 flex-1">
          <span className="font-ui text-[0.8rem] font-semibold text-ink">
            Lý do gỡ
          </span>
          <input
            type="text"
            name="reason"
            placeholder="Bắt buộc. Ví dụ: khiếu nại đúng, hoặc đã qua một mùa không tái phạm."
            className="mt-2 w-full border border-line-strong bg-paper px-4 py-2.5 font-ui text-[0.92rem] text-ink placeholder:text-muted focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex cursor-pointer items-center gap-2 border border-navy bg-navy px-6 py-2.5 font-ui text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-paper transition-colors hover:bg-navy-deep disabled:opacity-50"
        >
          <Undo2 className="h-4 w-4" aria-hidden="true" />
          Gỡ
        </button>
      </form>

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
    </div>
  );
}
