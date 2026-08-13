import Link from "next/link";
import { Check, Clock, Lock, ShieldCheck, Trophy, X } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { currentCompetition, eligibilityFor } from "@/lib/competition/service";
import { ELIGIBILITY } from "@/lib/competition/ranking";
import { startCompetitionAttemptAction } from "@/lib/actions/competition";
import { CompetitionRegisterForm } from "@/components/competition/register-form";
import { BADGE_INFO } from "@/components/competition/badges";
import { ErrorBanner, NoteBox, PageHero, SubmitButton } from "@/components/ui";

export const metadata = {
  title: "Nguyệt Thí",
  description:
    "Cuộc thi IELTS Reading hàng tháng của HỔ PHÙ · IELTS — ba đề trong bảy ngày, giải thưởng tiền mặt, và huy hiệu chỉ dành cho ba người đứng đầu.",
};
export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  CHUA_MO: "Đề này chưa tới giờ mở.",
  DA_DONG: "Kỳ thi đã đóng cổng.",
  CHUA_DANG_KY: "Bạn chưa đăng ký kỳ thi này.",
  BI_LOAI: "Bài dự thi của bạn đang bị tạm dừng. Vui lòng liên hệ trung tâm.",
  DA_LAM: "Mỗi đề chỉ được làm một lần duy nhất.",
};

function fmt(d: Date) {
  return d.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

export default async function CompetitionPage({
  searchParams,
}: {
  searchParams: Promise<{ loi?: string }>;
}) {
  const { loi } = await searchParams;
  // Trang này XEM ĐƯỢC KHI CHƯA ĐĂNG NHẬP: người chưa là học viên cần hiểu
  // cuộc thi là gì trước khi quyết định có theo đuổi hay không.
  const user = await getCurrentUser();
  const competition = await currentCompetition();

  const [entry, eligibility] =
    user && competition
      ? await Promise.all([
          db.competitionEntry.findUnique({
            where: {
              competitionId_userId: {
                competitionId: competition.id,
                userId: user.id,
              },
            },
            include: { attempts: true },
          }),
          eligibilityFor(user.id, competition.registrationCloseAt),
        ])
      : [null, null];

  const now = new Date();

  return (
    <div className="motion-page-entry">
      <PageHero
        label="Cuộc thi hàng tháng"
        title="Nguyệt Thí"
        lede="Bảy ngày, ba đề Reading, và một danh sách rất ngắn những người đủ tư cách bước vào. Không có đường tắt tới đây — chỉ có tháng ngày làm bài đều đặn và chữa sai tử tế."
      />

      <section className="mx-auto max-w-4xl px-6 py-14">
        {loi && (
          <div className="mb-8">
            <ErrorBanner message={ERRORS[loi] ?? "Không thực hiện được."} />
          </div>
        )}

        {/* ===== Cuộc thi diễn ra thế nào ===== */}
        <h2 className="font-display text-2xl font-bold text-navy-deep">
          Cuộc thi diễn ra thế nào
        </h2>
        <ol className="mt-6 space-y-4">
          {[
            {
              step: "1",
              title: "Đăng ký trước khi cổng đóng",
              body: "Mở đăng ký trước ngày thi 7 ngày. Bạn chọn luôn cách mình xuất hiện trên Bảng Vàng: tên thật, biệt danh, hoặc ẩn danh.",
            },
            {
              step: "2",
              title: "Ba đề mở dần vào ngày 1 · 3 · 5",
              body: "Không mở cùng lúc, để bạn không dồn cả ba vào một buổi kiệt sức. Mỗi đề làm đúng một lần — mất mạng giữa chừng thì quay lại đúng lượt đang dở.",
            },
            {
              step: "3",
              title: "Không có bảng xếp hạng trực tiếp",
              body: "Trong lúc thi bạn chỉ thấy tiến độ của mình. Nhìn mình đứng thứ mấy chỉ khiến người ta thi lấy thứ hạng thay vì làm bài cho tử tế.",
            },
            {
              step: "4",
              title: "Rà soát rồi mới công bố",
              body: "Hết bảy ngày, trung tâm kiểm tra thời gian làm bài, tài khoản trùng và các dấu hiệu bất thường. Kết quả lên Bảng Vàng sau bước này, không sớm hơn.",
            },
          ].map((item) => (
            <li key={item.step} className="flex gap-5 border border-line bg-paper p-6">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-gold font-display text-lg font-bold text-gold">
                {item.step}
              </span>
              <div className="min-w-0">
                <h3 className="font-display text-lg font-bold text-navy-deep">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-[0.94rem] leading-relaxed text-ink-soft">
                  {item.body}
                </p>
              </div>
            </li>
          ))}
        </ol>

        {/* ===== Huy hiệu ===== */}
        <h2 className="mt-14 font-display text-2xl font-bold text-navy-deep">
          Ba huy hiệu, và chỉ ba
        </h2>
        <p className="mt-3 max-w-2xl text-[0.96rem] leading-relaxed text-ink-soft">
          Danh hiệu là chữ và bạn giữ vĩnh viễn. Huy hiệu là hình, và chỉ sống{" "}
          <strong>30 ngày</strong> — vinh quang của tháng này không nên che mờ
          người giỏi của tháng sau.
        </p>

        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {BADGE_INFO.map(({ code, Badge, title, prizeLabel, requirement, note }) => (
            <article
              key={code}
              className="flex flex-col items-center border border-line bg-paper p-7 text-center shadow-card"
            >
              <Badge className="h-20 w-20" />
              <h3 className="mt-4 font-display text-lg font-bold leading-snug text-navy-deep">
                {title}
              </h3>
              <p className="mt-2 font-display text-2xl font-bold text-gold">
                {prizeLabel}
              </p>
              <p className="mt-2.5 font-ui text-xs leading-relaxed text-ink-soft">
                {requirement}
              </p>
              <p className="mt-3 border-t border-line pt-3 font-ui text-[0.68rem] uppercase tracking-[0.08em] text-muted">
                {note}
              </p>
            </article>
          ))}
        </div>

        <p className="mt-6 flex items-start gap-2.5 border-l-4 border-gold bg-gold-pale px-5 py-4 font-ui text-sm leading-relaxed text-ink">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
          <span>
            <strong>Không ai đạt chuẩn thì giải để trống.</strong> Chúng tôi
            không hạ chuẩn để trao cho đủ mâm — làm vậy là hạ giá trị của giải
            với tất cả những người sau này.
          </span>
        </p>

        {/* ===== Điều kiện tham gia ===== */}
        <h2 className="mt-14 font-display text-2xl font-bold text-navy-deep">
          Ai được tham gia
        </h2>
        <p className="mt-3 max-w-2xl text-[0.96rem] leading-relaxed text-ink-soft">
          Vé vào cửa là danh hiệu{" "}
          <strong>Nhận thức — Hành động — Ý chí</strong>, chỉ có được khi bạn đủ
          cả ba trụ: giải đề, sửa đề và kỷ luật. Trụ kỷ luật cần{" "}
          <strong>25 ngày học thật trong 35 ngày</strong> — nghĩa là không ai
          vào được đây trong vòng một tuần, dù giỏi tới đâu.
        </p>

        <ul className="mt-6 divide-y divide-line border-y border-line">
          {(
            eligibility?.checks ?? [
              { label: "Đã đạt danh hiệu Nhận thức — Hành động — Ý chí", ok: false, detail: "" },
              { label: `Ít nhất ${ELIGIBILITY.activeDays} ngày học thật trong 30 ngày qua`, ok: false, detail: "" },
              { label: `Ít nhất ${ELIGIBILITY.feynmanReviews} phiên chữa bài trong 30 ngày qua`, ok: false, detail: "" },
              { label: `Trung bình ${ELIGIBILITY.recentAttempts} bài gần nhất đạt từ ${ELIGIBILITY.minAverageBand}`, ok: false, detail: "" },
              { label: "Không có cờ nghi vấn liêm chính đang mở", ok: false, detail: "" },
            ]
          ).map((c) => (
            <li key={c.label} className="flex items-center gap-3 py-3">
              {user ? (
                c.ok ? (
                  <Check className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
                ) : (
                  <X className="h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
                )
              ) : (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold" aria-hidden="true" />
              )}
              <span className="min-w-0 flex-1 text-[0.95rem] text-ink">{c.label}</span>
              {user && (
                <span
                  className={`font-ui text-xs tabular-nums ${c.ok ? "text-success" : "text-ink-soft"}`}
                >
                  {c.detail}
                </span>
              )}
            </li>
          ))}
        </ul>

        <p className="mt-4 font-ui text-sm leading-relaxed text-muted">
          Điều kiện 30 ngày được <strong>xét lại mỗi kỳ</strong>. Danh hiệu bạn
          giữ vĩnh viễn, nhưng phong độ thì phải chứng minh lại — danh hiệu là vé
          vào cửa, không phải vé miễn kiểm tra.
        </p>

        {/* ===== Trạng thái theo người xem ===== */}
        {!user ? (
          <NoteBox className="mt-10" title="Bắt đầu từ đâu">
            Hành trình tới Nguyệt Thí bắt đầu bằng một bài đọc.{" "}
            <Link href="/dang-ky" className="font-semibold text-navy underline underline-offset-4">
              Tạo tài khoản miễn phí
            </Link>{" "}
            rồi làm bài Reading đầu tiên — danh hiệu đầu tiên chỉ cần ba bài.
          </NoteBox>
        ) : !competition ? (
          <NoteBox className="mt-10" title="Chưa có kỳ thi nào đang mở">
            Nguyệt Thí diễn ra mỗi tháng. Hãy dùng thời gian này để tích lũy ba
            trụ —{" "}
            <Link
              href="/hoc-vien/danh-hieu"
              className="font-semibold text-navy underline underline-offset-4"
            >
              xem hành trình danh hiệu của bạn
            </Link>
            .
          </NoteBox>
        ) : (
          <CompetitionStatus
            competition={competition}
            entry={entry}
            eligible={eligibility?.eligible ?? false}
            now={now}
          />
        )}
      </section>
    </div>
  );
}

/** Phần chỉ hiện với học viên đã đăng nhập và đang có kỳ thi. */
function CompetitionStatus({
  competition,
  entry,
  eligible,
  now,
}: {
  competition: NonNullable<Awaited<ReturnType<typeof currentCompetition>>>;
  entry: { attempts: Array<{ exerciseId: string; submittedAt: Date | null }> } | null;
  eligible: boolean;
  now: Date;
}) {
  return (
    <div className="mt-12 border-t border-line pt-10">
      <h2 className="font-display text-2xl font-bold text-navy-deep">
        {competition.name}
      </h2>
      <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-1 font-ui text-sm text-ink-soft">
        <div>
          <dt className="inline font-semibold text-ink">Thi từ: </dt>
          <dd className="inline">{fmt(competition.startAt)}</dd>
        </div>
        <div>
          <dt className="inline font-semibold text-ink">Đóng cổng: </dt>
          <dd className="inline">{fmt(competition.endAt)}</dd>
        </div>
      </dl>

      {!entry ? (
        competition.status !== "REGISTRATION" ? (
          <NoteBox className="mt-6">
            Kỳ này chưa mở đăng ký. Hãy dùng thời gian này để hoàn thiện các điều
            kiện ở trên.
          </NoteBox>
        ) : eligible ? (
          <CompetitionRegisterForm competitionId={competition.id} />
        ) : (
          <NoteBox className="mt-6" title="Chưa đủ điều kiện">
            Hãy hoàn thiện những mục còn thiếu ở trên rồi quay lại. Không có cách
            nào rút ngắn phần kỷ luật — nó cần đúng số ngày của nó.
          </NoteBox>
        )
      ) : (
        <>
          <p className="mt-6 font-ui text-sm text-ink-soft">
            Mỗi đề làm <strong>đúng một lần</strong>. Mất mạng giữa chừng thì quay
            lại đúng lượt đang dở nếu còn thời gian.
          </p>
          <ol className="mt-5 space-y-4">
            {competition.exercises.map((item, index) => {
              const done = entry.attempts.find((a) => a.exerciseId === item.exerciseId);
              const opened = now >= item.opensAt;
              const closed = now > competition.endAt;
              return (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-4 border border-line bg-paper p-6"
                >
                  <div className="min-w-0">
                    <p className="font-ui text-sm font-bold uppercase tracking-[0.08em] text-gold">
                      Đề {index + 1}
                    </p>
                    <p className="mt-1 font-display text-lg font-bold text-navy-deep">
                      {opened ? item.exercise.title : `Sẽ mở vào ${fmt(item.opensAt)}`}
                    </p>
                    <p className="mt-1 font-ui text-xs text-muted">
                      {item.exercise.durationMinutes} phút
                    </p>
                  </div>

                  {done?.submittedAt ? (
                    <span className="inline-flex items-center gap-2 border border-success bg-success-pale px-5 py-2.5 font-ui text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-success">
                      <Check className="h-4 w-4" aria-hidden="true" />
                      Đã nộp
                    </span>
                  ) : !opened ? (
                    <span className="inline-flex items-center gap-2 border border-line-strong bg-cream-deep px-5 py-2.5 font-ui text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-muted">
                      <Clock className="h-4 w-4" aria-hidden="true" />
                      Chưa mở
                    </span>
                  ) : closed || competition.status !== "RUNNING" ? (
                    <span className="inline-flex items-center gap-2 border border-line-strong bg-cream-deep px-5 py-2.5 font-ui text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-muted">
                      <Lock className="h-4 w-4" aria-hidden="true" />
                      Đã đóng
                    </span>
                  ) : (
                    <form action={startCompetitionAttemptAction.bind(null, item.id)}>
                      <SubmitButton variant="gold">
                        {done ? "Tiếp tục làm bài" : "Bắt đầu làm bài"}
                      </SubmitButton>
                    </form>
                  )}
                </li>
              );
            })}
          </ol>

          <NoteBox className="mt-8" title="Sau khi thi xong">
            Kết quả không hiện ngay.{" "}
            <Link href="/bang-vang" className="font-semibold text-navy underline underline-offset-4">
              Bảng Vàng
            </Link>{" "}
            công bố sau khi rà soát, và tiền thưởng được chuyển thủ công sau khi
            xác nhận.
          </NoteBox>
        </>
      )}

      <p className="mt-8 flex items-start gap-2 font-ui text-sm leading-relaxed text-muted">
        <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
        Kết quả các kỳ đã khép lại nằm ở{" "}
        <Link href="/bang-vang" className="font-semibold text-navy underline underline-offset-4">
          Bảng Vàng
        </Link>
        .
      </p>
    </div>
  );
}
