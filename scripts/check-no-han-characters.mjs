#!/usr/bin/env node
/**
 * Chặn ký tự chữ Hán trong mã nguồn, tài liệu và asset văn bản.
 *
 * Vì sao cần một script thay vì chỉ dặn nhau: toàn bộ danh xưng của sản phẩm
 * là từ Hán-Việt, nên việc dán nhầm một ký tự chữ Hán từ tài liệu tham khảo
 * hoặc từ gợi ý của công cụ là chuyện gần như chắc chắn sẽ xảy ra. Mắt người
 * rất khó soi ra một ký tự lẫn trong hàng nghìn dòng, còn máy thì soi trong
 * một giây.
 *
 * Quy tắc production: mọi chữ hiển thị ở website, tài liệu, email, metadata,
 * alt text, SVG và lớp overlay trên ảnh phải là tiếng Việt hoặc danh xưng
 * Hán-Việt viết bằng chữ cái Latin.
 *
 * Phạm vi quét cố ý KHÔNG bao gồm ảnh nhị phân — không đọc được chữ trong
 * ảnh bằng cách này. Ảnh vẫn phải qua khâu duyệt thủ công.
 *
 * Chạy: npm run test:no-han
 */

import fs from "node:fs";
import path from "node:path";

/**
 * Bốn dải Unicode chứa chữ Hán:
 *  - 3400-4DBF  mở rộng A
 *  - 4E00-9FFF  khối thông dụng
 *  - F900-FAFF  dạng tương thích
 *  - 20000-2A6DF mở rộng B (nằm ngoài mặt phẳng cơ bản, cần cờ u)
 *
 * Chữ Hán-Việt viết bằng chữ cái Latin có dấu không rơi vào dải nào ở trên,
 * nên "Lữ Bố" hay "Trương Phi" luôn hợp lệ.
 */
const HAN = /[㐀-䶿一-鿿豈-﫿\u{20000}-\u{2A6DF}]/u;

const ROOTS = ["src", "scripts", "docs", "public", "prisma"];
const EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".css",
  ".svg",
  ".html",
  ".txt",
]);
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "dist", "build"]);

/** File tự cho phép chứa dải Unicode ở dạng chuỗi escape — chính là file này. */
const SELF = path.resolve("scripts/check-no-han-characters.mjs");

function* walk(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return; // thư mục không tồn tại trong nhánh này — không phải lỗi
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      yield* walk(full);
    } else if (entry.isFile()) {
      yield full;
    }
  }
}

const failures = [];

for (const root of ROOTS) {
  for (const file of walk(root)) {
    if (!EXTENSIONS.has(path.extname(file))) continue;
    if (path.resolve(file) === SELF) continue;

    const text = fs.readFileSync(file, "utf8");
    if (!HAN.test(text)) continue;

    // Báo đúng dòng và đúng ký tự, để người sửa không phải đi tìm.
    text.split("\n").forEach((line, index) => {
      const found = [...line].filter((ch) => HAN.test(ch));
      if (found.length === 0) return;
      failures.push({
        file,
        line: index + 1,
        characters: [...new Set(found)].join(" "),
        excerpt: line.trim().slice(0, 100),
      });
    });
  }
}

if (failures.length > 0) {
  console.error(
    `\nPhat hien ky tu chu Han tai ${failures.length} vi tri. Chi dung tieng Viet va danh xung Han-Viet bang chu cai Latin.\n`,
  );
  for (const f of failures) {
    console.error(`  ${f.file}:${f.line}  [${f.characters}]`);
    console.error(`      ${f.excerpt}`);
  }
  console.error("");
  process.exit(1);
}

console.log("test:no-han — khong co ky tu chu Han nao trong ma nguon va tai lieu.");
