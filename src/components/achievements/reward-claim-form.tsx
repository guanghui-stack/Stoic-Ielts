"use client";

import { useActionState } from "react";
import { Gift } from "lucide-react";
import { requestRewardAction, type RewardState } from "@/lib/actions/rewards";

/** Học viên chọn một bài đang khóa để dùng phần thưởng từ danh hiệu. */
export function RewardClaimForm({
  rewardId,
  titleName,
  expiresLabel,
  options,
}: {
  rewardId: string;
  titleName: string;
  expiresLabel: string;
  options: Array<{ id: string; title: string }>;
}) {
  const [state, formAction, pending] = useActionState<RewardState, FormData>(
    requestRewardAction,
    undefined
  );

  return (
    <div className="mt-8 border border-gold bg-gold-pale p-7">
      <p className="label-caps flex items-center gap-2">
        <Gift className="h-3.5 w-3.5" aria-hidden="true" />
        Phần thưởng của bạn
      </p>
      <h2 className="mt-2.5 font-display text-xl font-bold text-navy-deep">
        Chọn một bài để mở miễn phí
      </h2>
      <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-ink-soft">
        Danh hiệu <strong>{titleName}</strong> cho bạn quyền mở một bài Reading
        đang khóa, kèm luôn phần chữa bài Feynman của bài đó. Hãy gửi yêu cầu
        trước ngày {expiresLabel}.
      </p>

      {options.length === 0 ? (
        <p className="mt-5 font-ui text-sm text-ink-soft">
          Hiện chưa có bài nào đang khóa để đổi. Hãy quay lại khi trung tâm đăng
          thêm đề.
        </p>
      ) : (
        <form action={formAction} className="mt-5 flex flex-wrap items-end gap-3">
          <input type="hidden" name="rewardId" value={rewardId} />
          <label className="min-w-[16rem] flex-1">
            <span className="block font-ui text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-ink">
              Bài muốn mở
            </span>
            <select
              name="exerciseId"
              required
              className="mt-1.5 w-full border border-line-strong bg-paper px-3 py-2.5 font-ui text-sm text-ink"
            >
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex cursor-pointer items-center gap-2 border border-gold bg-gold px-6 py-2.5 font-ui text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-paper transition-colors hover:bg-[#9d7223] disabled:opacity-50"
          >
            {pending ? "Đang gửi…" : "Gửi yêu cầu"}
          </button>
        </form>
      )}

      {state?.error && (
        <p className="mt-3 font-ui text-sm text-danger">{state.error}</p>
      )}
      {state?.success && (
        <p className="mt-3 font-ui text-sm text-success">{state.success}</p>
      )}
    </div>
  );
}
