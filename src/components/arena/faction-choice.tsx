"use client";

import { useActionState } from "react";
import { Flag, Lock } from "lucide-react";
import { chooseFactionAction, type FactionState } from "@/lib/actions/faction";

/**
 * Chọn phe.
 *
 * VỀ MÀU. Thẻ chọn phe cố ý KHÔNG tô màu phe. Brand guideline mục 1.5 cho phép
 * ba màu đó ở đúng hai chỗ: bảng xếp hạng phe và chú giải bản đồ. Đây là chỗ
 * thứ ba, nên nó dùng chữ và bóng dáng chứ không dùng màu. Ba dòng mô tả địa
 * thế đã đủ để phân biệt, và người mù màu đọc được như nhau.
 *
 * VỀ VIỆC KHOÁ. Khi không chọn được, thẻ vẫn hiện đủ ba phe kèm lý do. Ẩn hẳn
 * thì người học không biết là có thứ này để hướng tới.
 */

const CHOICES = [
  {
    code: "WEI",
    name: "Ngụy",
    region: "Phía bắc",
    blurb: "Thành trì kiên cố, kỷ luật và tổ chức.",
  },
  {
    code: "SHU",
    name: "Thục",
    region: "Phía tây",
    blurb: "Núi non hiểm trở, bền bỉ và địa lợi.",
  },
  {
    code: "WU",
    name: "Ngô",
    region: "Phía đông nam",
    blurb: "Sông nước mênh mông, linh hoạt và cơ động.",
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
                    Phe của bạn
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
          {current ? "Đổi phe cho mùa này" : "Gia nhập"}
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
