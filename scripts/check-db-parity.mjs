/**
 * Đối chiếu database ĐANG CHẠY với schema.prisma.
 *
 * VÌ SAO CẦN: production không chạy `prisma db push`. Nó gọi `initDatabase()`
 * trong `src/lib/init-db.ts`, nơi mọi câu CREATE TABLE và ALTER TABLE được
 * viết TAY. Hai nguồn đó lệch nhau là bảng thiếu cột, và lỗi chỉ lộ ra sau
 * khi đã deploy — `npm run build` không đụng database nên không bắt được.
 *
 * Script này chỉ ĐỌC, không sửa gì. Chạy sau khi đã dựng database bằng đúng
 * đường của production:
 *
 *   1. npm run build
 *   2. npx next start        (instrumentation chỉ chạy initDatabase khi
 *                             NODE_ENV=production, dev server thì bỏ qua)
 *   3. node scripts/check-db-parity.mjs
 *
 * Lưu ý MySQL trên Windows: `lower_case_table_names` mặc định là 1 nên tên
 * bảng bị hạ thấp hết. So sánh phải không phân biệt hoa thường, nếu không
 * script sẽ báo thiếu toàn bộ 47 bảng dù chúng có đủ.
 */

import fs from "node:fs";
import { PrismaClient } from "@prisma/client";

const url = fs.readFileSync(".env", "utf8").match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/)?.[1] ?? "";
if (!/^mysql:\/\//.test(url)) {
  console.error("DATABASE_URL không phải MySQL — script này chỉ dùng cho MySQL.");
  process.exit(1);
}

const dbName = url.split("/").pop().split("?")[0];
const db = new PrismaClient();

const tableRows = await db.$queryRawUnsafe(
  `SELECT table_name AS t FROM information_schema.tables WHERE table_schema = '${dbName}'`,
);
const columnRows = await db.$queryRawUnsafe(
  `SELECT table_name AS t, column_name AS c FROM information_schema.columns WHERE table_schema = '${dbName}'`,
);
const [indexCount] = await db.$queryRawUnsafe(
  `SELECT COUNT(DISTINCT table_name, index_name) AS n FROM information_schema.statistics WHERE table_schema = '${dbName}'`,
);
await db.$disconnect();

const liveTables = new Set(tableRows.map((r) => String(r.t).toLowerCase()));
const liveColumns = new Map();
for (const row of columnRows) {
  const key = String(row.t).toLowerCase();
  if (!liveColumns.has(key)) liveColumns.set(key, new Set());
  liveColumns.get(key).add(String(row.c).toLowerCase());
}

const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
const blocks = [...schema.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)];

const missingTables = [];
const missingColumns = [];

for (const [, model, body] of blocks) {
  const key = model.toLowerCase();
  if (!liveTables.has(key)) {
    missingTables.push(model);
    continue;
  }
  const live = liveColumns.get(key) ?? new Set();
  for (const line of body.split("\n")) {
    const m = line.match(/^\s{2}(\w+)\s+(\w+)(\[\])?(\?)?/);
    if (!m) continue;
    const [, field, type, isList] = m;
    // Bỏ qua trường quan hệ: chúng không phải cột trong database.
    if (isList) continue;
    if (blocks.some(([, other]) => other === type)) continue;
    if (!live.has(field.toLowerCase())) missingColumns.push(`${model}.${field}`);
  }
}

console.log(`Database   : ${dbName}`);
console.log(`Bảng sống  : ${liveTables.size}`);
console.log(`Model schema: ${blocks.length}`);
console.log(`Index       : ${Number(indexCount.n)}`);

if (missingTables.length > 0) {
  console.error("\n❌ THIẾU BẢNG (schema khai nhưng raw DDL không tạo):");
  for (const t of missingTables) console.error("   " + t);
}
if (missingColumns.length > 0) {
  console.error("\n❌ THIẾU CỘT (schema khai nhưng raw DDL không tạo):");
  for (const c of missingColumns) console.error("   " + c);
}

if (missingTables.length === 0 && missingColumns.length === 0) {
  console.log("\n✅ Raw DDL khớp đủ mọi bảng và cột mà schema.prisma khai báo");
  process.exit(0);
}
process.exit(1);
