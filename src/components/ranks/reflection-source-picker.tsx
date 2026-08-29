"use client";

import { CheckCircle2, Eye, Lock, XCircle } from "lucide-react";
import { useState } from "react";
import type { ReflectionSourceQuestion } from "@/lib/ranks/reflection-reference";

export function ReflectionSourcePicker({
  sources,
}: {
  sources: ReflectionSourceQuestion[];
}) {
  const [selected, setSelected] = useState<ReflectionSourceQuestion | null>(
    sources[0] ?? null,
  );

  if (sources.length === 0) {
    return (
      <div className="reflection-source reflection-source--empty">
        <p className="reflection-source__eyebrow">Gợi ý dẫn chiếu</p>
        <p className="reflection-source__title">Chưa tìm thấy câu sai gần đây</p>
        <p className="reflection-source__copy">
          Bạn vẫn có thể tự điền một lượt phục bàn; sau khi có bài Reading đã nộp,
          các câu sai sẽ xuất hiện ở đây để chọn nhanh.
        </p>
      </div>
    );
  }

  return (
    <div className="reflection-source">
      <div className="reflection-source__header">
        <div>
          <p className="reflection-source__eyebrow">Dẫn chiếu từ bài đã làm</p>
          <p className="reflection-source__title">Chọn đúng câu sai để phục bàn</p>
          <p className="reflection-source__copy">
            Dữ liệu lấy từ những lượt Reading đã nộp của bạn. Chọn một câu để điền
            bằng chứng chính xác hơn.
          </p>
        </div>
        <span className="reflection-source__count">{sources.length} câu sai</span>
      </div>

      <div className="reflection-source__grid">
        <div className="reflection-source__list" role="listbox" aria-label="Các câu sai gần đây">
          {sources.map((source) => {
            const active = selected?.questionId === source.questionId && selected.attemptId === source.attemptId;
            return (
              <button
                key={`${source.attemptId}:${source.questionId}`}
                type="button"
                role="option"
                aria-selected={active}
                className={`reflection-source__option${active ? " is-selected" : ""}`}
                onClick={() => setSelected(source)}
              >
                {active ? (
                  <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
                ) : (
                  <XCircle className="size-4 shrink-0" aria-hidden="true" />
                )}
                <span className="min-w-0 text-left">
                  <strong>Câu {source.numberLabel}</strong>
                  <span>{source.attemptTitle}</span>
                  <small>{source.submittedAtLabel} · {source.type}</small>
                </span>
              </button>
            );
          })}
        </div>

        {selected ? (
          <div className="reflection-source__detail" aria-live="polite">
            <div className="reflection-source__detail-meta">
              <span>Part {selected.part}</span>
              <span>Câu {selected.numberLabel}</span>
              <span>{selected.type}</span>
            </div>
            <p className="reflection-source__prompt">{selected.prompt || "Câu hỏi không có phần mô tả."}</p>
            <dl className="reflection-source__answers">
              <div>
                <dt>Bạn đã chọn</dt>
                <dd>{selected.userAnswer || "(bỏ trống)"}</dd>
              </div>
              <div>
                <dt>Đáp án đúng</dt>
                <dd>
                  {selected.correctAnswer ? (
                    selected.correctAnswer
                  ) : (
                    <span className="reflection-source__locked">
                      <Lock className="size-3.5" aria-hidden="true" /> Mở đáp án cơ bản ở trang kết quả để xem
                    </span>
                  )}
                </dd>
              </div>
            </dl>
            {!selected.answersUnlocked && (
              <p className="reflection-source__note">
                <Eye className="size-3.5" aria-hidden="true" />
                Bạn vẫn xem được câu hỏi và đáp án đã chọn; đáp án đúng sẽ hiện sau
                khi mở đáp án cơ bản miễn phí.
              </p>
            )}
          </div>
        ) : null}
      </div>

      {selected ? (
        <>
          <input type="hidden" name="sourceAttemptId" value={selected.attemptId} />
          <input type="hidden" name="sourceQuestionId" value={selected.questionId} />
          <input type="hidden" name="questionType" value={selected.type} />
        </>
      ) : null}
    </div>
  );
}
