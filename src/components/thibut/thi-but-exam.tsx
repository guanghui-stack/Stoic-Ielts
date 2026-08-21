"use client";

import { useActionState, useEffect, useState } from "react";
import { submitThiButAction, type ThiButSubmitState } from "@/lib/actions/thibut";

type Item = {
  id: string;
  typeLabel: string;
  prompt: string;
  options: string[];
};

/**
 * Bốn câu khảo hạch, bấm giờ.
 *
 * Đồng hồ ở đây chỉ để NHẮC, không phải trọng tài: máy chủ mới là nơi giữ
 * `deadlineAt`. Hết giờ thì bài tự nộp theo phần đã làm, không huỷ lượt, vì
 * Quân Công đã trừ rồi và huỷ trắng sẽ biến một sự cố mạng thành mất tiền.
 *
 * Đồng hồ KHÔNG đổi sang màu đỏ khi sắp hết giờ. Đổi màu chỉ làm người ta
 * cuống mà không thêm thông tin nào, vì con số đã ở ngay đó. Xem
 * `docs/BRAND-GUIDELINE.md` mục 8.9.
 */
export function ThiButExam({
  attemptId,
  items,
  deadlineIso,
  threshold,
}: {
  attemptId: string;
  items: Item[];
  deadlineIso: string;
  threshold: number;
}) {
  const [state, formAction, pending] = useActionState<ThiButSubmitState, FormData>(
    submitThiButAction,
    undefined,
  );
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    const deadline = new Date(deadlineIso).getTime();
    const tick = () =>
      setSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadlineIso]);

  const mm = secondsLeft === null ? "--" : String(Math.floor(secondsLeft / 60));
  const ss =
    secondsLeft === null ? "--" : String(secondsLeft % 60).padStart(2, "0");

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="attemptId" value={attemptId} />

      <div className="flex flex-wrap items-baseline justify-between gap-4 border border-line bg-cream-deep px-6 py-4">
        <p className="font-display text-lg font-bold text-navy-deep">
          Không mua được binh thư, phải đánh mà đoạt lấy.
        </p>
        <p className="font-display text-2xl font-bold tabular-nums text-ink">
          {mm}:{ss}
        </p>
      </div>

      <p className="text-[0.95rem] leading-relaxed text-ink-soft">
        Bốn câu, cần đúng {threshold} câu để qua. Hết giờ thì bài tự nộp theo
        phần đã làm.
      </p>

      {items.map((item, index) => (
        <fieldset key={item.id} className="border border-line bg-paper p-6">
          <legend className="px-2 font-ui text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-gold-ink">
            Câu {index + 1} · {item.typeLabel}
          </legend>
          <p className="mt-2 text-[1.02rem] leading-relaxed text-ink">
            {item.prompt}
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {item.options.map((option, optionIndex) => (
              <label
                key={optionIndex}
                className="flex cursor-pointer items-start gap-3 border border-line px-4 py-2.5 text-[0.95rem] text-ink-soft transition-colors hover:border-navy has-checked:border-navy has-checked:bg-info-pale has-checked:text-ink"
              >
                <input
                  type="radio"
                  name={`answer:${item.id}`}
                  value={optionIndex}
                  className="mt-1"
                />
                <span className="font-ui text-xs font-semibold">
                  {String.fromCharCode(65 + optionIndex)}
                </span>
                <span className="flex-1">{option}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      {state && "error" in state ? (
        <p className="border border-danger bg-danger-pale px-4 py-2.5 font-ui text-[0.9rem] text-danger">
          {state.error}
        </p>
      ) : null}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex cursor-pointer items-center gap-2 border border-navy bg-navy px-8 py-3 font-ui text-[0.8rem] font-semibold uppercase tracking-[0.12em] text-paper transition-colors hover:bg-navy-deep disabled:opacity-50"
        >
          {pending ? "Đang chấm…" : "Nộp bài"}
        </button>
      </div>
    </form>
  );
}
