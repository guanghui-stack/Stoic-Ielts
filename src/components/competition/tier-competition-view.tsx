import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { SectionHeading, NoteBox, ButtonLink } from "@/components/ui";
import { QualificationCard } from "@/components/competition/qualification-card";
import { qualificationFor } from "@/lib/competition/qualification-service";
import { tierPolicy, type CompetitionTier } from "@/lib/competition/tiers";

/**
 * Khối dùng chung cho trang Dương Thí và Thiên Thí.
 *
 * Hai trang chỉ khác nhau đúng một tham số tier, nên viết hai bản gần giống
 * nhau là cách chắc chắn nhất để sau này sửa một bên mà quên bên kia.
 *
 * Nguyên tắc hiển thị: hai tầng này KHÔNG có đăng ký mở. Người chưa có vé
 * phải hiểu ngay vì sao mình chưa vào được, và con đường vào là gì — nếu
 * không, trang này chỉ là một cánh cửa đóng không lời giải thích.
 */

/**
 * Band luôn viết một chữ số thập phân: 8 hiển thị thành "8.0".
 *
 * Không phải chuyện thẩm mỹ — trong IELTS, 8 và 8.0 đọc giống nhau nhưng
 * "band 8" trông như một con số làm tròn, còn ngưỡng ở đây là chính xác.
 */
function bandLabel(band: number | null): string {
  return band === null ? "—" : band.toFixed(1);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

export async function TierCompetitionView({ tier }: { tier: CompetitionTier }) {
  const policy = tierPolicy(tier);
  const sourcePolicy = policy.sourceTier ? tierPolicy(policy.sourceTier) : null;

  const competition = await db.competition.findFirst({
    where: { tier, status: { in: ["DRAFT", "OPEN", "RUNNING", "FINALIZED"] } },
    orderBy: { startAt: "desc" },
    select: {
      id: true,
      name: true,
      status: true,
      seasonKey: true,
      startAt: true,
      endAt: true,
    },
  });

  const user = await getCurrentUser();
  const offer =
    competition && user ? await qualificationFor(competition.id, user.id) : null;

  const sourceName = sourcePolicy?.name ?? "";

  return (
    <main className="motion-page-entry mx-auto max-w-4xl px-6 py-10">
      <SectionHeading
        label={policy.name}
        title={
          competition?.name ??
          `${policy.name} chưa mở kỳ nào`
        }
      />

      <p className="mt-4 max-w-2xl text-[0.95rem] leading-relaxed text-ink-soft">
        {policy.name} không có đăng ký mở. Chỉ những người được tuyển chọn từ{" "}
        {sourceName} mới nhận được vé dự thi — mỗi kỳ {sourceName} góp{" "}
        {policy.topPerSource} người, tối đa {policy.maxSeats} ghế cho cả kỳ.
      </p>

      {!competition ? (
        <NoteBox className="mt-8" title="Chưa có kỳ nào được mở">
          Khi ban tổ chức chốt đủ {policy.sourceCount} kỳ {sourceName} của mùa,
          vé tuyển chọn sẽ được gửi tới những người đủ điều kiện. Bạn không cần
          đăng ký gì cả.
        </NoteBox>
      ) : offer ? (
        <div className="mt-8">
          <QualificationCard
            qualificationId={offer.id}
            tierName={policy.name}
            sourceName={sourceName}
            sourceRank={offer.sourceRank}
            route={offer.route}
            status={offer.status}
            expiresLabel={formatDate(offer.expiresAt)}
          />
        </div>
      ) : (
        <NoteBox className="mt-8" title="Bạn chưa có vé cho kỳ này">
          Con đường vào {policy.name} đi qua {sourceName}: lọt top{" "}
          {policy.topPerSource} của một kỳ {sourceName}, đạt band thấp nhất từ{" "}
          <strong>{bandLabel(policy.minLowestBand)}</strong> ở cả ba đề, và kết quả không
          còn đang rà soát.
          <div className="mt-5">
            <ButtonLink href="/nguyet-thi" variant="primary">
              Xem Nguyệt Thí
            </ButtonLink>
          </div>
        </NoteBox>
      )}

      <section
        aria-label="Thể lệ tuyển chọn"
        className="mt-8 border border-line bg-paper p-7"
      >
        <p className="label-caps">Thể lệ tuyển chọn</p>
        <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          <div>
            <dt className="font-ui text-xs uppercase tracking-wide text-muted">Nguồn thí sinh</dt>
            <dd className="mt-0.5 font-ui text-sm text-ink-soft">
              Top {policy.topPerSource} của {policy.sourceCount} kỳ {sourceName}
            </dd>
          </div>
          <div>
            <dt className="font-ui text-xs uppercase tracking-wide text-muted">Số ghế tối đa</dt>
            <dd className="mt-0.5 font-ui text-sm text-ink-soft">{policy.maxSeats} người</dd>
          </div>
          <div>
            <dt className="font-ui text-xs uppercase tracking-wide text-muted">Band thấp nhất</dt>
            <dd className="mt-0.5 font-ui text-sm text-ink-soft">
              Từ {bandLabel(policy.minLowestBand)} ở cả ba đề
            </dd>
          </div>
          <div>
            <dt className="font-ui text-xs uppercase tracking-wide text-muted">Hạn nhận vé</dt>
            <dd className="mt-0.5 font-ui text-sm text-ink-soft">
              {policy.offerExpiryDays} ngày kể từ khi được mời
            </dd>
          </div>
          <div>
            <dt className="font-ui text-xs uppercase tracking-wide text-muted">Huy hiệu</dt>
            <dd className="mt-0.5 font-ui text-sm text-ink-soft">
              Có hiệu lực {policy.badgeDurationDays} ngày
            </dd>
          </div>
        </dl>

        <p className="mt-5 border-l-4 border-gold bg-cream-deep px-4 py-3 text-sm leading-relaxed text-ink-soft">
          Ban tổ chức không hạ ngưỡng để lấp đủ ghế. Nếu không đủ người đạt
          chuẩn, kỳ thi sẽ có ít thí sinh hơn mức tối đa — tấm vé giữ nguyên
          giá trị của nó.
        </p>
      </section>
    </main>
  );
}
