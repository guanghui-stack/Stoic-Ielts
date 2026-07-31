"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send, CloudUpload } from "lucide-react";
import { Countdown } from "@/components/exam/countdown";
import { useExamController } from "@/components/exam/use-exam-controller";
import { countWords } from "@/lib/exercise-content";
import type { WritingContent } from "@/lib/exercise-content";
import { BridgeMark } from "@/components/brand";

type BaseProps = {
  attemptId: string;
  title: string;
  deadlineIso: string;
  initialAnswers: string; // JSON đã lưu (autosave từ phiên trước)
};

function ExamShell({
  title,
  deadlineIso,
  onExpire,
  onSubmit,
  isSubmitting,
  savedAt,
  children,
}: {
  title: string;
  deadlineIso: string;
  onExpire: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  savedAt: Date | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-cream">
      <header className="sticky top-0 z-40 border-b border-line bg-paper shadow-card">
        <div className="h-[3px] bg-gold" />
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <BridgeMark className="h-8 w-8 shrink-0" />
            <h1 className="truncate font-display text-base font-bold text-navy-deep md:text-lg">
              {title}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {savedAt && (
              <span className="hidden items-center gap-1.5 font-ui text-xs text-muted md:flex">
                <CloudUpload className="h-3.5 w-3.5" aria-hidden="true" />
                Đã lưu {savedAt.toLocaleTimeString("vi-VN")}
              </span>
            )}
            <Countdown deadlineIso={deadlineIso} onExpire={onExpire} />
            <button
              type="button"
              onClick={onSubmit}
              disabled={isSubmitting}
              className="flex cursor-pointer items-center gap-2 border border-navy bg-navy px-5 py-2 font-ui text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-paper transition-colors hover:bg-navy-deep disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
              {isSubmitting ? "Đang nộp…" : "Nộp bài"}
            </button>
          </div>
        </div>
      </header>
      {children}
      {isSubmitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-deep/40">
          <div className="border border-line bg-paper px-10 py-8 text-center shadow-lift">
            <p className="font-display text-xl font-bold text-navy-deep">Đang nộp bài…</p>
            <p className="mt-2 font-ui text-sm text-ink-soft">Vui lòng không đóng trang.</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===================== WRITING ===================== */

export function WritingExam({
  attemptId,
  title,
  deadlineIso,
  initialAnswers,
  content,
}: BaseProps & { content: WritingContent }) {
  const [essay, setEssay] = useState<string>(() => {
    try {
      return JSON.parse(initialAnswers || "{}").essay ?? "";
    } catch {
      return "";
    }
  });
  // Giữ bản mới nhất của bài viết cho autosave/nộp bài. Gán trong effect
  // (không gán khi đang render) — effect luôn chạy xong trước khi người dùng
  // kịp bấm nút hoặc trước nhịp autosave kế tiếp.
  const essayRef = useRef(essay);
  useEffect(() => {
    essayRef.current = essay;
  }, [essay]);
  const getAnswersJson = useCallback(
    () =>
      JSON.stringify({
        essay: essayRef.current,
        wordCount: countWords(essayRef.current),
      }),
    []
  );
  const { submit, isSubmitting, savedAt } = useExamController(attemptId, getAnswersJson);

  const words = countWords(essay);
  const enough = words >= content.minWords;

  return (
    <ExamShell
      title={title}
      deadlineIso={deadlineIso}
      onExpire={() => submit(true)}
      onSubmit={() => submit(false)}
      isSubmitting={isSubmitting}
      savedAt={savedAt}
    >
      <div className="mx-auto grid w-full max-w-7xl flex-1 gap-6 px-4 py-6 md:px-6 lg:grid-cols-[2fr_3fr] lg:gap-8">
        {/* Đề bài */}
        <section
          aria-label="Đề bài"
          className="h-fit border border-line bg-paper p-6 shadow-card md:p-8 lg:sticky lg:top-24"
        >
          <p className="label-caps">
            IELTS Writing {content.task === "TASK_1" ? "Task 1" : "Task 2"}
          </p>
          <div className="rule-gold mt-4" />
          <div className="mt-6 space-y-4 leading-[1.8] text-ink">
            {content.prompt.split("\n\n").map((p, i) => (
              <p key={i} className={i === 0 ? "" : "font-semibold"}>
                {p}
              </p>
            ))}
          </div>
          {content.dataTable && (
            <table className="mt-6 w-full border border-line font-ui text-sm">
              <caption className="border border-b-0 border-line bg-cream-deep px-3 py-2 text-left text-[0.82rem] font-semibold text-ink">
                {content.dataTable.caption}
              </caption>
              <thead>
                <tr className="bg-navy text-paper">
                  {content.dataTable.headers.map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {content.dataTable.rows.map((row, ri) => (
                  <tr key={ri} className="bg-paper">
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className={`px-3 py-2 ${ci === 0 ? "font-semibold text-ink" : "tabular-nums text-ink-soft"}`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {content.guidance && (
            <p className="mt-6 border-l-4 border-gold bg-cream-deep px-4 py-3 text-[0.88rem] leading-relaxed text-ink-soft">
              {content.guidance}
            </p>
          )}
        </section>

        {/* Vùng viết */}
        <section aria-label="Bài viết" className="flex flex-col">
          <div className="flex items-center justify-between border border-b-0 border-line bg-paper px-5 py-3">
            <label
              htmlFor="essay"
              className="font-ui text-[0.8rem] font-semibold uppercase tracking-[0.1em] text-ink"
            >
              Bài viết của bạn
            </label>
            <span
              className={`font-ui text-sm font-semibold tabular-nums ${
                enough ? "text-success" : "text-ink-soft"
              }`}
            >
              {words} từ{" "}
              <span className="font-normal text-muted">
                / tối thiểu {content.minWords}
              </span>
            </span>
          </div>
          <textarea
            id="essay"
            value={essay}
            onChange={(e) => setEssay(e.target.value)}
            spellCheck={false}
            placeholder="Bắt đầu viết tại đây… Bài của bạn được tự động lưu mỗi 20 giây."
            className="min-h-[60dvh] flex-1 resize-y border border-line bg-paper p-6 font-body text-[1.05rem] leading-[1.9] text-ink shadow-card focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
          />
          <p className="mt-3 font-ui text-xs leading-relaxed text-muted">
            Giáo viên sẽ chấm theo rubric 4 tiêu chí (Task Achievement, Coherence
            &amp; Cohesion, Lexical Resource, Grammatical Range &amp; Accuracy) và
            trả nhận xét trong vòng 48 giờ.
          </p>
        </section>
      </div>
    </ExamShell>
  );
}
