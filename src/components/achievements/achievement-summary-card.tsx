import Link from "next/link";
import { Award, ChevronRight, Sparkles } from "lucide-react";
import { titleOverviewFor } from "@/lib/achievements/view";

/**
 * Ô tóm tắt danh hiệu trên trang hồ sơ học tập.
 *
 * Cố ý chỉ hiện BA thứ: đã đạt bao nhiêu, mốc đang tiến gần nhất, và danh hiệu
 * mới nhận. Đổ cả danh mục vào đây sẽ biến trang hồ sơ thành một bức tường ô
 * khóa — thứ khiến người học nản chứ không khiến họ học.
 */
export async function AchievementSummaryCard({ userId }: { userId: string }) {
  const overview = await titleOverviewFor(userId);

  return (
    <article className="border border-line bg-paper p-7 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="label-caps flex items-center gap-2">
            <Award className="h-3.5 w-3.5" aria-hidden="true" />
            Danh hiệu
          </p>
          <p className="mt-2.5 font-display text-2xl font-bold text-navy-deep">
            Đã đạt {overview.earnedCount}
            <span className="text-lg text-muted">/{overview.totalCount}</span>
          </p>
        </div>
        <Link
          href="/hoc-vien/danh-hieu"
          className="inline-flex items-center gap-1.5 border border-navy px-5 py-2.5 font-ui text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-navy transition-colors hover:bg-navy hover:text-paper"
        >
          Xem hành trình
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {overview.latest && (
        <p className="mt-5 flex items-start gap-2 border-l-4 border-success bg-success-pale px-5 py-3.5 font-ui text-sm leading-relaxed text-success">
          <Award className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Mới nhận: <strong>{overview.latest.name}</strong>
          </span>
        </p>
      )}

      {overview.nextUp && (
        <div className="mt-4">
          <p className="font-ui text-sm text-ink">
            Đang tiến gần: <strong>{overview.nextUp.name}</strong>
          </p>
          <div
            className="mt-2 h-1.5 w-full bg-line"
            role="progressbar"
            aria-valuenow={overview.nextUp.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Tiến độ ${overview.nextUp.name}`}
          >
            <div className="h-full bg-gold" style={{ width: `${overview.nextUp.percent}%` }} />
          </div>
          {overview.nextUp.hint && (
            <p className="mt-2 flex items-start gap-1.5 font-ui text-xs leading-relaxed text-ink-soft">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" aria-hidden="true" />
              {overview.nextUp.hint}
            </p>
          )}
        </div>
      )}

      {!overview.latest && !overview.nextUp && (
        <p className="mt-4 font-ui text-sm leading-relaxed text-ink-soft">
          Hoàn thành bài Reading đầu tiên để bắt đầu hành trình danh hiệu.
        </p>
      )}
    </article>
  );
}
