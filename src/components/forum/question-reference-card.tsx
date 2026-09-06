import Link from "next/link";
import { ArrowUpRight, BookOpen, LockKeyhole } from "lucide-react";
import { optionLabel, QUESTION_TYPE_LABELS, WORD_LIMIT_LABELS, type QuestionType } from "@/lib/exercise-content";
import type { ForumQuestionReferenceView } from "@/lib/forum/question-rules";
import styles from "./forum-discussions.module.css";

function labeledOption(text: string, type: string, index: number) {
  if (type === "TFNG" || !Object.hasOwn(QUESTION_TYPE_LABELS, type)) return text;
  const label = optionLabel(type as QuestionType, index);
  // Một số đề cũ đã có A./i. trong nội dung; không đánh nhãn thêm lần nữa.
  return text === label || /^\s*(?:[a-z]|[ivxlcdm]+)[.)]\s+/i.test(text)
    ? text
    : `${label}. ${text}`;
}

export function QuestionReferenceCard({
  reference,
}: {
  reference: ForumQuestionReferenceView;
}) {
  const available = reference.state === "available";

  return (
    <aside className={styles.questionCard} aria-label="Câu hỏi đang được thảo luận">
      <div className={styles.questionHeader}>
        <span className={styles.questionNumber}>
          <span>Câu</span>
          <strong>{reference.questionNumber}</strong>
        </span>
        <div className={styles.questionHeading}>
          <p className={styles.eyebrow}>Câu hỏi được liên kết</p>
          <h2>{reference.passageTitle}</h2>
          <p className={styles.metadata}>
            {QUESTION_TYPE_LABELS[reference.questionType] ?? reference.questionType}
          </p>
        </div>
        {available ? <BookOpen size={19} aria-hidden="true" /> : <LockKeyhole size={19} aria-hidden="true" />}
      </div>

      {reference.state === "locked" ? (
        <div className={styles.questionLocked}>
          <p>Bạn chưa có quyền mở bài đọc này. Mua hoặc mở quyền truy cập bài đọc để xem trích dẫn câu hỏi.</p>
          <Link href={reference.purchaseHref} className={styles.primaryLink}>
            Xem bài đọc và cách mở <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
      ) : reference.state === "missing" ? (
        <p className={styles.questionNotice}>
          Câu hỏi nguồn đã thay đổi hoặc hiện không còn được mở. Hãy đối chiếu lại bài học trước khi tiếp tục trao đổi.
        </p>
      ) : (
        <div className={styles.questionContent}>
          {reference.quote.instruction && <p className={styles.instruction}>{reference.quote.instruction}</p>}
          {reference.quote.wordLimit && (
            <p className={styles.instruction}>
              {(WORD_LIMIT_LABELS as Record<string, string>)[reference.quote.wordLimit] ?? reference.quote.wordLimit}
            </p>
          )}
          {reference.quote.selectCount > 1 && <p className={styles.metadata}>Chọn {reference.quote.selectCount} đáp án.</p>}
          {reference.quote.boxTitle && <p className={styles.boxTitle}>{reference.quote.boxTitle}</p>}
          {reference.quote.prompt && <p className={styles.questionPrompt}>{reference.quote.prompt}</p>}
          {reference.quote.options.length > 0 && (
            <ul className={styles.questionOptions}>
              {reference.quote.options.map((option, index) => <li key={index}>{labeledOption(option, reference.questionType, index)}</li>)}
            </ul>
          )}
          {reference.quote.groupOptions.length > 0 && (
            <ul className={styles.questionOptions} aria-label="Các lựa chọn của nhóm câu hỏi">
              {reference.quote.groupOptions.map((option, index) => <li key={index}>{labeledOption(option, reference.questionType, index)}</li>)}
            </ul>
          )}
          {reference.quote.reuseOptions !== null && (
            <p className={styles.metadata}>
              {reference.quote.reuseOptions ? "Có thể dùng một lựa chọn nhiều lần." : "Mỗi lựa chọn chỉ dùng một lần."}
            </p>
          )}
          {reference.quote.paragraphText && (
            <details className={styles.quoteDetails}>
              <summary>
                Đọc đoạn trích{reference.quote.paragraphLabel ? ` ${reference.quote.paragraphLabel}` : ""}
              </summary>
              <blockquote>{reference.quote.paragraphText}</blockquote>
            </details>
          )}
          {reference.exerciseHref && (
            <Link href={reference.exerciseHref} className={styles.textLink}>
              Mở bài học <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          )}
        </div>
      )}
    </aside>
  );
}
