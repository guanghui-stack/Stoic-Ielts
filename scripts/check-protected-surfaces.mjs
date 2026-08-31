import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

const manifestPath = "docs/PROTECTED-SURFACES.sha256";

if (!existsSync(manifestPath)) {
  console.error(`Thiếu manifest bảo vệ: ${manifestPath}`);
  process.exit(1);
}

const entries = readFileSync(manifestPath, "utf8")
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => {
    const match = line.match(/^([a-f0-9]{64})\s{2}(.+)$/);
    if (!match) throw new Error(`Dòng manifest không hợp lệ: ${line}`);
    return { expected: match[1], file: match[2] };
  });

const changed = [];
for (const entry of entries) {
  if (!existsSync(entry.file)) {
    changed.push(`${entry.file} (đã bị xóa)`);
    continue;
  }

  // Git có thể checkout LF thành CRLF trên Windows dù blob và nội dung nguồn
  // không đổi. Chuẩn hóa đúng phần khác biệt vận chuyển này để hàng rào vẫn
  // bắt mọi sửa đổi thật nhưng không báo giả theo hệ điều hành.
  const normalizedSource = readFileSync(entry.file, "utf8").replace(/\r\n/g, "\n");
  const actual = createHash("sha256").update(normalizedSource).digest("hex");
  if (actual !== entry.expected) changed.push(entry.file);
}

if (changed.length > 0) {
  console.error("Vùng học/làm bài mô phỏng thi thật đã bị thay đổi:");
  for (const file of changed) console.error(`  - ${file}`);
  console.error("Hoàn nguyên các tệp trên; rebrand không được phép chạm vùng này.");
  process.exit(1);
}

console.log(`test:protected-surfaces — đạt, ${entries.length} tệp giữ nguyên checksum baseline.`);
