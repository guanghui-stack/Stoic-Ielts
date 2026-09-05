/**
 * Gọi từng nhà cung cấp từ điển.
 *
 * Đây là nơi DUY NHẤT đọc khóa API. Mỗi hàm trả về một `ProviderReply` để tầng
 * trên biết nên dừng hay rơi xuống nhà kế tiếp — chứ không ném lỗi, vì "nhà này
 * hỏng" là chuyện bình thường trong luồng này, không phải sự cố.
 */
import "server-only";
import {
  PROVIDER_TIMEOUT_MS,
  classifyHttpStatus,
  type Outcome,
  type ProviderId,
} from "./lookup-rules.ts";
import {
  parseDictionaryApi,
  parseOxford,
  parseStands4,
  parseWiktionary,
  type DictionaryResult,
  type SynonymResult,
} from "./parsers.ts";

export type ProviderReply = Readonly<{
  outcome: Outcome;
  definition?: DictionaryResult | null;
  synonym?: SynonymResult | null;
}>;

/**
 * Gọi mạng có hạn giờ riêng cho từng nhà.
 *
 * `AbortSignal.timeout` chứ không phải chờ vô hạn: dictionaryapi.dev đã cho
 * thấy nó có thể treo tới khi Cloudflare bỏ cuộc (~15 giây). Một nhà treo lâu
 * là cả lượt tra hỏng, vì còn nhà sau đang chờ.
 */
async function fetchJson(
  url: string,
  headers: Record<string, string> = {},
): Promise<{ status: number; body: unknown }> {
  try {
    const res = await fetch(url, {
      headers: {
        // Wikimedia yêu cầu User-Agent nhận dạng được; thiếu nó có thể bị chặn.
        "User-Agent": "StoicIELTS/1.0 (https://stoic-ielts.online)",
        Accept: "application/json",
        ...headers,
      },
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) return { status: res.status, body: null };
    return { status: res.status, body: await res.json() };
  } catch {
    // Timeout, DNS hỏng, JSON vỡ — với tầng trên đều là "nhà này không dùng
    // được lúc này". Dùng 503 để classifyHttpStatus xếp vào PROVIDER_DOWN.
    return { status: 503, body: null };
  }
}

/** Bóc ra kết quả; bóc không nổi thì coi như nhà trả rỗng, KHÔNG dựng nghĩa sai. */
function definitionReply(
  status: number,
  parsed: DictionaryResult | null,
): ProviderReply {
  const outcome = classifyHttpStatus(status);
  if (outcome !== "FOUND") return { outcome };
  // 200 nhưng bóc không ra nghĩa nào: coi như không có từ, không rơi nhà —
  // nhà này còn sống và đã trả lời, rơi tiếp chỉ tốn quota.
  if (!parsed) return { outcome: "NOT_FOUND" };
  return { outcome: "FOUND", definition: parsed };
}

export async function callWiktionary(term: string): Promise<ProviderReply> {
  const url = `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(term)}`;
  const { status, body } = await fetchJson(url);
  return definitionReply(status, parseWiktionary(body, term));
}

export async function callDictionaryApi(term: string): Promise<ProviderReply> {
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(term)}`;
  const { status, body } = await fetchJson(url);
  return definitionReply(status, parseDictionaryApi(body, term));
}

export async function callOxford(term: string): Promise<ProviderReply> {
  const appId = process.env.OXFORD_APP_ID;
  const appKey = process.env.OXFORD_APP_KEY;
  // Tầng trên đã lọc nhà thiếu khóa, nhưng kiểm lại ở đây để file này tự đứng
  // vững nếu sau này có nơi khác gọi thẳng.
  if (!appId || !appKey) return { outcome: "PROVIDER_DOWN" };

  const url = `https://od-api-sandbox.oxforddictionaries.com/api/v2/entries/en-gb/${encodeURIComponent(term)}`;
  const { status, body } = await fetchJson(url, { app_id: appId, app_key: appKey });
  return definitionReply(status, parseOxford(body, term));
}

export async function callStands4(term: string): Promise<ProviderReply> {
  const uid = process.env.STANDS4_UID;
  const token = process.env.STANDS4_TOKEN;
  if (!uid || !token) return { outcome: "PROVIDER_DOWN" };

  const url =
    `https://www.stands4.com/services/v2/syno.php?uid=${encodeURIComponent(uid)}` +
    `&tokenid=${encodeURIComponent(token)}&word=${encodeURIComponent(term)}&format=json`;
  const { status, body } = await fetchJson(url);
  const outcome = classifyHttpStatus(status);
  if (outcome !== "FOUND") return { outcome };
  const parsed = parseStands4(body, term);
  return parsed ? { outcome: "FOUND", synonym: parsed } : { outcome: "NOT_FOUND" };
}

export const DEFINITION_CALLERS: Record<
  ProviderId,
  ((term: string) => Promise<ProviderReply>) | null
> = {
  WIKTIONARY: callWiktionary,
  DICTIONARYAPI: callDictionaryApi,
  OXFORD: callOxford,
  STANDS4: null,
};
