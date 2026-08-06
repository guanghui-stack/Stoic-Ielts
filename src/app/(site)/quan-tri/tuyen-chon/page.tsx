import Link from "next/link";
import { notFound } from "next/navigation";
import { Ticket, ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { features } from "@/lib/features";
import { tierPolicy, type CompetitionTier } from "@/lib/competition/tiers";

export const metadata = { title: "Tuyển chọn Dương Thí — Thiên Thí" };
export const dynamic = "force-dynamic";

/**
 * Danh sách kỳ thi hai tầng trên, để quản trị viên chọn kỳ cần cấu hình nguồn.
 *
 * Nguyệt Thí không xuất hiện ở đây: nó dùng đăng ký mở, không có nguồn tuyển
 * chọn nào để quản.
 */
export default async function QualificationAdminPage() {
  if (!features.competitionTiers) notFound();
  await requireAdmin();

  const competitions = await db.competition.findMany({
    where: { tier: { in: ["QUARTERLY", "ANNUAL"] } },
    orderBy: [{ tier: "asc" }, { startAt: "desc" }],
    select: {
      id: true,
      name: true,
      tier: true,
      seasonKey: true,
      status: true,
      _count: { select: { sources: true, qualifications: true } },
    },
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <p className="label-caps flex items-center gap-2">
        <Ticket className="h-3.5 w-3.5" aria-hidden />
        Quản trị
      </p>
      <h1 className="mt-3 font-display text-3xl font-bold text-navy-deep">
        Nguồn tuyển chọn
      </h1>
      <p className="mt-4 max-w-2xl text-[0.95rem] leading-relaxed text-ink-soft">
        Dương Thí và Thiên Thí không có đăng ký mở. Thí sinh đến từ kết quả của
        tầng dưới, nên ở đây bạn chỉ gắn kỳ nguồn và sinh vé — không có cách nào
        thêm một người vào kỳ thi bằng tay.
      </p>

      {competitions.length === 0 ? (
        <p className="mt-8 border border-line bg-cream-deep p-7 font-ui text-sm text-ink-soft">
          Chưa có kỳ Dương Thí hoặc Thiên Thí nào. Hãy tạo ở trang Cuộc thi, chọn
          đúng tier và seasonKey.
        </p>
      ) : (
        <ul className="mt-8 m-0 list-none space-y-3 p-0">
          {competitions.map((competition) => {
            const policy = tierPolicy(competition.tier as CompetitionTier);
            const enough = competition._count.sources >= policy.sourceCount;

            return (
              <li key={competition.id}>
                <Link
                  href={`/quan-tri/tuyen-chon/${competition.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 border border-line bg-paper p-5 transition-colors hover:border-navy"
                >
                  <span>
                    <span className="block font-display font-semibold text-navy-deep">
                      {competition.name}
                    </span>
                    <span className="mt-0.5 block font-ui text-xs text-muted">
                      {policy.name} · mùa {competition.seasonKey} · {competition.status}
                    </span>
                  </span>
                  <span className="flex items-center gap-4">
                    <span className="font-ui text-sm tabular-nums text-ink-soft">
                      Nguồn {competition._count.sources}/{policy.sourceCount}
                      {!enough && " — còn thiếu"}
                    </span>
                    <span className="font-ui text-sm tabular-nums text-ink-soft">
                      {competition._count.qualifications} vé
                    </span>
                    <ArrowRight className="size-4 text-muted" aria-hidden />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
