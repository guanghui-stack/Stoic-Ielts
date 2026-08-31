/**
 * Chặn bí mật lọt vào repo.
 *
 * VÌ SAO CẦN: repository này là PUBLIC. Một khóa API hay chuỗi kết nối
 * database bị commit là lộ vĩnh viễn — xóa ở commit sau không cứu được, vì
 * lịch sử Git giữ lại tất cả. Đã từng có mật khẩu admin mặc định nằm lộ thiên
 * trong mã nguồn.
 *
 * `.gitignore` đã chặn `.env*`, nhưng nó chỉ bảo vệ đúng những file có tên đó.
 * Script này quét NỘI DUNG của mọi file được Git theo dõi hoặc sắp được thêm
 * vào Git, nên bắt được cả trường hợp khóa bị dán nhầm vào mã nguồn, tài liệu
 * hay script trước khi commit.
 *
 * Chạy: npm run test:no-secrets  (đã nối vào npm test)
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/**
 * Chỗ giữ chỗ trong tài liệu, không phải bí mật thật.
 *
 * Quy ước của dự án là viết hoa kèm gạch dưới (`MAT_KHAU`, `TEN_USER`), cộng
 * thêm vài từ tiếng Anh thường gặp trong ví dụ.
 */
const PLACEHOLDER_WORDS = new Set([
  "user", "username", "password", "pass", "host", "hostname",
  "dbname", "database", "xxx", "yyy", "example", "changeme",
]);

function isPlaceholder(value) {
  if (/^[A-Z][A-Z0-9_]*$/.test(value)) return true;
  if (/^[<{[].*[>}\]]$/.test(value)) return true;
  return PLACEHOLDER_WORDS.has(value.toLowerCase());
}

/** Mỗi mẫu kèm lý do, để thông báo lỗi nói được phải sửa gì. */
const PATTERNS = [
  { name: "Khóa Google AI / Gemini", re: /\bAIza[0-9A-Za-z_-]{30,}\b/ },
  { name: "Khóa Google AI dạng mới", re: /\bAQ\.[0-9A-Za-z_-]{30,}\b/ },
  { name: "Khóa OpenAI", re: /\bsk-[0-9A-Za-z_-]{20,}\b/ },
  {
    name: "Chuỗi kết nối MySQL có mật khẩu",
    re: /mysql:\/\/([^\s:@/]+):([^\s@/]+)@/,
    // Tài liệu hướng dẫn buộc phải in ra mẫu chuỗi kết nối. Cảnh báo giả sẽ
    // khiến người ta quen bỏ qua bộ quét, và lúc đó nó vô dụng.
    ignore: (match) => isPlaceholder(match[1]) || isPlaceholder(match[2]),
  },
  { name: "Khóa riêng tư (private key)", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: "Token GitHub", re: /\bgh[pousr]_[0-9A-Za-z]{30,}\b/ },
  {
    name: "Khóa API Ably",
    // Định dạng Ably API key: appId.keyId:secret. Chỉ secret dài mới được coi
    // là khóa thật để các giá trị minh họa ngắn trong tài liệu không báo giả.
    re: /\b[0-9A-Za-z_-]{4,}\.[0-9A-Za-z_-]{4,}:([0-9A-Za-z_-]{20,})\b/,
    ignore: (match) => isPlaceholder(match[1]),
  },
];

/**
 * Bỏ qua chính file này: nó buộc phải chứa các mẫu ở trên để nhận diện.
 * Ngoài ra bỏ qua file nhị phân và ảnh.
 */
const SKIP_FILES = new Set(["scripts/check-no-secrets.mjs"]);
const SKIP_EXT = new Set([
  ".png", ".jpg", ".jpeg", ".webp", ".gif", ".ico", ".woff", ".woff2",
  ".ttf", ".otf", ".pdf", ".zip", ".db", ".docx",
]);

const files = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard"],
  { encoding: "utf8" },
)
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);

const findings = [];

for (const file of files) {
  if (SKIP_FILES.has(file)) continue;
  if (SKIP_EXT.has(path.extname(file).toLowerCase())) continue;
  if (!fs.existsSync(file)) continue;

  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    continue;
  }

  text.split("\n").forEach((line, index) => {
    for (const pattern of PATTERNS) {
      const match = pattern.re.exec(line);
      if (!match) continue;
      if (pattern.ignore?.(match)) continue;
      findings.push(`${file}:${index + 1} — ${pattern.name}`);
    }
  });
}

// Hàng rào thứ hai: chính file .env không được nằm trong danh sách Git theo dõi.
const trackedEnv = files.filter((f) => /(^|\/)\.env($|\.)/.test(f));
for (const file of trackedEnv) {
  findings.push(`${file} — file môi trường bị Git theo dõi, phải gỡ khỏi index`);
}

if (findings.length > 0) {
  console.error("test:no-secrets — PHÁT HIỆN BÍ MẬT TRONG FILE ĐƯỢC GIT THEO DÕI:");
  for (const f of findings) console.error("  " + f);
  console.error(
    "\nRepo này là PUBLIC. Gỡ giá trị ra khỏi mã nguồn, đưa vào biến môi trường,\n" +
      "và THU HỒI khóa đó — lịch sử Git giữ lại mọi thứ đã commit.",
  );
  process.exit(1);
}

console.log(
  `test:no-secrets — sach, da quet ${files.length} file trong pham vi Git.`,
);
