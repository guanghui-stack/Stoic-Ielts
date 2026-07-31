"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Bookmark,
  Highlighter,
  StickyNote,
  Eraser,
  Send,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { Countdown } from "@/components/exam/countdown";
import { useExamController } from "@/components/exam/use-exam-controller";
import {
  optionLabel,
  violatesWordLimit,
  WORD_LIMIT_LABELS,
  type ReadingPart,
  type ReadingQuestionGroup,
  type ReadingQuestion,
} from "@/lib/exercise-content";

/*
 * Phòng thi Reading mô phỏng giao diện thi IELTS trên máy tính (CBT).
 * Hỗ trợ 8 dạng câu hỏi, trong đó các dạng MATCH_* dùng kéo-thả đáp án
 * (kèm cách "bấm chọn thẻ → bấm ô" cho màn hình cảm ứng).
 */

type AnswerValue = string | string[];

type FlatQuestion = {
  qid: string;
  partIdx: number;
  numbers: number[]; // MC_MULTI chiếm nhiều số câu
  label: string; // "7" hoặc "21-22"
};

type NoteItem = { id: number; excerpt: string; note: string };
type DragChip = { groupKey: string; value: string };

type HL = { add(r: Range): void; delete(r: Range): void; clear(): void };

function rangesIntersect(a: Range, b: Range): boolean {
  return (
    a.compareBoundaryPoints(Range.END_TO_START, b) < 0 &&
    a.compareBoundaryPoints(Range.START_TO_END, b) > 0
  );
}

/** Nội dung hiển thị của một thẻ đáp án. */
function chipText(type: string, options: string[], value: string): string {
  const idx = options.findIndex((_, i) => optionLabel(type as never, i) === value);
  const text = idx >= 0 ? options[idx] : value;
  if (type === "MATCH_HEADINGS" || type === "MATCH_ENDINGS") return text;
  if (text === value) return value; // đáp án là chữ cái trần (A, B, C…)
  return `${value}. ${text}`;
}

export function ReadingCbtExam({
  attemptId,
  title,
  deadlineIso,
  initialAnswers,
  parts,
}: {
  attemptId: string;
  title: string;
  deadlineIso: string;
  initialAnswers: string;
  parts: ReadingPart[];
}) {
  /* ===== Dữ liệu phẳng: đánh số câu liên tục xuyên part ===== */
  const flat = useMemo<FlatQuestion[]>(() => {
    const out: FlatQuestion[] = [];
    let no = 0;
    parts.forEach((p, partIdx) =>
      p.questionGroups.forEach((g) =>
        g.questions.forEach((q) => {
          const span = g.type === "MC_MULTI" ? (q.selectCount ?? 2) : 1;
          const numbers = Array.from({ length: span }, (_, i) => no + 1 + i);
          no += span;
          out.push({
            qid: q.id,
            partIdx,
            numbers,
            label:
              numbers.length > 1
                ? `${numbers[0]}-${numbers[numbers.length - 1]}`
                : String(numbers[0]),
          });
        })
      )
    );
    return out;
  }, [parts]);

  const flatByQid = useMemo(() => {
    const m = new Map<string, FlatQuestion>();
    flat.forEach((f) => m.set(f.qid, f));
    return m;
  }, [flat]);

  const partRange = useMemo(
    () =>
      parts.map((_, i) => {
        const nums = flat.filter((f) => f.partIdx === i).flatMap((f) => f.numbers);
        return {
          start: nums[0] ?? 0,
          end: nums[nums.length - 1] ?? 0,
          count: nums.length,
        };
      }),
    [parts, flat]
  );

  /* ===== Trạng thái bài làm ===== */
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>(() => {
    try {
      const parsed = JSON.parse(initialAnswers || "{}");
      const out: Record<string, AnswerValue> = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (k.startsWith("__")) continue;
        if (typeof v === "string") out[k] = v;
        else if (Array.isArray(v)) out[k] = v.map(String);
      }
      return out;
    } catch {
      return {};
    }
  });
  const [marked, setMarked] = useState<Set<string>>(() => {
    try {
      const parsed = JSON.parse(initialAnswers || "{}");
      return new Set(Array.isArray(parsed.__marked) ? parsed.__marked : []);
    } catch {
      return new Set();
    }
  });
  const [part, setPart] = useState(0);
  const [activeQid, setActiveQid] = useState<string | null>(flat[0]?.qid ?? null);
  const [split, setSplit] = useState(52);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [notesOpen, setNotesOpen] = useState(false);
  const [popup, setPopup] = useState<{ x: number; y: number; mode: "menu" | "note" } | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  /** Thẻ đang được chọn bằng cách bấm (fallback cho cảm ứng). */
  const [pickedChip, setPickedChip] = useState<DragChip | null>(null);
  const dragChipRef = useRef<DragChip | null>(null);

  const answersRef = useRef(answers);
  answersRef.current = answers;
  const markedRef = useRef(marked);
  markedRef.current = marked;

  const getAnswersJson = useCallback(
    () =>
      JSON.stringify({
        ...answersRef.current,
        __marked: [...markedRef.current],
      }),
    []
  );
  const { submit, isSubmitting, savedAt } = useExamController(attemptId, getAnswersJson);

  const hasAnswer = (v: AnswerValue | undefined) =>
    Array.isArray(v) ? v.length > 0 : Boolean(v && v.trim());

  const setAnswer = (qid: string, value: AnswerValue) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
    setActiveQid(qid);
  };

  const clearAnswer = (qid: string) => {
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[qid];
      return next;
    });
  };

  const toggleMark = (qid: string) => {
    setMarked((prev) => {
      const next = new Set(prev);
      if (next.has(qid)) next.delete(qid);
      else next.add(qid);
      return next;
    });
  };

  /* ===== Kéo-thả / bấm-đặt thẻ đáp án ===== */
  const placeChip = (qid: string, chip: DragChip, groupKey: string) => {
    if (chip.groupKey !== groupKey) return; // thẻ thuộc nhóm khác
    setAnswer(qid, chip.value);
    setPickedChip(null);
    dragChipRef.current = null;
  };

  /** Với nhóm không cho dùng lại: các đáp án đã đặt vào ô nào đó. */
  const usedValues = (groupKey: string, group: ReadingQuestionGroup) => {
    const used = new Set<string>();
    if (group.reuseOptions !== false && group.type !== "MATCH_HEADINGS" && group.type !== "MATCH_ENDINGS") {
      return used; // cho phép dùng lại → không khóa thẻ
    }
    // MATCH_HEADINGS/ENDINGS mặc định mỗi đáp án dùng 1 lần (trừ khi reuseOptions=true)
    if (group.reuseOptions === true) return used;
    for (const q of group.questions) {
      const v = answers[q.id];
      if (typeof v === "string" && v) used.add(v);
    }
    return used;
  };

  /* ===== Highlight / Note (CSS Custom Highlight API) ===== */
  const supportsHL =
    typeof window !== "undefined" &&
    typeof CSS !== "undefined" &&
    "highlights" in CSS;

  const hlRef = useRef<HL | null>(null);
  const noteHlRef = useRef<HL | null>(null);
  const hlRangesRef = useRef<Range[]>([]);
  const noteRangesRef = useRef<{ id: number; range: Range }[]>([]);
  const pendingRangeRef = useRef<Range | null>(null);
  const noteSeq = useRef(1);

  useEffect(() => {
    if (!supportsHL) return;
    const w = window as unknown as { Highlight: new () => HL };
    hlRef.current = new w.Highlight();
    noteHlRef.current = new w.Highlight();
    CSS.highlights.set("wb-hl", hlRef.current as never);
    CSS.highlights.set("wb-note", noteHlRef.current as never);
    return () => {
      CSS.highlights.delete("wb-hl");
      CSS.highlights.delete("wb-note");
    };
  }, [supportsHL]);

  const shellRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const passagePanelRef = useRef<HTMLDivElement>(null);
  const questionPanelRef = useRef<HTMLDivElement>(null);

  const onTextSelected = useCallback(() => {
    if (!supportsHL || isSubmitting) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      setPopup(null);
      return;
    }
    const range = sel.getRangeAt(0);
    if (!contentRef.current?.contains(range.commonAncestorContainer)) return;
    if (range.toString().trim().length === 0) return;

    const rect = range.getBoundingClientRect();
    const shell = shellRef.current?.getBoundingClientRect();
    if (!shell) return;
    pendingRangeRef.current = range.cloneRange();
    setNoteDraft("");
    setPopup({
      x: Math.max(8, rect.left + rect.width / 2 - shell.left - 90),
      y: Math.max(8, rect.top - shell.top - 46),
      mode: "menu",
    });
  }, [supportsHL, isSubmitting]);

  const doHighlight = () => {
    const r = pendingRangeRef.current;
    if (!r || !hlRef.current) return;
    hlRef.current.add(r);
    hlRangesRef.current.push(r);
    window.getSelection()?.removeAllRanges();
    setPopup(null);
  };

  const doNoteSave = () => {
    const r = pendingRangeRef.current;
    if (!r || !noteHlRef.current) return;
    const id = noteSeq.current++;
    noteHlRef.current.add(r);
    noteRangesRef.current.push({ id, range: r });
    setNotes((prev) => [
      ...prev,
      { id, excerpt: r.toString().slice(0, 90), note: noteDraft.trim() },
    ]);
    window.getSelection()?.removeAllRanges();
    setPopup(null);
    setNotesOpen(true);
  };

  const doErase = () => {
    const r = pendingRangeRef.current;
    if (!r) return;
    hlRangesRef.current = hlRangesRef.current.filter((x) => {
      if (rangesIntersect(x, r)) {
        hlRef.current?.delete(x);
        return false;
      }
      return true;
    });
    const removedIds: number[] = [];
    noteRangesRef.current = noteRangesRef.current.filter((x) => {
      if (rangesIntersect(x.range, r)) {
        noteHlRef.current?.delete(x.range);
        removedIds.push(x.id);
        return false;
      }
      return true;
    });
    if (removedIds.length) {
      setNotes((prev) => prev.filter((n) => !removedIds.includes(n.id)));
    }
    window.getSelection()?.removeAllRanges();
    setPopup(null);
  };

  const deleteNote = (id: number) => {
    const entry = noteRangesRef.current.find((x) => x.id === id);
    if (entry) noteHlRef.current?.delete(entry.range);
    noteRangesRef.current = noteRangesRef.current.filter((x) => x.id !== id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  /* ===== Điều hướng ===== */
  const goPart = (i: number) => {
    setPart(i);
    setPopup(null);
    requestAnimationFrame(() => {
      passagePanelRef.current?.scrollTo({ top: 0 });
      questionPanelRef.current?.scrollTo({ top: 0 });
    });
  };

  const jumpTo = (f: FlatQuestion) => {
    if (f.partIdx !== part) setPart(f.partIdx);
    setActiveQid(f.qid);
    setPopup(null);
    requestAnimationFrame(() => {
      document.getElementById(`q-box-${f.qid}`)?.scrollIntoView({ block: "center" });
    });
  };

  const step = (dir: 1 | -1) => {
    const idx = flat.findIndex((f) => f.qid === activeQid);
    const next = flat[Math.min(flat.length - 1, Math.max(0, (idx === -1 ? 0 : idx) + dir))];
    if (next) jumpTo(next);
  };

  const answeredIn = (i: number) =>
    flat
      .filter((f) => f.partIdx === i)
      .reduce((s, f) => s + (hasAnswer(answers[f.qid]) ? f.numbers.length : 0), 0);

  /* ===== Kéo giãn 2 panel ===== */
  const dragging = useRef(false);
  const onDividerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onDividerMove = (e: React.PointerEvent) => {
    if (!dragging.current || !contentRef.current) return;
    const rect = contentRef.current.getBoundingClientRect();
    setSplit(Math.min(72, Math.max(28, ((e.clientX - rect.left) / rect.width) * 100)));
  };
  const onDividerUp = () => {
    dragging.current = false;
  };

  /* ===== Các khối render dùng chung ===== */

  const NumberBox = ({ f, q }: { f: FlatQuestion; q: ReadingQuestion }) => (
    <span
      className={`flex h-7 min-w-7 shrink-0 items-center justify-center border px-1 text-sm font-bold ${
        activeQid === q.id ? "border-neutral-800" : "border-transparent"
      }`}
    >
      {f.label}
    </span>
  );

  const MarkButton = ({ q, label }: { q: ReadingQuestion; label: string }) => (
    <button
      type="button"
      onClick={() => toggleMark(q.id)}
      aria-pressed={marked.has(q.id)}
      title={marked.has(q.id) ? `Bỏ đánh dấu câu ${label}` : `Đánh dấu câu ${label} để xem lại`}
      className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center hover:bg-neutral-100"
    >
      <Bookmark
        className={`h-4.5 w-4.5 ${marked.has(q.id) ? "fill-red-600 text-red-600" : "text-neutral-400"}`}
        aria-hidden="true"
      />
    </button>
  );

  /** Ô thả đáp án (dạng MATCH_*). */
  const DropSlot = ({
    q,
    group,
    groupKey,
    className = "",
  }: {
    q: ReadingQuestion;
    group: ReadingQuestionGroup;
    groupKey: string;
    className?: string;
  }) => {
    const f = flatByQid.get(q.id)!;
    const value = answers[q.id];
    const filled = typeof value === "string" && value;
    return (
      <span
        role="button"
        tabIndex={0}
        aria-label={`Ô đáp án câu ${f.label}${filled ? `: ${value}` : " (trống)"}`}
        onDragOver={(e) => {
          if (dragChipRef.current?.groupKey === groupKey) e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (dragChipRef.current) placeChip(q.id, dragChipRef.current, groupKey);
        }}
        onClick={() => {
          if (pickedChip) placeChip(q.id, pickedChip, groupKey);
          else setActiveQid(q.id);
        }}
        className={`inline-flex min-h-8 min-w-24 max-w-full cursor-pointer items-center justify-center gap-1 border-2 border-dashed px-2 py-0.5 align-middle text-sm ${
          filled
            ? "border-neutral-500 bg-neutral-100 font-semibold"
            : pickedChip?.groupKey === groupKey
              ? "border-blue-500 bg-blue-50"
              : "border-neutral-400"
        } ${className}`}
      >
        {filled ? (
          <>
            <span className="truncate">{chipText(group.type, group.options ?? [], value)}</span>
            <button
              type="button"
              aria-label={`Xóa đáp án câu ${f.label}`}
              onClick={(e) => {
                e.stopPropagation();
                clearAnswer(q.id);
              }}
              className="ml-1 shrink-0 cursor-pointer text-neutral-500 hover:text-red-600"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </>
        ) : (
          <span className="font-bold text-neutral-600">{f.label}</span>
        )}
      </span>
    );
  };

  /** Kho thẻ đáp án của một nhóm MATCH_*. */
  const ChipBank = ({
    group,
    groupKey,
    title,
  }: {
    group: ReadingQuestionGroup;
    groupKey: string;
    title: string;
  }) => {
    const used = usedValues(groupKey, group);
    return (
      <div className="mt-4">
        <p className="mb-2 text-[15px] font-bold">{title}</p>
        <div className="flex flex-wrap gap-2">
          {(group.options ?? []).map((opt, i) => {
            const value = optionLabel(group.type, i);
            const isUsed = used.has(value);
            const isPicked =
              pickedChip?.groupKey === groupKey && pickedChip.value === value;
            const text =
              group.type === "MATCH_HEADINGS" || group.type === "MATCH_ENDINGS"
                ? opt
                : opt === value
                  ? value
                  : `${value}. ${opt}`;
            return (
              <button
                key={value}
                type="button"
                draggable={!isUsed}
                onDragStart={() => {
                  dragChipRef.current = { groupKey, value };
                }}
                onDragEnd={() => {
                  dragChipRef.current = null;
                }}
                onClick={() =>
                  setPickedChip(isPicked ? null : { groupKey, value })
                }
                disabled={isUsed}
                title={
                  isUsed
                    ? "Đáp án này đã được dùng"
                    : "Kéo thả vào ô trống, hoặc bấm chọn rồi bấm vào ô trống"
                }
                className={`max-w-full cursor-grab border px-3 py-1.5 text-left text-sm leading-snug shadow-sm active:cursor-grabbing ${
                  isUsed
                    ? "cursor-not-allowed border-neutral-200 bg-neutral-100 text-neutral-300"
                    : isPicked
                      ? "border-blue-600 bg-blue-50 ring-2 ring-blue-300"
                      : "border-neutral-400 bg-white hover:bg-neutral-50"
                }`}
              >
                {text}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  /* ===== Render một nhóm câu hỏi trong panel phải ===== */
  const renderGroup = (
    group: ReadingQuestionGroup,
    gi: number,
    partIdx: number
  ) => {
    const groupKey = `${partIdx}-${gi}`;
    const nums = group.questions.flatMap((q) => flatByQid.get(q.id)?.numbers ?? []);
    const heading = `Questions ${nums[0]}–${nums[nums.length - 1]}`;

    return (
      <div key={gi} className="mb-8">
        <p className="text-[15px] font-bold">{heading}</p>
        <p className="mb-1 mt-1 whitespace-pre-line text-[15px] leading-relaxed text-neutral-800">
          {group.instruction}
        </p>
        {group.type === "GAP" && group.wordLimit && (
          <p className="mb-3 text-[15px]">
            Write <strong>{WORD_LIMIT_LABELS[group.wordLimit]}</strong> from the
            passage for each answer.
          </p>
        )}
        {(group.type === "MATCH_INFO" || group.type === "MATCH_FEATURES") &&
          group.reuseOptions !== false && (
            <p className="mb-3 text-[15px] italic text-neutral-700">
              NB&nbsp; You may use any letter more than once.
            </p>
          )}

        {/* ==== theo dạng ==== */}
        {group.type === "MATCH_HEADINGS" && (
          <>
            <p className="text-[15px] text-neutral-700">
              Kéo heading thả vào ô tương ứng trong bài đọc (bên trái).
            </p>
            <ChipBank group={group} groupKey={groupKey} title="List of Headings" />
          </>
        )}

        {(group.type === "MATCH_INFO" || group.type === "MATCH_FEATURES") && (
          <>
            <div className="mt-3 space-y-3">
              {group.questions.map((q) => {
                const f = flatByQid.get(q.id)!;
                return (
                  <div key={q.id} id={`q-box-${q.id}`} className="flex items-start gap-3">
                    <DropSlot q={q} group={group} groupKey={groupKey} />
                    <p className="flex-1 pt-1 text-[15px] leading-relaxed">{q.prompt}</p>
                    <MarkButton q={q} label={f.label} />
                  </div>
                );
              })}
            </div>
            <ChipBank group={group} groupKey={groupKey} title="List of options" />
          </>
        )}

        {group.type === "MATCH_ENDINGS" && (
          <>
            <div className="mt-3 space-y-3">
              {group.questions.map((q) => {
                const f = flatByQid.get(q.id)!;
                return (
                  <div key={q.id} id={`q-box-${q.id}`} className="flex items-start gap-3">
                    <p className="flex-1 pt-1 text-[15px] leading-relaxed">{q.prompt}</p>
                    <DropSlot q={q} group={group} groupKey={groupKey} />
                    <MarkButton q={q} label={f.label} />
                  </div>
                );
              })}
            </div>
            <ChipBank group={group} groupKey={groupKey} title="List of options" />
          </>
        )}

        {(group.type === "TFNG" || group.type === "MC") &&
          group.questions.map((q) => {
            const f = flatByQid.get(q.id)!;
            return (
              <div key={q.id} id={`q-box-${q.id}`} className="mb-6">
                <div className="flex items-start gap-2">
                  <NumberBox f={f} q={q} />
                  <p className="flex-1 pt-0.5 text-[15px] leading-relaxed">{q.prompt}</p>
                  <MarkButton q={q} label={f.label} />
                </div>
                <div className="ml-9 mt-2 space-y-1.5">
                  {(q.options ?? []).map((opt) => {
                    const value = group.type === "MC" ? opt.trim().charAt(0) : opt;
                    return (
                      <label
                        key={opt}
                        className="flex cursor-pointer items-start gap-2 text-[15px] leading-relaxed hover:bg-neutral-50"
                      >
                        <input
                          type="radio"
                          name={q.id}
                          checked={answers[q.id] === value}
                          onChange={() => setAnswer(q.id, value)}
                          className="mt-1 h-4 w-4 shrink-0 accent-black"
                        />
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}

        {group.type === "MC_MULTI" &&
          group.questions.map((q) => {
            const f = flatByQid.get(q.id)!;
            const selected = Array.isArray(answers[q.id])
              ? (answers[q.id] as string[])
              : [];
            const limit = q.selectCount ?? 2;
            return (
              <div key={q.id} id={`q-box-${q.id}`} className="mb-6">
                <div className="flex items-start gap-2">
                  <NumberBox f={f} q={q} />
                  <p className="flex-1 pt-0.5 text-[15px] leading-relaxed">{q.prompt}</p>
                  <MarkButton q={q} label={f.label} />
                </div>
                <p className="ml-9 mt-1 text-sm text-neutral-600">
                  Chọn đúng {limit} đáp án ({selected.length}/{limit})
                </p>
                <div className="ml-9 mt-2 space-y-1.5">
                  {(q.options ?? []).map((opt) => {
                    const value = opt.trim().charAt(0);
                    const checked = selected.includes(value);
                    const full = selected.length >= limit && !checked;
                    return (
                      <label
                        key={opt}
                        className={`flex items-start gap-2 text-[15px] leading-relaxed ${
                          full ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-neutral-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={full}
                          onChange={() =>
                            setAnswer(
                              q.id,
                              checked
                                ? selected.filter((v) => v !== value)
                                : [...selected, value]
                            )
                          }
                          className="mt-1 h-4 w-4 shrink-0 accent-black"
                        />
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}

        {group.type === "GAP" &&
          (group.boxTitle ? (
            <div className="mt-3 border border-neutral-500 p-4">
              <p className="mb-3 text-center text-[15px] font-bold">{group.boxTitle}</p>
              <ul className="list-disc space-y-3 pl-5">
                {group.questions.map((q) => (
                  <li key={q.id} id={`q-box-${q.id}`} className="text-[15px] leading-[2.1]">
                    <GapPrompt q={q} group={group} />
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="mt-3 space-y-4">
              {group.questions.map((q) => {
                const f = flatByQid.get(q.id)!;
                return (
                  <div key={q.id} id={`q-box-${q.id}`} className="flex items-start gap-2">
                    <NumberBox f={f} q={q} />
                    <p className="flex-1 pt-0.5 text-[15px] leading-[2.1]">
                      <GapPrompt q={q} group={group} />
                    </p>
                    <MarkButton q={q} label={f.label} />
                  </div>
                );
              })}
            </div>
          ))}
      </div>
    );
  };

  /** Câu GAP với ô điền nằm ngay trong dòng văn bản. */
  const GapPrompt = ({
    q,
    group,
  }: {
    q: ReadingQuestion;
    group: ReadingQuestionGroup;
  }) => {
    const f = flatByQid.get(q.id)!;
    const value = typeof answers[q.id] === "string" ? (answers[q.id] as string) : "";
    const bad = group.wordLimit ? violatesWordLimit(value, group.wordLimit) : false;
    const partsText = (q.prompt ?? "").split(/_{3,}/);
    const input = (
      <input
        type="text"
        value={value}
        onChange={(e) => setAnswer(q.id, e.target.value)}
        onFocus={() => setActiveQid(q.id)}
        aria-label={`Câu ${f.label}`}
        placeholder={f.label}
        title={bad ? "Vượt giới hạn từ cho phép" : undefined}
        className={`mx-1 inline-block w-36 border px-2 py-0.5 text-center align-baseline text-[15px] placeholder:font-bold placeholder:text-neutral-500 focus:outline-none ${
          bad ? "border-red-600 bg-red-50" : "border-neutral-500 focus:border-black"
        }`}
      />
    );
    return (
      <>
        {partsText.map((seg, i) => (
          <span key={i}>
            {seg}
            {i < partsText.length - 1 && input}
          </span>
        ))}
        {partsText.length === 1 && input}
        {bad && (
          <span className="ml-2 text-xs font-bold text-red-600">
            Vượt giới hạn từ!
          </span>
        )}
      </>
    );
  };

  return (
    <div
      ref={shellRef}
      className="font-exam relative flex h-dvh flex-col bg-white text-[#1a1a1a]"
    >
      {/* ===== Thanh trên ===== */}
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-300 bg-white px-4 py-2">
        <p className="min-w-0 truncate text-sm font-bold">{title}</p>
        <div className="flex shrink-0 items-center gap-2">
          {savedAt && (
            <span className="hidden text-xs text-neutral-500 md:inline">
              Đã lưu {savedAt.toLocaleTimeString("vi-VN")}
            </span>
          )}
          <button
            type="button"
            onClick={() => setNotesOpen((v) => !v)}
            className="flex h-9 cursor-pointer items-center gap-1.5 border border-neutral-300 px-3 text-xs font-bold hover:bg-neutral-100"
            aria-expanded={notesOpen}
          >
            <StickyNote className="h-4 w-4" aria-hidden="true" />
            Ghi chú {notes.length > 0 && `(${notes.length})`}
          </button>
          <Countdown deadlineIso={deadlineIso} onExpire={() => submit(true)} />
          <button
            type="button"
            onClick={() => submit(false)}
            disabled={isSubmitting}
            className="flex h-9 cursor-pointer items-center gap-2 bg-black px-4 text-xs font-bold uppercase tracking-wide text-white hover:bg-neutral-800 disabled:opacity-60"
          >
            <Send className="h-3.5 w-3.5" aria-hidden="true" />
            {isSubmitting ? "Đang nộp…" : "Nộp bài"}
          </button>
        </div>
      </header>

      {/* ===== Thanh hướng dẫn part ===== */}
      <div className="shrink-0 border-b border-neutral-300 bg-[#f2f2f2] px-4 py-2">
        <p className="text-sm font-bold">Part {part + 1}</p>
        <p className="text-sm text-neutral-700">
          Read the text and answer questions {partRange[part]?.start}–{partRange[part]?.end}.
        </p>
      </div>

      {/* ===== Nội dung 2 panel ===== */}
      <div ref={contentRef} onMouseUp={onTextSelected} className="relative flex min-h-0 flex-1">
        {/* Panel bài đọc */}
        <div
          ref={passagePanelRef}
          className="min-w-0 overflow-y-auto px-6 py-5"
          style={{ width: `${split}%` }}
          aria-label="Bài đọc"
        >
          {parts.map((p, i) => {
            // Slot heading gắn vào đoạn văn nào
            const headingSlots = new Map<string, { q: ReadingQuestion; group: ReadingQuestionGroup; groupKey: string }>();
            p.questionGroups.forEach((g, gi) => {
              if (g.type === "MATCH_HEADINGS") {
                g.questions.forEach((q) => {
                  if (q.paragraph) {
                    headingSlots.set(q.paragraph.toUpperCase(), {
                      q,
                      group: g,
                      groupKey: `${i}-${gi}`,
                    });
                  }
                });
              }
            });
            const showLabels =
              p.passage.labelParagraphs || headingSlots.size > 0;

            return (
              <div key={i} hidden={i !== part}>
                <h2 className="mb-4 text-center text-xl font-bold">{p.passage.title}</h2>
                {p.passage.paragraphs.map((para, pi) => {
                  const letter = String.fromCharCode(65 + pi);
                  const slot = headingSlots.get(letter);
                  return (
                    <div key={pi}>
                      {slot && (
                        <div className="mb-3 mt-1" id={`q-box-${slot.q.id}`}>
                          <DropSlot
                            q={slot.q}
                            group={slot.group}
                            groupKey={slot.groupKey}
                            className="flex w-full"
                          />
                        </div>
                      )}
                      <p className="mb-4 text-[15px] leading-[1.7]">
                        {showLabels && (
                          <strong className="mr-1.5">{letter}.</strong>
                        )}
                        {para}
                      </p>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Thanh kéo giãn */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Kéo để thay đổi độ rộng hai khung"
          onPointerDown={onDividerDown}
          onPointerMove={onDividerMove}
          onPointerUp={onDividerUp}
          className="relative z-10 flex w-2 shrink-0 cursor-col-resize items-center justify-center bg-neutral-300 hover:bg-neutral-400"
        >
          <span className="pointer-events-none absolute flex h-8 w-6 items-center justify-center border border-neutral-400 bg-white text-xs text-neutral-600 shadow">
            ↔
          </span>
        </div>

        {/* Panel câu hỏi */}
        <div
          ref={questionPanelRef}
          className="min-w-0 flex-1 overflow-y-auto px-6 py-5"
          aria-label="Câu hỏi"
        >
          {parts.map((p, i) => {
            if (i !== part) {
              // vẫn render (ẩn) để giữ highlight khi chuyển part
              return (
                <div key={i} hidden>
                  {p.questionGroups.map((g, gi) => (
                    <div key={gi}>
                      {g.questions.map((q) => (
                        <span key={q.id}>{q.prompt}</span>
                      ))}
                    </div>
                  ))}
                </div>
              );
            }
            return (
              <div key={i}>
                {p.questionGroups.map((g, gi) => renderGroup(g, gi, i))}
              </div>
            );
          })}
        </div>

        {/* Popup Highlight / Note */}
        {popup && (
          <div
            style={{ left: popup.x, top: popup.y }}
            onMouseDown={(e) => e.preventDefault()}
            className="absolute z-40 border border-neutral-400 bg-white shadow-lg"
          >
            {popup.mode === "menu" ? (
              <div className="flex divide-x divide-neutral-300">
                <button
                  type="button"
                  onClick={() => setPopup({ ...popup, mode: "note" })}
                  className="flex cursor-pointer items-center gap-1.5 px-3 py-2 text-xs font-bold hover:bg-neutral-100"
                >
                  <StickyNote className="h-3.5 w-3.5" aria-hidden="true" />
                  Note
                </button>
                <button
                  type="button"
                  onClick={doHighlight}
                  className="flex cursor-pointer items-center gap-1.5 px-3 py-2 text-xs font-bold hover:bg-neutral-100"
                >
                  <Highlighter className="h-3.5 w-3.5" aria-hidden="true" />
                  Highlight
                </button>
                <button
                  type="button"
                  onClick={doErase}
                  className="flex cursor-pointer items-center gap-1.5 px-3 py-2 text-xs font-bold hover:bg-neutral-100"
                >
                  <Eraser className="h-3.5 w-3.5" aria-hidden="true" />
                  Xóa
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2">
                <input
                  autoFocus
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && doNoteSave()}
                  placeholder="Nhập ghi chú…"
                  className="w-52 border border-neutral-400 px-2 py-1.5 text-sm focus:border-black focus:outline-none"
                />
                <button
                  type="button"
                  onClick={doNoteSave}
                  className="cursor-pointer bg-black px-3 py-1.5 text-xs font-bold text-white hover:bg-neutral-800"
                >
                  Lưu
                </button>
              </div>
            )}
          </div>
        )}

        {/* Panel ghi chú */}
        {notesOpen && (
          <aside className="absolute bottom-0 right-0 top-0 z-30 w-72 overflow-y-auto border-l border-neutral-300 bg-white p-3 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold">Ghi chú của bạn</p>
              <button
                type="button"
                onClick={() => setNotesOpen(false)}
                aria-label="Đóng ghi chú"
                className="flex h-7 w-7 cursor-pointer items-center justify-center hover:bg-neutral-100"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            {notes.length === 0 ? (
              <p className="text-xs leading-relaxed text-neutral-500">
                Bôi chọn đoạn văn bản trong bài đọc hoặc câu hỏi rồi chọn
                &quot;Note&quot; để tạo ghi chú, &quot;Highlight&quot; để tô màu.
              </p>
            ) : (
              <ul className="space-y-3">
                {notes.map((nt) => (
                  <li key={nt.id} className="border border-neutral-200 p-2">
                    <p className="text-xs italic text-neutral-500">
                      “{nt.excerpt}
                      {nt.excerpt.length >= 90 ? "…" : ""}”
                    </p>
                    {nt.note && <p className="mt-1 text-sm leading-snug">{nt.note}</p>}
                    <button
                      type="button"
                      onClick={() => deleteNote(nt.id)}
                      className="mt-1.5 cursor-pointer text-xs text-red-600 hover:underline"
                    >
                      Xóa ghi chú
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        )}
      </div>

      {/* ===== Thanh điều hướng part + số câu ===== */}
      <footer className="flex shrink-0 items-stretch border-t border-neutral-300 bg-white">
        <div className="flex min-w-0 flex-1 items-stretch overflow-x-auto">
          {parts.map((_, i) =>
            i === part ? (
              <div key={i} className="flex shrink-0 items-center gap-0.5 bg-neutral-100 px-3 py-1.5">
                <span className="mr-2 whitespace-nowrap text-sm font-bold">Part {i + 1}</span>
                {flat
                  .filter((f) => f.partIdx === i)
                  .flatMap((f) =>
                    f.numbers.map((n) => {
                      const isAnswered = hasAnswer(answers[f.qid]);
                      const isActive = activeQid === f.qid;
                      const isMarked = marked.has(f.qid);
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => jumpTo(f)}
                          aria-label={`Câu ${n}${isAnswered ? " (đã trả lời)" : ""}${isMarked ? " (đã đánh dấu)" : ""}`}
                          className={`relative h-8 min-w-8 shrink-0 cursor-pointer px-1 text-sm hover:bg-neutral-200 ${
                            isActive ? "border border-neutral-800 font-bold" : ""
                          } ${isAnswered ? "font-bold underline" : "text-neutral-700"}`}
                        >
                          {isMarked && (
                            <span
                              aria-hidden="true"
                              className="absolute -top-0.5 right-0.5 h-2 w-2 bg-red-600"
                              style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 65%, 0 100%)" }}
                            />
                          )}
                          {n}
                        </button>
                      );
                    })
                  )}
              </div>
            ) : (
              <button
                key={i}
                type="button"
                onClick={() => goPart(i)}
                className="flex shrink-0 cursor-pointer items-center gap-2 border-l border-neutral-200 px-4 py-1.5 hover:bg-neutral-50"
              >
                <span className="text-sm font-bold">Part {i + 1}</span>
                <span className="whitespace-nowrap text-sm text-neutral-500">
                  {answeredIn(i)} of {partRange[i].count}
                </span>
              </button>
            )
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1 border-l border-neutral-200 px-2">
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Câu trước"
            className="flex h-9 w-10 cursor-pointer items-center justify-center border border-neutral-400 bg-neutral-100 hover:bg-neutral-200"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Câu tiếp theo"
            className="flex h-9 w-10 cursor-pointer items-center justify-center bg-black text-white hover:bg-neutral-800"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </footer>

      {/* Màn che khi đang nộp */}
      {isSubmitting && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="border border-neutral-300 bg-white px-10 py-8 text-center shadow-xl">
            <p className="text-lg font-bold">Đang nộp bài…</p>
            <p className="mt-1 text-sm text-neutral-600">Vui lòng không đóng trang.</p>
          </div>
        </div>
      )}
    </div>
  );
}
