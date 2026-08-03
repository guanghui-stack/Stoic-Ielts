/**
 * Sinh biến thể đề cho từng thí sinh, và quy đáp án về dạng chuẩn để chấm.
 *
 * Vì sao cần: người thi sớm có thể chụp đề rồi gửi cho người thi sau. Đảo thứ tự
 * passage, thứ tự câu độc lập và thứ tự phương án khiến một tấm ảnh chụp màn hình
 * kèm đáp án "câu 7 chọn B" gần như vô dụng với người khác.
 *
 * Ba ràng buộc không được vi phạm, vì chúng bảo vệ tính CÔNG BẰNG — đảo đề mà làm
 * đề khó lên với một số người thì tệ hơn là không đảo:
 *
 *  1. Chỉ đảo những gì không đổi độ khó. Câu GAP hay MATCH_HEADINGS phụ thuộc
 *     trình tự đọc; đảo chúng là đổi bài thi chứ không phải đổi thứ tự.
 *  2. Mọi thứ đảo đều phải quy ngược về canonical ID trước khi chấm và trước khi
 *     so sánh đáp án giữa các thí sinh.
 *  3. Tất định: cùng lượt thi và cùng phiên bản nội dung luôn ra đúng một biến
 *     thể. Nếu không, thí sinh tải lại trang sẽ thấy đề khác và mất hết câu đã làm.
 *
 * File thuần, không import "server-only", để kiểm thử bằng node. Phần sinh seed
 * bí mật nằm ở variant.ts phía máy chủ.
 */

export const SHUFFLE_POLICIES = ["INDEPENDENT", "SEQUENTIAL"] as const;
export type ShufflePolicy = (typeof SHUFFLE_POLICIES)[number];

export type VaultOption = { canonicalId: string; text: string };

export type VaultQuestion = {
  canonicalId: string;
  type: string;
  prompt: string;
  options?: VaultOption[];
};

export type VaultGroup = {
  canonicalId: string;
  /** INDEPENDENT: các câu trong nhóm không phụ thuộc thứ tự đọc, được đảo. */
  shufflePolicy: ShufflePolicy;
  shuffleOptions: boolean;
  instructions: string;
  questions: VaultQuestion[];
};

export type VaultPart = {
  canonicalId: string;
  title: string;
  passageHtml: string;
  groups: VaultGroup[];
};

/**
 * Các dạng câu TUYỆT ĐỐI không đảo phương án.
 *
 * TRUE/FALSE/NOT GIVEN và YES/NO/NOT GIVEN có thứ tự cố định trong phòng thi
 * thật. Đảo chúng làm thí sinh quen tay chọn nhầm — đó là bẫy do hệ thống tạo
 * ra, không phải do đề.
 */
export const FIXED_ORDER_TYPES = new Set([
  "TRUE_FALSE_NOT_GIVEN",
  "YES_NO_NOT_GIVEN",
]);

/** PRNG tất định — cùng seed luôn cho cùng dãy số. */
export function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffled<T>(items: T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export type VariantQuestion = {
  /** Số câu thí sinh nhìn thấy, đánh lại liên tục 1..N theo biến thể. */
  displayNumber: number;
  canonicalId: string;
  type: string;
  prompt: string;
  options?: Array<{ canonicalId: string; text: string; displayLabel: string }>;
};

export type VariantPart = {
  canonicalId: string;
  displayIndex: number;
  title: string;
  passageHtml: string;
  groups: Array<{
    canonicalId: string;
    instructions: string;
    questions: VariantQuestion[];
  }>;
};

export type CanonicalMapping = {
  /** displayNumber -> canonicalId của câu hỏi. */
  questionByDisplay: Record<string, string>;
  /** canonicalId câu -> (nhãn hiển thị -> canonicalId phương án). */
  optionByDisplay: Record<string, Record<string, string>>;
};

const OPTION_LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * Dựng biến thể từ seed đã cho.
 *
 * Đánh số câu lại liên tục sau khi đảo là bắt buộc: nếu giữ số cũ thì hướng dẫn
 * "Questions 1–5" sẽ trỏ sai chỗ và thí sinh không biết đang làm phần nào.
 */
export function buildVariantFromSeed(input: {
  seed: number;
  parts: VaultPart[];
}): { parts: VariantPart[]; mapping: CanonicalMapping } {
  const random = mulberry32(input.seed);

  const orderedParts = shuffled(input.parts, random);
  const questionByDisplay: Record<string, string> = {};
  const optionByDisplay: Record<string, Record<string, string>> = {};

  let displayNumber = 0;

  const parts: VariantPart[] = orderedParts.map((part, partIndex) => ({
    canonicalId: part.canonicalId,
    displayIndex: partIndex + 1,
    title: part.title,
    passageHtml: part.passageHtml,
    groups: part.groups.map((group) => {
      const questions =
        group.shufflePolicy === "INDEPENDENT"
          ? shuffled(group.questions, random)
          : group.questions;

      return {
        canonicalId: group.canonicalId,
        instructions: group.instructions,
        questions: questions.map((question) => {
          displayNumber += 1;
          questionByDisplay[String(displayNumber)] = question.canonicalId;

          let options: VariantQuestion["options"];
          if (question.options && question.options.length > 0) {
            const canShuffle = group.shuffleOptions && !FIXED_ORDER_TYPES.has(question.type);
            const ordered = canShuffle ? shuffled(question.options, random) : question.options;
            const labelMap: Record<string, string> = {};
            options = ordered.map((option, index) => {
              const displayLabel = OPTION_LABELS[index] ?? String(index + 1);
              labelMap[displayLabel] = option.canonicalId;
              return { canonicalId: option.canonicalId, text: option.text, displayLabel };
            });
            optionByDisplay[question.canonicalId] = labelMap;
          }

          return {
            displayNumber,
            canonicalId: question.canonicalId,
            type: question.type,
            prompt: question.prompt,
            options,
          };
        }),
      };
    }),
  }));

  return { parts, mapping: { questionByDisplay, optionByDisplay } };
}

/**
 * Quy đáp án thí sinh nộp về dạng chuẩn.
 *
 * Bắt buộc chạy trước khi chấm VÀ trước khi so sánh đáp án giữa các thí sinh —
 * hai người cùng chọn "B" ở "câu 7" là chuyện ngẫu nhiên nếu biến thể của họ
 * khác nhau. So sánh khi chưa quy chuẩn sẽ tạo ra hàng loạt nghi ngờ sai.
 */
export function toCanonicalAnswers(input: {
  mapping: CanonicalMapping;
  /** displayNumber -> đáp án thí sinh chọn (nhãn A/B/C hoặc chữ tự điền). */
  submitted: Record<string, string>;
}): Record<string, string> {
  const canonical: Record<string, string> = {};

  for (const [display, rawAnswer] of Object.entries(input.submitted)) {
    const questionId = input.mapping.questionByDisplay[display];
    // Câu không có trong mapping nghĩa là dữ liệu gửi lên không khớp biến thể —
    // bỏ qua thay vì đoán, để không tự tạo ra một đáp án chưa từng được chọn.
    if (!questionId) continue;

    const labelMap = input.mapping.optionByDisplay[questionId];
    if (labelMap) {
      const canonicalOption = labelMap[String(rawAnswer).trim().toUpperCase()];
      if (canonicalOption) {
        canonical[questionId] = canonicalOption;
        continue;
      }
    }
    // Câu tự điền: giữ nguyên chữ, việc chuẩn hóa chính tả do bộ chấm lo.
    canonical[questionId] = rawAnswer;
  }

  return canonical;
}

/** Đếm số câu để kiểm tra biến thể không làm mất hay nhân đôi câu nào. */
export function countQuestions(parts: Array<{ groups: Array<{ questions: unknown[] }> }>): number {
  return parts.reduce(
    (sum, part) => sum + part.groups.reduce((s, group) => s + group.questions.length, 0),
    0
  );
}
