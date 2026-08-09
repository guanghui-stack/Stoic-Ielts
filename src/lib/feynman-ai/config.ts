/**
 * Cấu hình Feynman AI — đọc biến môi trường, KHÔNG bao giờ lộ khóa ra ngoài.
 *
 * Quy tắc: thiếu cấu hình thì mặc định TẮT. Một biến gõ sai không được biến
 * thành "bật với giá trị lạ" — vì thứ đứng sau nó là tiền API thật.
 *
 * File này KHÔNG export `OPENAI_API_KEY`. Khóa chỉ được đọc tại đúng một nơi
 * là `openai-client.ts`, và không đi qua bất kỳ giá trị trả về nào.
 */
import "server-only";

function intFromEnv(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;

  const parsed = Number.parseInt(raw, 10);
  // Giá trị lạ → dùng mặc định, KHÔNG dùng NaN. NaN lọt xuống phép so sánh
  // quota sẽ làm mọi so sánh trả false và mở toang giới hạn.
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export type FeynmanAiConfig = {
  enabled: boolean;
  model: string;
  timeoutMs: number;
  gradingPerPurchase: number;
  gradingPerDay: number;
  chatLimitFull: number;
  chatLimitSingle: number;
  maxQuestionsPerRun: number;
  evalMaxOutputTokens: number;
  chatMaxOutputTokens: number;
  invalidRequestsPerHour: number;
};

export function readFeynmanAiConfig(): FeynmanAiConfig {
  // So sánh chính xác với "true": mọi giá trị khác ("1", "yes", "TRUE", rỗng)
  // đều là TẮT. Bật một tính năng tốn tiền phải là hành động rõ ràng.
  const enabled = process.env.OPENAI_FEYNMAN_ENABLED === "true";

  return {
    // Không có khóa thì coi như tắt, dù cờ có bật. Bật mà thiếu khóa chỉ tạo ra
    // một nút bấm luôn báo lỗi cho học viên.
    enabled: enabled && Boolean(process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_FEYNMAN_MODEL || "gpt-5-mini",
    timeoutMs: intFromEnv("OPENAI_FEYNMAN_TIMEOUT_MS", 90_000, 5_000, 120_000),

    gradingPerPurchase: intFromEnv("OPENAI_FEYNMAN_GRADING_PER_PURCHASE", 10, 0, 100),
    gradingPerDay: intFromEnv("OPENAI_FEYNMAN_GRADING_PER_DAY", 1, 1, 10),
    chatLimitFull: intFromEnv("OPENAI_FEYNMAN_CHAT_LIMIT_FULL", 10, 0, 50),
    chatLimitSingle: intFromEnv("OPENAI_FEYNMAN_CHAT_LIMIT_SINGLE", 5, 0, 50),
    maxQuestionsPerRun: intFromEnv("OPENAI_FEYNMAN_MAX_QUESTIONS_PER_RUN", 10, 1, 40),

    // gpt-5-mini là reasoning model: max_output_tokens BAO GỒM cả reasoning
    // token. Đặt trần quá thấp làm JSON bị cắt giữa chừng và tốn tiền cho một
    // kết quả không dùng được. 4000 là mức tối thiểu an toàn cho lần chấm.
    evalMaxOutputTokens: intFromEnv("OPENAI_FEYNMAN_EVAL_MAX_OUTPUT", 4_000, 1_000, 32_000),
    chatMaxOutputTokens: intFromEnv("OPENAI_FEYNMAN_CHAT_MAX_OUTPUT", 1_200, 200, 8_000),
    invalidRequestsPerHour: intFromEnv("OPENAI_FEYNMAN_INVALID_REQUESTS_PER_HOUR", 3, 1, 100),
  };
}

/** Phiên bản prompt và schema — lưu kèm mỗi bản ghi để về sau đối chiếu được. */
export const PROMPT_VERSION = "2026-08-09-v1";
export const SCHEMA_VERSION = "2026-08-09-v1";
