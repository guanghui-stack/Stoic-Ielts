"use client";

import { useActionState } from "react";
import { Feather } from "lucide-react";
import { startThiButAction, type ThiButStartState } from "@/lib/actions/thibut";

/**
 * Cổng vào Thí Bút.
 *
 * Nói rõ giá và số dư TRƯỚC khi bấm. Quân Công bị trừ ngay lúc bắt đầu, và
 * trượt thì mất mà không có hàng, nên người ta phải biết chính xác mình đang
 * cam kết điều gì.
 */
export function ThiButStart({
  targetKind,
  targetId,
  cost,
  balance,
  canAfford,
  canRetry,
  secondsLeft,
  previousAttempts,
  poolReady,
}: {
  targetKind: string;
  targetId: string;
  cost: number;
  balance: number;
  canAfford: boolean;
  canRetry: boolean;
  secondsLeft: number;
  previousAttempts: number;
  poolReady: boolean;
}) {
  const [state, formAction, pending] = useActionState<ThiButStartState, FormData>(
    startThiButAction,
    undefined,
  );

  const blocked = !poolReady || !canAfford || !canRetry;
  const minutes = Math.ceil(secondsLeft / 60);

  return (
    <form action={formAction} className="border border-line bg-paper p-8">
      <input type="hidden" name="targetKind" value={targetKind} />
      <input type="hidden" name="targetId" value={targetId} />

      <p className="label-caps flex items-center gap-2">
        <Feather className="h-3.5 w-3.5" aria-hidden="true" />
        Thí Bút
      </p>
      <h2 className="mt-3 font-display text-2xl font-bold leading-snug text-navy-deep">
        Không mua được binh thư, phải đánh mà đoạt lấy.
      </h2>
      <p className="mt-4 max-w-2xl text-[1rem] leading-relaxed text-ink-soft">
        Bốn câu ngắn, ba phút, cần đúng ba câu để qua. Qua thì mở được thứ bạn
        nhắm tới mà không trả một đồng nào. Trượt thì mất quân công mà chưa mở
        được gì, nhưng bạn sẽ thấy mình sai ở đâu và được vào lại với giá rẻ hơn.
      </p>

      <div className="mt-6 flex flex-wrap gap-px border border-line bg-line">
        <div className="flex-1 bg-cream-deep px-6 py-4">
          <p className="label-caps">Lượt này tốn</p>
          <p className="mt-1.5 font-display text-2xl font-bold tabular-nums text-navy-deep">
            {cost}
          </p>
        </div>
        <div className="flex-1 bg-cream-deep px-6 py-4">
          <p className="label-caps">Bạn đang có</p>
          <p className="mt-1.5 font-display text-2xl font-bold tabular-nums text-navy-deep">
            {balance}
          </p>
        </div>
        {previousAttempts > 0 ? (
          <div className="flex-1 bg-cream-deep px-6 py-4">
            <p className="label-caps">Đã thử</p>
            <p className="mt-1.5 font-display text-2xl font-bold tabular-nums text-navy-deep">
              {previousAttempts}
            </p>
          </div>
        ) : null}
      </div>

      {!poolReady ? (
        <p className="mt-5 border-l-4 border-gold bg-cream-deep px-5 py-3.5 text-[0.94rem] leading-relaxed text-ink-soft">
          Kho câu khảo hạch chưa sẵn sàng. Hãy quay lại sau.
        </p>
      ) : !canRetry ? (
        <p className="mt-5 border-l-4 border-gold bg-cream-deep px-5 py-3.5 text-[0.94rem] leading-relaxed text-ink-soft">
          Bạn vừa thử xong. Nghỉ thêm {minutes} phút rồi vào lại, lượt tới chỉ
          tốn {cost} quân công.
        </p>
      ) : !canAfford ? (
        <p className="mt-5 border-l-4 border-gold bg-cream-deep px-5 py-3.5 text-[0.94rem] leading-relaxed text-ink-soft">
          Còn thiếu {cost - balance} quân công. Học đủ hai mươi lăm phút và nộp
          một bài trong ngày là được ghi công, hoặc chữa xong một bài đã sai.
        </p>
      ) : null}

      {state && "error" in state ? (
        <p className="mt-5 border border-danger bg-danger-pale px-4 py-2.5 font-ui text-[0.9rem] text-danger">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || blocked}
        className="mt-7 inline-flex cursor-pointer items-center gap-2 border border-navy bg-navy px-8 py-3 font-ui text-[0.8rem] font-semibold uppercase tracking-[0.12em] text-paper transition-colors hover:bg-navy-deep disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Đang mở…" : `Vào Thí Bút · ${cost} quân công`}
      </button>
    </form>
  );
}
