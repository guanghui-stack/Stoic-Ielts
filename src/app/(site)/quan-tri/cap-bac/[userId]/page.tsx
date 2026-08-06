import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { features } from "@/lib/features";
import { rankByLevel, trialByCode } from "@/lib/ranks/catalog";

export const metadata = { title: "Hành trình cấp bậc" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  LOCKED: "Chưa mở",
  ELIGIBLE: "Đã mở",
  ACTIVE: "Đang thí luyện",
  PASSED: "Đã vượt",
};

/**
 * Hành trình cấp bậc của một học viên — chỉ đọc.
 *
 * Tồn tại để trả lời một câu hỏi cụ thể mà bộ phận hỗ trợ hay gặp: "vì sao em
 * chưa lên cấp?". Không có nó thì câu trả lời chỉ có thể là phỏng đoán, và
 * cách duy nhất để chắc chắn là mở database ra xem.
 *
 * Hiển thị `progressJson` đã chụp của engine chứ không tính lại: nếu tính lại
 * ở đây thì con số có thể khác thứ học viên đang nhìn, và lúc đó không ai biết
 * bên nào đúng.
 */
function parseProgress(json: string | null): Array<{ label: string; current: number; target: number }> {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json) as { progress?: Array<{ label: string; current: number; target: number }> };
    return parsed.progress ?? [];
  } catch {
    return [];
  }
}

function explanationOf(json: string | null): string | null {
  if (!json) return null;
  try {
    return (JSON.parse(json) as { explanation?: string }).explanation ?? null;
  } catch {
    return null;
  }
}

export default async function StudentRankTimelinePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  if (!features.ranks) notFound();
  await requireAdmin();

  const { userId } = await params;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });
  if (!user) notFound();

  const [profile, trials, grace] = await Promise.all([
    db.userRank.findUnique({
      where: { userId },
      select: { currentLevel: true, currentRankCode: true, promotedAt: true, version: true },
    }),
    db.userTrial.findMany({
      where: { userId },
      orderBy: { trialCode: "asc" },
      select: {
        trialCode: true,
        status: true,
        eligibleAt: true,
        startedAt: true,
        completedAt: true,
        progressJson: true,
        gateSnapshotJson: true,
        runs: {
          orderBy: { runNumber: "asc" },
          select: { runNumber: true, status: true, startedAt: true, endedAt: true },
        },
      },
    }),
    db.userGraceState.findUnique({
      where: { userId },
      select: { availableCount: true, lastUsedAt: true, nextGrantAt: true },
    }),
  ]);

  const rank = profile ? rankByLevel(profile.currentLevel) : null;
  const fmt = (d: Date | null) =>
    d ? d.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "—";

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link
        href="/quan-tri/cap-bac"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted hover:text-navy"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Cấp bậc
      </Link>

      <h1 className="font-display text-3xl font-bold text-navy-deep">{user.name}</h1>
      <p className="mt-1 font-ui text-sm text-muted">{user.email}</p>

      {profile ? (
        <p className="mt-4 font-ui text-sm text-ink-soft">
          Bậc {profile.currentLevel} · <strong>{rank?.name}</strong> · thăng cấp lần
          cuối {fmt(profile.promotedAt)} · phiên bản {profile.version}
          {grace && (
            <> · Hoa Dung đạo: còn {grace.availableCount}
              {grace.lastUsedAt && <> (dùng lần cuối {fmt(grace.lastUsedAt)})</>}
            </>
          )}
        </p>
      ) : (
        <p className="mt-4 font-ui text-sm text-muted">
          Chưa có hồ sơ cấp bậc. Hồ sơ được tạo tự động ở lần xét sự kiện đầu tiên.
        </p>
      )}

      {trials.length === 0 ? (
        <p className="mt-8 border border-line bg-cream-deep p-7 font-ui text-sm text-ink-soft">
          Chưa có bản ghi thí luyện nào.
        </p>
      ) : (
        <ol className="mt-8 m-0 list-none space-y-4 p-0">
          {trials.map((trial) => {
            const definition = trialByCode(trial.trialCode);
            const progress = parseProgress(trial.progressJson);
            const gateNote = explanationOf(trial.gateSnapshotJson);
            const successNote = explanationOf(trial.progressJson);

            return (
              <li key={trial.trialCode} className="border border-line bg-paper p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-display text-lg font-bold text-navy-deep">
                    {definition?.name ?? trial.trialCode}
                  </h2>
                  <span className="font-ui text-sm text-ink-soft">
                    {STATUS_LABEL[trial.status] ?? trial.status}
                  </span>
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 font-ui text-xs sm:grid-cols-3">
                  <dt className="text-muted">Mở lúc</dt>
                  <dd className="text-ink-soft sm:col-span-2">{fmt(trial.eligibleAt)}</dd>
                  <dt className="text-muted">Khởi lúc</dt>
                  <dd className="text-ink-soft sm:col-span-2">{fmt(trial.startedAt)}</dd>
                  <dt className="text-muted">Vượt lúc</dt>
                  <dd className="text-ink-soft sm:col-span-2">{fmt(trial.completedAt)}</dd>
                </dl>

                {trial.status !== "ACTIVE" && gateNote && (
                  <p className="mt-3 font-ui text-sm text-ink-soft">Gate: {gateNote}</p>
                )}
                {successNote && (
                  <p className="mt-3 font-ui text-sm text-ink-soft">{successNote}</p>
                )}

                {progress.length > 0 && (
                  <ul className="mt-3 m-0 list-none space-y-1 p-0">
                    {progress.map((item) => (
                      <li
                        key={item.label}
                        className="flex justify-between font-ui text-xs text-ink-soft"
                      >
                        <span>{item.label}</span>
                        <span className="tabular-nums">
                          {item.current}/{item.target}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {trial.runs.length > 0 && (
                  <p className="mt-3 font-ui text-xs text-muted">
                    {trial.runs.length} lượt:{" "}
                    {trial.runs
                      .map((run) => `#${run.runNumber} ${run.status}`)
                      .join(" · ")}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <p className="mt-8 border-l-4 border-gold bg-cream-deep px-6 py-5 text-sm leading-relaxed text-ink-soft">
        Trang này hiển thị bản chụp tiến độ mà engine đã ghi, không tính lại.
        Nếu tính lại ở đây thì con số có thể khác thứ học viên đang nhìn, và lúc
        đó không ai biết bên nào đúng.
      </p>
    </main>
  );
}
