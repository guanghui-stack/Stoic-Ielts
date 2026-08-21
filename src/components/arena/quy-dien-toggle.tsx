"use client";

import { useActionState } from "react";
import { toggleQuyDienAction, type ArenaState } from "@/lib/actions/arena";

/**
 * Nút Quy Điền.
 *
 * Là component phía máy khách vì hành động trả về trạng thái để hiện lại cho
 * người dùng, mà `<form action>` thuần chỉ nhận hành động không trả gì.
 *
 * Câu chữ phải nói rõ CÁI GIÁ trước khi bấm. Đó là toàn bộ điểm khác biệt giữa
 * Quy Điền và Án Binh Bất Động: một bên tuyên bố và trả giá, một bên im lặng
 * lẩn tránh.
 */
export function QuyDienToggle({ inQuyDien }: { inQuyDien: boolean }) {
  const [state, formAction, pending] = useActionState<ArenaState, FormData>(
    toggleQuyDienAction,
    undefined,
  );

  return (
    <form action={formAction} className="mt-5">
      <input type="hidden" name="enter" value={inQuyDien ? "0" : "1"} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex cursor-pointer items-center gap-2 border border-navy px-6 py-2.5 font-ui text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-navy transition-colors hover:bg-navy hover:text-paper disabled:opacity-50"
      >
        {inQuyDien ? "Trở lại đấu trường" : "Quy Điền"}
      </button>

      {state?.success ? (
        <p className="mt-3 border border-success bg-success-pale px-4 py-2.5 font-ui text-[0.88rem] text-success">
          {state.success}
        </p>
      ) : null}
      {state?.error ? (
        <p className="mt-3 border border-danger bg-danger-pale px-4 py-2.5 font-ui text-[0.88rem] text-danger">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
