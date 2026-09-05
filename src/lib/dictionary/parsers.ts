/**
 * Bóc kết quả thô của từng nhà cung cấp về MỘT dạng chung.
 *
 * Hàm THUẦN, không chạm mạng — nên kiểm thử được bằng chính dữ liệu thật đã
 * chụp lại (scripts/test-dictionary.ts). Bóc tách là chỗ sinh lỗi nhiều nhất
 * của tính năng này, nên nó phải nằm ngoài tầng gọi mạng.
 *
 * Nguyên tắc chung: bóc không ra thì trả `null`, KHÔNG trả nửa vời. Một thẻ
 * từ điển hiện sai nghĩa còn tệ hơn một thẻ báo "không tra được".
 */
import { PROVIDER_ATTRIBUTION, type ProviderId } from "./lookup-rules.ts";

export type Sense = Readonly<{
  partOfSpeech: string | null;
  definition: string;
  example: string | null;
}>;

export type DictionaryResult = Readonly<{
  term: string;
  phonetic: string | null;
  audioUrl: string | null;
  senses: readonly Sense[];
  synonyms: readonly string[];
  antonyms: readonly string[];
  provider: ProviderId;
  attribution: string;
  sourceUrl: string | null;
}>;

/** Số nghĩa tối đa giữ lại — thẻ tra nhanh, không phải trang từ điển. */
const MAX_SENSES = 4;
const MAX_LIST = 8;

/**
 * Gỡ thẻ HTML khỏi định nghĩa Wiktionary.
 *
 * Wiktionary REST trả định nghĩa kèm thẻ `<a>` liên kết nội bộ và `<span>`
 * nhãn ngữ vực. Giữ nguyên chữ, bỏ thẻ; và bỏ luôn khoảng trắng thừa mà thẻ
 * rỗng để lại, nếu không định nghĩa sẽ mở đầu bằng một dấu cách.
 */
export function stripHtml(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

const clean = (list: unknown): string[] =>
  Array.isArray(list)
    ? [...new Set(list.filter((x): x is string => typeof x === "string" && x.trim() !== ""))]
        .map((x) => x.trim())
        .slice(0, MAX_LIST)
    : [];

function finish(
  partial: Omit<DictionaryResult, "attribution">,
): DictionaryResult | null {
  if (partial.senses.length === 0) return null;
  return { ...partial, attribution: PROVIDER_ATTRIBUTION[partial.provider] };
}

/* ===================== Wiktionary (REST) ===================== */

/**
 * `GET /api/rest_v1/page/definition/<từ>`
 *
 * Dạng: `{ "en": [ { partOfSpeech, language, definitions: [{definition, examples}] } ] }`
 * Khoá `en` là MÃ NGÔN NGỮ, không phải tên cố định — Wiktionary trả cả mục
 * tiếng khác cho cùng một chữ viết. Ta chỉ lấy `en`: học viên đang tra từ
 * tiếng Anh, đưa nghĩa tiếng Latin vào chỉ gây nhiễu.
 */
export function parseWiktionary(raw: unknown, term: string): DictionaryResult | null {
  if (!raw || typeof raw !== "object") return null;
  const en = (raw as Record<string, unknown>).en;
  if (!Array.isArray(en)) return null;

  const senses: Sense[] = [];
  for (const group of en) {
    if (!group || typeof group !== "object") continue;
    const g = group as Record<string, unknown>;
    // Khoá `en` gom mục tiếng Anh, nhưng vẫn kiểm lại trường `language` của
    // từng nhóm: cùng một chữ viết có thể mang mục ngôn ngữ khác, và đưa nghĩa
    // tiếng Latin cho học viên đang tra từ tiếng Anh là gây nhiễu.
    if (typeof g.language === "string" && g.language !== "English") continue;
    const pos = typeof g.partOfSpeech === "string" ? g.partOfSpeech : null;
    const defs = Array.isArray(g.definitions) ? g.definitions : [];
    for (const d of defs) {
      if (!d || typeof d !== "object") continue;
      const entry = d as Record<string, unknown>;
      const text = typeof entry.definition === "string" ? stripHtml(entry.definition) : "";
      // Định nghĩa rỗng xuất hiện thật: có mục chỉ chứa nhãn ngữ vực rồi thôi.
      if (text.length < 2) continue;
      const examples = Array.isArray(entry.examples) ? entry.examples : [];
      const firstExample =
        typeof examples[0] === "string" ? stripHtml(examples[0] as string) : null;
      senses.push({
        partOfSpeech: pos,
        definition: text,
        example: firstExample && firstExample.length > 1 ? firstExample : null,
      });
      if (senses.length >= MAX_SENSES) break;
    }
    if (senses.length >= MAX_SENSES) break;
  }

  return finish({
    term,
    phonetic: null,
    audioUrl: null,
    senses,
    synonyms: [],
    antonyms: [],
    provider: "WIKTIONARY",
    sourceUrl: `https://en.wiktionary.org/wiki/${encodeURIComponent(term)}`,
  });
}

/* ===================== dictionaryapi.dev ===================== */

/**
 * Dạng: mảng entry, mỗi entry có `phonetics[]`, `meanings[]`.
 *
 * Lấy bản ghi âm ĐẦU TIÊN có `audio` khác rỗng: nhiều mục `phonetics` chỉ có
 * phiên âm chữ mà không có file tiếng.
 */
export function parseDictionaryApi(raw: unknown, term: string): DictionaryResult | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const first = raw[0] as Record<string, unknown>;

  const phonetics = Array.isArray(first.phonetics) ? first.phonetics : [];
  let phonetic = typeof first.phonetic === "string" ? first.phonetic : null;
  let audioUrl: string | null = null;
  for (const p of phonetics) {
    if (!p || typeof p !== "object") continue;
    const item = p as Record<string, unknown>;
    if (!audioUrl && typeof item.audio === "string" && item.audio.trim() !== "") {
      audioUrl = item.audio;
    }
    if (!phonetic && typeof item.text === "string") phonetic = item.text;
  }

  const senses: Sense[] = [];
  const synonyms: string[] = [];
  const antonyms: string[] = [];
  const meanings = Array.isArray(first.meanings) ? first.meanings : [];
  for (const m of meanings) {
    if (!m || typeof m !== "object") continue;
    const meaning = m as Record<string, unknown>;
    const pos = typeof meaning.partOfSpeech === "string" ? meaning.partOfSpeech : null;
    synonyms.push(...clean(meaning.synonyms));
    antonyms.push(...clean(meaning.antonyms));
    const defs = Array.isArray(meaning.definitions) ? meaning.definitions : [];
    for (const d of defs) {
      if (!d || typeof d !== "object") continue;
      const entry = d as Record<string, unknown>;
      if (typeof entry.definition !== "string" || entry.definition.trim() === "") continue;
      senses.push({
        partOfSpeech: pos,
        definition: stripHtml(entry.definition),
        example: typeof entry.example === "string" ? stripHtml(entry.example) : null,
      });
      if (senses.length >= MAX_SENSES) break;
    }
    if (senses.length >= MAX_SENSES) break;
  }

  const sourceUrls = Array.isArray(first.sourceUrls) ? first.sourceUrls : [];

  return finish({
    term,
    phonetic,
    audioUrl,
    senses,
    synonyms: clean(synonyms),
    antonyms: clean(antonyms),
    provider: "DICTIONARYAPI",
    sourceUrl: typeof sourceUrls[0] === "string" ? (sourceUrls[0] as string) : null,
  });
}

/* ===================== Oxford Dictionaries ===================== */

/**
 * Dạng theo tài liệu Oxford v2:
 * `results[].lexicalEntries[].entries[].senses[].definitions[]`
 *
 * CHƯA ĐỐI CHIẾU ĐƯỢC VỚI DỮ LIỆU THẬT — trung tâm chưa có khóa API. Bộ bóc
 * này viết theo tài liệu, và cố tình fail an toàn: sai cấu trúc thì trả `null`
 * (coi như không tìm thấy) chứ không dựng ra nghĩa sai. Khi có khóa, chạy thử
 * một từ rồi đối chiếu lại trước khi tin.
 */
export function parseOxford(raw: unknown, term: string): DictionaryResult | null {
  if (!raw || typeof raw !== "object") return null;
  const results = (raw as Record<string, unknown>).results;
  if (!Array.isArray(results) || results.length === 0) return null;

  const senses: Sense[] = [];
  const synonyms: string[] = [];
  let phonetic: string | null = null;
  let audioUrl: string | null = null;

  for (const result of results) {
    const lexicalEntries = (result as Record<string, unknown>)?.lexicalEntries;
    if (!Array.isArray(lexicalEntries)) continue;
    for (const lex of lexicalEntries) {
      const l = lex as Record<string, unknown>;
      const pos =
        l.lexicalCategory && typeof l.lexicalCategory === "object"
          ? ((l.lexicalCategory as Record<string, unknown>).text as string | undefined) ?? null
          : null;
      const entries = Array.isArray(l.entries) ? l.entries : [];
      for (const e of entries) {
        const entry = e as Record<string, unknown>;
        const pronunciations = Array.isArray(entry.pronunciations) ? entry.pronunciations : [];
        for (const p of pronunciations) {
          const pr = p as Record<string, unknown>;
          if (!phonetic && typeof pr.phoneticSpelling === "string") {
            phonetic = pr.phoneticSpelling;
          }
          if (!audioUrl && typeof pr.audioFile === "string") audioUrl = pr.audioFile;
        }
        const senseList = Array.isArray(entry.senses) ? entry.senses : [];
        for (const s of senseList) {
          const sense = s as Record<string, unknown>;
          const defs = Array.isArray(sense.definitions) ? sense.definitions : [];
          const text = typeof defs[0] === "string" ? stripHtml(defs[0] as string) : "";
          if (text.length < 2) continue;
          synonyms.push(
            ...clean(
              (Array.isArray(sense.synonyms) ? sense.synonyms : [])
                .map((x) => (x as Record<string, unknown>)?.text)
                .filter(Boolean),
            ),
          );
          const examples = Array.isArray(sense.examples) ? sense.examples : [];
          const ex = (examples[0] as Record<string, unknown>)?.text;
          senses.push({
            partOfSpeech: pos,
            definition: text,
            example: typeof ex === "string" ? stripHtml(ex) : null,
          });
          if (senses.length >= MAX_SENSES) break;
        }
        if (senses.length >= MAX_SENSES) break;
      }
    }
  }

  return finish({
    term,
    phonetic,
    audioUrl,
    senses,
    synonyms: clean(synonyms),
    antonyms: [],
    provider: "OXFORD",
    sourceUrl: null,
  });
}

/* ===================== synonyms.com (STANDS4) ===================== */

export type SynonymResult = Readonly<{
  term: string;
  synonyms: readonly string[];
  antonyms: readonly string[];
  provider: ProviderId;
  attribution: string;
}>;

/**
 * Dạng JSON theo tài liệu STANDS4: `{ result: [ { term, synonyms, antonyms } ] }`,
 * trong đó `synonyms`/`antonyms` có thể là chuỗi ngăn cách bằng dấu phẩy hoặc
 * mảng, tùy mục.
 *
 * CHƯA ĐỐI CHIẾU ĐƯỢC VỚI DỮ LIỆU THẬT — chưa có khóa API. Fail an toàn như
 * bộ bóc Oxford.
 */
export function parseStands4(raw: unknown, term: string): SynonymResult | null {
  if (!raw || typeof raw !== "object") return null;
  const result = (raw as Record<string, unknown>).result;
  const rows = Array.isArray(result) ? result : result ? [result] : [];
  if (rows.length === 0) return null;

  const toList = (value: unknown): string[] => {
    if (Array.isArray(value)) return clean(value);
    if (typeof value === "string") {
      return clean(value.split(",").map((x) => x.trim()));
    }
    return [];
  };

  const synonyms: string[] = [];
  const antonyms: string[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    synonyms.push(...toList(r.synonyms));
    antonyms.push(...toList(r.antonyms));
  }

  if (synonyms.length === 0 && antonyms.length === 0) return null;

  return {
    term,
    synonyms: clean(synonyms),
    antonyms: clean(antonyms),
    provider: "STANDS4",
    attribution: PROVIDER_ATTRIBUTION.STANDS4,
  };
}
