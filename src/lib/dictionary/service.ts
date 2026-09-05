/**
 * Luồng tra từ: cache trước, rồi mới ra mạng.
 *
 * Thứ tự này là lý do tính năng không phụ thuộc vào độ ổn định của API miễn
 * phí. Vốn từ học thuật trong kho Reading lặp lại rất nhiều, nên sau vài tuần
 * phần lớn lượt tra không còn chạm mạng — và khi nhà cung cấp sập, học viên
 * vẫn tra được những từ đã có.
 */
import "server-only";
import { db } from "@/lib/db";
import {
  DEFINITION_PROVIDERS,
  LOOKUP_BUDGET_MS,
  SYNONYM_PROVIDERS,
  mayCachePermanently,
  normalizeTerm,
  quotaKey,
  shouldFallThrough,
  usableProviders,
  type ProviderId,
} from "./lookup-rules.ts";
import { hasProviderKey, readDictionaryConfig } from "./config.ts";
import { DEFINITION_CALLERS, callStands4 } from "./providers.ts";
import type { DictionaryResult, SynonymResult } from "./parsers.ts";

export type LookupOutcome =
  | { status: "DISABLED" }
  | { status: "BAD_TERM" }
  | { status: "NOT_FOUND"; term: string }
  | { status: "UNAVAILABLE"; term: string }
  | { status: "OK"; term: string; fromCache: boolean; result: DictionaryResult };

/* ===================== Cache ===================== */

async function readCache(term: string): Promise<{ found: boolean; payload: string } | null> {
  try {
    const row = await db.dictionaryEntry.findUnique({
      where: { term },
      select: { found: true, payload: true },
    });
    return row ?? null;
  } catch (err) {
    // Cache hỏng thì đi tiếp ra mạng, không làm chết cả lượt tra.
    console.error("[wobridges] Khong doc duoc cache tu dien:", err);
    return null;
  }
}

async function writeCache(
  term: string,
  provider: ProviderId,
  found: boolean,
  payload: unknown,
): Promise<void> {
  // Oxford và STANDS4 là dữ liệu thương mại — hợp đồng thường cấm lưu lâu dài.
  if (!mayCachePermanently(provider)) return;
  try {
    const data = { provider, found, payload: JSON.stringify(payload ?? null) };
    await db.dictionaryEntry.upsert({ where: { term }, update: data, create: { term, ...data } });
  } catch (err) {
    console.error("[wobridges] Khong ghi duoc cache tu dien:", err);
  }
}

/* ===================== Đếm hạn mức ngày ===================== */

async function usageToday(ids: readonly ProviderId[]): Promise<Record<string, number>> {
  const today = new Date();
  const keys = ids.map((id) => quotaKey(id, today));
  try {
    const rows = await db.config.findMany({
      where: { key: { in: keys } },
      select: { key: true, value: true },
    });
    const usage: Record<string, number> = {};
    for (const id of ids) {
      const row = rows.find((r) => r.key === quotaKey(id, today));
      const n = row ? Number.parseInt(row.value, 10) : 0;
      // Giá trị hỏng đọc thành 0 sẽ MỞ TOANG hạn mức, nên hỏng thì coi như đã
      // dùng hết — thà mất một nhà còn hơn mất quota.
      usage[id] = Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
    }
    return usage;
  } catch (err) {
    console.error("[wobridges] Khong doc duoc han muc tu dien:", err);
    // Không đọc được thì chỉ cho phép nhà không quota chạy.
    const usage: Record<string, number> = {};
    for (const id of ids) usage[id] = Number.MAX_SAFE_INTEGER;
    return usage;
  }
}

async function bumpUsage(id: ProviderId): Promise<void> {
  const key = quotaKey(id, new Date());
  try {
    const row = await db.config.findUnique({ where: { key }, select: { value: true } });
    const current = row ? Number.parseInt(row.value, 10) : 0;
    const next = String((Number.isFinite(current) ? current : 0) + 1);
    await db.config.upsert({ where: { key }, update: { value: next }, create: { key, value: next } });
  } catch (err) {
    console.error("[wobridges] Khong ghi duoc han muc tu dien:", err);
  }
}

/* ===================== Tra định nghĩa ===================== */

export async function lookupDefinition(rawTerm: string): Promise<LookupOutcome> {
  const config = readDictionaryConfig();
  if (!config.enabled) return { status: "DISABLED" };

  const term = normalizeTerm(rawTerm);
  if (!term) return { status: "BAD_TERM" };

  const cached = await readCache(term);
  if (cached) {
    if (!cached.found) return { status: "NOT_FOUND", term };
    try {
      return {
        status: "OK",
        term,
        fromCache: true,
        result: JSON.parse(cached.payload) as DictionaryResult,
      };
    } catch {
      // Bản ghi hỏng: bỏ qua cache, đi tiếp ra mạng rồi ghi đè.
    }
  }

  const ids = DEFINITION_PROVIDERS.map((p) => p.id);
  const usage = await usageToday(ids);
  const chain = usableProviders(DEFINITION_PROVIDERS, usage, hasProviderKey);

  const deadline = Date.now() + LOOKUP_BUDGET_MS;
  let sawProviderDown = false;

  for (const provider of chain) {
    // Hết ngân sách thì dừng: học viên chờ tiếp cũng không còn nghĩa gì.
    if (Date.now() >= deadline) break;
    const call = DEFINITION_CALLERS[provider.id];
    if (!call) continue;

    // Đếm TRƯỚC khi gọi: gọi xong mới đếm thì một đợt gọi song song có thể
    // vượt trần trước khi con số kịp tăng.
    if (provider.dailyCap !== null) await bumpUsage(provider.id);

    const reply = await call(term);

    if (reply.outcome === "FOUND" && reply.definition) {
      await writeCache(term, provider.id, true, reply.definition);
      return { status: "OK", term, fromCache: false, result: reply.definition };
    }
    if (reply.outcome === "NOT_FOUND") {
      // Nhà còn sống và khẳng định không có từ này. Dừng chuỗi — rơi tiếp chỉ
      // tốn quota. Cache lại để lần sau khỏi hỏi mạng.
      await writeCache(term, provider.id, false, null);
      return { status: "NOT_FOUND", term };
    }
    if (shouldFallThrough(reply.outcome)) sawProviderDown = true;
  }

  // Không nhà nào trả lời được: KHÔNG cache, vì đây là lỗi tạm thời chứ không
  // phải kết luận về từ đó. Cache lúc này nghĩa là một phút API chập chờn sẽ
  // biến thành "từ này không tồn tại" vĩnh viễn.
  if (sawProviderDown) {
    console.warn(`[wobridges] Tra tu "${term}": moi nha cung cap deu khong tra loi.`);
  }
  return { status: "UNAVAILABLE", term };
}

/* ===================== Tra từ đồng nghĩa ===================== */

export type SynonymOutcome =
  | { status: "DISABLED" }
  | { status: "BAD_TERM" }
  | { status: "UNAVAILABLE" }
  | { status: "OK"; result: SynonymResult };

/**
 * Tách hẳn khỏi luồng định nghĩa: STANDS4 không trả định nghĩa nên không thay
 * thế được nhà nào, và nó có hạn mức riêng.
 */
export async function lookupSynonyms(rawTerm: string): Promise<SynonymOutcome> {
  const config = readDictionaryConfig();
  if (!config.enabled) return { status: "DISABLED" };

  const term = normalizeTerm(rawTerm);
  if (!term) return { status: "BAD_TERM" };

  const chain = usableProviders(
    SYNONYM_PROVIDERS,
    await usageToday(SYNONYM_PROVIDERS.map((p) => p.id)),
    hasProviderKey,
  );
  if (chain.length === 0) return { status: "UNAVAILABLE" };

  await bumpUsage("STANDS4");
  const reply = await callStands4(term);
  return reply.outcome === "FOUND" && reply.synonym
    ? { status: "OK", result: reply.synonym }
    : { status: "UNAVAILABLE" };
}
