"use client";

import { useState } from "react";
import { voteAction } from "@/lib/actions/forum";
import { SCORE_LABEL, VOTE_LABELS } from "@/lib/forum/rules";

/**
 * Like và Dislike.
 *
 * Đổi từ "Cắm cờ / Hạ cờ" ngày 2026-09-06 theo yêu cầu chủ dự án. Ba điều đã
 * chốt và đừng tự đổi lại:
 *
 * 1. **Chỉ Like có con số.** Số dislike KHÔNG hiện ở bất cứ đâu — không ai cần
 *    biết mình đang bị dìm bao nhiêu để học tốt hơn. Phiếu dislike vẫn trừ vào
 *    uy vọng như cũ, nó chỉ thôi được đem ra trưng.
 * 2. **1 Like = 1 uy vọng** cho tác giả. Xem `forum/reputation.ts`.
 * 3. **Vẫn là biểu mẫu gửi lên máy chủ**, không phải nút bật/tắt ở trình duyệt.
 *    Máy chủ là nơi quyết định phiếu, và nút vẫn chạy khi JavaScript chưa tải
 *    xong. Trạng thái ở đây chỉ để CHẠY HIỆU ỨNG ngay lúc bấm; một nhịp sau,
 *    máy chủ dựng lại và con số thật thay vào.
 *
 * Bấm lại nút đang sáng là RÚT phiếu — đường duy nhất để sửa một cú bấm nhầm.
 */
export function VoteButtons({
  targetType,
  targetId,
  upCount,
  myValue,
  path,
  disabled,
}: {
  targetType: "POST" | "COMMENT";
  targetId: string;
  /** Số lượt Like. Số Dislike cố ý KHÔNG nhận vào đây — xem chú thích trên. */
  upCount: number;
  myValue: 1 | -1 | 0;
  /** Đường dẫn để dựng lại sau khi bầu. Máy chủ chỉ nhận đường nội bộ. */
  path: string;
  disabled: boolean;
}) {
  /*
   * Trạng thái lạc quan: đổi ngay lúc bấm để hiệu ứng chạy, rồi nhường lại cho
   * máy chủ.
   *
   * Cách hết hạn KHÔNG dùng `useEffect` để gọi `setState` — quy tắc
   * `react-hooks/set-state-in-effect` chặn đúng việc đó, và chặn có lý: nó gây
   * thêm một lượt dựng lại thừa. Thay vào đó, trạng thái lạc quan mang theo
   * ẢNH CHỤP của con số máy chủ lúc bấm. Máy chủ trả về số mới thì ảnh chụp
   * không còn khớp và giá trị lạc quan tự bị bỏ qua ngay trong lúc dựng.
   */
  const serverSnapshot = `${myValue}:${upCount}`;
  const [optimistic, setOptimistic] = useState<{
    snapshot: string;
    value: 1 | -1 | 0;
  } | null>(null);
  const guess =
    optimistic && optimistic.snapshot === serverSnapshot ? optimistic.value : null;

  const value = guess ?? myValue;
  const liked = value === 1;
  const disliked = value === -1;

  // Hai con số cho hiệu ứng trượt: một cho trạng thái chưa Like, một cho đã
  // Like. Cột chỉ trượt giữa hai số này nên không bao giờ nhảy sai một nhịp.
  const idleCount = myValue === 1 ? upCount - 1 : upCount;
  const likedCount = idleCount + 1;

  if (disabled) {
    return (
      <span
        className="inline-flex items-center gap-1.5 font-ui text-xs tabular-nums text-muted"
        title={`${upCount} ${SCORE_LABEL}`}
      >
        <HeartIcon className="size-3.5" filled={liked} />
        {upCount}
      </span>
    );
  }

  return (
    <div className="inline-flex items-center gap-2">
      <div className="like-button" data-liked={liked ? "true" : "false"}>
        <form action={voteAction} className="like-button__form">
          <input type="hidden" name="targetType" value={targetType} />
          <input type="hidden" name="targetId" value={targetId} />
          <input type="hidden" name="clicked" value="1" />
          <input type="hidden" name="path" value={path} />
          <button
            type="submit"
            className="like-button__trigger"
            title={`${VOTE_LABELS.UP} — ${upCount} lượt`}
            aria-label={VOTE_LABELS.UP}
            aria-pressed={liked}
            onClick={() => setOptimistic({ snapshot: serverSnapshot, value: liked ? 0 : 1 })}
          >
            <HeartIcon className="like-button__icon" filled={liked} />
            {VOTE_LABELS.UP}
          </button>
        </form>

        <span className="like-button__counts" aria-hidden="true">
          <span className="like-button__count like-button__count--idle">
            {idleCount}
          </span>
          <span className="like-button__count like-button__count--liked">
            {likedCount}
          </span>
        </span>
        {/* Con số cho trình đọc màn hình: hai số trượt ở trên là hiệu ứng, và
            trình đọc màn hình sẽ đọc cả hai thành một chuỗi vô nghĩa. */}
        <span className="sr-only">{liked ? likedCount : idleCount} lượt Like</span>
      </div>

      <form action={voteAction}>
        <input type="hidden" name="targetType" value={targetType} />
        <input type="hidden" name="targetId" value={targetId} />
        <input type="hidden" name="clicked" value="-1" />
        <input type="hidden" name="path" value={path} />
        <button
          type="submit"
          className="dislike-button"
          title={VOTE_LABELS.DOWN}
          aria-label={VOTE_LABELS.DOWN}
          aria-pressed={disliked}
          data-voted={disliked ? "true" : "false"}
          onClick={() => setOptimistic({ snapshot: serverSnapshot, value: disliked ? 0 : -1 })}
        >
          <HeartIcon className="dislike-button__icon" filled={disliked} broken />
        </button>
      </form>
    </div>
  );
}

/**
 * Trái tim, và trái tim vỡ cho Dislike.
 *
 * Vẽ tay chứ không lấy từ `lucide-react`: nút này cần tô ruột theo trạng thái
 * và chạy keyframe phình to, mà hai việc đó dễ nhất khi chính mình giữ `path`.
 */
function HeartIcon({
  className,
  filled,
  broken = false,
}: {
  className?: string;
  filled: boolean;
  broken?: boolean;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={filled ? undefined : { fill: "none" }}
    >
      <path d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
      {broken && (
        <path
          d="M13.2 6.4 10.4 10.6l3.1 1.9-2.6 4.4"
          fill="none"
          stroke="var(--color-paper)"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}
