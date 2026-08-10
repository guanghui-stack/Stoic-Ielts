/**
 * Dựng dữ liệu gửi sang OpenAI.
 *
 * Nguyên tắc: **danh sách trắng**. Payload được lắp từ những trường được nêu
 * tên ở đây, không bao giờ là một object của database truyền thẳng ra. Truyền
 * thẳng thì mỗi lần schema thêm cột là thêm một cột nữa rời khỏi máy chủ mà
 * không ai để ý.
 *
 * `assertPayloadClean()` là hàng rào thứ hai chứ không phải hàng rào duy nhất.
 *
 * Không import "server-only": bộ kiểm thử chạy bằng node thuần cần dựng payload
 * để kiểm tra nó sạch, và file này không đọc database cũng không giữ bí mật.
 */
import { FeynmanAiError } from "./errors.ts";
import {
  findForbiddenKeys,
  resolveSourceBasis,
  weaknessRowsForAi,
  hasEnoughWeaknessData,
  INSUFFICIENT_WEAKNESS_DATA_NOTE,
  type WeaknessRowLike,
} from "./rules.ts";

/* ------------------------------------------------------------------ */
/* 1. Kiểu dữ liệu vào — cố tình hẹp                                    */
/* ------------------------------------------------------------------ */

/**
 * Một câu học viên đã tick để chữa.
 *
 * KHÔNG có `id`, `reviewId`, `userId`. Kiểu hẹp như vậy là để lỡ ai đó truyền
 * cả bản ghi `FeynmanMistake` vào thì TypeScript nhận ra ngay, chứ không phải
 * chờ tới lúc `assertPayloadClean()` chạy.
 */
export type MistakeInput = {
  questionId: string;
  numberLabel: string;
  questionType: string;
  partNumber: number;
  prompt: string;
  userAnswer: string;
  correctAnswer: string;
  /** Lời giải chụp lúc học viên tick câu này. */
  modelExplanation: string | null;
  /** Lời giải hiện tại trong nội dung đề. */
  liveExplanation: string | null;
  /** Đoạn văn chứa bằng chứng, nếu biết. */
  evidenceParagraph: string | null;
  /** Phần học viên tự giảng lại — thứ chính cần chấm. */
  revisedExplanation: string | null;
  lessonRule: string | null;
};

export type EvaluationContextInput = {
  /** Tiêu đề đề bài, dùng cho model định hướng chủ đề. */
  exerciseTitle: string;
  /** Các đoạn văn liên quan, đã lọc theo part của những câu được tick. */
  passages: Array<{ partNumber: number; title: string; paragraphs: string[] }>;
  mistakes: MistakeInput[];
  /** Phần tổng kết học viên viết ở cuối phiên Feynman. */
  finalTeachBack: string | null;
  finalRule: string | null;
  confusingPoint: string | null;
  /** Band hiện tại và band mục tiêu, để lời khuyên bám đúng khoảng cách. */
  currentBand: number | null;
  targetBand: number | null;
  weaknessRows: WeaknessRowLike[];
};

/* ------------------------------------------------------------------ */
/* 2. Payload — đúng những gì rời khỏi máy chủ                          */
/* ------------------------------------------------------------------ */

export type EvaluationPayload = {
  deBai: string;
  doanVan: Array<{ phan: number; tieuDe: string; doan: string[] }>;
  cacCau: Array<{
    maCau: string;
    soCau: string;
    dangCau: string;
    deCau: string;
    hocVienChon: string;
    dapAnDung: string;
    loiGiaiGiaoVien: string | null;
    nguonLoiGiai: string;
    doanChuaBangChung: string | null;
    hocVienTuGiang: string;
    quyTacRutRa: string | null;
  }>;
  tongKet: {
    tuGiangChung: string | null;
    quyTacChung: string | null;
    diemConLan: string | null;
  };
  hocLuc: {
    bandHienTai: number | null;
    bandMucTieu: number | null;
    soHo: Array<{ dangCau: string; soMau: number; tyLeDung: number }>;
    ghiChu: string | null;
  };
};

const MAX_PARAGRAPH_CHARS = 4_000;
const MAX_FIELD_CHARS = 3_000;

/**
 * Cắt bớt chuỗi quá dài trước khi gửi.
 *
 * Có hai lý do, và lý do thứ hai mới là lý do thật: một là tiền token, hai là
 * một trường dài bất thường thường có nghĩa là ai đó dán cả một tài liệu vào ô
 * nhập để đẩy model ra khỏi hướng dẫn.
 */
function clamp(value: string | null | undefined, max: number): string {
  if (!value) return "";
  const text = String(value).trim();
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function nullIfEmpty(value: string): string | null {
  return value === "" ? null : value;
}

/**
 * Lắp payload cho lần chấm.
 *
 * Thứ tự `cacCau` phải giữ nguyên thứ tự nhận vào: model được dặn trả về nhận
 * xét theo đúng thứ tự đó, và tầng lưu kết quả ghép lại theo `maCau`.
 */
export function buildEvaluationPayload(
  input: EvaluationContextInput
): EvaluationPayload {
  const enoughWeakness = hasEnoughWeaknessData(input.weaknessRows);

  const payload: EvaluationPayload = {
    deBai: clamp(input.exerciseTitle, 300),
    doanVan: input.passages.map((p) => ({
      phan: p.partNumber,
      tieuDe: clamp(p.title, 300),
      doan: p.paragraphs.map((text) => clamp(text, MAX_PARAGRAPH_CHARS)),
    })),
    cacCau: input.mistakes.map((m) => {
      const source = resolveSourceBasis({
        snapshotExplanation: m.modelExplanation,
        liveExplanation: m.liveExplanation,
      });
      return {
        maCau: m.questionId,
        soCau: clamp(m.numberLabel, 20),
        dangCau: clamp(m.questionType, 40),
        deCau: clamp(m.prompt, MAX_FIELD_CHARS),
        hocVienChon: clamp(m.userAnswer, 500),
        dapAnDung: clamp(m.correctAnswer, 500),
        loiGiaiGiaoVien: source.explanation
          ? clamp(source.explanation, MAX_FIELD_CHARS)
          : null,
        nguonLoiGiai: source.basis,
        doanChuaBangChung: nullIfEmpty(clamp(m.evidenceParagraph, 40)),
        hocVienTuGiang: clamp(m.revisedExplanation, MAX_FIELD_CHARS),
        quyTacRutRa: nullIfEmpty(clamp(m.lessonRule, MAX_FIELD_CHARS)),
      };
    }),
    tongKet: {
      tuGiangChung: nullIfEmpty(clamp(input.finalTeachBack, MAX_FIELD_CHARS)),
      quyTacChung: nullIfEmpty(clamp(input.finalRule, MAX_FIELD_CHARS)),
      diemConLan: nullIfEmpty(clamp(input.confusingPoint, MAX_FIELD_CHARS)),
    },
    hocLuc: {
      bandHienTai: input.currentBand,
      bandMucTieu: input.targetBand,
      // Dòng chưa đủ mẫu bị BỎ HẲN chứ không gửi kèm lời dặn "đừng kết luận".
      soHo: weaknessRowsForAi(input.weaknessRows).map((row) => ({
        dangCau: clamp(row.questionType, 40),
        soMau: row.samples,
        tyLeDung: row.accuracyPercent,
      })),
      ghiChu: enoughWeakness ? null : INSUFFICIENT_WEAKNESS_DATA_NOTE,
    },
  };

  assertPayloadClean(payload);
  return payload;
}

/* ------------------------------------------------------------------ */
/* 3. Payload hỏi đáp                                                   */
/* ------------------------------------------------------------------ */

export type ChatContextInput = {
  /** Chính payload đã dùng lúc chấm — model cần cùng bối cảnh để trả lời. */
  evaluation: EvaluationPayload;
  /** Kết luận của lần chấm, để model không nói ngược lại chính nó. */
  ketLuan: { verdict: string; diemTuongDong: number };
  /** Vài lượt hỏi đáp gần nhất, cũ nhất trước. */
  lichSu: Array<{ hoi: string; dap: string }>;
  cauHoi: string;
};

export type ChatPayload = {
  boiCanh: EvaluationPayload;
  ketLuan: { ketQua: string; diemTuongDong: number };
  lichSu: Array<{ hoi: string; dap: string }>;
  cauHoi: string;
};

/** Chỉ giữ vài lượt gần nhất: đủ để hiểu mạch, không đủ để thổi phồng hóa đơn. */
const MAX_HISTORY_TURNS = 4;
const MAX_QUESTION_CHARS = 1_000;

export function buildChatPayload(input: ChatContextInput): ChatPayload {
  const payload: ChatPayload = {
    boiCanh: input.evaluation,
    ketLuan: {
      ketQua: input.ketLuan.verdict,
      diemTuongDong: input.ketLuan.diemTuongDong,
    },
    lichSu: input.lichSu.slice(-MAX_HISTORY_TURNS).map((turn) => ({
      hoi: clamp(turn.hoi, MAX_QUESTION_CHARS),
      dap: clamp(turn.dap, MAX_FIELD_CHARS),
    })),
    cauHoi: clamp(input.cauHoi, MAX_QUESTION_CHARS),
  };

  assertPayloadClean(payload);
  return payload;
}

/* ------------------------------------------------------------------ */
/* 4. Hàng rào cuối                                                     */
/* ------------------------------------------------------------------ */

/**
 * Chặn payload có khóa cấm. Ném lỗi chứ không lọc bỏ rồi gửi tiếp.
 *
 * Lọc âm thầm sẽ giấu đi việc một trường cá nhân đã lọt tới tận đây, và lần sau
 * nó lọt vào một đường khác không có hàng rào. Ném lỗi thì bộ kiểm thử đỏ ngay
 * trên máy người sửa, trước khi kịp lên production.
 */
export function assertPayloadClean(payload: unknown): void {
  const found = findForbiddenKeys(payload);
  if (found.length > 0) {
    throw new FeynmanAiError(
      "INTERNAL_ERROR",
      `Payload chua khoa cam: ${found.join(", ")}`
    );
  }
}
