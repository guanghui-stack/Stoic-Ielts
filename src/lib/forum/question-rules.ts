import { createHash } from "node:crypto";
import { normalizeReadingParts, questionSpan, QUESTION_TYPE_LABELS, type ReadingContent } from "../exercise-content.ts";

export type QuestionQuote = {
  instruction: string; prompt: string; options: string[]; groupOptions: string[];
  paragraphLabel: string; paragraphText: string; selectCount: number;
  wordLimit: string; boxTitle: string; reuseOptions: boolean | null;
};
type ReferenceMetadata = { passageTitle: string; questionNumber: string; questionType: string; exerciseHref: string };
export type ForumQuestionReferenceView = ReferenceMetadata & (
  | { state: "available"; quote: QuestionQuote }
  | { state: "locked"; purchaseHref: string }
  | { state: "missing" }
);
export type QuestionReferenceInput = {
  exerciseId: string; questionId: string; partIndex: number; questionNumber: string;
  passageTitle: string; questionType: string; sourceHash: string;
};

export function canAskFromAttempt(viewerId: string, attempt: {userId: string; status: string; submittedAt: Date | null}) {
  return viewerId === attempt.userId && attempt.submittedAt !== null &&
    (attempt.status === "SUBMITTED" || attempt.status === "GRADED");
}

export function isForumReadingSource(exercise: {skill: string; published: boolean; competitionOnly: boolean; arenaOnly: boolean}) {
  return exercise.skill === "READING" && exercise.published && !exercise.competitionOnly && !exercise.arenaOnly;
}

export function parseQuestionContent(raw: string): ReadingContent {
  try {
    const value = JSON.parse(raw);
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch { return {}; }
}

const textOnly = (value: unknown): string => typeof value === "string" ? value : "";
const textOptions = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

/** Chỉ dựng những trường để đọc câu hỏi. Không sao chép object chứa đáp án. */
export function findQuestionSource(content: ReadingContent, questionId: string) {
  try {
    const matches: {partIndex: number; questionNumber: string; passageTitle: string; questionType: string; quote: QuestionQuote; sourceHash: string}[] = [];
    let number = 1;
    normalizeReadingParts(content).forEach((part, partIndex) => {
      for (const group of part.questionGroups) for (const question of group.questions) {
        const span = questionSpan(group, question);
        if (question.id === questionId) {
          if (!Object.hasOwn(QUESTION_TYPE_LABELS, group.type)) return;
          const paragraphLabel = group.type === "MATCH_HEADINGS" ? textOnly(question.paragraph) : "";
          const paragraphIndex = /^[A-Z]$/i.test(paragraphLabel) ? paragraphLabel.toUpperCase().charCodeAt(0) - 65 : -1;
          const quote: QuestionQuote = {
            instruction: textOnly(group.instruction), prompt: textOnly(question.prompt),
            options: textOptions(question.options), groupOptions: textOptions(group.options),
            paragraphLabel, paragraphText: paragraphIndex >= 0 ? textOnly(part.passage.paragraphs[paragraphIndex]) : "",
            selectCount: group.type === "MC_MULTI" ? span : 1,
            wordLimit: textOnly(group.wordLimit), boxTitle: textOnly(group.boxTitle),
            reuseOptions: group.type === "MATCH_INFO" || group.type === "MATCH_FEATURES" ? group.reuseOptions !== false : null,
          };
          const questionNumber = span > 1 ? `${number}–${number + span - 1}` : String(number);
          // Đổi đoạn/câu nguồn thì không ghép lời bàn cũ với nội dung mới.
          const sourceHash = createHash("sha256").update(JSON.stringify({partIndex, questionId, questionNumber, type: group.type, quote, passage: part.passage})).digest("hex");
          matches.push({partIndex, questionNumber, passageTitle: textOnly(part.passage.title), questionType: group.type, quote, sourceHash});
        }
        number += span;
      }
    });
    return matches.length === 1 ? matches[0] : null;
  } catch { return null; }
}

/** Tiền tố theo vị trí bài thành phần, không phải số part đã làm phẳng. */
export function resolveAssemblyQuestion(questionId: string, itemCount: number) {
  const match = /^p([1-9]\d*):(.+)$/.exec(questionId);
  if (!match) return null;
  const itemIndex = Number(match[1]) - 1;
  return itemIndex < itemCount ? {itemIndex, questionId: match[2]} : null;
}

export function citationView(metadata: ReferenceMetadata, quote: QuestionQuote | null, hasAccess: boolean): ForumQuestionReferenceView {
  if (!quote) return {...metadata, state: "missing"};
  if (!hasAccess) return {...metadata, state: "locked", purchaseHref: metadata.exerciseHref};
  return {...metadata, state: "available", quote};
}
