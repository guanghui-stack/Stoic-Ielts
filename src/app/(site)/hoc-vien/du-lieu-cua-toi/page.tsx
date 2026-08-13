import { ShieldCheck, XCircle } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { SectionHeading, NoteBox } from "@/components/ui";
import { StudentNav } from "@/components/student/student-nav";
import { DataRightsForms } from "@/components/student/data-rights-forms";
import {
  DATA_CATEGORIES,
  NOT_COLLECTED,
  RETENTION_IDENTITY_KEY_MONTHS,
  identityKeyExpiresAt,
  planWithdrawal,
} from "@/lib/identity/data-rights";

export const metadata = { title: "Dữ liệu của tôi" };
export const dynamic = "force-dynamic";

/**
 * Trang tự phục vụ về dữ liệu cá nhân.
 *
 * Trước đây quyền "xem dữ liệu của mình" và "yêu cầu xoá" chỉ tồn tại trên
 * giấy — dự thảo pháp lý ghi thẳng là **chưa có giao diện**, phải yêu cầu qua
 * trung tâm. Trang này biến chúng thành thứ bấm được.
 *
 * Bảng kê lấy từ `data-rights.ts`, cùng nguồn với tài liệu pháp lý. Nếu hai
 * bên lệch nhau thì thông báo xử lý dữ liệu nói một đằng, hệ thống làm một nẻo.
 */

const STORAGE_LABEL = {
  PLAIN: "Văn bản rõ",
  HASHED: "Đã băm",
  IRREVERSIBLE: "Băm không hoàn nguyên được",
} as const;

const KIND_LABEL: Record<string, string> = {
  EXPORT: "Xem dữ liệu",
  DELETE: "Yêu cầu xoá",
  WITHDRAW_CONSENT: "Rút đồng ý",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Đang chờ xử lý",
  IN_PROGRESS: "Đang xử lý",
  COMPLETED: "Đã hoàn tất",
  REJECTED: "Đã từ chối",
};

export default async function MyDataPage() {
  const user = await requireUser();

  const [identity, requests, flaggedEntries, openAppeals] = await Promise.all([
    db.identityProfile.findUnique({
      where: { userId: user.id },
      select: { status: true, verifiedAt: true, documentLast4: true },
    }),
    db.dataRightsRequest.findMany({
      where: { userId: user.id },
      orderBy: { requestedAt: "desc" },
      take: 10,
      select: { id: true, kind: true, status: true, requestedAt: true, resolvedAt: true },
    }),
    db.competitionEntry.count({ where: { userId: user.id, reviewStatus: { not: "CLEAR" } } }),
    db.competitionAppeal.count({
      where: { userId: user.id, status: { notIn: ["RESOLVED", "REJECTED"] } },
    }),
  ]);

  const underReview = flaggedEntries > 0 || openAppeals > 0;
  const plan = planWithdrawal(underReview);
  const fmt = (d: Date | null) => (d ? d.toLocaleDateString("vi-VN") : "—");

  return (
    <main className="motion-page-entry mx-auto max-w-4xl px-6 py-10">
      <StudentNav />

      <SectionHeading label="Quyền dữ liệu" title="Dữ liệu của tôi" />

      <p className="mt-4 max-w-2xl text-[0.95rem] leading-relaxed text-ink-soft">
        Trang này nói đúng những gì hệ thống đang lưu về bạn — không phải những
        gì nó dự định lưu. Bảng dưới đây lấy từ cùng một nguồn với hồ sơ pháp lý
        của trung tâm.
      </p>

      <section
        aria-label="Hệ thống không thu thập"
        className="mt-8 border border-jade bg-paper p-7"
      >
        <p className="flex items-center gap-2 font-ui text-sm font-semibold text-jade-ink">
          <ShieldCheck className="h-4 w-4" aria-hidden />
          Hệ thống KHÔNG thu thập
        </p>
        <ul className="mt-3 m-0 list-none space-y-1 p-0">
          {NOT_COLLECTED.map((item) => (
            <li key={item} className="flex items-start gap-2 font-ui text-sm text-ink-soft">
              <XCircle className="mt-0.5 size-3.5 shrink-0 text-muted" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[0.95rem] leading-relaxed text-ink-soft">
          Kỳ thi được giám sát bằng phần mềm khóa máy, không phải bằng camera.
          Vì vậy hệ thống không cam kết phát hiện được mọi hành vi gian lận, và
          mọi quyết định xử lý đều do người xem xét trên bằng chứng cụ thể.
        </p>
      </section>

      <section aria-label="Dữ liệu đang lưu" className="mt-6">
        <h2 className="font-display text-xl font-bold text-navy-deep">
          Hệ thống đang lưu gì về bạn
        </h2>
        <div className="mt-4 overflow-x-auto border border-line bg-paper">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-line bg-cream-deep">
                <th scope="col" className="px-4 py-3 font-ui text-xs uppercase tracking-wide text-muted">Dữ liệu</th>
                <th scope="col" className="px-4 py-3 font-ui text-xs uppercase tracking-wide text-muted">Dạng lưu</th>
                <th scope="col" className="px-4 py-3 font-ui text-xs uppercase tracking-wide text-muted">Mục đích</th>
                <th scope="col" className="px-4 py-3 font-ui text-xs uppercase tracking-wide text-muted">Thời hạn</th>
              </tr>
            </thead>
            <tbody>
              {DATA_CATEGORIES.map((category) => (
                <tr key={category.code} className="border-b border-line last:border-0">
                  <th scope="row" className="px-4 py-3 font-ui text-sm font-medium text-navy-deep">
                    {category.label}
                  </th>
                  <td className="px-4 py-3 font-ui text-sm text-ink-soft">
                    {STORAGE_LABEL[category.storage]}
                  </td>
                  <td className="px-4 py-3 font-ui text-sm text-muted">{category.purpose}</td>
                  <td className="px-4 py-3 font-ui text-sm text-ink-soft">{category.retention}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {identity ? (
          <p className="mt-3 font-ui text-sm text-muted">
            Hồ sơ định danh của bạn: trạng thái {identity.status}
            {identity.documentLast4 && <> · giấy tờ ****{identity.documentLast4}</>}
            {identity.verifiedAt && (
              <>
                {" "}· xác minh {fmt(identity.verifiedAt)} · mã định danh hết hạn lưu{" "}
                {fmt(identityKeyExpiresAt(identity.verifiedAt))}
              </>
            )}
          </p>
        ) : (
          <p className="mt-3 font-ui text-sm text-muted">
            Bạn chưa xác minh danh tính, nên hệ thống chưa lưu thông tin giấy tờ nào.
          </p>
        )}
      </section>

      <section aria-label="Thực hiện quyền" className="mt-8">
        <h2 className="font-display text-xl font-bold text-navy-deep">Quyền của bạn</h2>
        <div className="mt-4">
          <DataRightsForms />
        </div>
      </section>

      {underReview && (
        <NoteBox className="mt-6" title="Hồ sơ của bạn đang trong diện rà soát">
          Trong lúc rà soát chưa khép lại, nhật ký phòng thi được giữ nguyên kể
          cả khi bạn rút đồng ý — để việc khiếu nại của bạn còn căn cứ. Dữ liệu
          sẽ được xử lý theo yêu cầu ngay khi rà soát kết thúc.
        </NoteBox>
      )}

      <section aria-label="Điều được giữ lại" className="mt-6 border border-line bg-paper p-7">
        <h2 className="font-display text-lg font-bold text-navy-deep">
          Nếu bạn rút đồng ý, phần nào vẫn được giữ
        </h2>
        <ul className="mt-4 m-0 list-none space-y-3 p-0">
          {plan.retained.map(({ category, reason }) => (
            <li key={category.code}>
              <p className="font-ui text-sm font-medium text-navy-deep">{category.label}</p>
              <p className="mt-0.5 text-[0.95rem] leading-relaxed text-ink-soft">{reason}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 font-ui text-sm text-muted">
          Mã định danh được giữ {RETENTION_IDENTITY_KEY_MONTHS} tháng rồi xoá tự
          động. Nó là chuỗi băm, không suy ngược ra số giấy tờ của bạn được.
        </p>
      </section>

      {requests.length > 0 && (
        <section aria-label="Yêu cầu đã gửi" className="mt-6 border border-line bg-paper p-7">
          <h2 className="font-display text-lg font-bold text-navy-deep">Yêu cầu đã gửi</h2>
          <ul className="mt-4 m-0 list-none space-y-2 p-0">
            {requests.map((request) => (
              <li
                key={request.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-2 last:border-0 font-ui text-sm"
              >
                <span className="text-navy-deep">{KIND_LABEL[request.kind] ?? request.kind}</span>
                <span className="text-muted">
                  Gửi {fmt(request.requestedAt)} ·{" "}
                  {STATUS_LABEL[request.status] ?? request.status}
                  {request.resolvedAt && <> ngày {fmt(request.resolvedAt)}</>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
