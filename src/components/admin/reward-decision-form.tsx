"use client";

import { useActionState, useState } from "react";
import { Check, X } from "lucide-react";
import {
  approveRewardAction,
  rejectRewardAction,
  type RewardState,
} from "@/lib/actions/rewards";

/** Duyệt hoặc trả lại một yêu cầu đổi thưởng. */
export function RewardDecisionForm({ rewardId }: { rewardId: string }) {
  const [rejecting, setRejecting] = useState(false);
  const [approveState, approve, approving] = useActionState<RewardState, FormData>(
    approveRewardAction,
    undefined
  );
  const [rejectState, reject, rejecting_] = useActionState<RewardState, FormData>(
    rejectRewardAction,
    undefined
  );
  const state = approveState ?? rejectState;

  return (
    <div className="flex flex-col items-end gap-2">
      {!rejecting ? (
        <div className="flex gap-2">
          <form action={approve}>
            <input type="hidden" name="rewardId" value={rewardId} />
            <button
              type="submit"
              disabled={approving}
              className="inline-flex cursor-pointer items-center gap-1.5 border border-success bg-success-pale px-3 py-1.5 font-ui text-[0.7rem] font-semibold uppercase tracking-[0.06em] text-success transition-colors hover:bg-success hover:text-paper disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              {approving ? "Đang mở…" : "Duyệt"}
            </button>
          </form>
          <button
            type="button"
            onClick={() => setRejecting(true)}
            className="inline-flex cursor-pointer items-center gap-1.5 border border-line-strong px-3 py-1.5 font-ui text-[0.7rem] font-semibold uppercase tracking-[0.06em] text-ink-soft transition-colors hover:border-danger hover:text-danger"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Trả lại
          </button>
        </div>
      ) : (
        <form action={reject} className="w-full max-w-[18rem] space-y-2 text-left">
          <input type="hidden" name="rewardId" value={rewardId} />
          <input
            name="note"
            required
            minLength={5}
            placeholder="Vì sao trả lại?"
            className="w-full border border-line-strong bg-paper px-2.5 py-1.5 font-ui text-[0.75rem] text-ink"
          />
          <p className="font-ui text-[0.68rem] leading-snug text-muted">
            Học viên vẫn giữ phần thưởng và được chọn bài khác.
          </p>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={rejecting_}
              className="cursor-pointer border border-danger px-3 py-1.5 font-ui text-[0.7rem] font-semibold uppercase tracking-[0.06em] text-danger disabled:opacity-50"
            >
              Gửi
            </button>
            <button
              type="button"
              onClick={() => setRejecting(false)}
              className="cursor-pointer border border-line-strong px-3 py-1.5 font-ui text-[0.7rem] font-semibold uppercase tracking-[0.06em] text-ink-soft"
            >
              Thôi
            </button>
          </div>
        </form>
      )}

      {state?.error && (
        <p className="max-w-[18rem] text-right font-ui text-[0.7rem] leading-snug text-danger">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="max-w-[18rem] text-right font-ui text-[0.7rem] leading-snug text-success">
          {state.success}
        </p>
      )}
    </div>
  );
}
