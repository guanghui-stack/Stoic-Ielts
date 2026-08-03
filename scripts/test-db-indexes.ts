/**
 * Kiểm tra mọi index trong init-db.ts không vượt giới hạn của MySQL.
 * Chạy: node --experimental-strip-types scripts/test-db-indexes.ts
 *
 * VÌ SAO CÓ FILE NÀY: production từng sập vì một index tổng hợp 5 cột
 * VARCHAR(191) utf8mb4 = 3820 byte, vượt giới hạn 3072 byte của InnoDB. Bảng
 * không tạo được, và vì vòng lặp DDL lúc đó dừng ở lỗi đầu tiên nên nó kéo theo
 * cả việc gieo tài khoản quản trị và khóa phiên đăng nhập — toàn bộ học viên bị
 * đăng xuất.
 *
 * `npm run build` KHÔNG bắt được lỗi này vì máy phát triển không có MySQL. Lỗi
 * chỉ lộ ra lúc máy chủ khởi động, tức là sau khi đã deploy.
 *
 * File này đọc thẳng DDL và tự cộng byte, nên bắt được ngay tại máy local.
 */
import { readFileSync } from "node:fs";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${ok ? "✓" : "✗ THẤT BẠI:"} ${label}`);
  if (!ok) {
    console.log(`      mong đợi ${JSON.stringify(expected)}, nhận ${JSON.stringify(actual)}`);
    failures++;
  }
}

/** Giới hạn độ dài khóa của InnoDB với DYNAMIC row format. */
const MAX_INDEX_BYTES = 3072;
/** utf8mb4: mỗi ký tự chiếm tối đa 4 byte. Đây là chỗ người ta hay quên. */
const BYTES_PER_CHAR = 4;

function columnBytes(definition: string): number {
  const varchar = definition.match(/VARCHAR\((\d+)\)/i);
  if (varchar) return Number(varchar[1]) * BYTES_PER_CHAR;
  if (/DATETIME/i.test(definition)) return 8;
  if (/BOOLEAN|TINYINT/i.test(definition)) return 1;
  if (/INTEGER|INT\b/i.test(definition)) return 4;
  if (/DOUBLE|FLOAT/i.test(definition)) return 8;
  // TEXT/LONGTEXT không index được nếu không có prefix length — coi là quá lớn
  if (/TEXT/i.test(definition)) return Number.MAX_SAFE_INTEGER;
  return 8;
}

const source = readFileSync(
  new URL("../src/lib/init-db.ts", import.meta.url),
  "utf8"
);

// Tách từng khối CREATE TABLE
const tables = [
  ...source.matchAll(/CREATE TABLE IF NOT EXISTS \\`(\w+)\\`\s*\(([\s\S]*?)\)\s*DEFAULT CHARACTER SET/g),
];

console.log(`\nĐỘ DÀI INDEX — giới hạn ${MAX_INDEX_BYTES} byte của MySQL`);
check("tìm được các bảng trong DDL", tables.length > 0, true);

const offenders: string[] = [];
const unknownColumns: string[] = [];
let indexCount = 0;
let widest = { name: "", bytes: 0 };

for (const [, tableName, body] of tables) {
  // Kiểu dữ liệu của từng cột trong bảng này
  const columnTypes = new Map<string, string>();
  for (const line of body.split("\n")) {
    const column = line.match(/^\s*\\`(\w+)\\`\s+([A-Z]+(\(\d+\))?)/);
    if (column) columnTypes.set(column[1], column[2]);
  }

  // Mọi index, kể cả UNIQUE và PRIMARY KEY
  const indexes = [
    ...body.matchAll(
      /(?:(UNIQUE|FULLTEXT)\s+)?(?:INDEX\s+\\`(\w+)\\`|PRIMARY KEY)\s*\(([^)]*)\)/g
    ),
  ];

  for (const [, , indexName, columnList] of indexes) {
    const columns = [...columnList.matchAll(/\\`(\w+)\\`/g)].map((m) => m[1]);
    if (columns.length === 0) continue;
    indexCount += 1;

    let bytes = 0;
    for (const column of columns) {
      const type = columnTypes.get(column);
      if (!type) {
        unknownColumns.push(`${tableName}.${column}`);
        continue;
      }
      bytes += columnBytes(type);
    }

    const label = `${tableName}.${indexName ?? "PRIMARY"}`;
    if (bytes > widest.bytes) widest = { name: label, bytes };
    if (bytes > MAX_INDEX_BYTES) {
      offenders.push(`${label} = ${bytes} byte (${columns.join(", ")})`);
    }
  }
}

check("mọi cột trong index đều khai báo được kiểu", unknownColumns, []);
check("KHÔNG index nào vượt 3072 byte", offenders, []);
console.log(
  `  ℹ đã kiểm ${indexCount} index · dài nhất: ${widest.name} = ${widest.bytes} byte`
);

// Phép thử của chính bộ kiểm tra: nếu hàm tính byte sai thì mọi thứ trên vô nghĩa
console.log("\nHÀM TÍNH BYTE");
check("VARCHAR(191) utf8mb4 = 764 byte", columnBytes("VARCHAR(191)"), 764);
check("VARCHAR(64) = 256 byte", columnBytes("VARCHAR(64)"), 256);
check("bốn cột VARCHAR(191) = 3056, vừa lọt", 764 * 4 <= MAX_INDEX_BYTES, true);
check("năm cột VARCHAR(191) = 3820, vượt — đúng lỗi đã làm sập production", 764 * 5 > MAX_INDEX_BYTES, true);
check("DATETIME nhỏ", columnBytes("DATETIME(3)"), 8);
check("LONGTEXT bị coi là không index được", columnBytes("LONGTEXT") > MAX_INDEX_BYTES, true);

console.log(
  failures === 0
    ? "\n✅ TẤT CẢ KIỂM THỬ ĐỀU ĐẠT\n"
    : `\n❌ CÓ ${failures} KIỂM THỬ THẤT BẠI\n`
);
process.exit(failures === 0 ? 0 : 1);
