import Link from "next/link";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock3,
  Coins,
  Lock,
  Shuffle,
  SquareCheck,
  Trophy,
} from "lucide-react";
import { requireUser } from "@/lib/session";
import {
  assemblyCandidates,
  createAssemblyAction,
} from "@/lib/actions/reading-assembly";
import { buyWithCoinsAction } from "@/lib/actions/payments";
import {
  planAutoAssembly,
  isAssemblable,
  PASSAGES_PER_TEST,
  TARGET_QUESTIONS,
  FULL_TEST_MINUTES,
} from "@/lib/reading-assembly";
import { readingDisplayTitle } from "@/lib/reading/catalog";
import { MODULE_LABELS } from "@/lib/nav";
import { getCoinWallet } from "@/lib/payments/coin-service";
import { formatCoins } from "@/lib/payments/coins";
import { OFFERS } from "@/lib/payments/catalog";
import { SubmitButton } from "@/components/ui";
import { ManualAssemblyPicker } from "@/components/exam/manual-assembly-picker";
import { ReadingCatalogSubmit } from "@/components/reading/catalog-actions";
import {
  ReadingCatalogDialog,
  ReadingDialogClose,
} from "@/components/reading/catalog-dialog";

export const metadata = { title: "Ghép đề Full Test" };
export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  NOT_ENOUGH_PASSAGES:
    "Kho đề chưa đủ ba bài đọc để ghép. Vui lòng quay lại sau khi trung tâm đăng thêm đề.",
  NEED_EXACTLY_THREE: "Hãy chọn đúng ba bài đọc.",
  DUPLICATE_PASSAGE: "Không thể chọn trùng một bài đọc.",
  PASSAGE_NOT_ALLOWED: "Một trong ba bài bạn chọn hiện không dùng để ghép được.",
  CHUA_MUA_DU: "Bạn chưa mở khóa đủ ba bài trong đề này.",
};

const TIER_LABELS: Record<string, string> = {
  EASY: "Dễ",
  MEDIUM: "Vừa",
  HARD: "Khó",
  UNKNOWN: "Chưa xếp",
};

const TIER_STYLES: Record<string, string> = {
  EASY: "border-success/20 bg-success-pale text-success",
  MEDIUM:
    "border-stoic-primary/20 bg-stoic-primary-soft/55 text-stoic-primary-deep",
  HARD: "border-stoic-ruby/20 bg-danger-pale text-stoic-danger",
  UNKNOWN: "border-stoic-line bg-stoic-canvas-soft text-stoic-ink-muted",
};

export default async function AssemblyPage({
  searchParams,
}: {
  searchParams: Promise<{ loi?: string; dang?: string }>;
}) {
  const { loi, dang } = await searchParams;
  const user = await requireUser();

  const readingType = dang === "GENERAL" ? "GENERAL" : "ACADEMIC";
  const wallet = await getCoinWallet(user.id);
  const unlockCost = OFFERS.READING_UNLOCK.priceCoins;
  const moduleLabel = MODULE_LABELS[readingType];

  const candidates = await assemblyCandidates(user.id, readingType);
  const usable = candidates.filter(isAssemblable);
  const autoPlan = planAutoAssembly(candidates);

  return (
    <div className="stoic-reading-surface stoic-assembly-surface min-h-screen">
      <section className="border-b border-stoic-line">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-16">
          <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div>
              <p className="flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-stoic-primary-deep">
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                Reading {moduleLabel}
              </p>
              <h1 className="mt-4 max-w-3xl text-[2.35rem] font-light leading-[1.08] tracking-[-0.035em] text-stoic-ink sm:text-5xl">
                Ghép ba passage thành một đề Full Test
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-stoic-ink-secondary sm:text-[1.05rem]">
                Luyện trọn 60 phút để điểm số phản ánh đúng sức bền đọc, thay vì
                bị lệch bởi một passage ngắn.
              </p>

              <nav
                aria-label="Chọn kho Reading để ghép đề"
                className="mt-7 inline-flex rounded-stoic-pill border border-stoic-line bg-stoic-canvas-soft p-1"
              >
                {(["ACADEMIC", "GENERAL"] as const).map((type) => {
                  const active = type === readingType;
                  return (
                    <Link
                      key={type}
                      href={`/luyen-tap/reading/ghep-de?dang=${type}`}
                      aria-current={active ? "page" : undefined}
                      className={`inline-flex min-h-10 items-center rounded-stoic-pill px-5 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stoic-primary/35 ${
                        active
                          ? "bg-stoic-canvas text-stoic-primary-deep shadow-stoic-1"
                          : "text-stoic-ink-muted hover:text-stoic-primary-deep"
                      }`}
                    >
                      {MODULE_LABELS[type]}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <dl className="grid grid-cols-3 overflow-hidden rounded-stoic-lg border border-stoic-line bg-stoic-canvas shadow-stoic-1">
              <HeroStat label="Passage" value={PASSAGES_PER_TEST} />
              <HeroStat label="Mục tiêu" value={`≈${TARGET_QUESTIONS}`} />
              <HeroStat label="Phút" value={FULL_TEST_MINUTES} />
            </dl>
          </div>
        </div>
      </section>

      <section className="bg-stoic-canvas-soft px-4 py-12 sm:px-6 md:py-16">
        <div className="mx-auto max-w-6xl">
          {loi ? (
            <div
              role="alert"
              className="mb-8 flex items-start gap-3 rounded-stoic-md border border-stoic-danger/25 bg-danger-pale px-5 py-4 text-sm leading-relaxed text-stoic-danger"
            >
              <AlertCircle
                className="mt-0.5 h-5 w-5 shrink-0"
                aria-hidden="true"
              />
              <span>
                {ERRORS[loi] ?? "Không ghép được đề. Vui lòng thử lại."}
              </span>
            </div>
          ) : null}

          <article className="overflow-hidden rounded-stoic-lg border border-stoic-line bg-stoic-canvas shadow-stoic-1">
            <div className="border-b border-stoic-line px-5 py-6 sm:px-7">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                <div className="flex gap-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-stoic-md bg-stoic-primary-soft text-stoic-primary-deep">
                    <Shuffle className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-stoic-primary-deep">
                      Đề do hệ thống ghép
                    </p>
                    <h2 className="mt-1.5 text-2xl font-medium tracking-[-0.025em] text-stoic-ink">
                      Bộ đề cân bằng cho lần làm này
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stoic-ink-secondary">
                      Ưu tiên bài chưa làm, cân bằng độ khó và chọn tổng số câu
                      gần đề thi thật nhất.
                    </p>
                  </div>
                </div>

                <span className="inline-flex min-h-9 shrink-0 items-center gap-2 self-start rounded-stoic-pill border border-success/20 bg-success-pale px-3.5 py-1.5 text-xs font-semibold text-success">
                  <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
                  Tính danh hiệu
                </span>
              </div>
            </div>

            {autoPlan.ok ? (
              <>
                <div
                  className="overflow-x-auto overscroll-x-contain"
                  role="region"
                  aria-label="Ba passage do hệ thống ghép"
                  tabIndex={0}
                >
                  <table className="w-full min-w-[42rem] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-stoic-line bg-stoic-canvas-soft">
                        <th
                          className="h-12 px-5 text-xs font-semibold text-stoic-ink-muted sm:px-7"
                          scope="col"
                        >
                          Passage
                        </th>
                        <th
                          className="h-12 px-4 text-xs font-semibold text-stoic-ink-muted"
                          scope="col"
                        >
                          Tên bài
                        </th>
                        <th
                          className="h-12 px-4 text-center text-xs font-semibold text-stoic-ink-muted"
                          scope="col"
                        >
                          Số câu
                        </th>
                        <th
                          className="h-12 px-4 text-center text-xs font-semibold text-stoic-ink-muted"
                          scope="col"
                        >
                          Độ khó
                        </th>
                        <th
                          className="h-12 px-5 text-right text-xs font-semibold text-stoic-ink-muted sm:px-7"
                          scope="col"
                        >
                          Trạng thái
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {autoPlan.parts.map((part, index) => {
                        const restricted = part.accessLevel === "RESTRICTED";
                        return (
                          <tr
                            key={part.exerciseId}
                            className="border-b border-stoic-line/80 last:border-b-0"
                          >
                            <td className="px-5 py-4 font-semibold tabular-nums text-stoic-primary-deep sm:px-7">
                              {index + 1}
                            </td>
                            <td className="px-4 py-4 font-medium text-stoic-ink">
                              {readingDisplayTitle(part.title)}
                            </td>
                            <td className="px-4 py-4 text-center tabular-nums text-stoic-ink-secondary">
                              {part.questionCount}
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span
                                className={`inline-flex rounded-stoic-pill border px-2.5 py-1 text-xs font-semibold ${TIER_STYLES[part.tier]}`}
                              >
                                {TIER_LABELS[part.tier]}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right sm:px-7">
                              {restricted && !part.owned ? (
                                <span className="inline-flex items-center gap-1.5 rounded-stoic-pill border border-stoic-warning/20 bg-stoic-canvas-cream px-2.5 py-1 text-xs font-semibold text-stoic-warning">
                                  <Lock
                                    className="h-3.5 w-3.5"
                                    aria-hidden="true"
                                  />
                                  Cần mở
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-stoic-pill border border-success/20 bg-success-pale px-2.5 py-1 text-xs font-semibold text-success">
                                  <CheckCircle2
                                    className="h-3.5 w-3.5"
                                    aria-hidden="true"
                                  />
                                  Sẵn sàng
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="border-t border-stoic-line bg-stoic-canvas-soft/55 px-5 py-5 sm:px-7">
                  <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-stoic-ink-secondary">
                      <span className="inline-flex items-center gap-2">
                        <BookOpen
                          className="h-4 w-4 text-stoic-primary-deep"
                          aria-hidden="true"
                        />
                        <strong className="tabular-nums text-stoic-ink">
                          {autoPlan.totalQuestions}
                        </strong>{" "}
                        câu
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <Clock3
                          className="h-4 w-4 text-stoic-primary-deep"
                          aria-hidden="true"
                        />
                        <strong className="tabular-nums text-stoic-ink">
                          {autoPlan.durationMinutes}
                        </strong>{" "}
                        phút
                      </span>
                    </div>

                    {autoPlan.missingAccess.length === 0 ? (
                      <form action={createAssemblyAction}>
                        <input type="hidden" name="mode" value="AUTO" />
                        <input
                          type="hidden"
                          name="readingType"
                          value={readingType}
                        />
                        <SubmitButton
                          variant="stoicPrimary"
                          className="w-full sm:w-auto"
                        >
                          <Shuffle className="h-4 w-4" aria-hidden="true" />
                          Bắt đầu đề này
                        </SubmitButton>
                      </form>
                    ) : null}
                  </div>

                  {autoPlan.missingAccess.length > 0 ? (
                    <UnlockPanel
                      parts={autoPlan.missingAccess}
                      balance={wallet.balance}
                      unlockCost={unlockCost}
                      readingType={readingType}
                    />
                  ) : null}
                </div>
              </>
            ) : (
              <div className="m-5 rounded-stoic-md border border-stoic-line bg-stoic-canvas-soft px-5 py-5 text-sm leading-relaxed text-stoic-ink-secondary sm:m-7">
                <p className="font-semibold text-stoic-ink">
                  Chưa ghép được đề tự động
                </p>
                <p className="mt-1.5">
                  Kho {moduleLabel} hiện có {usable.length} bài phù hợp; cần tối
                  thiểu {PASSAGES_PER_TEST}. Trung tâm sẽ bổ sung thêm đề.
                </p>
              </div>
            )}
          </article>

          <article className="mt-8 overflow-hidden rounded-stoic-lg border border-stoic-line bg-stoic-canvas shadow-stoic-1">
            <div className="border-b border-stoic-line px-5 py-6 sm:px-7">
              <div className="flex gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-stoic-md bg-stoic-canvas-cream text-stoic-warning">
                  <SquareCheck className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-stoic-warning">
                    Tự chọn để luyện đúng điểm yếu
                  </p>
                  <h2 className="mt-1.5 text-2xl font-medium tracking-[-0.025em] text-stoic-ink">
                    Chọn ba passage bạn muốn làm
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stoic-ink-secondary">
                    Phù hợp khi ôn một chủ đề hoặc làm lại bài cũ. Kết quả vẫn
                    được lưu, nhưng không tính vào danh hiệu.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-5 py-6 sm:px-7">
              {usable.length < PASSAGES_PER_TEST ? (
                <div className="rounded-stoic-md border border-stoic-line bg-stoic-canvas-soft px-5 py-4 text-sm text-stoic-ink-secondary">
                  Cần ít nhất {PASSAGES_PER_TEST} bài đọc; hiện có {usable.length}.
                </div>
              ) : (
                <ManualAssemblyPicker
                  candidates={usable.map((candidate) => ({
                    exerciseId: candidate.exerciseId,
                    title: readingDisplayTitle(candidate.title),
                    questionCount: candidate.questionCount,
                    tierLabel: TIER_LABELS[candidate.tier],
                    owned: candidate.owned,
                    restricted: candidate.accessLevel === "RESTRICTED",
                    attemptCount: candidate.attemptCount,
                  }))}
                  action={createAssemblyAction}
                  readingType={readingType}
                />
              )}
            </div>
          </article>

          <p className="mt-8 text-center">
            <Link
              href={
                readingType === "GENERAL"
                  ? "/luyen-tap/reading/general"
                  : "/luyen-tap/reading"
              }
              className="inline-flex min-h-11 items-center rounded-stoic-pill px-4 py-2 text-sm font-semibold text-stoic-primary-deep transition-colors hover:bg-stoic-primary-soft/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stoic-primary/35"
            >
              Quay lại kho Reading {moduleLabel}
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border-r border-stoic-line px-3 py-5 text-center last:border-r-0">
      <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-stoic-ink-muted">
        {label}
      </dt>
      <dd className="mt-1.5 text-2xl font-medium tabular-nums tracking-[-0.03em] text-stoic-ink">
        {value}
      </dd>
    </div>
  );
}

function UnlockPanel({
  parts,
  balance,
  unlockCost,
  readingType,
}: {
  parts: Array<{ exerciseId: string; title: string }>;
  balance: number;
  unlockCost: number;
  readingType: "ACADEMIC" | "GENERAL";
}) {
  const total = parts.length * unlockCost;
  const canOpenOne = balance >= unlockCost;
  const missing = Math.max(0, total - balance);

  return (
    <div className="mt-5 rounded-stoic-md border border-stoic-warning/20 bg-stoic-canvas-cream px-4 py-4 sm:px-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-stoic-ink">
            <Coins className="h-4 w-4 text-stoic-warning" aria-hidden="true" />
            Cần mở {parts.length} passage trước khi bắt đầu
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-stoic-ink-secondary">
            Tổng {formatCoins(total)} · Ví hiện có {formatCoins(balance)}.
            {missing > 0
              ? ` Còn thiếu ${formatCoins(missing)}.`
              : " Bạn có thể mở lần lượt từng bài."}
          </p>
        </div>

        {!canOpenOne ? (
          <Link
            href="/thanh-toan"
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-stoic-pill border border-stoic-primary bg-stoic-primary px-5 py-2.5 text-sm font-semibold text-white shadow-stoic-1 transition-colors hover:border-stoic-primary-deep hover:bg-stoic-primary-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stoic-primary/35"
          >
            <Coins className="h-4 w-4" aria-hidden="true" />
            Nạp Xu
          </Link>
        ) : null}
      </div>

      {canOpenOne ? (
        <div className="mt-4 flex flex-wrap gap-2.5">
          {parts.map((part) => (
            <ReadingCatalogDialog
              key={part.exerciseId}
              trigger={
                <>
                  <Lock className="h-4 w-4" aria-hidden="true" />
                  Mở {readingDisplayTitle(part.title)}
                </>
              }
              triggerAriaLabel={`Mở ${readingDisplayTitle(part.title)} bằng ${formatCoins(unlockCost)}`}
              triggerClassName="inline-flex min-h-11 items-center justify-center gap-2 rounded-stoic-pill border border-stoic-primary bg-stoic-canvas px-4 py-2.5 text-sm font-semibold text-stoic-primary-deep transition-colors hover:bg-stoic-primary-soft/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stoic-primary/35"
              title={`Mở “${readingDisplayTitle(part.title)}”?`}
              description={`Hệ thống sẽ trừ ${formatCoins(unlockCost)} từ ví Xu và mở bài này vĩnh viễn.`}
            >
              <form action={buyWithCoinsAction}>
                <input
                  type="hidden"
                  name="offerCode"
                  value="READING_UNLOCK"
                />
                <input
                  type="hidden"
                  name="exerciseId"
                  value={part.exerciseId}
                />
                <input
                  type="hidden"
                  name="returnTo"
                  value={`/luyen-tap/reading/ghep-de?dang=${readingType}`}
                />
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <ReadingDialogClose />
                  <ReadingCatalogSubmit pendingLabel="Đang mở…">
                    Xác nhận mở · {formatCoins(unlockCost)}
                  </ReadingCatalogSubmit>
                </div>
              </form>
            </ReadingCatalogDialog>
          ))}
          {missing > 0 ? (
            <Link
              href="/thanh-toan"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-stoic-pill px-4 py-2.5 text-sm font-semibold text-stoic-primary-deep transition-colors hover:bg-stoic-primary-soft/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stoic-primary/35"
            >
              Nạp thêm Xu
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
