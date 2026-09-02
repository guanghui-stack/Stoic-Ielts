import {
  QUESTION_TYPE_LABELS,
  questionSpan,
  type ReadingQuestion,
} from "../exercise-content.ts";

export type ReadingCatalogSource = Readonly<{
  title: string;
  content: string;
  difficultyTier?: string | null;
}>;

/** DTO tối thiểu được phép đưa xuống danh mục dành cho học viên. */
export type ReadingCatalogMetadata = Readonly<{
  displayTitle: string;
  questionCount: number;
  questionTypeLabels: readonly string[];
  difficultyLabel: string;
  passageFitLabel: string;
}>;

type JsonRecord = Record<string, unknown>;

const INTERNAL_TITLE_PREFIX =
  /^\s*Reading\s+(?:Practice|Full\s+Test)\s+\d+\s*(?:[\u2013\u2014-]|:)\s*/i;

const DIFFICULTY_METADATA = {
  EASY: {
    difficultyLabel: "Dễ",
    passageFitLabel: "Phù hợp Passage 1",
  },
  MEDIUM: {
    difficultyLabel: "Vừa",
    passageFitLabel: "Phù hợp Passage 2",
  },
  HARD: {
    difficultyLabel: "Khó",
    passageFitLabel: "Phù hợp Passage 3",
  },
  UNKNOWN: {
    difficultyLabel: "Chưa phân tầng",
    passageFitLabel: "Chưa xác định Passage",
  },
} as const;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readingDisplayTitle(title: string): string {
  const original = title.trim();
  const withoutPrefix = original.replace(INTERNAL_TITLE_PREFIX, "").trim();
  return withoutPrefix || original || "Bài Reading";
}

function questionGroupsOf(contentJson: string): JsonRecord[] {
  let content: unknown;
  try {
    content = JSON.parse(contentJson);
  } catch {
    return [];
  }
  if (!isRecord(content)) return [];

  // Đề mới dùng parts[]; đề cũ đặt questionGroups ngay ở gốc.
  if (Array.isArray(content.parts) && content.parts.length > 0) {
    return content.parts.flatMap((part) => {
      if (!isRecord(part) || !Array.isArray(part.questionGroups)) return [];
      return part.questionGroups.filter(isRecord);
    });
  }

  return Array.isArray(content.questionGroups)
    ? content.questionGroups.filter(isRecord)
    : [];
}

function catalogFactsOf(contentJson: string): {
  questionCount: number;
  questionTypeLabels: string[];
} {
  let questionCount = 0;
  const questionTypeLabels: string[] = [];
  const seenLabels = new Set<string>();

  for (const group of questionGroupsOf(contentJson)) {
    const type = typeof group.type === "string" ? group.type : "";
    const label = QUESTION_TYPE_LABELS[type];
    if (label && !seenLabels.has(label)) {
      seenLabels.add(label);
      questionTypeLabels.push(label);
    }

    if (!Array.isArray(group.questions)) continue;
    for (const question of group.questions) {
      if (!isRecord(question)) continue;
      questionCount +=
        type === "MC_MULTI"
          ? questionSpan(
              { type: "MC_MULTI", instruction: "", questions: [] },
              question as ReadingQuestion,
            )
          : 1;
    }
  }

  return { questionCount, questionTypeLabels };
}

function difficultyMetadataOf(difficultyTier: string | null | undefined) {
  const tier = difficultyTier?.trim().toUpperCase();
  if (tier === "EASY" || tier === "MEDIUM" || tier === "HARD") {
    return DIFFICULTY_METADATA[tier];
  }
  return DIFFICULTY_METADATA.UNKNOWN;
}

/**
 * Bóc metadata để dựng danh mục mà không truyền passage, câu hỏi hay đáp án
 * sang component hiển thị. Hàm thuần và chịu được JSON cũ/hỏng.
 */
export function buildReadingCatalogMetadata(
  source: ReadingCatalogSource,
): ReadingCatalogMetadata {
  const facts = catalogFactsOf(source.content);
  const difficulty = difficultyMetadataOf(source.difficultyTier);

  return {
    displayTitle: readingDisplayTitle(source.title),
    questionCount: facts.questionCount,
    questionTypeLabels: facts.questionTypeLabels,
    difficultyLabel: difficulty.difficultyLabel,
    passageFitLabel: difficulty.passageFitLabel,
  };
}
