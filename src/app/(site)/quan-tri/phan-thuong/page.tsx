import { Gift } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { RewardDecisionForm } from "@/components/admin/reward-decision-form";

export const metadata = { title: "Phần thưởng danh hiệu" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  EARNED: "Chờ học viên chọn bài",
  REQUESTED: "Chờ bạn duyệt",
  FULFILLED: "Đã mở bài",
  EXPIRED: "Quá hạn",
};

function fmt(d: Date | null) {
  return d ? d.toLocaleDateString("vi-VN") : "—";
}

export default async function AdminRewardsPage() {
  await requireAdmin();

  const rewards = await db.rewardGrant.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
    include: {
      user: { select: { name: true, email: true } },
      titleAward: { include: { title: { select: { name: true } } } },
    },
  });

  const exerciseIds = rewards
    .map((r) => r.selectedExerciseId)
    .filter((id): id is string => Boolean(id));
  const exercises = exerciseIds.length
    ? await db.exercise.findMany({
        where: { id: { in: exerciseIds } },
        select: { id: true, title: true },
      })
    : [];
  const titleOf = new Map(exercises.map((e) => [e.id, e.title]));

  const waiting = rewards.filter((r) => r.status === "REQUESTED");

  return (
    <section className="motion-page-entry mx-auto max-w-6xl px-6 py-12">
      <p className="label-caps flex items-center gap-2">
        <Gift className="h-3.5 w-3.5" aria-hidden="true" />
        Danh hiệu
      </p>
      <h1 className="mt-3 font-display text-3xl font-bold text-navy-deep md:text-4xl">
        Phần thưởng mở bài
      </h1>
      <div className="rule-gold mt-5" />
      <p className="mt-5 max-w-3xl text-[0.95rem] leading-relaxed text-ink-soft">
        Hai danh hiệu <strong>Thanh xuân tu tảo vi</strong> và{" "}
        <strong>Tuấn kiệt như sao buổi sớm</strong> cho học viên quyền chọn một
        bài trả phí để mở, kèm cả phần chữa bài Feynman. Học viên chọn bài, bạn
        duyệt. Duyệt xong hệ thống mở luôn cả hai quyền, vĩnh viễn.
      </p>

      {waiting.length > 0 && (
        <p className="mt-6 border-l-4 border-gold bg-gold-pale px-5 py-4 font-ui text-sm text-ink">
          Có <strong>{waiting.length}</strong> yêu cầu đang chờ bạn duyệt.
        </p>
      )}

      {rewards.length === 0 ? (
        <p className="mt-10 border border-line bg-paper p-8 text-center text-ink-soft">
          Chưa có học viên nào đạt danh hiệu có thưởng.
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[900px] border border-line font-ui text-sm">
            <thead>
              <tr className="bg-navy text-paper">
                <th className="px-4 py-3 text-left font-semibold">Học viên</th>
                <th className="px-4 py-3 text-left font-semibold">Danh hiệu</th>
                <th className="px-4 py-3 text-left font-semibold">Bài đã chọn</th>
                <th className="px-4 py-3 text-center font-semibold">Hạn dùng</th>
                <th className="px-4 py-3 text-center font-semibold">Trạng thái</th>
                <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rewards.map((r) => (
                <tr key={r.id} className="bg-paper align-top">
                  <td className="px-4 py-3">
                    <span className="block font-semibold text-ink">{r.user.name}</span>
                    <span className="block text-xs text-muted">{r.user.email}</span>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{r.titleAward.title.name}</td>
                  <td className="px-4 py-3 text-ink-soft">
                    {r.selectedExerciseId
                      ? (titleOf.get(r.selectedExerciseId) ?? "(bài đã bị xóa)")
                      : "—"}
                    {r.note && (
                      <span className="mt-1 block max-w-[16rem] text-xs leading-snug text-muted">
                        Ghi chú: {r.note}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-xs tabular-nums text-muted">
                    {fmt(r.expiresAt)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block border px-2.5 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.06em] ${
                        r.status === "FULFILLED"
                          ? "border-success bg-success-pale text-success"
                          : r.status === "REQUESTED"
                            ? "border-gold bg-gold-pale text-ink"
                            : "border-line-strong bg-cream-deep text-ink-soft"
                      }`}
                    >
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {r.status === "REQUESTED" ? (
                      <RewardDecisionForm rewardId={r.id} />
                    ) : (
                      <span className="block text-right text-xs text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
