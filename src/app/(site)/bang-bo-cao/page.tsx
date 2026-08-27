import Link from "next/link";
import { Award, Megaphone, Swords } from "lucide-react";
import { listBulletins } from "@/lib/arena/bulletin-service";
import {
  currentSeason,
  standingsOf,
  territoryOwner,
  topContributors,
} from "@/lib/arena/season-service";
import {
  FACTION_LABEL,
  TOP_CONTRIBUTORS,
  daysLeftInSeason,
} from "@/lib/arena/season.ts";
import { NoteBox } from "@/components/ui";

export const metadata = {
  title: "Thông Báo",
  description:
    "Thông báo cộng đồng của STOIC · IELTS: chặng tiến bộ mới, dấu mốc vừa đạt và kết quả mỗi mùa.",
};
export const dynamic = "force-dynamic";

/**
 * Bảng Bố Cáo.
 *
 * CHỈ TIN VINH DANH. Không có đường nào đưa tin xấu lên đây: `canAnnounce` chặn
 * cả ba nhóm danh hiệu đấu trường, kể cả nhóm chuộc lỗi tuy công khai nhưng chỉ
 * người từng vấp mới có. Xem `lib/arena/season.ts`.
 *
 * Ai tắt hiện tên ở nơi công cộng thì không tin nào của họ lên đây, và tin cũ
 * cũng được gỡ ngay lúc họ tắt.
 */

const KIND_ICON = {
  RANK_UP: Swords,
  TITLE_EARNED: Award,
  SEASON_RESULT: Megaphone,
} as const;

const KIND_LABEL: Record<string, string> = {
  RANK_UP: "Chặng mới",
  TITLE_EARNED: "Dấu mốc",
  SEASON_RESULT: "Mùa giải",
};

export default async function BulletinBoardPage() {
  const season = await currentSeason();
  const [bulletins, standings, owner] = await Promise.all([
    listBulletins(30),
    standingsOf(season.id),
    territoryOwner(),
  ]);

  const leader = standings[0];
  const contributors =
    leader && leader.score > 0
      ? await topContributors(season.id, leader.faction, TOP_CONTRIBUTORS)
      : [];

  const daysLeft = daysLeftInSeason(season, new Date());
  const dateVN = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12">
      <p className="label-caps flex items-center gap-2">
        <Megaphone className="h-3.5 w-3.5" aria-hidden="true" />
        Cập nhật cộng đồng
      </p>
      <h1 className="mt-3 font-display text-3xl font-bold text-navy-deep">
        Thông Báo
      </h1>
      <p className="mt-3 max-w-2xl text-[1rem] leading-relaxed text-ink-soft">
        Nơi này chỉ ghi nhận tiến bộ có thể kiểm chứng: người bước sang chặng
        mới, dấu mốc vừa đạt và kết quả mỗi mùa. Quyền riêng tư của học viên luôn
        được tôn trọng; chỉ dữ liệu được phép công khai mới xuất hiện.
      </p>

      {/* Mùa đang chạy */}
      <section className="mt-10 border border-line bg-paper p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="label-caps">Mùa đang chạy</p>
            <p className="mt-1.5 font-display text-2xl font-bold text-navy-deep">
              {season.code}
            </p>
          </div>
          <p className="font-ui text-[0.9rem] text-ink-soft">
            {daysLeft > 0 ? `Còn ${daysLeft} ngày` : "Đang khép lại"}
          </p>
        </div>

        <p className="mt-3 text-[0.94rem] leading-relaxed text-ink-soft">
          {owner
            ? `${FACTION_LABEL[owner]} đang dẫn đầu miền rèn luyện, tiếp nối kết quả từ mùa trước tới hết mùa này.`
            : "Chưa trụ thực hành nào dẫn đầu miền rèn luyện. Mùa đầu tiên còn đang diễn ra."}
        </p>

        {leader && leader.score > 0 ? (
          <>
            <p className="mt-4 font-ui text-[0.94rem] text-ink">
              Dẫn đầu hiện nay:{" "}
              <span className="font-semibold">{FACTION_LABEL[leader.faction]}</span>{" "}
              với <span className="tabular-nums">{leader.score}</span> điểm.
            </p>
            {contributors.length > 0 ? (
              <ul className="mt-3 flex flex-col gap-1.5">
                {contributors.map((row, index) => (
                  <li
                    key={row.userId}
                    className="flex items-baseline justify-between gap-3 border-b border-line pb-1.5 font-ui text-[0.9rem] last:border-0"
                  >
                    <span className="text-ink">
                      <span className="mr-2 tabular-nums text-muted">
                        {index + 1}
                      </span>
                      {row.displayName}
                    </span>
                    <span className="tabular-nums text-ink-soft">
                      {row.points}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : (
          <p className="mt-4 font-ui text-[0.94rem] text-ink-soft">
            Chưa trụ thực hành nào ghi được điểm mùa này.
          </p>
        )}

        <Link
          href="/hoc-vien/dau-truong"
          className="mt-5 inline-flex items-center gap-2 border border-navy px-5 py-2 font-ui text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-navy transition-colors hover:bg-navy hover:text-paper"
        >
          Xem thử thách đối chiếu
        </Link>
      </section>

      {/* Tin */}
      <h2 className="mt-12 font-display text-2xl font-bold text-navy-deep">
        Tin gần đây
      </h2>

      {bulletins.length === 0 ? (
        <NoteBox className="mt-4">
          Chưa có tin nào. Tin đầu tiên sẽ tới khi có người thăng lên nhóm cấp
          bậc cao nhất, hoặc khi mùa giải đầu tiên khép lại.
        </NoteBox>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {bulletins.map((item) => {
            const Icon = KIND_ICON[item.kind as keyof typeof KIND_ICON] ?? Megaphone;
            return (
              <li key={item.id} className="border border-line bg-paper p-5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <Icon className="h-4 w-4 shrink-0 text-gold-ink" aria-hidden="true" />
                  {/* Chữ chứ không chỉ ký hiệu. */}
                  <span className="border border-line-strong px-2 py-0.5 font-ui text-[0.65rem] font-semibold uppercase tracking-[0.06em] text-ink-soft">
                    {KIND_LABEL[item.kind] ?? item.kind}
                  </span>
                  <span className="font-ui text-xs tabular-nums text-muted">
                    {dateVN.format(item.createdAt)}
                  </span>
                </div>
                <p className="mt-2 font-display text-lg font-bold text-navy-deep">
                  {item.headline}
                </p>
                {item.detail ? (
                  <p className="mt-1.5 text-[0.94rem] leading-relaxed text-ink-soft">
                    {item.detail}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
