"use client";

import { useId, useRef } from "react";
import { Bold, Italic, List, Underline } from "lucide-react";
import { toggleBullet, toggleWrap } from "@/lib/forum/markup";

/**
 * Ô soạn thảo có thanh công cụ.
 *
 * Vẫn là một `<textarea>` thường, không phải vùng `contenteditable`. Thanh công
 * cụ chỉ chèn vài dấu quy ước vào chính chuỗi chữ — thứ gửi lên máy chủ vẫn là
 * văn bản thuần. Nhờ vậy không có HTML nào của người dùng để mà khử độc, và ô
 * này vẫn chạy được khi JavaScript hỏng (mất thanh công cụ, còn nguyên ô nhập).
 *
 * Con trỏ được đặt lại sau mỗi lần bấm; thiếu bước đó thì con trỏ nhảy về cuối
 * bài và người viết phải lần lại chỗ mình đang gõ.
 */
export function MarkupEditor({
  name,
  label,
  rows = 6,
  placeholder,
  maxLength,
  required,
  autoFocus,
}: {
  name: string;
  label?: string;
  rows?: number;
  placeholder?: string;
  maxLength?: number;
  required?: boolean;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const id = useId();

  function apply(
    fn: (
      value: string,
      start: number,
      end: number
    ) => { value: string; selectionStart: number; selectionEnd: number }
  ) {
    const el = ref.current;
    if (!el) return;
    const next = fn(el.value, el.selectionStart, el.selectionEnd);
    el.value = next.value;
    el.focus();
    el.setSelectionRange(next.selectionStart, next.selectionEnd);
  }

  const btn =
    "inline-flex h-8 w-8 cursor-pointer items-center justify-center border border-line text-ink-soft transition-colors hover:border-navy hover:text-navy";

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="mb-1.5 block font-ui text-xs font-semibold text-ink-soft">
          {label}
        </label>
      )}
      <div className="flex flex-wrap items-center gap-1.5 border border-b-0 border-line-strong bg-cream-deep px-2 py-1.5">
        <button
          type="button"
          onClick={() => apply((v, s, e) => toggleWrap(v, s, e, "**"))}
          title="In đậm"
          aria-label="In đậm"
          className={btn}
        >
          <Bold className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => apply((v, s, e) => toggleWrap(v, s, e, "*"))}
          title="In nghiêng"
          aria-label="In nghiêng"
          className={btn}
        >
          <Italic className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => apply((v, s, e) => toggleWrap(v, s, e, "__"))}
          title="Gạch chân"
          aria-label="Gạch chân"
          className={btn}
        >
          <Underline className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => apply(toggleBullet)}
          title="Gạch đầu dòng"
          aria-label="Gạch đầu dòng"
          className={btn}
        >
          <List className="h-3.5 w-3.5" aria-hidden="true" />
        </button>

        <span className="ml-auto font-ui text-[0.68rem] text-muted">
          **đậm** · *nghiêng* · __gạch chân__
        </span>
      </div>

      <textarea
        id={id}
        ref={ref}
        name={name}
        rows={rows}
        placeholder={placeholder}
        maxLength={maxLength}
        required={required}
        autoFocus={autoFocus}
        className="w-full resize-y border border-line-strong bg-paper px-3.5 py-2.5 font-ui text-sm leading-relaxed text-ink placeholder:text-muted focus:border-navy focus:outline-none"
      />
    </div>
  );
}
