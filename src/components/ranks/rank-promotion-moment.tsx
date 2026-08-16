"use client";

import { BadgeCheck, Flag, X } from "lucide-react";
import { RankInsignia } from "@/components/ranks/rank-insignia";
import { CeremonyLayer } from "@/components/world/ceremony-layer";

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
  return (
    <CeremonyLayer
      eventId={`${userId}:${promotionId}`}
      storageScope="rank"
      eligible={eligible}
      label={`Đã thăng lên bậc ${level}: ${rankName}`}
    >
      {(dismiss) => (
        <article className="rank-promotion-moment world-ceremony__surface paper-grain relative overflow-hidden border border-vermilion bg-paper p-7 shadow-card">
          <span
            className="absolute inset-y-0 left-0 w-1 bg-vermilion"
            aria-hidden="true"
          />
          <button
            type="button"
            onClick={dismiss}
            aria-label="Đóng thông báo thăng cấp"
            className="world-action absolute right-3 top-3 flex h-11 w-11 cursor-pointer items-center justify-center text-ink-soft hover:text-vermilion"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>

          <div className="flex flex-wrap items-center gap-5 pr-10">
            <div className="world-ceremony__insignia shrink-0">
              <RankInsignia level={level} className="h-20 w-20" />
            </div>
            <div className="world-ceremony__copy min-w-0 flex-1">
              <p className="label-caps flex items-center gap-2 text-vermilion-ink">
                <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                Khải hoàn · ấn triện mới
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold text-navy-deep">
                Đã thăng bậc: {rankName}
              </h2>
              <p className="mt-2 max-w-2xl text-[0.95rem] leading-relaxed text-ink-soft">
                Cửa ải đã vượt. Ấn triện mới đã được ghi vào hồ sơ; chiến tuyến
                kế tiếp đang chờ bạn, nhưng cấp bậc này sẽ không bao giờ bị mất.
              </p>
            </div>
            <span className="world-ceremony__seal inline-flex items-center gap-1.5 border border-vermilion px-3 py-1.5 font-ui text-xs font-semibold uppercase tracking-[0.08em] text-vermilion-ink">
              <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Đã ghi bậc
            </span>
          </div>
        </article>
      )}
    </CeremonyLayer>
  );
}
