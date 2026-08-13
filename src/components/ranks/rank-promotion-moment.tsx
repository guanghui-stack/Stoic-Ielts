"use client";

import { useEffect, useState } from "react";
import { Flag, X } from "lucide-react";
import { RankInsignia } from "@/components/ranks/rank-insignia";

export function RankPromotionMoment({
  userId,
  promotionId,
  level,
  rankName,
  eligible,
}: {
  userId: string;
  promotionId: string;
  level: number;
  rankName: string;
  eligible: boolean;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!eligible) return;

    const storageKey = `wb-rank-promotion:${userId}`;
    try {
      if (window.localStorage.getItem(storageKey) === promotionId) return;
    } catch {
      // Trình duyệt chặn localStorage thì vẫn hiện lời chúc trong lượt này.
    }

    // Đợi chuyển trang 160ms kết thúc rồi mới trao ấn, tránh hai lớp chuyển động chồng nhau.
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(storageKey, promotionId);
      } catch {
        // Không lưu được chỉ làm mất cơ chế "một lần", không được làm hỏng hồ sơ.
      }
      setVisible(true);
    }, 160);

    return () => window.clearTimeout(timer);
  }, [eligible, promotionId, userId]);

  if (!visible) return null;

  return (
    <section
      role="status"
      aria-label={`Đã thăng lên bậc ${level}: ${rankName}`}
      className="rank-promotion-moment paper-grain relative overflow-hidden border border-vermilion bg-paper p-7 shadow-card"
    >
      <span
        className="absolute inset-y-0 left-0 w-1 bg-vermilion"
        aria-hidden="true"
      />
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Đóng thông báo thăng cấp"
        className="motion-press absolute right-3 top-3 flex h-11 w-11 cursor-pointer items-center justify-center text-ink-soft hover:text-vermilion"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>

      <div className="flex flex-wrap items-center gap-5 pr-10">
        <div className="rank-promotion-moment__insignia shrink-0">
          <RankInsignia level={level} className="h-20 w-20" />
        </div>
        <div className="rank-promotion-moment__copy min-w-0 flex-1">
          <p className="label-caps flex items-center gap-2 text-vermilion-ink">
            <Flag className="h-3.5 w-3.5" aria-hidden="true" />
            Khải hoàn · ấn triện mới
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold text-navy-deep">
            Đã thăng bậc: {rankName}
          </h2>
          <p className="mt-2 max-w-2xl text-[0.95rem] leading-relaxed text-ink-soft">
            Cửa ải đã vượt. Ấn triện mới đã được ghi vào hồ sơ; chiến tuyến kế
            tiếp đang chờ bạn, nhưng cấp bậc này sẽ không bao giờ bị mất.
          </p>
        </div>
      </div>
    </section>
  );
}
