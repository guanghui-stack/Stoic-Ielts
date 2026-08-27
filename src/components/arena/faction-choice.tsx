"use client";

import { useActionState } from "react";
import { Flag, Lock } from "lucide-react";
import { chooseFactionAction, type FactionState } from "@/lib/actions/faction";

/**
 * Chọn trụ thực hành.
 *
 * VỀ MÀU. Thẻ chọn phe cố ý KHÔNG tô màu phe. Brand guideline mục 1.5 cho phép
 * ba màu đó ở đúng hai chỗ: bảng đối chiếu và chú giải bản đồ. Đây là chỗ
 * thứ ba, nên nó dùng chữ và bóng dáng chứ không dùng màu. Ba dòng mô tả cách
 * thực hành đã đủ để phân biệt, và người mù màu đọc được như nhau.
 *
 * VỀ VIỆC KHÓA. Khi không chọn được, thẻ vẫn hiện đủ ba trụ kèm lý do. Ẩn hẳn
 * thì người học không biết là có bề mặt này để hướng tới.
 */

const CHOICES = [
  {
    code: "WEI",
    name: "Nhận thức",
    region: "Nhìn rõ bằng chứng",
    blurb: "Tách dữ kiện khỏi suy đoán và gọi đúng điều đang xảy ra.",
  },
  {
    code: "SHU",
    name: "Hành động",
    region: "Làm đúng bước tiếp theo",
    blurb: "Chọn một việc cụ thể và làm nó trong phạm vi mình kiểm soát.",
  },
  {
    code: "WU",
    name: "Ý chí",
    region: "Giữ nhịp bền vững",
    blurb: "Quay lại sau ngày khó và duy trì điều có thể lặp lại.",
  },
] as const;

export function FactionChoice({
  current,
  canChoose,
  reason,
}: {
  current: string | null;
  canChoose: boolean;
  reason: string;
}) {
  const [state, formAction, pending] = useActionState<FactionState, FormData>(
    chooseFactionAction,
    undefined,
  );

  return (
    <form action={formAction} className="mt-5">
      <div className="grid gap-px border border-line bg-line sm:grid-cols-3">
        {CHOICES.map((choice) => {
          const mine = current === choice.code;
          return (
            <label
              key={choice.code}
              className={`flex flex-col gap-1.5 bg-paper p-5 ${
                canChoose ? "cursor-pointer" : "cursor-default"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <input
                  type="radio"
                  name="faction"
                  value={choice.code}
                  defaultChecked={mine}
                  disabled={!canChoose}
                  className="h-4 w-4"
                />
                <span className="font-display text-lg font-bold text-navy-deep">
                  {choice.name}
                </span>
                {mine ? (
                  <span className="border border-line-strong px-2 py-0.5 font-ui text-[0.65rem] font-semibold uppercase tracking-[0.06em] text-ink-soft">
                    Trụ bạn chọn
                  </span>
                ) : null}
              </span>
              <span className="font-ui text-xs uppercase tracking-[0.08em] text-muted">
                {choice.region}
              </span>
              <span className="text-[0.92rem] leading-relaxed text-ink-soft">
                {choice.blurb}
              </span>
            </label>
          );
        })}
      </div>

      {canChoose ? (
        <button
          type="submit"
          disabled={pending}
          className="mt-4 inline-flex cursor-pointer items-center gap-2 border border-navy bg-navy px-6 py-2.5 font-ui text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-paper transition-colors hover:bg-navy-deep disabled:opacity-50"
        >
          <Flag className="h-4 w-4" aria-hidden="true" />
          {current ? "Đổi trụ cho mùa này" : "Bắt đầu với trụ"}
        </button>
      ) : (
        <p className="mt-4 flex items-start gap-2 font-ui text-[0.88rem] text-ink-soft">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
          {reason}
        </p>
      )}

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
    </form>
  );
}
