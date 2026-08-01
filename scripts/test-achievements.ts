/**
 * Kiểm thử quy tắc danh hiệu — phần tính toán thuần, không cần database.
 * Chạy: node --experimental-strip-types scripts/test-achievements.ts
 */
import {
  bandTableFor,
  calculateReadingBand,
  isValidAchievementAttempt,
  DEFAULT_SCALE_VERSION,
} from "../src/lib/reading-band.ts";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${ok ? "✓" : "✗ THẤT BẠI:"} ${label}`);
  if (!ok) {
    console.log(`      mong đợi ${JSON.stringify(expected)}, nhận ${JSON.stringify(actual)}`);
    failures++;
  }
}

const band = (raw: number, total: number, content?: unknown) =>
  calculateReadingBand(content as never, raw, total)?.band ?? null;

/* ---------------------------------------------------------------- */
console.log("\nQUY ĐỔI BAND — đề 40 câu, đối chiếu bảng IELTS Academic Reading");
check("39/40 → 9.0", band(39, 40), 9.0);
check("37/40 → 8.5", band(37, 40), 8.5);
check("35/40 → 8.0", band(35, 40), 8.0);
check("30/40 → 7.0", band(30, 40), 7.0);
check("23/40 → 6.0", band(23, 40), 6.0);
check("15/40 → 5.0", band(15, 40), 5.0);
check("0/40 → 0", band(0, 40), 0);

console.log("\n  Điều quan trọng nhất: band KHÔNG phải phần trăm");
check("34/40 (85%) là band 7.5 chứ không phải 8.5", band(34, 40), 7.5);
check("36/40 (90%) là band 8.0 chứ không phải 9.0", band(36, 40), 8.0);

console.log("\n  Đề ngắn: quy đổi điểm về thang 40 câu rồi mới tra bảng");
check("14/14 tuyệt đối → 9.0", band(14, 14), 9.0);
check("13/14 (tương đương 37/40) → 8.5", band(13, 14), 8.5);
check("12/14 (tương đương 34/40) → 7.5", band(12, 14), 7.5);
check("11/14 (tương đương 31/40) → 7.0", band(11, 14), 7.0);
check("7/14 (đúng nửa, tương đương 20/40) → 5.5", band(7, 14), 5.5);

console.log("\n  KHÔNG được có band nào bị nuốt mất vì đề ngắn");
for (const total of [12, 14, 18, 20, 40]) {
  const table = bandTableFor(undefined, total);
  const mocs = table.map((r) => r.minRaw);
  check(
    `đề ${total} câu: mỗi band ứng với một mốc điểm riêng biệt`,
    mocs.length === new Set(mocs).size,
    true
  );
  check(
    `đề ${total} câu: điểm càng cao thì band càng cao, không đảo ngược`,
    table.every((row, i) => i === 0 || row.minRaw < table[i - 1].minRaw),
    true
  );
}

console.log("\n  Trường hợp bất thường");
check("đề không có câu nào → null, không đoán bừa", band(5, 0), null);
check("điểm âm được kẹp về 0", band(-3, 14), 0);
check("điểm vượt tổng được kẹp về tổng", band(99, 14), 9.0);

console.log("\nTHANG ĐIỂM RIÊNG CỦA ĐỀ");
const custom = {
  scoring: {
    scaleVersion: "DE-RIENG-V1",
    bandMap: [
      { minRaw: 10, band: 9.0 },
      { minRaw: 5, band: 6.0 },
      { minRaw: 0, band: 3.0 },
    ],
  },
};
check("thang riêng được ưu tiên", band(10, 14, custom), 9.0);
check("thang riêng áp đúng mốc giữa", band(6, 14, custom), 6.0);
check(
  "ghi lại đúng tên thang riêng",
  calculateReadingBand(custom as never, 10, 14)?.scaleVersion,
  "DE-RIENG-V1"
);
check(
  "thang mặc định có ghi số câu để truy vết",
  calculateReadingBand(undefined, 10, 14)?.scaleVersion,
  `${DEFAULT_SCALE_VERSION}:14`
);
check(
  "thang riêng HỎNG (band 99) bị bỏ qua, rơi về mặc định",
  calculateReadingBand({ scoring: { bandMap: [{ minRaw: 0, band: 99 }] } }, 10, 14)?.scaleVersion,
  `${DEFAULT_SCALE_VERSION}:14`
);
check(
  "thang riêng rỗng bị bỏ qua",
  calculateReadingBand({ scoring: { bandMap: [] } }, 10, 14)?.scaleVersion,
  `${DEFAULT_SCALE_VERSION}:14`
);
check("thang mặc định luôn có mốc 0", bandTableFor(undefined, 14).some((r) => r.minRaw === 0), true);

/* ---------------------------------------------------------------- */
console.log("\nLƯỢT LÀM BÀI CÓ ĐƯỢC TÍNH DANH HIỆU KHÔNG — hàng rào chống cày");
const attempt = (o: Partial<Parameters<typeof isValidAchievementAttempt>[0]> = {}) =>
  isValidAchievementAttempt({
    status: "GRADED",
    achievementEligible: true,
    band: 7.0,
    answeredCount: 14,
    scoreTotal: 14,
    elapsedSeconds: 600,
    durationMinutes: 20,
    integrityStatus: "CLEAR",
    ...o,
  });

check("lượt làm nghiêm túc được tính", attempt(), true);
check("chưa chấm xong → không tính", attempt({ status: "IN_PROGRESS" }), false);
check("bài không bật cờ tính danh hiệu → không tính", attempt({ achievementEligible: false }), false);
check("thiếu band → không tính", attempt({ band: null }), false);
check("có cờ nghi vấn liêm chính → không tính", attempt({ integrityStatus: "REVIEW" }), false);
check("bỏ trống quá nửa → không tính", attempt({ answeredCount: 6 }), false);
check("làm đúng nửa (ngưỡng) → vẫn tính", attempt({ answeredCount: 7 }), true);
check("nộp sau 10 giây → không tính", attempt({ elapsedSeconds: 10 }), false);
check("đề 20 phút cần tối thiểu 180 giây", attempt({ elapsedSeconds: 180 }), true);
check("đề 20 phút, 179 giây → không tính", attempt({ elapsedSeconds: 179 }), false);
check(
  "đề 60 phút chỉ cần 300 giây (không phải 540)",
  attempt({ durationMinutes: 60, elapsedSeconds: 300 }),
  true
);
check("thiếu thông tin thời gian → không tính", attempt({ elapsedSeconds: null }), false);
check("đề không có câu nào → không tính", attempt({ scoreTotal: 0 }), false);

console.log(
  failures === 0
    ? "\n✅ TẤT CẢ KIỂM THỬ ĐỀU ĐẠT\n"
    : `\n❌ CÓ ${failures} KIỂM THỬ THẤT BẠI\n`
);
process.exit(failures === 0 ? 0 : 1);
