export const TAG_MAX = 5;
export const TAG_LENGTH_MAX = 36;

export function cleanTag(raw: string): string {
  return raw
    .normalize("NFC")
    .trim()
    .replace(/^#+/, "")
    .replace(/\s+/g, " ")
    .slice(0, TAG_LENGTH_MAX);
}

export function tagKey(value: string): string {
  return cleanTag(value).toLocaleLowerCase("vi-VN");
}

export function normalizeTags(values: readonly string[], maxTags = TAG_MAX): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    const value = cleanTag(raw);
    const key = tagKey(value);
    if (!value || seen.has(key)) continue;
    seen.add(key);
    result.push(value);
    if (result.length >= maxTags) break;
  }
  return result;
}

export function formatTaggedBody(tags: readonly string[], body: string): string {
  const normalized = normalizeTags(tags);
  return normalized.length > 0
    ? `**Chủ đề:** ${normalized.map((tag) => `#${tag.replace(/\s+/g, "-")}`).join(" ")}\n\n${body}`
    : body;
}

export function extractTagsFromBody(body: string): { tags: string[]; content: string } {
  const [firstLine = "", ...rest] = body.split("\n");
  if (!/^\*\*Chủ đề:\*\*/i.test(firstLine.trim())) {
    return { tags: [], content: body };
  }

  const tags = normalizeTags(
    firstLine
      .replace(/^\s*\*\*Chủ đề:\*\*\s*/i, "")
      .split(/\s+/)
      .filter((token) => token.startsWith("#")),
  );
  const content = rest.join("\n").replace(/^\n+/, "");
  return { tags, content };
}

export function bodyWithoutTagMetadata(body: string): string {
  return extractTagsFromBody(body).content;
}
