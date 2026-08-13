import { Flag, FlagOff } from "lucide-react";
import { voteAction } from "@/lib/actions/forum";
import { SCORE_LABEL, VOTE_LABELS } from "@/lib/forum/rules";

/**
 * Cắm cờ / Hạ cờ.
 *
 * Hai biểu mẫu riêng chứ không phải một nút đổi trạng thái ở trình duyệt: như
 * vậy nó chạy cả khi JavaScript chưa tải xong, và máy chủ vẫn là nơi quyết
 * định. Bấm lại nút đang sáng là RÚT phiếu — đường duy nhất để sửa một cú bấm
 * nhầm.
 */
export function VoteButtons({
  targetType,
  targetId,
  upCount,
  downCount,
  myValue,
  path,
  disabled,
  compact = false,
}: {
  targetType: "POST" | "COMMENT";
  targetId: string;
  /** Số cờ đã cắm. Hiện RIÊNG với số cờ đã hạ — xem chú thích đầu file. */
  upCount: number;
  downCount: number;
  myValue: 1 | -1 | 0;
  /** Đường dẫn để dựng lại sau khi bầu. Máy chủ chỉ nhận đường nội bộ. */
  path: string;
  disabled: boolean;
  compact?: boolean;
}) {
  const size = compact ? "h-3.5 w-3.5" : "h-4 w-4";
  const pad = compact ? "px-1.5 py-1" : "px-2 py-1.5";

  const num = compact ? "text-xs" : "text-sm";

  if (disabled) {
    return (
      <span
        className="inline-flex items-center gap-2 font-ui text-xs text-muted tabular-nums"
        title={`${upCount - downCount} ${SCORE_LABEL}`}
      >
        <span className="inline-flex items-center gap-1">
          <Flag className={size} aria-hidden="true" />
          {upCount}
        </span>
        <span className="inline-flex items-center gap-1">
          <FlagOff className={size} aria-hidden="true" />
          {downCount}
        </span>
      </span>
    );
  }

  return (
    <div className="inline-flex items-center gap-1">
      <form action={voteAction}>
        <input type="hidden" name="targetType" value={targetType} />
        <input type="hidden" name="targetId" value={targetId} />
        <input type="hidden" name="clicked" value="1" />
        <input type="hidden" name="path" value={path} />
        <button
          type="submit"
          title={`${VOTE_LABELS.UP} — ${upCount} cờ đã cắm`}
          aria-label={VOTE_LABELS.UP}
          aria-pressed={myValue === 1}
          className={`inline-flex cursor-pointer items-center gap-1.5 border transition-colors ${pad} ${num} font-semibold tabular-nums ${
            myValue === 1
              ? "border-gold bg-gold-pale text-gold"
              : "border-line text-muted hover:border-gold hover:text-gold"
          }`}
        >
          <Flag className={size} aria-hidden="true" />
          {upCount}
        </button>
      </form>

      <form action={voteAction}>
        <input type="hidden" name="targetType" value={targetType} />
        <input type="hidden" name="targetId" value={targetId} />
        <input type="hidden" name="clicked" value="-1" />
        <input type="hidden" name="path" value={path} />
        <button
          type="submit"
          title={`${VOTE_LABELS.DOWN} — ${downCount} cờ đã hạ`}
          aria-label={VOTE_LABELS.DOWN}
          aria-pressed={myValue === -1}
          className={`inline-flex cursor-pointer items-center gap-1.5 border transition-colors ${pad} ${num} font-semibold tabular-nums ${
            myValue === -1
              ? "border-ink-soft bg-cream-deep text-ink"
              : "border-line text-muted hover:border-ink-soft hover:text-ink-soft"
          }`}
        >
          <FlagOff className={size} aria-hidden="true" />
          {downCount}
        </button>
      </form>
    </div>
  );
}
