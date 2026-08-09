/**
 * Bảng giá token — để trang quản trị biết mỗi lượt AI tốn bao nhiêu.
 *
 * Con số ở đây là ƯỚC TÍNH cho mục đích theo dõi nội bộ, không phải hóa đơn.
 * Hóa đơn thật vẫn là thứ OpenAI gửi. Mục đích duy nhất: phát hiện sớm khi
 * một tài khoản hay một dạng câu hỏi đốt tiền bất thường.
 *
 * Không import "server-only": bộ kiểm thử chạy bằng node thuần cần đọc file
 * này, và nó không chứa bí mật nào — chỉ là giá công khai của OpenAI.
 */

/** Đổi bản này khi OpenAI đổi giá, để số liệu cũ vẫn tra được tính theo giá nào. */
export const COST_TABLE_VERSION = "2026-08-09-v1";

/** Giá USD cho MỘT TRIỆU token. */
type ModelPricing = {
  input: number;
  cachedInput: number;
  output: number;
};

const PRICING: Record<string, ModelPricing> = {
  "gpt-5-mini": { input: 0.25, cachedInput: 0.025, output: 2.0 },
};

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
};

/**
 * Chi phí ước tính, đơn vị MICRO-USD (một phần triệu đô).
 *
 * Dùng số nguyên micro-USD thay vì số thực USD là cố ý: cộng dồn hàng nghìn
 * số thực rất nhỏ sẽ tích lũy sai số dấu phẩy động, và cột tổng chi phí ở
 * trang quản trị sẽ lệch dần theo thời gian mà không ai biết vì sao.
 *
 * Model không có trong bảng giá thì trả 0 — vẫn chạy, vẫn lưu token, và trang
 * quản trị hiện "Chưa có bảng giá" thay vì bịa ra một con số sai.
 */
export function estimateCostMicroUsd(model: string, usage: TokenUsage): number {
  const price = PRICING[model];
  if (!price) return 0;

  const cached = usage.cachedInputTokens ?? 0;
  // Token đã cache được tính riêng và rẻ hơn nhiều, nên phải trừ ra khỏi
  // input thường, nếu không sẽ tính tiền hai lần cho cùng một token.
  const freshInput = Math.max(0, usage.inputTokens - cached);

  const usd =
    (freshInput * price.input +
      cached * price.cachedInput +
      usage.outputTokens * price.output) /
    1_000_000;

  return Math.round(usd * 1_000_000);
}

export function hasPricing(model: string): boolean {
  return Boolean(PRICING[model]);
}

/** Tỷ giá chỉ dùng để HIỂN THỊ ở trang quản trị, không dùng để tính tiền. */
export const VND_PER_USD = 26_000;

export function microUsdToVnd(microUsd: number): number {
  return Math.round((microUsd / 1_000_000) * VND_PER_USD);
}
