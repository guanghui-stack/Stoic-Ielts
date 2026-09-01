"use client";

import type { ReactNode } from "react";
import { useId, useRef } from "react";
import { X } from "lucide-react";

/**
 * Hộp thoại gọn dành riêng cho bảng kho Reading.
 *
 * Native dialog giữ được Escape, focus trap và tự trả focus về đúng nút mở.
 * Component chỉ nhận nội dung đã được server lọc; tuyệt đối không truyền JSON
 * đề Reading qua ranh giới client này vì JSON đó chứa đáp án.
 */
export function ReadingCatalogDialog({
  trigger,
  triggerAriaLabel,
  triggerClassName,
  title,
  description,
  children,
}: {
  trigger: ReactNode;
  triggerAriaLabel?: string;
  triggerClassName: string;
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
        aria-haspopup="dialog"
        aria-label={triggerAriaLabel}
        onClick={() => dialogRef.current?.showModal()}
        className={triggerClassName}
      >
        {trigger}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        onClick={(event) => {
          if (event.currentTarget === event.target) event.currentTarget.close();
        }}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[min(38rem,calc(100%-2rem))] overflow-y-auto rounded-stoic-lg border border-stoic-line bg-stoic-canvas p-0 text-left font-stoic text-stoic-ink shadow-stoic-3 backdrop:bg-stoic-slate-950/55"
      >
        <div className="flex items-start justify-between gap-5 border-b border-stoic-line px-5 py-5 sm:px-6">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-xl font-semibold leading-snug tracking-[-0.02em] text-stoic-ink"
            >
              {title}
            </h2>
            {description ? (
              <p
                id={descriptionId}
                className="mt-1.5 text-sm leading-relaxed text-stoic-ink-muted"
              >
                {description}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-stoic-pill text-stoic-ink-muted transition-colors hover:bg-stoic-canvas-soft hover:text-stoic-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stoic-primary/35"
            aria-label="Đóng hộp thoại"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="px-5 py-5 sm:px-6">{children}</div>
      </dialog>
    </>
  );
}

/** Nút đóng dùng được ở phần chân của mọi dialog con. */
export function ReadingDialogClose({
  children = "Hủy",
  className = "",
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(event) => event.currentTarget.closest("dialog")?.close()}
      className={`inline-flex min-h-11 items-center justify-center rounded-stoic-pill border border-stoic-line-strong bg-stoic-canvas px-5 py-2.5 text-sm font-semibold text-stoic-ink-secondary transition-colors hover:border-stoic-primary hover:text-stoic-primary-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stoic-primary/35 ${className}`}
    >
      {children}
    </button>
  );
}
