"use client";

import {
  Fragment,
  type ReactNode,
  useId,
  useRef,
} from "react";
import { CheckCircle2, Clock3, Info, TriangleAlert, X } from "lucide-react";

export type TableColumn<T> = {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: "left" | "center" | "right";
  numeric?: boolean;
  className?: string;
};

export function DataTable<T>({
  rows,
  columns,
  getRowKey,
  caption,
  emptyTitle = "Chưa có dữ liệu",
  emptyDescription = "Dữ liệu sẽ xuất hiện ở đây khi có hoạt động.",
  loading = false,
  stickyHeader = false,
  footer,
  maxHeight,
  className = "",
}: {
  rows: readonly T[];
  columns: readonly TableColumn<T>[];
  getRowKey: (row: T) => string;
  caption?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  loading?: boolean;
  stickyHeader?: boolean;
  footer?: ReactNode;
  maxHeight?: string;
  className?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-stoic-md border border-stoic-line bg-stoic-canvas shadow-stoic-1 ${className}`}>
      <div className="overflow-auto" style={maxHeight ? { maxHeight } : undefined}>
        <table className="w-full min-w-[42rem] border-collapse text-left font-ui text-sm">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead className={stickyHeader ? "sticky top-0 z-10" : undefined}>
            <tr className="border-b border-stoic-line bg-stoic-canvas-soft">
              {columns.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  className={`h-12 px-4 text-xs font-semibold uppercase tracking-[0.07em] text-stoic-ink-muted ${alignClass(column.align)} ${column.className ?? ""}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <LoadingRows columnCount={columns.length} /> : null}
            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-16 text-center">
                  <p className="font-semibold text-stoic-ink">{emptyTitle}</p>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stoic-ink-muted">
                    {emptyDescription}
                  </p>
                </td>
              </tr>
            ) : null}
            {!loading
              ? rows.map((row) => (
                  <tr
                    key={getRowKey(row)}
                    className="border-b border-stoic-line/80 transition-colors last:border-b-0 hover:bg-stoic-primary-soft/20"
                  >
                    {columns.map((column) => (
                      <td
                        key={column.id}
                        className={`h-12 px-4 align-middle text-stoic-ink-secondary ${alignClass(column.align)} ${column.numeric ? "tabular-nums" : ""} ${column.className ?? ""}`}
                      >
                        {column.cell(row)}
                      </td>
                    ))}
                  </tr>
                ))
              : null}
          </tbody>
          {footer ? (
            <tfoot className="sticky bottom-0 z-10 border-t border-stoic-line bg-stoic-canvas-soft">
              {footer}
            </tfoot>
          ) : null}
        </table>
      </div>
    </div>
  );
}

function LoadingRows({ columnCount }: { columnCount: number }) {
  return (
    <Fragment>
      {[0, 1, 2, 3].map((row) => (
        <tr key={row} className="border-b border-stoic-line/80 last:border-0" aria-hidden="true">
          {Array.from({ length: columnCount }, (_, column) => (
            <td key={column} className="h-12 px-4">
              <span
                className="block h-3 animate-pulse rounded-full bg-stoic-line"
                style={{ width: `${52 + ((row + column) % 4) * 11}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </Fragment>
  );
}

function alignClass(align: TableColumn<unknown>["align"]): string {
  if (align === "right") return "text-right";
  if (align === "center") return "text-center";
  return "text-left";
}

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

const STATUS_STYLE: Record<StatusTone, string> = {
  success: "border-stoic-sage/25 bg-jade-pale text-jade-ink",
  warning: "border-stoic-warning/25 bg-gold-pale text-stoic-warning",
  danger: "border-stoic-danger/25 bg-danger-pale text-stoic-danger",
  info: "border-stoic-primary/25 bg-stoic-primary-soft text-stoic-primary-deep",
  neutral: "border-stoic-line bg-stoic-canvas-soft text-stoic-ink-secondary",
};

const STATUS_ICON = {
  success: CheckCircle2,
  warning: Clock3,
  danger: TriangleAlert,
  info: Info,
  neutral: Info,
} as const;

export function StatusBadge({ label, tone = "neutral" }: { label: string; tone?: StatusTone }) {
  const Icon = STATUS_ICON[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-stoic-pill border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[tone]}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}

export function TableDetailDialog({
  triggerLabel = "Xem chi tiết",
  title,
  description,
  children,
}: {
  triggerLabel?: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="inline-flex min-h-10 items-center justify-center rounded-stoic-pill border border-stoic-primary px-4 py-2 text-xs font-semibold text-stoic-primary-deep hover:bg-stoic-primary-soft"
      >
        {triggerLabel}
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        onClick={(event) => {
          if (event.currentTarget === event.target) event.currentTarget.close();
        }}
        className="m-auto w-[min(36rem,calc(100%-2rem))] rounded-stoic-lg border border-stoic-line bg-stoic-canvas p-0 text-stoic-ink shadow-stoic-3 backdrop:bg-stoic-slate-950/55"
      >
        <div className="flex items-start justify-between gap-6 border-b border-stoic-line px-6 py-5">
          <div>
            <h2 id={titleId} className="font-stoic text-xl font-medium tracking-[-0.01em]">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-1 text-sm leading-relaxed text-stoic-ink-muted">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-stoic-ink-muted hover:bg-stoic-canvas-soft hover:text-stoic-ink"
            aria-label="Đóng hộp thoại"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </dialog>
    </>
  );
}
