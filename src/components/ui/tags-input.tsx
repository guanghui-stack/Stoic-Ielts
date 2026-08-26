"use client";

import { useId, useMemo, useState } from "react";
import { Tag, X } from "lucide-react";

export type StoicTagTone =
  | "focus"
  | "evidence"
  | "question"
  | "reflection"
  | "warning";

const TONE_CLASS: Record<StoicTagTone, string> = {
  focus: "border-stoic-primary/25 bg-stoic-primary-soft text-stoic-primary-deep",
  evidence: "border-stoic-sage/25 bg-jade-pale text-jade-ink",
  question: "border-stoic-line bg-stoic-canvas-cream text-stoic-ink",
  reflection: "border-stoic-lavender/35 bg-stoic-lavender/15 text-stoic-slate-900",
  warning: "border-stoic-warning/25 bg-gold-pale text-stoic-warning",
};

export function TagsInput({
  label = "Chủ đề",
  name = "tags",
  defaultValue = [],
  maxTags = 5,
  tone = "focus",
  placeholder = "Thêm chủ đề rồi nhấn Enter",
  hint,
  disabled = false,
  onChange,
}: {
  label?: string;
  name?: string;
  defaultValue?: string[];
  maxTags?: number;
  tone?: StoicTagTone;
  placeholder?: string;
  hint?: string;
  disabled?: boolean;
  onChange?: (tags: string[]) => void;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const statusId = `${id}-status`;
  const [tags, setTags] = useState(() => normalizeInitial(defaultValue, maxTags));
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState("");

  const normalizedTags = useMemo(
    () => new Set(tags.map((tag) => normalizeForCompare(tag))),
    [tags],
  );

  function update(next: string[], nextMessage = "") {
    setTags(next);
    setMessage(nextMessage);
    onChange?.(next);
  }

  function commitDraft() {
    const value = cleanTag(draft);
    if (!value) {
      setDraft("");
      return;
    }
    if (normalizedTags.has(normalizeForCompare(value))) {
      setMessage(`Chủ đề “${value}” đã có.`);
      setDraft("");
      return;
    }
    if (tags.length >= maxTags) {
      setMessage(`Bạn có thể thêm tối đa ${maxTags} chủ đề.`);
      return;
    }
    update([...tags, value], `Đã thêm chủ đề “${value}”.`);
    setDraft("");
  }

  function removeTag(index: number) {
    const removed = tags[index];
    update(tags.filter((_, itemIndex) => itemIndex !== index), `Đã xóa chủ đề “${removed}”.`);
  }

  return (
    <div className="w-full font-ui">
      <div className="flex items-center justify-between gap-4">
        <label htmlFor={id} className="text-sm font-semibold text-stoic-ink">
          {label}
        </label>
        <span className="text-xs tabular-nums text-stoic-ink-muted">
          {tags.length}/{maxTags}
        </span>
      </div>

      <div
        className="mt-2 flex min-h-12 flex-wrap items-center gap-2 rounded-stoic-sm border border-stoic-line-strong bg-stoic-canvas px-3 py-2 shadow-stoic-1 transition focus-within:border-stoic-primary focus-within:ring-4 focus-within:ring-stoic-primary/10"
      >
        {tags.map((value, index) => (
          <span
            key={`${value}-${index}`}
            className={`inline-flex min-h-8 items-center gap-1.5 rounded-stoic-pill border px-3 py-1 text-xs font-semibold ${TONE_CLASS[tone]}`}
          >
            <Tag className="h-3 w-3" aria-hidden="true" />
            <span>{value}</span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => removeTag(index)}
              className="-mr-1 inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-45"
              aria-label={`Xóa chủ đề ${value}`}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </span>
        ))}

        <input
          id={id}
          disabled={disabled || tags.length >= maxTags}
          value={draft}
          onChange={(event) => {
            const value = event.target.value;
            if (value.endsWith(",")) {
              setDraft(value.slice(0, -1));
              queueMicrotask(commitDraft);
              return;
            }
            setDraft(value);
            if (message) setMessage("");
          }}
          onBlur={commitDraft}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              commitDraft();
            } else if (event.key === "Backspace" && !draft && tags.length > 0) {
              removeTag(tags.length - 1);
            }
          }}
          placeholder={tags.length >= maxTags ? "Đã đủ chủ đề" : placeholder}
          className="min-h-8 min-w-40 flex-1 border-0 bg-transparent px-1 text-sm text-stoic-ink outline-none placeholder:text-stoic-ink-muted disabled:cursor-not-allowed"
          aria-describedby={`${hint ? hintId : ""} ${statusId}`.trim()}
        />
      </div>

      {tags.map((tag) => (
        <input key={tag} type="hidden" name={name} value={tag} />
      ))}

      {hint ? (
        <p id={hintId} className="mt-2 text-xs leading-relaxed text-stoic-ink-muted">
          {hint}
        </p>
      ) : null}
      <p id={statusId} className="mt-1 min-h-5 text-xs text-stoic-primary-deep" aria-live="polite">
        {message}
      </p>

      {tags.length > 0 ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => update([], "Đã xóa tất cả chủ đề.")}
          className="mt-1 text-xs font-semibold text-stoic-ink-muted underline-offset-4 hover:text-stoic-primary-deep hover:underline disabled:cursor-not-allowed disabled:opacity-45"
        >
          Xóa tất cả
        </button>
      ) : null}
    </div>
  );
}

function normalizeInitial(values: string[], maxTags: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    const value = cleanTag(raw);
    const key = normalizeForCompare(value);
    if (!value || seen.has(key)) continue;
    seen.add(key);
    result.push(value);
    if (result.length >= maxTags) break;
  }
  return result;
}

function cleanTag(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, 36);
}

function normalizeForCompare(value: string): string {
  return value.normalize("NFC").toLocaleLowerCase("vi-VN");
}
