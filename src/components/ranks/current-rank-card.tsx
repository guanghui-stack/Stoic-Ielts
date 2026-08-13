import { Shield, Moon } from "lucide-react";
import { RANK_ERAS, type RankEra } from "@/lib/ranks/catalog";
import { RankInsignia } from "@/components/ranks/rank-insignia";

/**
 * Thẻ cấp bậc hiện tại.
 *
 * "Nhàn cư" cố ý KHÔNG dùng màu cảnh báo và không có chữ nào mang nghĩa phạt.
 * Người ngừng học vài tuần vẫn giữ nguyên cấp bậc — đó là quyết định số 8 của
 * đặc tả — nên giao diện không được làm họ thấy mình vừa mất thứ gì.
 */
export function CurrentRankCard({
  level,
  rankName,
  era,
  bandAnchor,
  active,
  cardinalTitleName,
}: {
  level: number;
  rankName: string;
  era: RankEra;
  bandAnchor: string;
  active: boolean;
  cardinalTitleName?: string | null;
}) {
  return (
    <section
      aria-label="Cấp bậc hiện tại"
      className="border border-line bg-paper p-7 paper-grain"
    >
      <p className="label-caps flex items-center gap-2">
        <Shield className="h-3.5 w-3.5" aria-hidden />
        Cấp bậc · bậc {level} trên 9
      </p>

      {/* Huy hiệu đặt cạnh tên bậc: học viên phải NHÌN THẤY thứ mình vừa đạt,
          không chỉ đọc tên nó. Đây cũng là chỗ duy nhất họ gặp huy hiệu cấp
          bậc của chính mình. */}
      <div className="mt-2.5 flex items-center gap-4">
        <RankInsignia level={level} className="h-14 w-14 shrink-0" />
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-bold text-navy-deep">
            {cardinalTitleName ?? rankName}
          </h2>
          <p className="mt-1 font-ui text-sm text-muted">
            Thời {RANK_ERAS[era].name} · {bandAnchor}
          </p>
        </div>
      </div>

      <p className="mt-4 text-[0.95rem] leading-relaxed text-ink-soft">
        {RANK_ERAS[era].meaning}
      </p>

      <p className="mt-5 inline-flex items-center gap-2 border border-line bg-cream px-3 py-1.5 font-ui text-xs text-ink-soft">
        {active ? (
          <>
            <Shield className="h-3.5 w-3.5 text-jade-ink" aria-hidden />
            Đang trấn thủ
          </>
        ) : (
          <>
            <Moon className="h-3.5 w-3.5 text-ash-ink" aria-hidden />
            Nhàn cư — cấp bậc vẫn giữ nguyên, chỉ cần một ngày học thật là trở lại
          </>
        )}
      </p>
    </section>
  );
}
