import { Feather } from "lucide-react";
import { requireAdmin } from "@/lib/session";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { ItemReviewForm } from "@/components/thibut/item-review-form";
import { listDraftItems, poolStats } from "@/lib/thibut/thibut-service.ts";
import {
  ITEMS_PER_ATTEMPT,
  TARGET_POOL_SIZE,
  THI_BUT_TYPE_LABEL,
  type ThiButType,
} from "@/lib/thibut/thibut.ts";

export const metadata = { title: "Duyệt kho Thí Bút" };

function parseOptions(json: string): string[] {
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.map((x) => String(x)) : [];
  } catch {
    return [];
  }
}

export default async function AdminThiButPage() {
  await requireAdmin();

  const [stats, drafts] = await Promise.all([poolStats(), listDraftItems(20)]);

  return (
    <AdminPageShell
      eyebrow="Thí Bút"
      title="Duyệt kho câu khảo hạch"
      lede="AI sinh câu ở trạng thái nháp. Chỉ người duyệt mới đẩy sang phát hành. Một câu sai đáp án sẽ lấy mất quân công của người ngay thẳng, và không tái lập được để xử tranh chấp."
    >
      <section className="grid gap-px border border-line bg-line sm:grid-cols-3">
        <div className="bg-paper p-6">
          <p className="label-caps">Chờ duyệt</p>
          <p className="mt-2 font-display text-3xl font-bold tabular-nums text-navy-deep">
            {stats.draft}
          </p>
        </div>
        <div className="bg-paper p-6">
          <p className="label-caps">Đã phát hành</p>
          <p className="mt-2 font-display text-3xl font-bold tabular-nums text-navy-deep">
            {stats.published}
          </p>
          <p className="mt-1 font-ui text-xs text-ink-soft">
            trên chỉ tiêu {TARGET_POOL_SIZE}
          </p>
        </div>
        <div className="bg-paper p-6">
          <p className="label-caps">Đã loại</p>
          <p className="mt-2 font-display text-3xl font-bold tabular-nums text-navy-deep">
            {stats.retired}
          </p>
        </div>
      </section>

      <div className="mt-4 border border-line bg-paper p-5">
        <div className="flex items-center justify-between gap-4">
          <p className="font-ui text-[0.86rem] font-semibold text-ink">
            Tiến độ kho câu
          </p>
          <p className="font-ui text-[0.86rem] tabular-nums text-ink-soft">
            {stats.health.percent}%
          </p>
        </div>
        <div
          className="mt-3 h-2 w-full bg-line"
          role="img"
          aria-label={`Kho câu đạt ${stats.health.percent} phần trăm chỉ tiêu`}
        >
          <div
            className="h-full bg-navy"
            style={{ width: `${stats.health.percent}%` }}
          />
        </div>
        <p className="mt-3 text-[0.9rem] leading-relaxed text-ink-soft">
          {stats.health.ready
            ? `Đủ câu để phát một lượt ${ITEMS_PER_ATTEMPT} câu. Kho càng lớn thì học viên càng hiếm gặp lại câu cũ.`
            : `Chưa đủ ${ITEMS_PER_ATTEMPT} câu đã phát hành nên Thí Bút chưa mở được cho học viên.`}
        </p>
      </div>

      <section className="mt-10 flex flex-col gap-6">
        <h2 className="font-display text-2xl font-bold text-navy-deep">
          Câu đang chờ duyệt
        </h2>

        {drafts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 border border-line bg-paper px-6 py-16 text-center">
            <Feather className="h-7 w-7 text-muted" aria-hidden="true" />
            <p className="font-display text-lg font-bold text-navy-deep">
              Không còn câu nào chờ duyệt
            </p>
            <p className="max-w-md text-[0.94rem] leading-relaxed text-ink-soft">
              Khi có mẻ câu mới được sinh ra, chúng sẽ hiện ở đây để bạn xem
              từng câu trước khi phát hành.
            </p>
          </div>
        ) : (
          drafts.map((item) => (
            <ItemReviewForm
              key={item.id}
              item={{
                id: item.id,
                type: item.type,
                typeLabel:
                  THI_BUT_TYPE_LABEL[item.type as ThiButType] ?? item.type,
                difficulty: item.difficulty,
                prompt: item.prompt,
                options: parseOptions(item.options),
                answerIndex: item.answerIndex,
                explanation: item.explanation,
                sourceBatch: item.sourceBatch,
              }}
            />
          ))
        )}
      </section>
    </AdminPageShell>
  );
}
