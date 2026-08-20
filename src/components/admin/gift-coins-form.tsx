"use client";

import { useActionState } from "react";
import { Coins } from "lucide-react";
import { giftCoinsAction, type GiftCoinsState } from "@/lib/actions/admin-coins";

/**
 * Tặng xu cho một học viên.
 *
 * Ô nhập số chứ không phải vài nút cố định: lý do tặng rất khác nhau (đền bù
 * sự cố, học phí đóng tại lớp, khuyến mãi) nên con số cũng khác nhau. Bắt buộc
 * ghi LÝ DO — vài tháng sau nhìn lại sổ cái mà chỉ thấy "+50 xu" thì không ai
 * biết đó là đền bù hay là nhầm.
 */
export function GiftCoinsForm({
  userId,
  userName,
}: {
  userId: string;
  userName: string;
}) {
  const [state, action, pending] = useActionState<GiftCoinsState, FormData>(
    giftCoinsAction,
    undefined
  );

  return (
    <details className="text-left">
      <summary className="inline-flex cursor-pointer items-center gap-1.5 border border-line px-2.5 py-1.5 font-ui text-[0.7rem] font-semibold uppercase tracking-[0.06em] text-ink-soft transition-colors hover:border-gold hover:text-gold">
        <Coins className="h-3.5 w-3.5" aria-hidden="true" />
        Tặng xu
      </summary>
      <form action={action} className="mt-2 space-y-2 border border-line bg-cream p-3">
        <input type="hidden" name="userId" value={userId} />
        <p className="font-ui text-[0.7rem] text-muted">Tặng xu cho {userName}</p>
        <input
          type="number"
          name="coins"
          min={1}
          max={1000}
          required
          placeholder="Số xu"
          className="w-full border border-line-strong bg-paper px-2 py-1.5 font-ui text-xs text-ink"
        />
        <input
          type="text"
          name="reason"
          required
          minLength={5}
          placeholder="Lý do (bắt buộc)"
          className="w-full border border-line-strong bg-paper px-2 py-1.5 font-ui text-xs text-ink"
        />
        <button
          type="submit"
          disabled={pending}
          className="w-full cursor-pointer border border-gold bg-gold px-3 py-1.5 font-ui text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-navy-deep disabled:opacity-60"
        >
          {pending ? "Đang tặng…" : "Xác nhận tặng"}
        </button>
        {state?.error && (
          <p className="font-ui text-[0.7rem] text-danger">{state.error}</p>
        )}
        {state?.success && (
          <p className="font-ui text-[0.7rem] text-success">{state.success}</p>
        )}
      </form>
    </details>
  );
}
