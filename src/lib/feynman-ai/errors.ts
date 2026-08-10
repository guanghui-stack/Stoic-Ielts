/**
 * Mã lỗi và việc làm sạch thông báo lỗi trước khi lưu hoặc trả về.
 *
 * Vì sao cần: thông báo lỗi của SDK OpenAI có thể chứa nguyên đoạn request,
 * và request thì chứa nội dung bài của học viên. Nguy hiểm hơn, một số dạng
 * lỗi mạng nhúng cả header Authorization vào chuỗi. Lưu thẳng vào database
 * hoặc in ra log là lộ khóa API.
 */

export type FeynmanAiErrorCode =
  | "FEATURE_DISABLED"
  | "NO_ACCESS"
  | "COMPETITION_LOCKED"
  | "QUOTA_EXHAUSTED"
  | "DAILY_LIMIT_REACHED"
  | "CHAT_LIMIT_REACHED"
  | "REVIEW_NOT_COMPLETED"
  | "ALREADY_GRADED"
  /** Một request khác đang chấm chính phiên này — khác hẳn "đã chấm xong". */
  | "EVALUATION_IN_PROGRESS"
  | "EVALUATION_NOT_READY"
  | "QUESTION_TOO_SHORT"
  | "QUESTION_TOO_LONG"
  | "OUT_OF_SCOPE"
  | "INVALID_REQUEST"
  | "RATE_LIMITED"
  | "UPSTREAM_TIMEOUT"
  | "UPSTREAM_ERROR"
  | "MALFORMED_OUTPUT"
  | "INTERNAL_ERROR";

export class FeynmanAiError extends Error {
  // Khai báo và gán tường minh, KHÔNG dùng "parameter property" (readonly ngay
  // trong tham số constructor): bộ kiểm thử chạy bằng `node
  // --experimental-strip-types`, chế độ này chỉ xóa chú thích kiểu chứ không
  // sinh mã, nên cú pháp đó làm cả bộ kiểm thử không khởi động được.
  readonly code: FeynmanAiErrorCode;

  constructor(code: FeynmanAiErrorCode, message?: string) {
    super(message ?? code);
    this.name = "FeynmanAiError";
    this.code = code;
  }
}

/**
 * Những mẫu tuyệt đối không được lọt vào chuỗi lỗi đã lưu.
 * Danh sách cố tình rộng tay: thà che nhầm một chuỗi vô hại còn hơn để lọt
 * một khóa API vào database.
 */
const SECRET_PATTERNS: RegExp[] = [
  /sk-[A-Za-z0-9_-]{8,}/g,          // khóa OpenAI
  /Bearer\s+[A-Za-z0-9._-]{8,}/gi,  // header Authorization
  /mysql:\/\/[^\s"']+/gi,           // chuỗi kết nối database
  /postgres(ql)?:\/\/[^\s"']+/gi,
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, // email học viên
];

const MAX_ERROR_CHARS = 300;

/**
 * Làm sạch lỗi trước khi lưu vào cột `errorCode` hoặc ghi log.
 * Luôn trả về chuỗi ngắn, đã che bí mật, không bao giờ ném ra lỗi mới.
 */
export function sanitizeErrorMessage(err: unknown): string {
  let text: string;
  try {
    text = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  } catch {
    return "UNKNOWN_ERROR";
  }

  for (const pattern of SECRET_PATTERNS) {
    text = text.replace(pattern, "[da-che]");
  }

  return text.slice(0, MAX_ERROR_CHARS);
}

/** Xếp lỗi của SDK về một mã ổn định để trang quản trị thống kê được. */
export function classifyUpstreamError(err: unknown): FeynmanAiErrorCode {
  const status = (err as { status?: number } | null)?.status;

  if (status === 429) return "RATE_LIMITED";
  if (typeof status === "number" && status >= 500) return "UPSTREAM_ERROR";

  const name = (err as { name?: string } | null)?.name ?? "";
  if (name === "AbortError" || name === "TimeoutError") return "UPSTREAM_TIMEOUT";

  return "UPSTREAM_ERROR";
}

/**
 * Lỗi nào thì HOÀN LẠI lượt đã giữ chỗ.
 *
 * Nguyên tắc: học viên chỉ mất lượt khi thật sự nhận được kết quả dùng được.
 * Mọi thất bại về phía hệ thống đều hoàn lượt — kể cả khi OpenAI đã tính tiền
 * chúng ta, vì đó là chi phí vận hành chứ không phải lỗi của học viên.
 */
export function shouldRefundQuota(code: FeynmanAiErrorCode): boolean {
  switch (code) {
    case "RATE_LIMITED":
    case "UPSTREAM_TIMEOUT":
    case "UPSTREAM_ERROR":
    case "MALFORMED_OUTPUT":
    case "INTERNAL_ERROR":
    case "OUT_OF_SCOPE":
    case "INVALID_REQUEST":
      return true;
    default:
      return false;
  }
}
