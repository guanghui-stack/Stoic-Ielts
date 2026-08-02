import Link from "next/link";
import { Check, Clock, Lock, Trophy, X } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { currentCompetition, eligibilityFor } from "@/lib/competition/service";
import { PRIZE_TIERS } from "@/lib/competition/ranking";
import { formatVnd } from "@/lib/payments/catalog";
import { startCompetitionAttemptAction } from "@/lib/actions/competition";
import { CompetitionRegisterForm } from "@/components/competition/register-form";
import { ErrorBanner, NoteBox, SectionHeading, SubmitButton } from "@/components/ui";

export const metadata = { title: "Nguyệt Thí Wobridges" };
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
  const user = await requireUser();
  const competition = await currentCompetition();

  if (!competition) {
    return (
      <section className="mx-auto max-w-3xl px-6 py-16">
        <SectionHeading label="Cuộc thi hàng tháng" title="Nguyệt Thí Wobridges" />
        <NoteBox className="mt-8" title="Chưa có kỳ thi nào đang mở">
          Nguyệt Thí diễn ra mỗi tháng, kéo dài 7 ngày với 3 đề Reading Full
          Test. Điều kiện dự thi là danh hiệu{" "}
          <em>Nhận thức — Hành động — Ý chí</em> cùng phong độ 30 ngày gần nhất.{" "}
          <Link
            href="/hoc-vien/danh-hieu"
            className="font-semibold text-navy underline underline-offset-4"
          >
            Xem hành trình danh hiệu của bạn
          </Link>
        </NoteBox>
      </section>
    );
  }

  const [entry, eligibility] = await Promise.all([
    db.competitionEntry.findUnique({
      where: {
        competitionId_userId: { competitionId: competition.id, userId: user.id },
      },
      include: { attempts: true },
    }),
    eligibilityFor(user.id, competition.registrationCloseAt),
  ]);

  const now = new Date();

  return (
    <section className="mx-auto max-w-4xl px-6 py-12 md:py-16">
      <SectionHeading label="Cuộc thi hàng tháng" title={competition.name} />

      {loi && (
        <div className="mt-8">
          <ErrorBanner message={ERRORS[loi] ?? "Không thực hiện được."} />
        </div>
      )}

      <dl className="mt-8 grid gap-x-10 gap-y-3 font-ui text-sm text-ink-soft sm:grid-cols-2">
        <div>
          <dt className="inline font-semibold text-ink">Thi từ: </dt>
          <dd className="inline">{fmt(competition.startAt)}</dd>
        </div>
        <div>
          <dt className="inline font-semibold text-ink">Đóng cổng: </dt>
          <dd className="inline">{fmt(competition.endAt)}</dd>
        </div>
      </dl>

      <div className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-3">
        {PRIZE_TIERS.map((tier) => (
          <div key={tier.rank} className="bg-paper p-6 text-center">
            <p className="label-caps">
              {tier.rank === 1 ? "Giải Nhất" : tier.rank === 2 ? "Giải Nhì" : "Giải Ba"}
            </p>
            <p className="mt-2.5 font-display text-2xl font-bold text-navy-deep">
              {formatVnd(tier.amount)}
            </p>
            <p className="mt-1 font-ui text-xs text-muted">
              cả 3 đề từ {tier.minBand}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-6 flex items-start gap-2 border-l-4 border-gold bg-gold-pale px-5 py-4 font-ui text-sm leading-relaxed text-ink">
        <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
        <span>
          <strong>Không có bảng xếp hạng trực tiếp.</strong> Trong lúc thi bạn
          chỉ thấy tiến độ của mình. Kết quả công bố sau khi trung tâm rà soát
          xong — làm bài cho tử tế quan trọng hơn nhìn mình đứng thứ mấy.
        </span>
      </p>

      {/* ===== Chưa đăng ký ===== */}
      {!entry && (
        <div className="mt-10">
          <h2 className="font-display text-2xl font-bold text-navy-deep">
            Điều kiện dự thi
          </h2>
          <ul className="mt-5 divide-y divide-line border-y border-line">
            {eligibility.checks.map((c) => (
              <li key={c.label} className="flex items-center gap-3 py-3">
                {c.ok ? (
                  <Check className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
                ) : (
                  <X className="h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
                )}
                <span className="min-w-0 flex-1 text-[0.95rem] text-ink">{c.label}</span>
                <span
                  className={`font-ui text-xs tabular-nums ${c.ok ? "text-success" : "text-ink-soft"}`}
                >
                  {c.detail}
                </span>
              </li>
            ))}
          </ul>

          {competition.status !== "REGISTRATION" ? (
            <NoteBox className="mt-6">
              Kỳ thi chưa mở đăng ký. Hãy dùng thời gian này để hoàn thiện các
              điều kiện ở trên.
            </NoteBox>
          ) : eligibility.eligible ? (
            <CompetitionRegisterForm competitionId={competition.id} />
          ) : (
            <NoteBox className="mt-6" title="Chưa đủ điều kiện">
              Danh hiệu là vé vào cửa, không phải vé miễn kiểm tra — phong độ 30
              ngày gần nhất được xét lại mỗi kỳ. Hãy hoàn thiện những mục còn
              thiếu ở trên rồi quay lại.
            </NoteBox>
          )}
        </div>
      )}

      {/* ===== Đã đăng ký ===== */}
      {entry && (
        <div className="mt-10">
          <h2 className="font-display text-2xl font-bold text-navy-deep">
            Ba đề của kỳ này
          </h2>
          <p className="mt-2 font-ui text-sm text-ink-soft">
            Mỗi đề làm <strong>đúng một lần</strong>. Mất mạng giữa chừng thì
            quay lại đúng lượt đang dở nếu còn thời gian.
          </p>

          <ol className="mt-6 space-y-4">
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
                      {opened ? item.exercise.title : "Sẽ mở vào " + fmt(item.opensAt)}
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
            Kết quả không hiện ngay. Trung tâm sẽ rà soát rồi công bố ở{" "}
            <Link
              href="/bang-vang"
              className="font-semibold text-navy underline underline-offset-4"
            >
              Bảng Vàng
            </Link>
            . Tiền thưởng được chuyển thủ công sau khi xác nhận.
          </NoteBox>
        </div>
      )}
    </section>
  );
}
