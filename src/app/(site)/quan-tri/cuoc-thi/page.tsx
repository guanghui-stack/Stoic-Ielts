import { Trophy } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { advanceCompetitionAction } from "@/lib/actions/competition";
import { formatVnd } from "@/lib/payments/catalog";
import {
  CompetitionCreateForm,
  FinalizeForm,
  DisqualifyForm,
} from "@/components/admin/competition-forms";

export const metadata = { title: "Nguyệt Thí" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Đang soạn",
  REGISTRATION: "Đang mở đăng ký",
  RUNNING: "Đang thi",
  REVIEW: "Đang rà soát",
  FINALIZED: "Đã chốt",
  CANCELLED: "Đã hủy",
};

const NEXT_LABEL: Record<string, string> = {
  DRAFT: "Mở đăng ký",
  REGISTRATION: "Bắt đầu thi",
  RUNNING: "Đóng cổng, chuyển sang rà soát",
};

function fmt(d: Date | null) {
  return d ? d.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "—";
}

export default async function AdminCompetitionPage() {
  await requireAdmin();

  const [competitions, candidates] = await Promise.all([
    db.competition.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      include: {
        exercises: {
          orderBy: { orderIndex: "asc" },
          include: { exercise: { select: { title: true } } },
        },
        entries: {
          orderBy: [{ finalRank: "asc" }, { registeredAt: "asc" }],
          include: {
            user: { select: { name: true, email: true } },
            attempts: { select: { bandSnapshot: true, submittedAt: true } },
          },
        },
      },
    }),
    db.exercise.findMany({
      where: {
        skill: "READING",
        readingType: "ACADEMIC",
        competitionOnly: true,
      },
      select: { id: true, title: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <p className="label-caps flex items-center gap-2">
        <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
        Cuộc thi
      </p>
      <h1 className="mt-3 font-display text-3xl font-bold text-navy-deep md:text-4xl">
        Nguyệt Thí
      </h1>
      <div className="rule-gold mt-5" />
      <p className="mt-5 max-w-3xl text-[0.95rem] leading-relaxed text-ink-soft">
        Mỗi kỳ 7 ngày, 3 đề Reading, mở dần vào ngày 1 · 3 · 5. Giải thưởng
        999.000đ · 499.000đ · 199.000đ. Kết quả <strong>không</strong> tự công
        bố: bạn phải rà soát rồi bấm chốt, và tiền phải tự chuyển tay.
      </p>

      <p className="mt-5 border-l-4 border-gold bg-cream-deep px-5 py-4 font-ui text-sm leading-relaxed text-ink-soft">
        Đề dùng cho cuộc thi phải được đánh dấu{" "}
        <strong>&ldquo;chỉ dùng cho cuộc thi&rdquo;</strong> trước. Đề đã công
        khai thì học viên luyện trước được, và cuộc thi mất hết ý nghĩa. Hiện có{" "}
        <strong>{candidates.length}</strong> đề như vậy.
      </p>

      <CompetitionCreateForm candidates={candidates} />

      {competitions.length === 0 ? (
        <p className="mt-10 border border-line bg-paper p-8 text-center text-ink-soft">
          Chưa có kỳ thi nào.
        </p>
      ) : (
        <div className="mt-12 space-y-10">
          {competitions.map((c) => {
            const finished = c.entries.filter((e) =>
              e.attempts.filter((a) => a.submittedAt).length === 3
            ).length;
            return (
              <article key={c.id} className="border border-line bg-paper p-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-display text-xl font-bold text-navy-deep">
                      {c.name}
                    </h2>
                    <p className="mt-1 font-mono text-xs text-muted">{c.code}</p>
                    <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-1 font-ui text-xs text-ink-soft">
                      <div>
                        <dt className="inline font-semibold">Thi: </dt>
                        <dd className="inline">{fmt(c.startAt)}</dd>
                      </div>
                      <div>
                        <dt className="inline font-semibold">Đóng: </dt>
                        <dd className="inline">{fmt(c.endAt)}</dd>
                      </div>
                      <div>
                        <dt className="inline font-semibold">Thí sinh: </dt>
                        <dd className="inline tabular-nums">
                          {c.entries.length} · hoàn thành {finished}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  <span
                    className={`shrink-0 border px-3 py-1 font-ui text-[0.7rem] font-semibold uppercase tracking-[0.06em] ${
                      c.status === "FINALIZED"
                        ? "border-success bg-success-pale text-success"
                        : c.status === "REVIEW"
                          ? "border-gold bg-gold-pale text-ink"
                          : "border-line-strong bg-cream-deep text-ink-soft"
                    }`}
                  >
                    {STATUS_LABEL[c.status] ?? c.status}
                  </span>
                </div>

                <ol className="mt-5 flex flex-wrap gap-2 font-ui text-xs text-ink-soft">
                  {c.exercises.map((x) => (
                    <li key={x.id} className="border border-line px-3 py-1.5">
                      Đề {x.orderIndex}: {x.exercise.title} · mở {fmt(x.opensAt)}
                    </li>
                  ))}
                </ol>

                {NEXT_LABEL[c.status] && (
                  <form action={advanceCompetitionAction.bind(null, c.id)} className="mt-5">
                    <button
                      type="submit"
                      className="cursor-pointer border border-navy px-6 py-2.5 font-ui text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-navy transition-colors hover:bg-navy hover:text-paper"
                    >
                      {NEXT_LABEL[c.status]}
                    </button>
                  </form>
                )}

                {c.entries.length > 0 && (
                  <div className="mt-6 overflow-x-auto">
                    <table className="w-full min-w-[700px] border border-line font-ui text-sm">
                      <thead>
                        <tr className="bg-navy text-paper">
                          <th className="px-3 py-2 text-left font-semibold">Hạng</th>
                          <th className="px-3 py-2 text-left font-semibold">Thí sinh</th>
                          <th className="px-3 py-2 text-center font-semibold">Band 3 đề</th>
                          <th className="px-3 py-2 text-center font-semibold">Giải</th>
                          <th className="px-3 py-2 text-right font-semibold">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {c.entries.map((e) => (
                          <tr key={e.id} className={e.status === "DISQUALIFIED" ? "bg-danger-pale" : "bg-paper"}>
                            <td className="px-3 py-2 tabular-nums text-ink">
                              {e.finalRank ?? "—"}
                            </td>
                            <td className="px-3 py-2">
                              <span className="block font-semibold text-ink">{e.user.name}</span>
                              <span className="block text-xs text-muted">{e.user.email}</span>
                              {e.status === "DISQUALIFIED" && (
                                <span className="text-xs font-semibold text-danger">Đã loại</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center text-xs tabular-nums text-ink-soft">
                              {e.attempts
                                .map((a) => a.bandSnapshot?.toFixed(1) ?? "–")
                                .join(" / ") || "chưa làm"}
                            </td>
                            <td className="px-3 py-2 text-center text-xs">
                              {e.prizeAmount ? (
                                <span className="text-gold">
                                  {formatVnd(e.prizeAmount)}
                                  <span className="block text-[0.65rem] text-muted">
                                    {e.prizeStatus === "APPROVED" ? "chờ chi" : e.prizeStatus}
                                  </span>
                                </span>
                              ) : (
                                <span className="text-muted">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {c.status === "REVIEW" && e.status !== "DISQUALIFIED" ? (
                                <DisqualifyForm entryId={e.id} />
                              ) : (
                                <span className="text-xs text-muted">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {c.status === "REVIEW" && <FinalizeForm competitionId={c.id} />}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
