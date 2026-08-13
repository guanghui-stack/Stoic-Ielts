import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { features } from "@/lib/features";
import { previewQualifications } from "@/lib/competition/qualification-service";
import { tierPolicy, sourceBelongsToSeason, type CompetitionTier } from "@/lib/competition/tiers";
import {
  AttachSourceForm,
  DetachSourceForm,
  GenerateOffersForm,
  ExpireOffersForm,
} from "@/components/admin/qualification-forms";

export const dynamic = "force-dynamic";

const OFFER_LABEL: Record<string, string> = {
  OFFERED: "Đang chờ trả lời",
  ACCEPTED: "Đã nhận",
  DECLINED: "Đã từ chối",
  EXPIRED: "Hết hạn",
  REVOKED: "Đã thu hồi",
};

/**
 * Cấu hình nguồn tuyển chọn cho một kỳ Dương Thí hoặc Thiên Thí.
 *
 * Trang hiển thị BA thứ mà đặc tả §11.4 đòi hỏi: nguồn ghế, hàng chờ cascade,
 * và lý do loại từng người. Lý do loại quan trọng không kém danh sách trúng —
 * khi một học viên hỏi vì sao mình không được mời, trung tâm phải trả lời
 * được bằng dữ liệu chứ không phải bằng phỏng đoán.
 */
export default async function QualificationDetailPage({
  params,
}: {
  params: Promise<{ competitionId: string }>;
}) {
  if (!features.competitionTiers) notFound();
  await requireAdmin();

  const { competitionId } = await params;
  const competition = await db.competition.findUnique({
    where: { id: competitionId },
    select: { id: true, name: true, tier: true, seasonKey: true, status: true },
  });
  if (!competition) notFound();

  const policy = tierPolicy(competition.tier as CompetitionTier);
  if (policy.sourceTier === null) notFound();

  const [attached, preview, offers, candidates] = await Promise.all([
    db.competitionSource.findMany({
      where: { targetCompetitionId: competitionId },
      orderBy: { orderIndex: "asc" },
      select: {
        orderIndex: true,
        sourceCompetitionId: true,
        source: { select: { name: true, seasonKey: true, finalizedAt: true } },
      },
    }),
    previewQualifications(competitionId),
    db.competitionQualification.findMany({
      where: { targetCompetitionId: competitionId },
      orderBy: [{ status: "asc" }, { sourceRank: "asc" }],
      select: {
        id: true,
        status: true,
        sourceRank: true,
        route: true,
        expiresAt: true,
        user: { select: { name: true, email: true } },
      },
    }),
    db.competition.findMany({
      where: { tier: policy.sourceTier },
      orderBy: { startAt: "desc" },
      select: { id: true, name: true, seasonKey: true, finalizedAt: true },
    }),
  ]);

  const attachedIds = new Set(attached.map((a) => a.sourceCompetitionId));
  const options = candidates
    .filter(
      (c) =>
        !attachedIds.has(c.id) &&
        sourceBelongsToSeason(competition.tier as CompetitionTier, competition.seasonKey, c.seasonKey),
    )
    .map((c) => ({
      id: c.id,
      name: c.name,
      seasonKey: c.seasonKey,
      finalized: c.finalizedAt !== null,
    }));

  return (
    <main className="motion-page-entry mx-auto max-w-5xl px-6 py-10">
      <Link
        href="/quan-tri/tuyen-chon"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted hover:text-navy"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Nguồn tuyển chọn
      </Link>

      <p className="label-caps">{policy.name} · mùa {competition.seasonKey}</p>
      <h1 className="mt-3 font-display text-3xl font-bold text-navy-deep">
        {competition.name}
      </h1>
      <p className="mt-3 font-ui text-sm text-muted">
        Nhận top {policy.topPerSource} của {policy.sourceCount} kỳ{" "}
        {tierPolicy(policy.sourceTier).name} · tối đa {policy.maxSeats} ghế · band thấp
        nhất từ {policy.minLowestBand?.toFixed(1)}
      </p>

      <section aria-label="Kỳ nguồn" className="mt-8 border border-line bg-paper p-7">
        <h2 className="font-display text-lg font-bold text-navy-deep">
          Kỳ nguồn ({attached.length}/{policy.sourceCount})
        </h2>

        {attached.length > 0 && (
          <ul className="mt-4 m-0 list-none space-y-2 p-0">
            {attached.map((link) => (
              <li
                key={link.sourceCompetitionId}
                className="flex flex-wrap items-center justify-between gap-3 border border-line bg-cream px-4 py-3"
              >
                <span>
                  <span className="font-ui text-sm font-medium text-navy-deep">
                    {link.orderIndex + 1}. {link.source.name}
                  </span>
                  <span className="ml-2 font-ui text-xs text-muted">
                    {link.source.seasonKey} ·{" "}
                    {link.source.finalizedAt ? "đã chốt" : "CHƯA CHỐT"}
                  </span>
                </span>
                <DetachSourceForm
                  targetId={competition.id}
                  sourceId={link.sourceCompetitionId}
                />
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5">
          <AttachSourceForm targetId={competition.id} options={options} />
        </div>
      </section>

      <section aria-label="Sinh vé" className="mt-6 border border-line bg-paper p-7">
        <h2 className="font-display text-lg font-bold text-navy-deep">Sinh vé tuyển chọn</h2>
        <p className="mt-2 max-w-2xl text-[0.95rem] leading-relaxed text-ink-soft">
          Xem trước bên dưới cho biết ai sẽ nhận vé và ai bị loại, tính từ dữ
          liệu hiện tại. Bấm sinh vé mới thực sự gửi lời mời.
        </p>

        {preview && (
          <p className="mt-4 font-ui text-sm text-ink-soft">
            Dự kiến <strong>{preview.result.offers.length}</strong> vé
            {preview.result.unfilledSeats > 0 && (
              <> · {preview.result.unfilledSeats} ghế bỏ trống</>
            )}
            {preview.result.rejected.length > 0 && (
              <> · {preview.result.rejected.length} người bị loại</>
            )}
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <GenerateOffersForm
            targetId={competition.id}
            ready={preview?.ready ?? false}
            blockedReason={preview?.blockedReason ?? null}
          />
          <ExpireOffersForm targetId={competition.id} />
        </div>
      </section>

      {preview && preview.result.rejected.length > 0 && (
        <section aria-label="Lý do loại" className="mt-6 border border-line bg-paper p-7">
          <h2 className="font-display text-lg font-bold text-navy-deep">
            Vì sao những người này không được mời
          </h2>
          <ul className="mt-4 m-0 list-none space-y-2 p-0">
            {preview.result.rejected.map((row, index) => (
              <li
                key={`${row.userId}-${index}`}
                className="flex items-start gap-2 font-ui text-sm text-ink-soft"
              >
                <XCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
                <span>
                  <code className="text-xs">{row.userId}</code> — {row.reason}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Vé đã sinh" className="mt-6 border border-line bg-paper p-7">
        <h2 className="font-display text-lg font-bold text-navy-deep">
          Vé đã sinh ({offers.length})
        </h2>

        {offers.length === 0 ? (
          <p className="mt-3 font-ui text-sm text-muted">Chưa sinh vé nào.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="py-2 font-ui text-xs uppercase tracking-wide text-muted">Học viên</th>
                  <th scope="col" className="py-2 font-ui text-xs uppercase tracking-wide text-muted">Hạng nguồn</th>
                  <th scope="col" className="py-2 font-ui text-xs uppercase tracking-wide text-muted">Đường vào</th>
                  <th scope="col" className="py-2 font-ui text-xs uppercase tracking-wide text-muted">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((offer) => (
                  <tr key={offer.id} className="border-b border-line last:border-0">
                    <td className="py-2 font-ui text-sm text-navy-deep">
                      {offer.user.name}
                      <span className="ml-2 text-xs text-muted">{offer.user.email}</span>
                    </td>
                    <td className="py-2 font-ui text-sm tabular-nums text-ink-soft">
                      {offer.sourceRank}
                    </td>
                    <td className="py-2 font-ui text-sm text-ink-soft">
                      {offer.route === "CASCADE" ? "Ghế nhường xuống" : "Suất trực tiếp"}
                    </td>
                    <td className="py-2 font-ui text-sm text-ink-soft">
                      <span className="inline-flex items-center gap-1.5">
                        {offer.status === "ACCEPTED" && (
                          <CheckCircle2 className="size-3.5 text-jade-ink" aria-hidden />
                        )}
                        {OFFER_LABEL[offer.status] ?? offer.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="mt-6 border-l-4 border-gold bg-cream-deep px-6 py-5 text-sm leading-relaxed text-ink-soft">
        Trang này cố ý KHÔNG có nút thêm thí sinh tùy ý. Mọi ghế đều truy ngược
        được về một kết quả có thật ở một kỳ nguồn đã chốt — đó là thứ giữ cho
        tấm vé có giá trị. Tiền thưởng của {policy.name} để trống cho tới khi
        chủ dự án duyệt mức cụ thể.
      </p>
    </main>
  );
}
