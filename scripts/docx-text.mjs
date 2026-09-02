/**
 * Trích văn bản từ file .docx (đọc thẳng word/document.xml trong gói zip).
 *   node docx-text.mjs <file.docx> [từ-khóa-lọc]
 *
 * Dùng khi bản .md bị lỗi hoặc thiếu — file Word là bản gốc.
 */
import fs from "node:fs";
import { execSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

const file = process.argv[2];
const filter = process.argv[3];

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "docx-"));
execSync(`unzip -o -q "${file}" word/document.xml -d "${tmp}"`);
const xml = fs.readFileSync(path.join(tmp, "word/document.xml"), "utf8");
fs.rmSync(tmp, { recursive: true, force: true });

const text = xml
  .split(/<w:p[ >]/)
  .slice(1)
  .map((p) =>
    [...p.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)]
      .map((m) => m[1])
      .join("")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
  )
  .join("\n");

if (filter) {
  const re = new RegExp(filter, "i");
  text.split("\n").forEach((l, i) => {
    if (re.test(l)) console.log(`${i + 1}: ${l}`);
  });
} else {
  console.log(text);
}
