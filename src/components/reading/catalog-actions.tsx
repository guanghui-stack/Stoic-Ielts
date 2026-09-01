"use client";

import type { ReactNode } from "react";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { startThiButAction, type ThiButStartState } from "@/lib/actions/thibut";
import { ReadingDialogClose } from "@/components/reading/catalog-dialog";

/** Submit button biết trạng thái pending của Server Action gần nhất. */
export function ReadingCatalogSubmit({
  children,
  pendingLabel,
  disabled = false,
}: {
  children: ReactNode;
  pendingLabel: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending}
      className="inline-flex min-h-11 items-center justify-center rounded-stoic-pill border border-stoic-primary bg-stoic-primary px-5 py-2.5 text-sm font-semibold text-white shadow-stoic-1 transition-[background-color,border-color,transform] hover:border-stoic-primary-deep hover:bg-stoic-primary-deep active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stoic-primary/35"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

/**
 * Xác nhận vào Thí Bút ngay từ bảng. Server Action vẫn kiểm tra lại toàn bộ
 * số dư, thời gian chờ và kho câu trước khi trừ Đức Hạnh.
 */
export function ReadingThiButConfirm({
  exerciseId,
  cost,
}: {
  exerciseId: string;
  cost: number;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ThiButStartState, FormData>(
    startThiButAction,
    undefined,
  );

  useEffect(() => {
    if (state && "attemptId" in state) {
      router.push(`/hoc-vien/thi-but/EXERCISE/${exerciseId}`);
      router.refresh();
    }
  }, [exerciseId, router, state]);

  return (
    <form action={formAction} className="mt-6">
      <input type="hidden" name="targetKind" value="EXERCISE" />
      <input type="hidden" name="targetId" value={exerciseId} />

      {state && "error" in state ? (
        <p
          role="alert"
          className="mb-4 rounded-stoic-sm border border-stoic-danger/25 bg-danger-pale px-4 py-3 text-sm leading-relaxed text-stoic-danger"
        >
          {state.error.replace(/quân công/gi, "Đức Hạnh")}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <ReadingDialogClose />
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="inline-flex min-h-11 items-center justify-center rounded-stoic-pill border border-stoic-primary bg-stoic-primary px-5 py-2.5 text-sm font-semibold text-white shadow-stoic-1 transition-[background-color,border-color,transform] hover:border-stoic-primary-deep hover:bg-stoic-primary-deep active:translate-y-px disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stoic-primary/35"
        >
          {pending ? "Đang vào…" : `Vào Thí Bút · ${cost}`}
        </button>
      </div>
    </form>
  );
}
