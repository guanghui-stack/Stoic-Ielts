import { Tent, TrendingUp } from "lucide-react";
import { requireUser } from "@/lib/session";
import { ArenaFloor } from "@/components/arena/arena-floor";
import { QuyDienToggle } from "@/components/arena/quy-dien-toggle";
import {
  getArenaProfile,
  isInQuyDien,
  leaderboard,
} from "@/lib/arena/arena-service.ts";
import { getMeritWallet } from "@/lib/merit/merit-service.ts";
import { MUSTER_WINDOWS, MUSTER_XP_BONUS } from "@/lib/arena/rating.ts";

export const metadata = { title: "Đấu trường" };

/**
 * Đấu trường.
 *
 * Đây là nơi THỨ HAI được dùng dải mực tối, theo `docs/BRAND-GUIDELINE.md` mục
 * 8.1. Dùng ở đây vì nó có lý do chức năng chứ không phải trang trí: phòng đấu
 * cần dồn sự chú ý, và nền tối làm đúng việc đó.
 */
export default async function ArenaPage() {
  const user = await requireUser();
  const [profile, wallet, quyDien, board] = await Promise.all([
    getArenaProfile(user.id),
    getMeritWallet(user.id),
    isInQuyDien(user.id),
    leaderboard(10),
  ]);

  return (
    <div className="motion-page-entry">
      {/* Dải mực tối, mô-típ chữ ký. Xem brand guideline mục 8.1. */}
      <section
        className="relative overflow-hidden bg-navy-deep py-16 md:py-20"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 38% 56% at 16% 20%, rgb(184 134 43 / .16), transparent 66%), radial-gradient(ellipse 42% 60% at 86% 78%, rgb(58 127 196 / .16), transparent 70%)",
        }}
      >
        <div className="mx-auto w-full max-w-4xl px-6 text-center">
          <p className="label-caps text-gold-soft">Đấu trường</p>
          <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-paper md:text-4xl">
            Văn vô đệ nhất
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[1rem] leading-relaxed text-moon-silver">
            Cùng một đề, cùng một lúc, hai người. Máy chủ chấm và đo giờ, không
            ai tự khai điểm của mình.
          </p>

          <div className="mt-9 flex flex-wrap justify-center gap-px border border-navy bg-navy">
            <div className="flex-1 bg-navy-deep px-7 py-4">
              <p className="label-caps text-gold-soft">Chiến Lực</p>
              <p className="mt-1.5 font-display text-2xl font-bold tabular-nums text-paper">
                {profile.chienLuc}
              </p>
            </div>
            <div className="flex-1 bg-navy-deep px-7 py-4">
              <p className="label-caps text-gold-soft">Quân Công</p>
              <p className="mt-1.5 font-display text-2xl font-bold tabular-nums text-paper">
                {wallet.balance}
              </p>
            </div>
            <div className="flex-1 bg-navy-deep px-7 py-4">
              <p className="label-caps text-gold-soft">Chiến tích</p>
              <p className="mt-1.5 font-display text-2xl font-bold tabular-nums text-paper">
                {profile.wins}/{profile.losses}
              </p>
              <p className="mt-0.5 font-ui text-[0.7rem] text-moon-silver">
                Hoà khí {profile.truces}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-4xl px-6 py-12">
        <ArenaFloor selfId={user.id} inQuyDien={quyDien} />

        {/* Giờ điểm binh */}
        <section className="mt-12 border-l-4 border-gold bg-cream-deep px-6 py-5">
          <p className="label-caps">Giờ điểm binh</p>
          <p className="mt-2 text-[0.96rem] leading-relaxed text-ink-soft">
            {MUSTER_WINDOWS.map((w) => `${w.startHour} tới ${w.endHour} giờ`).join(
              " và ",
            )}
            . Trong khung đó mọi trận được thưởng thêm{" "}
            {Math.round(MUSTER_XP_BONUS * 100)} phần trăm kinh nghiệm.
          </p>
          <p className="mt-2 text-[0.9rem] leading-relaxed text-muted">
            Khung giờ tồn tại vì một lý do rất thực tế: trận cần hai người online
            cùng lúc, mà ai cũng học rải rác cả ngày. Dồn vào một khung là cách
            rẻ nhất để sân không rỗng.
          </p>
        </section>

        {/* Quy Điền */}
        <section className="mt-6 border border-line bg-paper p-6">
          <p className="label-caps flex items-center gap-2">
            <Tent className="h-3.5 w-3.5" aria-hidden="true" />
            Quy Điền
          </p>
          <p className="mt-2.5 max-w-2xl text-[0.96rem] leading-relaxed text-ink-soft">
            Tạm rút khỏi đấu trường. Không giới hạn thời gian, nhưng có cái giá:
            Chiến Lực sẽ trôi xuống dần cho tới mốc gốc rồi dừng, và bạn biến
            khỏi bảng xếp hạng. Đổi lại, không ai thách được bạn và những lời
            thách không trả lời cũng không bị đếm.
          </p>
          <QuyDienToggle inQuyDien={quyDien} />
        </section>

        {/* Bảng xếp hạng */}
        <section className="mt-12">
          <p className="label-caps flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
            Bảng Chiến Lực
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold text-navy-deep">
            Mười người đứng đầu
          </h2>
          <p className="mt-2 text-[0.9rem] text-muted">
            Người đang Quy Điền không có tên ở đây. Bảng này liệt kê những người
            đang thật sự ra trận.
          </p>

          <div className="mt-5 overflow-x-auto border border-line bg-paper">
            <table className="w-full min-w-[30rem] border-collapse text-[0.92rem]">
              <thead>
                <tr className="bg-cream-deep">
                  <th className="px-4 py-3 text-left font-ui text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-gold-ink">
                    Tên
                  </th>
                  <th className="px-4 py-3 text-right font-ui text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-gold-ink">
                    Chiến Lực
                  </th>
                  <th className="px-4 py-3 text-right font-ui text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-gold-ink">
                    Thắng
                  </th>
                  <th className="px-4 py-3 text-right font-ui text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-gold-ink">
                    Thua
                  </th>
                  <th className="px-4 py-3 text-right font-ui text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-gold-ink">
                    Hoà khí
                  </th>
                </tr>
              </thead>
              <tbody>
                {board.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-ink-soft">
                      Chưa ai ra trận.
                    </td>
                  </tr>
                ) : (
                  board.map((row) => (
                    <tr key={row.userId} className="border-t border-line">
                      <td className="px-4 py-2.5 font-ui font-semibold text-ink">
                        {row.name}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-ink">
                        {row.chienLuc}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-ink-soft">
                        {row.wins}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-ink-soft">
                        {row.losses}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-ink-soft">
                        {row.truces}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
