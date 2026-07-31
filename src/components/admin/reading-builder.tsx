"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown, Code2 } from "lucide-react";
import {
  optionLabel,
  WORD_LIMIT_LABELS,
  type QuestionType,
  type WordLimit,
} from "@/lib/exercise-content";

/*
 * Trình tạo đề Reading cho quản trị viên:
 * chọn dạng bài từ trình đơn thả xuống → nhập nội dung + đáp án theo form,
 * hệ thống tự đánh số câu và tự sinh JSON (không cần biết kỹ thuật).
 */

const TYPE_OPTIONS: { value: QuestionType; label: string; hint: string }[] = [
  { value: "TFNG", label: "True / False / Not Given", hint: "Mỗi câu chọn 1 trong 3 đáp án" },
  { value: "MC", label: "Multiple Choice (1 đáp án)", hint: "Trắc nghiệm A–D, 1 đáp án đúng" },
  { value: "MC_MULTI", label: "Multiple Choice (nhiều đáp án)", hint: "Chọn 2+ đáp án, chiếm nhiều số câu" },
  { value: "GAP", label: "Gap Filling (điền từ)", hint: "Ô điền trong câu, quy định giới hạn từ" },
  { value: "MATCH_HEADINGS", label: "Matching Headings", hint: "Kéo heading thả vào ô trong bài đọc" },
  { value: "MATCH_INFO", label: "Matching Information", hint: "Kéo đáp án vào ô — dùng lại được" },
  { value: "MATCH_FEATURES", label: "Matching Features", hint: "Nối với danh sách A–F — dùng lại được" },
  { value: "MATCH_ENDINGS", label: "Matching Sentence Endings", hint: "Chọn phần kết thúc câu từ danh sách" },
];

type BQuestion = {
  prompt: string;
  answer: string; // TFNG/MC/GAP/MATCH_*: đáp án đơn
  answers: string[]; // MC_MULTI
  optionsText: string; // MC/MC_MULTI: mỗi dòng 1 lựa chọn (không cần tiền tố)
  altText: string; // GAP: biến thể, phân cách dấu phẩy
  paragraph: string; // MATCH_HEADINGS
  selectCount: number; // MC_MULTI
};

type BGroup = {
  type: QuestionType;
  instruction: string;
  optionsText: string; // MATCH_*: kho đáp án, mỗi dòng 1 mục
  reuse: boolean;
  wordLimit: WordLimit;
  boxTitle: string;
  questions: BQuestion[];
};

type BPart = {
  title: string;
  paragraphsText: string; // các đoạn cách nhau dòng trống
  groups: BGroup[];
};

const emptyQuestion = (): BQuestion => ({
  prompt: "",
  answer: "",
  answers: [],
  optionsText: "",
  altText: "",
  paragraph: "B",
  selectCount: 2,
});

const emptyGroup = (type: QuestionType): BGroup => ({
  type,
  instruction: DEFAULT_INSTRUCTIONS[type],
  optionsText: "",
  reuse: type === "MATCH_INFO" || type === "MATCH_FEATURES",
  wordLimit: "TWO_WORDS",
  boxTitle: "",
  questions: [emptyQuestion()],
});

const DEFAULT_INSTRUCTIONS: Record<QuestionType, string> = {
  TFNG: "Do the following statements agree with the information given in the passage? Choose TRUE if the statement agrees with the information, FALSE if the statement contradicts the information, or NOT GIVEN if there is no information on this.",
  MC: "Choose the correct letter, A, B, C or D.",
  MC_MULTI: "Choose TWO correct answers.",
  GAP: "Complete the sentences below.",
  MATCH_HEADINGS: "The passage has several paragraphs. Choose the correct heading for each paragraph from the list of headings below.",
  MATCH_INFO: "Which paragraph contains the following information? Choose the correct letter.",
  MATCH_FEATURES: "Look at the following statements and the list below. Match each statement with the correct letter.",
  MATCH_ENDINGS: "Complete each sentence with the correct ending below.",
};

const PARAGRAPH_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

const splitLines = (s: string) =>
  s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

const splitParagraphs = (s: string) =>
  s.split(/\r?\n\s*\r?\n/).map((p) => p.replace(/\s*\r?\n\s*/g, " ").trim()).filter(Boolean);

/** Sinh JSON nội dung đề từ trạng thái builder. */
function buildContent(bparts: BPart[]): unknown {
  let qNo = 0;
  return {
    parts: bparts.map((bp) => {
      const needLabels = bp.groups.some(
        (g) => g.type === "MATCH_HEADINGS" || g.type === "MATCH_INFO"
      );
      return {
        passage: {
          title: bp.title.trim(),
          paragraphs: splitParagraphs(bp.paragraphsText),
          ...(needLabels ? { labelParagraphs: true } : {}),
        },
        questionGroups: bp.groups.map((g) => {
          const isMatch = g.type.startsWith("MATCH_");
          const group: Record<string, unknown> = {
            type: g.type,
            instruction: g.instruction.trim(),
          };
          if (isMatch) {
            group.options = splitLines(g.optionsText);
            if (g.type === "MATCH_INFO" || g.type === "MATCH_FEATURES") {
              group.reuseOptions = g.reuse;
            }
          }
          if (g.type === "GAP") {
            group.wordLimit = g.wordLimit;
            if (g.boxTitle.trim()) group.boxTitle = g.boxTitle.trim();
          }
          group.questions = g.questions.map((q) => {
            const start = qNo + 1;
            qNo += g.type === "MC_MULTI" ? Math.max(2, q.selectCount) : 1;
            const base: Record<string, unknown> = { id: `q${start}` };
            if (g.type === "MATCH_HEADINGS") {
              base.paragraph = q.paragraph;
              base.answer = q.answer;
            } else if (g.type === "MC_MULTI") {
              base.prompt = q.prompt.trim();
              base.options = splitLines(q.optionsText).map(
                (o, i) => `${String.fromCharCode(65 + i)}. ${o.replace(/^[A-Z][.)]\s*/, "")}`
              );
              base.selectCount = Math.max(2, q.selectCount);
              base.answer = q.answers;
            } else if (g.type === "MC") {
              base.prompt = q.prompt.trim();
              base.options = splitLines(q.optionsText).map(
                (o, i) => `${String.fromCharCode(65 + i)}. ${o.replace(/^[A-Z][.)]\s*/, "")}`
              );
              base.answer = q.answer;
            } else if (g.type === "TFNG") {
              base.prompt = q.prompt.trim();
              base.options = ["TRUE", "FALSE", "NOT GIVEN"];
              base.answer = q.answer || "TRUE";
            } else if (g.type === "GAP") {
              base.prompt = q.prompt.trim();
              base.answer = q.answer.trim();
              const alts = q.altText.split(",").map((s) => s.trim()).filter(Boolean);
              if (alts.length) base.altAnswers = alts;
            } else {
              base.prompt = q.prompt.trim();
              base.answer = q.answer;
            }
            return base;
          });
          // id phải cấp theo thứ tự đầu-cuối: sửa lại vì MC_MULTI cộng span trước
          return group;
        }),
      };
    }),
  };
}

/* Ô nhập chuẩn */
const inp =
  "w-full border border-line-strong bg-paper px-3 py-2 font-ui text-sm text-ink placeholder:text-muted focus:border-navy focus:outline-none";
const lbl = "block font-ui text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-ink-soft";

export function ReadingBuilder({
  name,
  defaultJson,
}: {
  name: string; // tên hidden input gửi lên server action
  defaultJson?: string;
}) {
  // Sửa đề cũ: không dựng ngược được form từ mọi JSON nên mở thẳng chế độ nâng
  // cao. Tính ngay khi khởi tạo state (không cần effect + setState).
  const editingExisting = Boolean(
    defaultJson && defaultJson.trim() && defaultJson.trim() !== "{}"
  );
  const [advanced, setAdvanced] = useState(editingExisting);
  const [rawJson, setRawJson] = useState(editingExisting ? defaultJson! : "");
  const [bparts, setBparts] = useState<BPart[]>([
    { title: "", paragraphsText: "", groups: [] },
  ]);

  const json = useMemo(() => {
    if (advanced) return rawJson;
    try {
      return JSON.stringify(buildContent(bparts));
    } catch {
      return "{}";
    }
  }, [advanced, rawJson, bparts]);

  /* ==== thao tác state ==== */
  const setPart = (pi: number, patch: Partial<BPart>) =>
    setBparts((prev) => prev.map((p, i) => (i === pi ? { ...p, ...patch } : p)));
  const setGroup = (pi: number, gi: number, patch: Partial<BGroup>) =>
    setBparts((prev) =>
      prev.map((p, i) =>
        i === pi
          ? { ...p, groups: p.groups.map((g, j) => (j === gi ? { ...g, ...patch } : g)) }
          : p
      )
    );
  const setQuestion = (pi: number, gi: number, qi: number, patch: Partial<BQuestion>) =>
    setBparts((prev) =>
      prev.map((p, i) =>
        i === pi
          ? {
              ...p,
              groups: p.groups.map((g, j) =>
                j === gi
                  ? {
                      ...g,
                      questions: g.questions.map((q, k) =>
                        k === qi ? { ...q, ...patch } : q
                      ),
                    }
                  : g
              ),
            }
          : p
      )
    );

  /* Đánh số câu hiển thị trong builder */
  const numbering = useMemo(() => {
    const map = new Map<string, string>();
    let n = 0;
    bparts.forEach((p, pi) =>
      p.groups.forEach((g, gi) =>
        g.questions.forEach((q, qi) => {
          const span = g.type === "MC_MULTI" ? Math.max(2, q.selectCount) : 1;
          const start = n + 1;
          n += span;
          map.set(`${pi}-${gi}-${qi}`, span > 1 ? `${start}-${n}` : String(start));
        })
      )
    );
    return map;
  }, [bparts]);

  return (
    <div className="space-y-6">
      <input type="hidden" name={name} value={json} />

      <div className="flex items-center justify-between gap-3">
        <p className="font-ui text-sm text-ink-soft">
          {advanced
            ? "Chế độ nâng cao: sửa trực tiếp JSON của đề."
            : "Soạn đề bằng form — chọn dạng bài, dán nội dung và đáp án, hệ thống tự đánh số câu."}
        </p>
        <button
          type="button"
          onClick={() => {
            if (!advanced) setRawJson(json);
            setAdvanced((v) => !v);
          }}
          className="flex shrink-0 cursor-pointer items-center gap-1.5 border border-line px-3 py-1.5 font-ui text-xs font-semibold text-ink-soft hover:border-navy hover:text-navy"
        >
          <Code2 className="h-3.5 w-3.5" aria-hidden="true" />
          {advanced ? "Về chế độ form" : "Chế độ nâng cao (JSON)"}
        </button>
      </div>

      {advanced ? (
        <textarea
          value={rawJson}
          onChange={(e) => setRawJson(e.target.value)}
          rows={22}
          className={`${inp} resize-y font-mono text-[0.8rem] leading-relaxed`}
        />
      ) : (
        <>
          {bparts.map((bp, pi) => (
            <fieldset key={pi} className="border border-line-strong p-5">
              <legend className="px-2 font-ui text-sm font-bold uppercase tracking-wide text-navy">
                Part {pi + 1}
                {bparts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setBparts((prev) => prev.filter((_, i) => i !== pi))}
                    className="ml-3 cursor-pointer text-xs font-semibold text-danger hover:underline"
                  >
                    Xóa part
                  </button>
                )}
              </legend>

              <div className="space-y-4">
                <div>
                  <label className={lbl}>Tiêu đề bài đọc</label>
                  <input
                    value={bp.title}
                    onChange={(e) => setPart(pi, { title: e.target.value })}
                    placeholder="The Evolution of Film Making"
                    className={`${inp} mt-1`}
                  />
                </div>
                <div>
                  <label className={lbl}>
                    Bài đọc (các đoạn cách nhau MỘT DÒNG TRỐNG — đoạn 1 = A, đoạn 2 = B…)
                  </label>
                  <textarea
                    value={bp.paragraphsText}
                    onChange={(e) => setPart(pi, { paragraphsText: e.target.value })}
                    rows={8}
                    placeholder={"Đoạn văn thứ nhất…\n\nĐoạn văn thứ hai…"}
                    className={`${inp} mt-1 resize-y leading-relaxed`}
                  />
                  <p className="mt-1 font-ui text-xs text-muted">
                    {splitParagraphs(bp.paragraphsText).length} đoạn
                    {splitParagraphs(bp.paragraphsText).length > 0 &&
                      ` (A–${PARAGRAPH_LETTERS[splitParagraphs(bp.paragraphsText).length - 1] ?? "?"})`}
                  </p>
                </div>

                {/* ===== các nhóm câu hỏi ===== */}
                {bp.groups.map((g, gi) => {
                  const typeInfo = TYPE_OPTIONS.find((t) => t.value === g.type)!;
                  const isMatch = g.type.startsWith("MATCH_");
                  const bankLabels = splitLines(g.optionsText).map((_, i) =>
                    optionLabel(g.type, i)
                  );
                  return (
                    <div key={gi} className="border border-line bg-cream p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-ui text-sm font-bold text-navy-deep">
                          Nhóm {gi + 1} · {typeInfo.label}
                        </p>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={gi === 0}
                            onClick={() => {
                              const gs = [...bp.groups];
                              [gs[gi - 1], gs[gi]] = [gs[gi], gs[gi - 1]];
                              setPart(pi, { groups: gs });
                            }}
                            aria-label="Chuyển nhóm lên"
                            className="flex h-7 w-7 cursor-pointer items-center justify-center border border-line text-ink-soft hover:border-navy disabled:opacity-30"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={gi === bp.groups.length - 1}
                            onClick={() => {
                              const gs = [...bp.groups];
                              [gs[gi], gs[gi + 1]] = [gs[gi + 1], gs[gi]];
                              setPart(pi, { groups: gs });
                            }}
                            aria-label="Chuyển nhóm xuống"
                            className="flex h-7 w-7 cursor-pointer items-center justify-center border border-line text-ink-soft hover:border-navy disabled:opacity-30"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setPart(pi, { groups: bp.groups.filter((_, j) => j !== gi) })
                            }
                            aria-label="Xóa nhóm"
                            className="flex h-7 w-7 cursor-pointer items-center justify-center border border-line text-ink-soft hover:border-danger hover:text-danger"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 space-y-3">
                        <div>
                          <label className={lbl}>Hướng dẫn (tiếng Anh, hiện cho học viên)</label>
                          <textarea
                            value={g.instruction}
                            onChange={(e) => setGroup(pi, gi, { instruction: e.target.value })}
                            rows={2}
                            className={`${inp} mt-1 resize-y`}
                          />
                        </div>

                        {g.type === "GAP" && (
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <label className={lbl}>Giới hạn từ</label>
                              <select
                                value={g.wordLimit}
                                onChange={(e) =>
                                  setGroup(pi, gi, { wordLimit: e.target.value as WordLimit })
                                }
                                className={`${inp} mt-1`}
                              >
                                {Object.entries(WORD_LIMIT_LABELS).map(([v, label]) => (
                                  <option key={v} value={v}>
                                    {label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className={lbl}>Tiêu đề khung tóm tắt (bỏ trống nếu không dùng khung)</label>
                              <input
                                value={g.boxTitle}
                                onChange={(e) => setGroup(pi, gi, { boxTitle: e.target.value })}
                                placeholder="Scientists play tricks"
                                className={`${inp} mt-1`}
                              />
                            </div>
                          </div>
                        )}

                        {isMatch && (
                          <div>
                            <label className={lbl}>
                              {g.type === "MATCH_HEADINGS"
                                ? "Danh sách headings (mỗi dòng 1 heading — tự đánh i, ii, iii…)"
                                : g.type === "MATCH_ENDINGS"
                                  ? "Danh sách endings (mỗi dòng 1 ending — tự đánh A, B, C…)"
                                  : "Danh sách đáp án (mỗi dòng 1 mục — tự đánh A, B, C…)"}
                            </label>
                            <textarea
                              value={g.optionsText}
                              onChange={(e) => setGroup(pi, gi, { optionsText: e.target.value })}
                              rows={4}
                              placeholder={"Mục thứ nhất\nMục thứ hai\nMục thứ ba"}
                              className={`${inp} mt-1 resize-y`}
                            />
                            {(g.type === "MATCH_INFO" || g.type === "MATCH_FEATURES") && (
                              <label className="mt-2 flex cursor-pointer items-center gap-2 font-ui text-xs text-ink">
                                <input
                                  type="checkbox"
                                  checked={g.reuse}
                                  onChange={(e) => setGroup(pi, gi, { reuse: e.target.checked })}
                                  className="h-3.5 w-3.5 accent-[#1e3a5c]"
                                />
                                Cho phép dùng một đáp án nhiều lần (NB: You may use any letter more than once)
                              </label>
                            )}
                          </div>
                        )}

                        {/* ===== câu hỏi trong nhóm ===== */}
                        {g.questions.map((q, qi) => {
                          const no = numbering.get(`${pi}-${gi}-${qi}`) ?? "?";
                          return (
                            <div key={qi} className="border border-line bg-paper p-3">
                              <div className="flex items-center justify-between">
                                <p className="font-ui text-xs font-bold text-gold">Câu {no}</p>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setGroup(pi, gi, {
                                      questions: g.questions.filter((_, k) => k !== qi),
                                    })
                                  }
                                  aria-label="Xóa câu"
                                  className="flex h-6 w-6 cursor-pointer items-center justify-center text-ink-soft hover:text-danger"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              <div className="mt-2 space-y-2">
                                {g.type === "MATCH_HEADINGS" ? (
                                  <div className="grid gap-3 sm:grid-cols-2">
                                    <div>
                                      <label className={lbl}>Đoạn văn gắn ô thả</label>
                                      <select
                                        value={q.paragraph}
                                        onChange={(e) =>
                                          setQuestion(pi, gi, qi, { paragraph: e.target.value })
                                        }
                                        className={`${inp} mt-1`}
                                      >
                                        {PARAGRAPH_LETTERS.slice(
                                          0,
                                          Math.max(splitParagraphs(bp.paragraphsText).length, 4)
                                        ).map((L) => (
                                          <option key={L} value={L}>
                                            Paragraph {L}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <label className={lbl}>Heading đúng</label>
                                      <select
                                        value={q.answer}
                                        onChange={(e) =>
                                          setQuestion(pi, gi, qi, { answer: e.target.value })
                                        }
                                        className={`${inp} mt-1`}
                                      >
                                        <option value="">— chọn —</option>
                                        {splitLines(g.optionsText).map((opt, i) => (
                                          <option key={i} value={bankLabels[i]}>
                                            {bankLabels[i]}. {opt.slice(0, 60)}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <label className={lbl}>
                                      {g.type === "GAP"
                                        ? "Câu có chỗ trống (dùng ______ tại vị trí ô điền)"
                                        : g.type === "MATCH_ENDINGS"
                                          ? "Phần đầu câu"
                                          : g.type === "MC" || g.type === "MC_MULTI"
                                            ? "Câu hỏi"
                                            : "Câu khẳng định"}
                                    </label>
                                    <textarea
                                      value={q.prompt}
                                      onChange={(e) =>
                                        setQuestion(pi, gi, qi, { prompt: e.target.value })
                                      }
                                      rows={2}
                                      className={`${inp} mt-1 resize-y`}
                                    />
                                  </div>
                                )}

                                {(g.type === "MC" || g.type === "MC_MULTI") && (
                                  <div>
                                    <label className={lbl}>
                                      Các lựa chọn (mỗi dòng 1 lựa chọn — tự đánh A, B, C…)
                                    </label>
                                    <textarea
                                      value={q.optionsText}
                                      onChange={(e) =>
                                        setQuestion(pi, gi, qi, { optionsText: e.target.value })
                                      }
                                      rows={4}
                                      placeholder={"Lựa chọn thứ nhất\nLựa chọn thứ hai\nLựa chọn thứ ba\nLựa chọn thứ tư"}
                                      className={`${inp} mt-1 resize-y`}
                                    />
                                  </div>
                                )}

                                {/* Đáp án */}
                                {g.type === "TFNG" && (
                                  <div>
                                    <label className={lbl}>Đáp án</label>
                                    <select
                                      value={q.answer}
                                      onChange={(e) =>
                                        setQuestion(pi, gi, qi, { answer: e.target.value })
                                      }
                                      className={`${inp} mt-1 max-w-xs`}
                                    >
                                      <option value="TRUE">TRUE</option>
                                      <option value="FALSE">FALSE</option>
                                      <option value="NOT GIVEN">NOT GIVEN</option>
                                    </select>
                                  </div>
                                )}

                                {g.type === "MC" && (
                                  <div>
                                    <label className={lbl}>Đáp án đúng</label>
                                    <select
                                      value={q.answer}
                                      onChange={(e) =>
                                        setQuestion(pi, gi, qi, { answer: e.target.value })
                                      }
                                      className={`${inp} mt-1 max-w-xs`}
                                    >
                                      <option value="">— chọn —</option>
                                      {splitLines(q.optionsText).map((opt, i) => (
                                        <option key={i} value={String.fromCharCode(65 + i)}>
                                          {String.fromCharCode(65 + i)}. {opt.slice(0, 50)}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}

                                {g.type === "MC_MULTI" && (
                                  <div className="grid gap-3 sm:grid-cols-2">
                                    <div>
                                      <label className={lbl}>Số đáp án phải chọn</label>
                                      <select
                                        value={q.selectCount}
                                        onChange={(e) =>
                                          setQuestion(pi, gi, qi, {
                                            selectCount: Number(e.target.value),
                                            answers: q.answers.slice(0, Number(e.target.value)),
                                          })
                                        }
                                        className={`${inp} mt-1`}
                                      >
                                        <option value={2}>2</option>
                                        <option value={3}>3</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className={lbl}>
                                        Các đáp án đúng (tick đúng {q.selectCount})
                                      </label>
                                      <div className="mt-1 flex flex-wrap gap-2">
                                        {splitLines(q.optionsText).map((_, i) => {
                                          const L = String.fromCharCode(65 + i);
                                          const on = q.answers.includes(L);
                                          return (
                                            <label
                                              key={L}
                                              className="flex cursor-pointer items-center gap-1 border border-line bg-paper px-2 py-1 font-ui text-xs"
                                            >
                                              <input
                                                type="checkbox"
                                                checked={on}
                                                onChange={() =>
                                                  setQuestion(pi, gi, qi, {
                                                    answers: on
                                                      ? q.answers.filter((v) => v !== L)
                                                      : [...q.answers, L],
                                                  })
                                                }
                                                className="h-3.5 w-3.5 accent-[#1e3a5c]"
                                              />
                                              {L}
                                            </label>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {g.type === "GAP" && (
                                  <div className="grid gap-3 sm:grid-cols-2">
                                    <div>
                                      <label className={lbl}>Đáp án</label>
                                      <input
                                        value={q.answer}
                                        onChange={(e) =>
                                          setQuestion(pi, gi, qi, { answer: e.target.value })
                                        }
                                        className={`${inp} mt-1`}
                                      />
                                    </div>
                                    <div>
                                      <label className={lbl}>Biến thể chấp nhận (cách nhau dấu phẩy)</label>
                                      <input
                                        value={q.altText}
                                        onChange={(e) =>
                                          setQuestion(pi, gi, qi, { altText: e.target.value })
                                        }
                                        placeholder="1280, 1,280"
                                        className={`${inp} mt-1`}
                                      />
                                    </div>
                                  </div>
                                )}

                                {(g.type === "MATCH_INFO" ||
                                  g.type === "MATCH_FEATURES" ||
                                  g.type === "MATCH_ENDINGS") && (
                                  <div>
                                    <label className={lbl}>Đáp án đúng</label>
                                    <select
                                      value={q.answer}
                                      onChange={(e) =>
                                        setQuestion(pi, gi, qi, { answer: e.target.value })
                                      }
                                      className={`${inp} mt-1 max-w-md`}
                                    >
                                      <option value="">— chọn —</option>
                                      {splitLines(g.optionsText).map((opt, i) => (
                                        <option key={i} value={bankLabels[i]}>
                                          {bankLabels[i]}. {opt.slice(0, 60)}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        <button
                          type="button"
                          onClick={() =>
                            setGroup(pi, gi, { questions: [...g.questions, emptyQuestion()] })
                          }
                          className="flex cursor-pointer items-center gap-1.5 border border-line px-3 py-1.5 font-ui text-xs font-semibold text-navy hover:border-navy"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Thêm câu vào nhóm
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Thêm nhóm câu hỏi: TRÌNH ĐƠN THẢ XUỐNG chọn dạng */}
                <div className="flex flex-wrap items-end gap-2 border-t border-line pt-4">
                  <div className="min-w-64 flex-1">
                    <label className={lbl}>Thêm nhóm câu hỏi — chọn dạng bài</label>
                    <select
                      id={`add-group-${pi}`}
                      defaultValue=""
                      className={`${inp} mt-1`}
                    >
                      <option value="" disabled>
                        — Chọn dạng bài tập —
                      </option>
                      {TYPE_OPTIONS.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label} — {t.hint}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const sel = document.getElementById(
                        `add-group-${pi}`
                      ) as HTMLSelectElement;
                      if (!sel?.value) return;
                      setPart(pi, {
                        groups: [...bp.groups, emptyGroup(sel.value as QuestionType)],
                      });
                      sel.value = "";
                    }}
                    className="flex cursor-pointer items-center gap-1.5 border border-navy bg-navy px-4 py-2 font-ui text-xs font-bold uppercase tracking-wide text-paper hover:bg-navy-deep"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Thêm nhóm
                  </button>
                </div>
              </div>
            </fieldset>
          ))}

          {bparts.length < 3 && (
            <button
              type="button"
              onClick={() =>
                setBparts((prev) => [...prev, { title: "", paragraphsText: "", groups: [] }])
              }
              className="flex cursor-pointer items-center gap-1.5 border border-line px-4 py-2 font-ui text-xs font-bold uppercase tracking-wide text-navy hover:border-navy"
            >
              <Plus className="h-3.5 w-3.5" />
              Thêm Part {bparts.length + 1}
            </button>
          )}
        </>
      )}
    </div>
  );
}
