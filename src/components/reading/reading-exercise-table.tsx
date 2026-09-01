import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Feather,
  PlayCircle,
  RotateCcw,
} from "lucide-react";
import { startAttemptAction } from "@/lib/actions/attempts";
import { buyWithCoinsAction } from "@/lib/actions/payments";
import { formatCoins } from "@/lib/payments/coins";
import { formatMerit } from "@/lib/merit/merit";
import { BASE_COST } from "@/lib/thibut/thibut";
import {
  ReadingCatalogSubmit,
  ReadingThiButConfirm,
} from "@/components/reading/catalog-actions";
import {
  ReadingCatalogDialog,
  ReadingDialogClose,
} from "@/components/reading/catalog-dialog";

export type ReadingMeritGateView = {
  balance: number;
  cost: number;
  canAfford: boolean;
  canRetry: boolean;
  secondsLeft: number;
  poolReady: boolean;
  hasLiveAttempt: boolean;
};

export type ReadingExerciseTableRow = {
  id: string;
  title: string;
  questionCount: number;
  questionTypes: string[];
  difficultyLabel: string;
  passageFitLabel: string;
  durationMinutes: number;
  access: "FREE" | "OWNED" | "LOCKED";
  userSignedIn: boolean;
  inProgress: boolean;
  attemptCount: number;
  bestScore: { raw: number; total: number } | null;
  coinCost: number;
  coinBalance: number | null;
  merit: ReadingMeritGateView | null;
};

/**
 * Bảng so sánh passage: thông tin phụ chỉ xuất hiện khi học viên bấm tên bài,
 * còn hai cột mở khóa giữ đúng một hành động ngắn gọn là dấu tick.
 */
export function ReadingExerciseTable({
  rows,
}: {
  rows: ReadingExerciseTableRow[];
}) {
  return (
    <div className="overflow-hidden rounded-stoic-lg border border-stoic-line bg-stoic-canvas shadow-stoic-1">
      <div
        className="overflow-x-auto overscroll-x-contain"
        role="region"
        aria-label="Danh sách passage Reading và lựa chọn mở bài"
        tabIndex={0}
      >
        <table className="w-full min-w-[43rem] border-collapse text-left font-stoic text-sm">
          <caption className="sr-only">
            Kho Reading gồm tên passage, số câu hỏi và lựa chọn mở bằng Xu hoặc
            Đức Hạnh.
          </caption>
          <thead>
            <tr className="border-b border-stoic-line bg-stoic-canvas-soft">
              <th
                scope="col"
                className="h-14 w-full px-5 text-xs font-semibold uppercase tracking-[0.07em] text-stoic-ink-muted sm:px-6"
              >
                Tên passage
              </th>
              <th
                scope="col"
                className="h-14 whitespace-nowrap px-4 text-center text-xs font-semibold uppercase tracking-[0.07em] text-stoic-ink-muted"
              >
                Số câu
              </th>
              <th
                scope="col"
                className="h-14 min-w-28 px-4 text-center text-xs font-semibold uppercase tracking-[0.07em] text-stoic-ink-muted"
              >
                Xu
              </th>
              <th
                scope="col"
                className="h-14 min-w-32 px-4 text-center text-xs font-semibold uppercase tracking-[0.07em] text-stoic-ink-muted"
              >
                Đức Hạnh
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-stoic-line/80 transition-colors last:border-b-0 hover:bg-stoic-primary-soft/20"
              >
                <td className="px-5 py-4 align-middle sm:px-6">
                  <ReadingDetailDialog row={row} />
                </td>
                <td className="px-4 py-4 text-center align-middle font-semibold tabular-nums text-stoic-ink-secondary">
                  {row.questionCount}
                </td>

                {row.access === "LOCKED" ? (
                  <>
                    <td className="px-4 py-3 text-center align-middle">
                      <CoinUnlock row={row} />
                    </td>
                    <td className="px-4 py-3 text-center align-middle">
                      <MeritUnlock row={row} />
                    </td>
                  </>
                ) : (
                  <td colSpan={2} className="px-4 py-4 text-center align-middle">
                    <span className="inline-flex min-h-8 items-center gap-1.5 rounded-stoic-pill border border-stoic-sage/20 bg-jade-pale px-3 py-1 text-xs font-semibold text-jade-ink">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      {row.access === "FREE" ? "Miễn phí" : "Đã mở"}
                    </span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReadingDetailDialog({ row }: { row: ReadingExerciseTableRow }) {
  return (
    <ReadingCatalogDialog
      triggerAriaLabel={`Xem chi tiết ${row.title}`}
      triggerClassName="group inline-flex max-w-xl items-center gap-2 text-left text-[0.95rem] font-semibold leading-snug text-stoic-ink transition-colors hover:text-stoic-primary-deep focus-visible:rounded-stoic-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stoic-primary/35"
      trigger={
        <>
          <span className="underline decoration-stoic-line-strong decoration-1 underline-offset-4 group-hover:decoration-stoic-primary">
            {row.title}
          </span>
          <ArrowRight
            className="h-4 w-4 shrink-0 text-stoic-primary transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </>
      }
      title={row.title}
      description="Thông tin bài đọc"
    >
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-stoic-md border border-stoic-line bg-stoic-line sm:grid-cols-3">
        <DetailFact label="Số câu" value={`${row.questionCount} câu`} />
        <DetailFact label="Độ khó" value={row.difficultyLabel} />
        <DetailFact label="Vị trí" value={row.passageFitLabel} />
        <DetailFact label="Thời gian" value={`${row.durationMinutes} phút`} />
        <DetailFact
          label="Lượt đã làm"
          value={row.attemptCount > 0 ? String(row.attemptCount) : "Chưa làm"}
        />
        <DetailFact
          label="Kết quả tốt nhất"
          value={
            row.bestScore
              ? `${row.bestScore.raw}/${row.bestScore.total}`
              : "Chưa có"
          }
        />
      </dl>

      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.07em] text-stoic-ink-muted">
          Dạng câu hỏi
        </p>
        {row.questionTypes.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Các dạng câu hỏi">
            {row.questionTypes.map((type) => (
              <li
                key={type}
                className="rounded-stoic-pill border border-stoic-primary/20 bg-stoic-primary-soft/45 px-3 py-1.5 text-xs font-medium text-stoic-primary-deep"
              >
                {type}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-stoic-ink-muted">Chưa có thông tin.</p>
        )}
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 border-t border-stoic-line pt-5 sm:flex-row sm:items-center sm:justify-end">
        <ReadingDialogClose>Đóng</ReadingDialogClose>
        {row.access === "LOCKED" ? (
          <p className="text-sm leading-relaxed text-stoic-ink-muted sm:mr-auto">
            Chọn dấu tick trong bảng để mở bài.
          </p>
        ) : !row.userSignedIn ? (
          <Link href="/dang-nhap" className={PRIMARY_LINK_CLASS}>
            Đăng nhập để làm bài
          </Link>
        ) : (
          <form action={startAttemptAction.bind(null, row.id)}>
            <ReadingCatalogSubmit pendingLabel="Đang mở bài…">
              {row.inProgress ? (
                <>
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Tiếp tục
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4" aria-hidden="true" />
                  {row.attemptCount > 0 ? "Làm lại" : "Bắt đầu"}
                </>
              )}
            </ReadingCatalogSubmit>
          </form>
        )}
      </div>
    </ReadingCatalogDialog>
  );
}

function DetailFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-h-20 bg-stoic-canvas-soft px-4 py-3.5">
      <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.07em] text-stoic-ink-muted">
        {label}
      </dt>
      <dd className="mt-1.5 text-sm font-semibold leading-snug text-stoic-ink-secondary">
        {value}
      </dd>
    </div>
  );
}

function CoinUnlock({ row }: { row: ReadingExerciseTableRow }) {
  const balance = row.coinBalance;
  const canAfford = balance !== null && balance >= row.coinCost;

  return (
    <div className="inline-flex flex-col items-center gap-1.5">
      <ReadingCatalogDialog
        triggerAriaLabel={`Mở ${row.title} bằng ${formatCoins(row.coinCost)}`}
        triggerClassName="inline-flex h-11 w-11 items-center justify-center rounded-stoic-md border border-stoic-primary bg-stoic-canvas text-stoic-primary-deep shadow-stoic-1 transition-[background-color,border-color,transform] hover:bg-stoic-primary-soft/55 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stoic-primary/35"
        trigger={<Check className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />}
        title={`Mở “${row.title}” bằng Xu?`}
        description="Mở một lần, làm lại không giới hạn."
      >
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-stoic-md border border-stoic-line bg-stoic-line sm:grid-cols-3">
          <DialogStat label="Giá" value={formatCoins(row.coinCost)} />
          <DialogStat
            label="Bạn có"
            value={balance === null ? "—" : formatCoins(balance)}
          />
          <DialogStat
            label="Sau khi mở"
            value={canAfford && balance !== null ? formatCoins(balance - row.coinCost) : "—"}
            className="col-span-2 sm:col-span-1"
          />
        </div>

        {!row.userSignedIn ? (
          <DialogLinkActions href="/dang-nhap" label="Đăng nhập" />
        ) : canAfford ? (
          <form action={buyWithCoinsAction} className="mt-6">
            <input type="hidden" name="offerCode" value="READING_UNLOCK" />
            <input type="hidden" name="exerciseId" value={row.id} />
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <ReadingDialogClose />
              <ReadingCatalogSubmit pendingLabel="Đang mở…">
                Xác nhận · {formatCoins(row.coinCost)}
              </ReadingCatalogSubmit>
            </div>
          </form>
        ) : (
          <>
            <p className="mt-4 rounded-stoic-sm bg-stoic-canvas-soft px-4 py-3 text-sm leading-relaxed text-stoic-ink-muted">
              Bạn còn thiếu {formatCoins(row.coinCost - (balance ?? 0))}.
            </p>
            <DialogLinkActions href="/thanh-toan" label="Nạp Xu" />
          </>
        )}
      </ReadingCatalogDialog>
      <span className="text-xs font-semibold tabular-nums text-stoic-ink-muted">
        {row.coinCost}
      </span>
    </div>
  );
}

function MeritUnlock({ row }: { row: ReadingExerciseTableRow }) {
  const gate = row.merit;
  const cost = gate?.cost ?? BASE_COST;
  const minutes = gate ? Math.max(1, Math.ceil(gate.secondsLeft / 60)) : 0;

  return (
    <div className="inline-flex flex-col items-center gap-1.5">
      <ReadingCatalogDialog
        triggerAriaLabel={`Vào Thí Bút để mở ${row.title}`}
        triggerClassName="inline-flex h-11 w-11 items-center justify-center rounded-stoic-md border border-stoic-sage bg-stoic-canvas text-stoic-sage shadow-stoic-1 transition-[background-color,border-color,transform] hover:bg-jade-pale active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stoic-sage/30"
        trigger={<Check className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />}
        title={`Vào Thí Bút cho “${row.title}”?`}
        description="4 câu · 3 phút · đúng 3 câu để mở bài."
      >
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-stoic-md border border-stoic-line bg-stoic-line">
          <DialogStat
            label={gate?.hasLiveAttempt ? "Trạng thái" : "Lượt này"}
            value={gate?.hasLiveAttempt ? "Đang diễn ra" : formatMerit(cost)}
          />
          <DialogStat
            label="Bạn có"
            value={gate ? formatMerit(gate.balance) : "—"}
          />
        </div>

        <p className="mt-4 flex gap-2.5 rounded-stoic-sm bg-stoic-canvas-soft px-4 py-3 text-sm leading-relaxed text-stoic-ink-muted">
          <Feather className="mt-0.5 h-4 w-4 shrink-0 text-stoic-sage" aria-hidden="true" />
          {gate?.hasLiveAttempt
            ? "Bạn đã có một lượt đang làm. Tiếp tục từ đúng câu đang dở."
            : "Đức Hạnh được trừ khi vào. Bài chỉ mở sau khi bạn vượt Thí Bút."}
        </p>

        {!row.userSignedIn ? (
          <DialogLinkActions href="/dang-nhap" label="Đăng nhập" />
        ) : gate?.hasLiveAttempt ? (
          <DialogLinkActions
            href={`/hoc-vien/thi-but/EXERCISE/${row.id}`}
            label="Tiếp tục Thí Bút"
          />
        ) : !gate?.poolReady ? (
          <BlockedDialogActions message="Kho câu Thí Bút chưa sẵn sàng." />
        ) : !gate.canRetry ? (
          <BlockedDialogActions message={`Có thể vào lại sau ${minutes} phút.`} />
        ) : !gate.canAfford ? (
          <BlockedDialogActions
            message={`Bạn còn thiếu ${formatMerit(gate.cost - gate.balance)}.`}
            href="/hoc-vien"
            linkLabel="Cách kiếm Đức Hạnh"
          />
        ) : (
          <ReadingThiButConfirm exerciseId={row.id} cost={gate.cost} />
        )}
      </ReadingCatalogDialog>
      <span className="text-xs font-semibold tabular-nums text-stoic-ink-muted">
        {gate?.hasLiveAttempt ? "Đang thi" : cost}
      </span>
    </div>
  );
}

function DialogStat({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`bg-stoic-canvas-soft px-4 py-4 ${className}`}>
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.07em] text-stoic-ink-muted">
        {label}
      </p>
      <p className="mt-1.5 font-semibold tabular-nums text-stoic-ink">{value}</p>
    </div>
  );
}

function DialogLinkActions({ href, label }: { href: string; label: string }) {
  return (
    <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <ReadingDialogClose />
      <Link href={href} className={PRIMARY_LINK_CLASS}>
        {label}
      </Link>
    </div>
  );
}

function BlockedDialogActions({
  message,
  href,
  linkLabel,
}: {
  message: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mt-5">
      <p className="rounded-stoic-sm border border-stoic-warning/20 bg-gold-pale px-4 py-3 text-sm leading-relaxed text-stoic-warning">
        {message}
      </p>
      <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <ReadingDialogClose>Đóng</ReadingDialogClose>
        {href && linkLabel ? (
          <Link href={href} className={SECONDARY_LINK_CLASS}>
            {linkLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

const PRIMARY_LINK_CLASS =
  "inline-flex min-h-11 items-center justify-center rounded-stoic-pill border border-stoic-primary bg-stoic-primary px-5 py-2.5 text-sm font-semibold text-white shadow-stoic-1 transition-colors hover:border-stoic-primary-deep hover:bg-stoic-primary-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stoic-primary/35";

const SECONDARY_LINK_CLASS =
  "inline-flex min-h-11 items-center justify-center rounded-stoic-pill border border-stoic-primary px-5 py-2.5 text-sm font-semibold text-stoic-primary-deep transition-colors hover:bg-stoic-primary-soft/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stoic-primary/35";
