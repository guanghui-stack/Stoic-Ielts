/**
 * Luật tra từ điển — hàm THUẦN, không chạm mạng và không chạm database, nên
 * kiểm thử được bằng node trần (scripts/test-dictionary.ts).
 *
 * Hai quyết định quan trọng nhất của tính năng này nằm ở đây:
 *
 *  1. Phân biệt "NHÀ CUNG CẤP HỎNG" với "TỪ KHÔNG TỒN TẠI". Chỉ trường hợp đầu
 *     mới được rơi xuống nhà kế tiếp. Nếu gộp hai ca này, mỗi lần học viên gõ
 *     sai chính tả sẽ gọi lần lượt cả chuỗi và đốt sạch quota nhà trả phí.
 *
 *  2. Hạn mức cứng theo ngày cho từng nhà, đặt THẤP HƠN trần thật để không bao
 *     giờ chạm trần. Chạm trần nghĩa là nhà cung cấp khoá khoá API, không phải
 *     chỉ từ chối một lượt.
 */

export type ProviderId = "WIKTIONARY" | "DICTIONARYAPI" | "OXFORD" | "STANDS4";

/** Nhà trả định nghĩa hay chỉ trả từ đồng nghĩa — hai việc khác nhau. */
export type ProviderKind = "DEFINITION" | "SYNONYM";

export type Provider = Readonly<{
  id: ProviderId;
  kind: ProviderKind;
  label: string;
  /**
   * Số lượt tối đa MỖI NGÀY mà ta tự cho phép. `null` = nhà không đặt quota
   * (Wikimedia), nhưng vẫn phải lịch sự nên tầng gọi có nhịp riêng.
   *
   * Con số ở đây là trần CỦA TA, luôn thấp hơn trần nhà cung cấp công bố, để
   * còn biên an toàn khi đếm bị lệch (nhiều tiến trình, deploy giữa ngày).
   */
  dailyCap: number | null;
  /** Cần khoá API mới gọi được — thiếu khoá thì bỏ qua nhà này, không báo lỗi. */
  needsApiKey: boolean;
}>;

/**
 * Thứ tự thử. Wiktionary đứng đầu chứ không phải dictionaryapi.dev, dù cái sau
 * trả JSON sạch hơn: dictionaryapi.dev chỉ là lớp bọc quanh chính Wiktionary,
 * và ca "từ không tồn tại" của nó trả 522 treo ~15 giây thay vì báo không tìm
 * thấy. Nguồn gốc vừa ổn định hơn vừa xử lý đúng ca đó.
 */
export const DEFINITION_PROVIDERS: readonly Provider[] = [
  {
    id: "WIKTIONARY",
    kind: "DEFINITION",
    label: "Wiktionary",
    dailyCap: null,
    needsApiKey: false,
  },
  {
    id: "DICTIONARYAPI",
    kind: "DEFINITION",
    label: "dictionaryapi.dev",
    dailyCap: null,
    needsApiKey: false,
  },
  {
    id: "OXFORD",
    kind: "DEFINITION",
    label: "Oxford Dictionaries",
    // Gói free công bố 500/ngày. Ta tự chặn ở 300 để chừa biên; và chỉ tới đây
    // khi hai nhà miễn phí trên đều chết, nên con số này gần như không dùng tới.
    dailyCap: 300,
    needsApiKey: true,
  },
];

/**
 * Từ đồng nghĩa là tính năng RIÊNG, không nằm trong chuỗi dự phòng định nghĩa:
 * STANDS4 không trả định nghĩa nên không thay thế được nhà nào ở trên.
 */
export const SYNONYM_PROVIDERS: readonly Provider[] = [
  {
    id: "STANDS4",
    kind: "SYNONYM",
    label: "synonyms.com (STANDS4)",
    dailyCap: 100,
    needsApiKey: true,
  },
];

export const ALL_PROVIDERS: readonly Provider[] = [
  ...DEFINITION_PROVIDERS,
  ...SYNONYM_PROVIDERS,
];

/** Tổng thời gian cho MỘT lượt tra, tính cả các lần rơi nhà. */
export const LOOKUP_BUDGET_MS = 5_000;
/** Trần cho một nhà. Ngắn hơn hẳn budget để còn kịp thử nhà sau. */
export const PROVIDER_TIMEOUT_MS = 2_500;

/* ===================== Chuẩn hoá từ khoá ===================== */

/** Dài hơn mức này thì không còn là "một từ" nữa — nhiều khả năng dán cả câu. */
export const MAX_TERM_LENGTH = 40;

/**
 * Chuẩn hoá từ người học bôi đen.
 *
 * Trả `null` khi không đáng đem đi tra: rỗng, quá dài, hoặc không có chữ cái
 * Latin nào. Chặn ở đây để một cú bôi nhầm cả đoạn không thành một lượt gọi
 * mạng — và để khoá cache không bị phân mảnh vì hoa/thường hay dấu câu.
 */
export function normalizeTerm(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw
    .normalize("NFKC")
    .toLowerCase()
    // Bỏ dấu câu bám hai đầu nhưng GIỮ gạch nối và nháy đơn giữa từ:
    // "well-known" và "don't" là từ thật, không phải nhiễu.
    .replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "")
    .trim();
  if (!cleaned) return null;
  if (cleaned.length > MAX_TERM_LENGTH) return null;
  if (!/\p{L}/u.test(cleaned)) return null;
  // Cụm nhiều từ vẫn cho qua (idiom), nhưng chặn ở 3 từ để khỏi thành cả câu.
  if (cleaned.split(/\s+/).length > 3) return null;
  return cleaned;
}

/* ===================== Phân loại kết quả ===================== */

export type Outcome = "FOUND" | "NOT_FOUND" | "PROVIDER_DOWN";

/**
 * Nhìn mã HTTP để biết nên rơi nhà hay dừng.
 *
 * 404 là câu trả lời HỢP LỆ: nhà cung cấp còn sống và khẳng định không có từ
 * đó. Rơi tiếp là vô nghĩa và tốn quota. Ngược lại 5xx, 429 và timeout đều là
 * nhà cung cấp có vấn đề, khi đó nhà sau có thể trả lời được.
 *
 * 522 (Cloudflare) tuy là 5xx nhưng đáng nói riêng: đó chính là cách
 * dictionaryapi.dev "trả lời" khi không tìm thấy từ. Ta vẫn xếp nó vào
 * PROVIDER_DOWN vì không thể phân biệt được với sập thật — và vì thế nhà đó
 * không nên đứng đầu chuỗi.
 */
export function classifyHttpStatus(status: number): Outcome {
  if (status >= 200 && status < 300) return "FOUND";
  if (status === 404) return "NOT_FOUND";
  return "PROVIDER_DOWN";
}

/** Chỉ hỏng ở tầng nhà cung cấp mới được thử nhà kế tiếp. */
export function shouldFallThrough(outcome: Outcome): boolean {
  return outcome === "PROVIDER_DOWN";
}

/* ===================== Hạn mức ngày ===================== */

export type QuotaUsage = Readonly<Record<string, number>>;

/** Khoá đếm theo NGÀY (UTC) để reset tự nhiên, không cần cron dọn. */
export function quotaKey(provider: ProviderId, day: Date): string {
  const iso = day.toISOString().slice(0, 10);
  return `DICT_QUOTA:${provider}:${iso}`;
}

/**
 * Còn lượt cho nhà này hôm nay không.
 *
 * `dailyCap === null` nghĩa là nhà không đặt quota. Vẫn trả true nhưng tầng
 * gọi phải tự giữ nhịp — "không quota" không đồng nghĩa với "gọi bao nhiêu
 * cũng được".
 */
export function withinDailyCap(provider: Provider, usedToday: number): boolean {
  if (provider.dailyCap === null) return true;
  return usedToday < provider.dailyCap;
}

/**
 * Lọc ra chuỗi nhà thật sự gọi được cho lượt này: còn quota, và có khoá API
 * nếu nhà đó đòi. Thiếu khoá thì lặng lẽ bỏ qua — người học không cần biết
 * quản trị viên chưa cấu hình Oxford.
 */
export function usableProviders(
  providers: readonly Provider[],
  usage: QuotaUsage,
  hasKey: (id: ProviderId) => boolean,
): Provider[] {
  return providers.filter((p) => {
    if (p.needsApiKey && !hasKey(p.id)) return false;
    return withinDailyCap(p, usage[p.id] ?? 0);
  });
}

/* ===================== Ghi công giấy phép ===================== */

/**
 * Wiktionary và dictionaryapi.dev đều phát hành theo CC BY-SA: được phép lưu
 * và hiển thị, ĐIỀU KIỆN là ghi nguồn. Đây là nghĩa vụ pháp lý chứ không phải
 * phép lịch sự, nên để cạnh dữ liệu thay vì rải trong giao diện.
 */
export const PROVIDER_ATTRIBUTION: Record<ProviderId, string> = {
  WIKTIONARY: "Wiktionary · CC BY-SA 3.0",
  DICTIONARYAPI: "Wiktionary qua dictionaryapi.dev · CC BY-SA 3.0",
  OXFORD: "Oxford Dictionaries",
  STANDS4: "synonyms.com (STANDS4)",
};

/**
 * Được phép lưu lâu dài không.
 *
 * Wiktionary CC BY-SA thì thoải mái. Oxford và STANDS4 là dữ liệu thương mại,
 * hợp đồng thường CẤM lưu trữ lâu dài — nên kết quả từ hai nhà đó chỉ được
 * giữ tạm, và mặc định của hệ thống là không cache.
 */
export function mayCachePermanently(provider: ProviderId): boolean {
  return provider === "WIKTIONARY" || provider === "DICTIONARYAPI";
}
