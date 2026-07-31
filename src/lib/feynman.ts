import "server-only";
import {
  normalizeReadingParts,
  type FeynmanLearningNote,
  type ReadingContent,
} from "@/lib/exercise-content";

export type FeynmanLearningSnapshot = {
  partNumber: number;
  questionType: string;
  learning?: FeynmanLearningNote;
};

/**
 * Tạo bản đồ lời giải mẫu theo questionId.
 * Metadata này chỉ dùng phía máy chủ và không bao giờ đi qua
 * sanitizeReadingParts().
 */
export function buildFeynmanLearningLookup(
  content: ReadingContent
): Map<string, FeynmanLearningSnapshot> {
  const map = new Map<string, FeynmanLearningSnapshot>();
  normalizeReadingParts(content).forEach((part, partIndex) => {
    part.questionGroups.forEach((group) => {
      group.questions.forEach((question) => {
        map.set(question.id, {
          partNumber: partIndex + 1,
          questionType: group.type,
          learning: question.learning,
        });
      });
    });
  });
  return map;
}
