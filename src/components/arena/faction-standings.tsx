import { FACTION_LABEL, type Faction, type FactionStanding } from "@/lib/arena/season.ts";

/**
 * Bảng xếp hạng ba phe.
 *
 * VỀ MÀU. Đây là MỘT trong hai chỗ duy nhất được dùng ba màu phe, theo brand
 * guideline mục 1.5. Chỗ còn lại là chú giải bản đồ lãnh địa.
 *
 * Và ngay ở đây màu cũng không phải tín hiệu duy nhất: thứ hạng có số, tên phe
 * có chữ, và thanh dài ngắn theo điểm. Người mù màu đọc bảng này không thiếu gì.
 *
 * VỀ CON SỐ ĐƯỢC XẾP HẠNG. Cột xếp hạng là "điểm nhóm đầu", không phải tổng
 * điểm toàn phe. Bảng hiện cả hai và nói rõ cột nào quyết định, vì nếu chỉ hiện
 * một thì phe đông người sẽ tưởng mình bị tính sai.
 */

const BAR_CLASS: Readonly<Record<Faction, string>> = {
  WEI: "bg-faction-wei",
  SHU: "bg-faction-shu",
  WU: "bg-faction-wu",
};

const TEXT_CLASS: Readonly<Record<Faction, string>> = {
  WEI: "text-faction-wei-ink",
  SHU: "text-faction-shu-ink",
  WU: "text-faction-wu-ink",
};

export function FactionStandings({
  standings,
  topN,
  myFaction,
}: {
  standings: readonly FactionStanding[];
  topN: number;
  myFaction: Faction | null;
}) {
  const max = Math.max(1, ...standings.map((s) => s.score));

  return (
    <div className="mt-5 flex flex-col gap-3">
      {standings.map((standing, index) => {
        const mine = standing.faction === myFaction;
        return (
          <div
            key={standing.faction}
            className={`border bg-paper p-5 ${mine ? "border-line-strong" : "border-line"}`}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <p className="flex flex-wrap items-center gap-2.5">
                <span className="font-ui text-sm font-semibold tabular-nums text-muted">
                  {index + 1}
                </span>
                <span
                  className={`font-display text-lg font-bold ${TEXT_CLASS[standing.faction]}`}
                >
                  {FACTION_LABEL[standing.faction]}
                </span>
                {mine ? (
                  <span className="border border-line-strong px-2 py-0.5 font-ui text-[0.65rem] font-semibold uppercase tracking-[0.06em] text-ink-soft">
                    Phe của bạn
                  </span>
                ) : null}
              </p>
              <p className="text-right">
                <span className="font-display text-2xl font-bold tabular-nums text-navy-deep">
                  {standing.score}
                </span>
                <span className="ml-1.5 font-ui text-xs text-muted">điểm</span>
              </p>
            </div>

            <div
              className="mt-3 h-2 w-full bg-cream-deep"
              role="presentation"
            >
              <div
                className={`h-2 ${BAR_CLASS[standing.faction]}`}
                style={{ width: `${Math.round((standing.score / max) * 100)}%` }}
              />
            </div>

            <p className="mt-2.5 font-ui text-xs text-muted">
              {standing.activeMembers === 0
                ? "Chưa ai của phe này ra trận mùa nay."
                : `${standing.countedMembers} người được tính trên tổng ${standing.activeMembers} người đã ra trận. Toàn phe cộng lại ${standing.totalPoints} điểm.`}
            </p>
          </div>
        );
      })}

      <p className="text-[0.9rem] leading-relaxed text-ink-soft">
        Xếp hạng tính bằng tổng điểm của {topN} người đóng góp nhiều nhất mỗi
        phe, không phải tổng điểm toàn phe. Nhờ vậy phe đông người không thắng
        chỉ vì đông, và một người đóng góp ít cũng không bao giờ kéo phe mình
        xuống.
      </p>
    </div>
  );
}
