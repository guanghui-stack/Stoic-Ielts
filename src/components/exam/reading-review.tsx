"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Check, X } from "lucide-react";
import {
  optionLabel,
  WORD_LIMIT_LABELS,
  type ReadingPart,
  type ReadingQuestion,
  type ReadingQuestionGroup,
} from "@/lib/exercise-content";
import {
  questionRangeLabel,
  reviewPromptOf,
  splitPromptAroundBlanks,
  type ReviewModel,
  type ReviewSlot,
} from "@/lib/attempts/review";
import type { QuestionDiscussionLink } from "@/lib/forum/question-context";
import { QuestionDiscussionLinks } from "@/components/forum/question-discussion-links";

/**
 * ĐỐI CHIẾU đề và đáp án — bản chỉ để đọc của phòng thi.
 *
 * Vì sao là component RIÊNG chứ không phải một cờ `review` cắm vào
 * `reading-cbt.tsx`: phòng thi là 1100 dòng đồng hồ đếm ngược, kéo-thả, tô
 * sáng, ghi chú và nhịp tim — thứ mà `docs/PROTECTED-SURFACES.sha256` khoá lại
 * vì sai một li là hỏng một lượt thi thật. Đối chiếu không cần một dòng nào
 * trong số đó. Luồn thêm một nhánh "chỉ đọc" xuyên qua toàn bộ chỗ ấy là đem
 * rủi ro vào đúng nơi đắt nhất để đổi lấy việc dùng lại thứ mình không cần.
 *
 * ĐIỀU QUAN TRỌNG NHẤT — và là lý do màn này chạy được với MỌI đề, kể cả đề
 * thêm sau này: nó KHÔNG có nhánh `if` nào theo dạng câu hỏi. Nó duyệt
 * part → nhóm → câu đúng như cấu trúc dữ liệu đề, rồi với mỗi câu chỉ hỏi bảng
 * chấm một câu duy nhất: "bạn trả lời gì, đáp án là gì". Một dạng câu hỏi thứ
 * chín ra đời mà vẫn đi qua `gradeReading` thì màn này hiện đúng nó ngay, không
 * cần sửa gì ở đây.
 */
export function ReadingReviewSheet({
  parts,
  review,
  discussions = {},
}: {
  parts: ReadingPart[];
  review: ReviewModel;
  discussions?: Record<string, QuestionDiscussionLink>;
}) {
  const [part, setPart] = useState(0);

  // Dải số câu của từng part, để nhãn tab nói được "Câu 1–13" thay vì "Part 1".
  const partRanges = useMemo(() => {
    const ranges: Array<{ label: string }> = [];
    for (const p of parts) {
      const labels = p.questionGroups.flatMap((g) =>
        g.questions.map((q) => review.slots[q.id]?.numberLabel ?? ""),
      ).filter(Boolean);
      ranges.push({ label: questionRangeLabel(labels) });
    }
    return ranges;
  }, [parts, review.slots]);

  return (
    <div className="rounded-stoic-lg border border-stoic-line bg-stoic-canvas shadow-stoic-1">
      {parts.length > 1 && (
        <div
          role="tablist"
          aria-label="Chọn part để đối chiếu"
          className="flex flex-wrap gap-1 border-b border-stoic-line bg-stoic-canvas-soft px-3 py-2"
        >
          {parts.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === part}
              onClick={() => setPart(i)}
              className={`min-h-10 rounded-stoic-pill px-4 py-2 text-xs font-semibold tracking-wide transition-colors ${
                i === part
                  ? "bg-stoic-canvas text-stoic-primary-deep shadow-stoic-1"
                  : "text-stoic-ink-muted hover:bg-stoic-canvas/70 hover:text-stoic-primary-deep"
              }`}
            >
              Part {i + 1}
              {partRanges[i]?.label && (
                <span className="ml-1.5 font-normal text-stoic-ink-muted">
                  · {partRanges[i].label}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {parts.map((p, i) => (
        <div
          key={i}
          hidden={i !== part}
          className="grid gap-px bg-stoic-line lg:grid-cols-2"
        >
          {/* ===== Khung trái: passage ===== */}
          <section
            aria-label={`Bài đọc Part ${i + 1}`}
            className="max-h-[70vh] overflow-y-auto bg-stoic-canvas p-6"
          >
            <h2 className="mb-4 text-center font-display text-xl font-bold text-navy-deep">
              {p.passage.title}
            </h2>
            {p.passage.paragraphs.map((para, pi) => (
              <p key={pi} className="mb-4 text-[15px] leading-[1.7] text-ink">
                {p.passage.labelParagraphs && (
                  <strong className="mr-1.5">
                    {String.fromCharCode(65 + pi)}.
                  </strong>
                )}
                {para}
              </p>
            ))}
          </section>

          {/* ===== Khung phải: câu hỏi kèm đáp án ===== */}
          <section
            aria-label={`Câu hỏi Part ${i + 1}`}
            className="max-h-[70vh] overflow-y-auto bg-stoic-canvas p-6"
          >
            {p.questionGroups.map((group, gi) => (
              <ReviewGroup
                key={gi}
                group={group}
                review={review}
                discussions={discussions}
              />
            ))}
          </section>
        </div>
      ))}
    </div>
  );
}

function ReviewGroup({
  group,
  review,
  discussions,
}: {
  group: ReadingQuestionGroup;
  review: ReviewModel;
  discussions: Record<string, QuestionDiscussionLink>;
}) {
  const labels = group.questions
    .map((q) => review.slots[q.id]?.numberLabel)
    .filter(Boolean) as string[];

  return (
    <div className="mb-8 last:mb-0">
      <p className="text-[15px] font-bold text-navy-deep">
        {questionRangeLabel(labels) || "Questions"}
      </p>
      <p className="mb-1 mt-1 whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">
        {group.instruction}
      </p>
      {group.type === "GAP" && group.wordLimit && (
        <p className="mb-3 text-[15px] text-ink-soft">
          Write <strong>{WORD_LIMIT_LABELS[group.wordLimit]}</strong> from the
          passage for each answer.
        </p>
      )}
      {group.boxTitle && (
        <p className="mb-2 mt-3 text-[15px] font-bold text-navy-deep">
          {group.boxTitle}
        </p>
      )}

      {/* Kho đáp án dùng chung của nhóm (các dạng nối). Không có nó thì "iii"
          trong ô đáp án là một ký hiệu trống nghĩa. */}
      {group.options && group.options.length > 0 && (
        <OptionBank type={group.type} options={group.options} />
      )}

      <ul className="mt-3 space-y-3">
        {group.questions.map((q) => (
          <ReviewQuestion
            key={q.id}
            question={q}
            groupType={group.type}
            slot={review.slots[q.id]}
            discussion={discussions[q.id]}
          />
        ))}
      </ul>
    </div>
  );
}

function ReviewQuestion({
  question,
  groupType,
  slot,
  discussion,
}: {
  question: ReadingQuestion;
  groupType: ReadingQuestionGroup["type"];
  slot: ReviewSlot | undefined;
  discussion?: QuestionDiscussionLink;
}) {
  // Câu không có trong bảng chấm là câu đề vừa được sửa sau khi học viên nộp.
  // Hiện phần chữ và nói thẳng là không đối chiếu được, thay vì để trống lặng lẽ.
  if (!slot) {
    return (
      <li className="text-[15px] leading-relaxed text-ink-soft">
        {reviewPromptOf(question)}
        <span className="ml-2 text-xs text-muted">(không đối chiếu được)</span>
      </li>
    );
  }

  const segments = splitPromptAroundBlanks(reviewPromptOf(question));
  const answerPair = <AnswerPair slot={slot} />;

  return (
    <li className="text-[15px] leading-relaxed text-ink">
      <span className="align-middle">
        {segments.map((seg, i) => (
          <span key={i}>
            {seg}
            {i < segments.length - 1 && answerPair}
          </span>
        ))}
        {/* Câu không có ô điền giữa dòng thì đáp án đứng ngay sau phần chữ. */}
        {segments.length === 1 && answerPair}
      </span>
      {/* Lựa chọn của riêng câu này (TFNG, MC, MC_MULTI). Cần vì đáp án lưu
          dưới dạng chữ cái: không có bảng này thì "A, C" không nói lên điều gì. */}
      {question.options && question.options.length > 0 && (
        <OptionBank type={groupType} options={question.options} compact />
      )}
      {discussion && <QuestionDiscussionLinks discussion={discussion} />}
    </li>
  );
}

/**
 * Bảng lựa chọn kèm nhãn.
 *
 * Nhãn do `optionLabel()` sinh — đúng hàm mà phòng thi và bộ chấm dùng, nên
 * chữ cái ở đây luôn khớp với chữ cái trong ô đáp án. Tự đánh số ở đây là mở
 * đường cho hai nơi đánh khác nhau trên cùng một câu.
 */
function OptionBank({
  type,
  options,
  compact = false,
}: {
  type: ReadingQuestionGroup["type"];
  options: readonly string[];
  compact?: boolean;
}) {
  return (
    <ul
      className={`${compact ? "mt-1.5" : "mb-3 mt-2 rounded-stoic-sm border border-stoic-line bg-stoic-canvas-soft p-3"} space-y-1`}
    >
      {options.map((option, i) => (
        <li key={i} className="text-[13px] leading-snug text-ink-soft">
          <strong className="mr-1.5 text-navy-deep">{optionLabel(type, i)}.</strong>
          {option}
        </li>
      ))}
    </ul>
  );
}

/**
 * "Bạn trả lời → Đáp án đúng" của một câu.
 *
 * Đúng thì chỉ hiện một đáp án màu xanh — thêm mũi tên trỏ sang chính nó là
 * nhiễu. Sai mới hiện cặp. Chưa mở đáp án thì `correctAnswer` là `null` ngay từ
 * dữ liệu (xem `lib/attempts/review.ts`), nên ở đây không có gì để lỡ tay hiện ra.
 */
function AnswerPair({ slot }: { slot: ReviewSlot }) {
  const blank = slot.userAnswer.trim() === "";
  const partial = slot.score > 0 && slot.score < slot.maxScore;

  return (
    <span className="mx-1 inline-flex flex-wrap items-center gap-1.5 align-middle">
      <span
        className={`inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums ${
          slot.correct
            ? "bg-jade-pale text-jade-ink"
            : "bg-vermilion-pale text-vermilion-ink"
        }`}
      >
        {slot.numberLabel}
      </span>

      <span
        className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-sm font-semibold ${
          slot.correct
            ? "border-jade/40 bg-jade-pale text-jade-ink"
            : "border-vermilion/40 bg-vermilion-pale text-vermilion-ink"
        }`}
      >
        {slot.correct ? (
          <Check className="size-3.5 shrink-0" aria-hidden="true" />
        ) : (
          <X className="size-3.5 shrink-0" aria-hidden="true" />
        )}
        <span className={blank ? "italic" : undefined}>
          {blank ? "bỏ trống" : slot.userAnswer}
        </span>
        <span className="sr-only">— bạn trả lời</span>
      </span>

      {!slot.correct && slot.correctAnswer !== null && (
        <>
          <ArrowRight className="size-3.5 shrink-0 text-muted" aria-hidden="true" />
          <span className="inline-flex items-center rounded border border-jade/40 bg-jade-pale px-2 py-0.5 text-sm font-semibold text-jade-ink">
            {slot.correctAnswer}
            <span className="sr-only">— đáp án đúng</span>
          </span>
        </>
      )}

      {!slot.correct && slot.correctAnswer === null && (
        <span className="text-xs text-muted">(đáp án chưa mở)</span>
      )}

      {partial && (
        <span className="text-xs text-muted tabular-nums">
          {slot.score}/{slot.maxScore}
        </span>
      )}
    </span>
  );
}
