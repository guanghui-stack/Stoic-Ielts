import { SquareCheck, Square } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { toggleCollectionItemAction } from "@/lib/actions/collections";
import { CollectionForms } from "@/components/admin/collection-forms";
import { AdminPageShell } from "@/components/admin/admin-page-shell";

export const metadata = { title: "Bộ đề danh hiệu" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Đang soạn",
  ACTIVE: "Đang hoạt động",
  ARCHIVED: "Đã lưu trữ",
};

export default async function AdminCollectionsPage() {
  await requireAdmin();

  const [collections, exercises] = await Promise.all([
    db.exerciseCollection.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: { items: { select: { exerciseId: true } } },
    }),
    db.exercise.findMany({
      where: {
        skill: "READING",
        readingType: "ACADEMIC",
        published: true,
        competitionOnly: false,
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, title: true, accessLevel: true, difficultyTier: true },
    }),
  ]);

  const draft = collections.find((c) => c.status === "DRAFT");
  const active = collections.find((c) => c.status === "ACTIVE");

  return (
    <AdminPageShell eyebrow="Danh hiệu" title="Bộ đề đóng băng">
      <p className="mt-5 max-w-3xl text-[0.95rem] leading-relaxed text-ink-soft">
        Bốn danh hiệu kiểu <em>&ldquo;hoàn thành toàn bộ đề&rdquo;</em> phải xét
        trên một danh sách cố định. Nếu xét trên mọi đề hiện có, chỉ cần bạn đăng
        thêm một bài là học viên vừa đạt danh hiệu bỗng dưng mất nó. Đóng băng
        chính là lời hứa đó với người học.
      </p>

      <p className="mt-5 border-l-4 border-gold bg-cream-deep px-5 py-4 font-ui text-sm leading-relaxed text-ink-soft">
        Đăng thêm đề sau khi đóng băng <strong>không ảnh hưởng</strong> tới bộ
        đang chạy. Muốn đưa đề mới vào danh hiệu, hãy tạo một bộ mới rồi kích
        hoạt — học viên sẽ có cơ hội đạt lại danh hiệu ở mùa mới, và danh hiệu
        mùa cũ vẫn được giữ nguyên.
      </p>

      <CollectionForms
        activeCollection={
          active ? { id: active.id, code: active.code, itemCount: active.items.length } : null
        }
        draftCollection={
          draft ? { id: draft.id, code: draft.code, itemCount: draft.items.length } : null
        }
      />

      {collections.length > 0 && (
        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[600px] border border-line font-ui text-sm">
            <thead>
              <tr className="bg-navy text-paper">
                <th className="px-4 py-3 text-left font-semibold">Mã</th>
                <th className="px-4 py-3 text-left font-semibold">Tên</th>
                <th className="px-4 py-3 text-center font-semibold">Số bài</th>
                <th className="px-4 py-3 text-center font-semibold">Đóng băng lúc</th>
                <th className="px-4 py-3 text-center font-semibold">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {collections.map((c) => (
                <tr key={c.id} className="bg-paper">
                  <td className="px-4 py-3 font-mono text-xs text-ink">{c.code}</td>
                  <td className="px-4 py-3 text-ink-soft">{c.name}</td>
                  <td className="px-4 py-3 text-center tabular-nums text-ink-soft">
                    {c.items.length}
                  </td>
                  <td className="px-4 py-3 text-center text-xs tabular-nums text-muted">
                    {c.frozenAt ? c.frozenAt.toLocaleDateString("vi-VN") : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block border px-2.5 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.06em] ${
                        c.status === "ACTIVE"
                          ? "border-success bg-success-pale text-success"
                          : "border-line-strong bg-cream-deep text-ink-soft"
                      }`}
                    >
                      {STATUS_LABEL[c.status] ?? c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {draft && (
        <div className="mt-10">
          <h2 className="font-display text-2xl font-bold text-navy-deep">
            Chọn bài cho {draft.code}
          </h2>
          <p className="mt-2 font-ui text-sm text-ink-soft">
            Đã chọn {draft.items.length} bài. Cần tối thiểu 8 bài mới kích hoạt được.
          </p>
          <ul className="mt-5 divide-y divide-line border-y border-line">
            {exercises.map((ex) => {
              const picked = draft.items.some((i) => i.exerciseId === ex.id);
              return (
                <li key={ex.id}>
                  <form action={toggleCollectionItemAction.bind(null, draft.id, ex.id)}>
                    <button
                      type="submit"
                      className="flex w-full cursor-pointer flex-wrap items-center gap-3 px-1 py-3 text-left transition-colors hover:bg-cream"
                    >
                      {picked ? (
                        <SquareCheck className="h-5 w-5 shrink-0 text-navy" aria-hidden="true" />
                      ) : (
                        <Square className="h-5 w-5 shrink-0 text-line-strong" aria-hidden="true" />
                      )}
                      <span className="min-w-0 flex-1 text-ink">{ex.title}</span>
                      <span className="font-ui text-xs text-muted">
                        {ex.difficultyTier} ·{" "}
                        {ex.accessLevel === "RESTRICTED" ? "Cần mở khóa" : "Công khai"}
                      </span>
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </AdminPageShell>
  );
}
