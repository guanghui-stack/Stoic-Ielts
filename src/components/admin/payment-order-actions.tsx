"use client";

import { useActionState, useState } from "react";
import { RefreshCw, Undo2 } from "lucide-react";
import {
  reconcileOrderAction,
  refundOrderAction,
  type AdminPaymentState,
} from "@/lib/actions/admin-payments";

/**
 * Hai thao tác thật sự đụng tới tiền, nên đều có xác nhận rõ ràng:
 * đối soát (hỏi lại SePay) và ghi nhận hoàn tiền (thu hồi quyền).
 */
export function ReconcileButton({ invoiceNumber }: { invoiceNumber: string }) {
  const [state, formAction, pending] = useActionState<AdminPaymentState, FormData>(
    reconcileOrderAction,
    undefined
  );

  return (
    <div className="text-right">
      <form action={formAction}>
        <input type="hidden" name="invoiceNumber" value={invoiceNumber} />
        <button
          type="submit"
          disabled={pending}
          title="Hỏi SePay xem đơn này đã thanh toán chưa"
          className="motion-press inline-flex cursor-pointer items-center gap-1.5 border border-navy px-3 py-1.5 font-ui text-[0.7rem] font-semibold uppercase tracking-[0.06em] text-navy hover:bg-navy hover:text-paper disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          Đối soát
        </button>
      </form>
      {state?.error && (
        <p className="mt-1.5 max-w-[18rem] text-right font-ui text-[0.7rem] leading-snug text-danger">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="mt-1.5 max-w-[18rem] text-right font-ui text-[0.7rem] leading-snug text-success">
          {state.success}
        </p>
      )}
    </div>
  );
}

export function RefundButton({
  invoiceNumber,
  amountLabel,
}: {
  invoiceNumber: string;
  amountLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<AdminPaymentState, FormData>(
    refundOrderAction,
    undefined
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="motion-press inline-flex cursor-pointer items-center gap-1.5 border border-danger px-3 py-1.5 font-ui text-[0.7rem] font-semibold uppercase tracking-[0.06em] text-danger hover:bg-danger hover:text-paper"
      >
        <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
        Hoàn tiền
      </button>
    );
  }

  return (
    <div className="motion-panel-swap max-w-[20rem] border border-danger bg-danger-pale p-3 text-left">
      <p className="font-ui text-[0.72rem] leading-snug text-danger">
        Ghi nhận hoàn tiền {amountLabel} cho đơn {invoiceNumber} và thu hồi
        quyền của đơn này. Việc chuyển tiền lại cho học viên bạn phải tự làm
        trên SePay hoặc ngân hàng — website không tự chuyển.
      </p>
      <form action={formAction} className="mt-2.5 space-y-2">
        <input type="hidden" name="invoiceNumber" value={invoiceNumber} />
        <input
          name="reason"
          required
          minLength={5}
          placeholder="Lý do hoàn tiền"
          className="w-full border border-line-strong bg-paper px-2.5 py-1.5 font-ui text-[0.75rem] text-ink"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending}
            className="motion-press cursor-pointer border border-danger bg-danger px-3 py-1.5 font-ui text-[0.7rem] font-semibold uppercase tracking-[0.06em] text-paper disabled:opacity-50"
          >
            {pending ? "Đang ghi…" : "Xác nhận hoàn tiền"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="motion-press cursor-pointer border border-line-strong px-3 py-1.5 font-ui text-[0.7rem] font-semibold uppercase tracking-[0.06em] text-ink-soft"
          >
            Thôi
          </button>
        </div>
      </form>
      {state?.error && (
        <p className="mt-2 font-ui text-[0.7rem] leading-snug text-danger">{state.error}</p>
      )}
      {state?.success && (
        <p className="mt-2 font-ui text-[0.7rem] leading-snug text-success">{state.success}</p>
      )}
    </div>
  );
}
