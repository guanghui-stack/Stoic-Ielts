/**
 * NƠI DUY NHẤT đọc `OPENAI_API_KEY` trong toàn bộ mã nguồn.
 *
 * Khóa không đi qua bất kỳ giá trị trả về nào, không vào log, không vào
 * database. `config.ts` cố tình không export nó — muốn biết đã cấu hình chưa
 * thì hỏi `readFeynmanAiConfig().enabled`.
 *
 * Gọi thẳng bằng `fetch` thay vì SDK là cố ý: dự án chỉ cần đúng một endpoint,
 * và thêm một gói phụ thuộc chỉ để gửi một POST là mở thêm một đường cho mã lạ
 * chạy trên máy chủ giữ khóa API và dữ liệu học viên.
 */
import "server-only";
import { readFeynmanAiConfig } from "./config.ts";
import {
  FeynmanAiError,
  classifyUpstreamError,
  sanitizeErrorMessage,
} from "./errors.ts";

const RESPONSES_URL = "https://api.openai.com/v1/responses";

export type JsonSchemaFormat = {
  name: string;
  schema: Record<string, unknown>;
};

export type ResponsesCall = {
  /** Lời nhắc hệ thống — luật chơi, không chứa dữ liệu học viên. */
  instructions: string;
  /** Dữ liệu bài làm, đã qua `assertPayloadClean()`. */
  input: string;
  /** Buộc model trả về JSON đúng cấu trúc; thiếu nó thì mỗi lần một kiểu. */
  format: JsonSchemaFormat;
  maxOutputTokens: number;
};

export type ResponsesResult = {
  /** Chuỗi JSON model trả về, CHƯA parse. */
  text: string;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  requestId: string | null;
  latencyMs: number;
};

/**
 * Lấy khóa tại chỗ dùng, không giữ ở biến cấp module.
 *
 * Giữ ở cấp module thì khóa nằm trong bộ nhớ suốt vòng đời tiến trình và lọt
 * vào mọi bản kết xuất heap khi gỡ lỗi.
 */
function apiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new FeynmanAiError("FEATURE_DISABLED", "Chua cau hinh khoa API");
  return key;
}

/**
 * Rút phần văn bản khỏi phản hồi Responses API.
 *
 * Cấu trúc là một mảng `output` gồm nhiều khối; model suy luận trả về cả khối
 * `reasoning` không có `content`. Duyệt hết và chỉ nhặt `output_text` — lấy
 * `output[0]` sẽ ra rỗng đúng vào những lần model suy luận nhiều nhất.
 */
function extractText(body: unknown): string {
  const root = body as { output?: unknown; output_text?: unknown } | null;
  if (!root) return "";

  // Một số phiên bản trả sẵn trường gộp; dùng được thì khỏi duyệt.
  if (typeof root.output_text === "string" && root.output_text.trim()) {
    return root.output_text;
  }

  const output = Array.isArray(root.output) ? root.output : [];
  const parts: string[] = [];

  for (const block of output) {
    if (typeof block !== "object" || block === null) continue;
    const content = (block as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;

    for (const piece of content) {
      if (typeof piece !== "object" || piece === null) continue;
      const p = piece as { type?: unknown; text?: unknown };
      if (p.type === "output_text" && typeof p.text === "string") {
        parts.push(p.text);
      }
    }
  }

  return parts.join("");
}

function readUsage(body: unknown): {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
} {
  const usage = (body as { usage?: Record<string, unknown> } | null)?.usage;
  const num = (value: unknown): number =>
    typeof value === "number" && Number.isFinite(value) ? value : 0;

  const details = usage?.input_tokens_details as
    | Record<string, unknown>
    | undefined;

  return {
    inputTokens: num(usage?.input_tokens),
    outputTokens: num(usage?.output_tokens),
    cachedInputTokens: num(details?.cached_tokens),
  };
}

/**
 * Gọi Responses API một lần, có hạn giờ.
 *
 * KHÔNG tự thử lại. Mỗi lần gọi là một lần tốn tiền, và tầng trên đã giữ chỗ
 * một lượt của học viên trước khi gọi — thử lại ngầm ở đây sẽ nhân đôi hóa đơn
 * mà học viên vẫn chỉ mất một lượt. Muốn thử lại thì để học viên tự bấm.
 */
export async function callResponses(
  call: ResponsesCall
): Promise<ResponsesResult> {
  const config = readFeynmanAiConfig();
  const startedAt = Date.now();

  // AbortSignal.timeout() ném ra TimeoutError, đúng thứ classifyUpstreamError
  // đang chờ để xếp thành UPSTREAM_TIMEOUT.
  const signal = AbortSignal.timeout(config.timeoutMs);

  let response: Response;
  try {
    response = await fetch(RESPONSES_URL, {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey()}`,
      },
      body: JSON.stringify({
        model: config.model,
        instructions: call.instructions,
        input: call.input,
        max_output_tokens: call.maxOutputTokens,
        // Không lưu lại phía OpenAI: dữ liệu bài làm của học viên không có lý
        // do gì phải nằm trên máy chủ của bên thứ ba sau khi đã trả lời xong.
        store: false,
        text: {
          format: {
            type: "json_schema",
            name: call.format.name,
            schema: call.format.schema,
            strict: true,
          },
        },
      }),
    });
  } catch (error) {
    throw new FeynmanAiError(
      classifyUpstreamError(error),
      sanitizeErrorMessage(error)
    );
  }

  const requestId = response.headers.get("x-request-id");

  if (!response.ok) {
    // Đọc thân lỗi để biết vì sao, nhưng luôn làm sạch trước khi cho đi tiếp:
    // thân lỗi của OpenAI có thể chứa nguyên đoạn request đã gửi.
    let detail = "";
    try {
      detail = (await response.text()).slice(0, 500);
    } catch {
      detail = "";
    }
    const error = Object.assign(new Error(detail || response.statusText), {
      status: response.status,
    });
    throw new FeynmanAiError(
      classifyUpstreamError(error),
      sanitizeErrorMessage(error)
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    throw new FeynmanAiError("MALFORMED_OUTPUT", sanitizeErrorMessage(error));
  }

  const text = extractText(body);
  if (!text.trim()) {
    // Hay gặp nhất khi max_output_tokens quá thấp: model tiêu hết trần vào
    // reasoning token và không còn chỗ cho câu trả lời.
    throw new FeynmanAiError("MALFORMED_OUTPUT", "Phan hoi rong");
  }

  const usage = readUsage(body);

  return {
    text,
    ...usage,
    requestId,
    latencyMs: Date.now() - startedAt,
  };
}

/**
 * Parse JSON model trả về. Model đôi khi bọc trong ```json dù đã ép schema.
 */
export function parseModelJson(text: string): unknown {
  const trimmed = text.trim();
  const unfenced = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
    : trimmed;

  try {
    return JSON.parse(unfenced);
  } catch (error) {
    throw new FeynmanAiError("MALFORMED_OUTPUT", sanitizeErrorMessage(error));
  }
}
