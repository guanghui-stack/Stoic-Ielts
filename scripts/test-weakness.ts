/**
 * Kiểm thử Sổ Sơ Hở.
 * Chạy: node --experimental-strip-types scripts/test-weakness.ts
 *
 * Phủ yêu cầu §9.1: chỉ hiển thị khi total >= 20 để tránh kết luận từ mẫu
 * nhỏ. Đây là chỗ dễ nói dối người học nhất — bảo ai đó rằng họ yếu một dạng
 * câu dựa trên ba câu vừa sai vừa làm họ nản, nên các hàng rào phải có kiểm
 * thử canh.
 */
import { weaknessRows, MIN_SAMPLES } from "../src/lib/ranks/weakness.ts";
import type { RankAttemptFact } from "../src/lib/ranks/rules.ts";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${ok ? "✓" : "✗ THẤT BẠI:"} ${label}`);
  if (!ok) {
    console.log(`      mong đợi ${JSON.stringify(expected)}, nhận ${JSON.stringify(actual)}`);
    failures++;
  }
}

const NOW = new Date("2026-08-05T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

function attempt(
  daysBefore: number,
  stats: Record<string, { correct: number; total: number }>,
  valid = true,
): RankAttemptFact {
  return {
    id: `a-${daysBefore}-${Math.random().toString(36).slice(2, 6)}`,
    exerciseId: "ex",
    band: 5,
    elapsedSeconds: 600,
    submittedAt: daysAgo(daysBefore),
    questionTypeStats: stats,
    partStats: [],
    isFullTest: false,
    valid,
  };
}

console.log("\n— Hàng rào mẫu nhỏ —");

{
  const rows = weaknessRows([attempt(5, { TFNG: { correct: 1, total: 5 } })], NOW);
  check("5 câu chưa đủ để kết luận điểm yếu", rows, []);
}

{
  const rows = weaknessRows([attempt(5, { TFNG: { correct: 4, total: 20 } })], NOW);
  check(`đúng ${MIN_SAMPLES} câu thì mới xếp hạng`, rows.length, 1);
  check("độ chính xác tính đúng", rows[0].accuracy, 0.2);
}

console.log("\n— Cửa sổ 90 ngày —");

{
  const rows = weaknessRows([attempt(120, { TFNG: { correct: 2, total: 30 } })], NOW);
  check("bài ngoài 90 ngày không được tính", rows, []);
}

{
  const rows = weaknessRows(
    [
      attempt(120, { TFNG: { correct: 0, total: 30 } }),
      attempt(10, { TFNG: { correct: 18, total: 20 } }),
    ],
    NOW,
  );
  check("lỗi cũ đã sửa không kéo bảng về quá khứ", Math.round(rows[0].accuracy * 100), 90);
}

console.log("\n— Hàng rào liêm chính —");

{
  const rows = weaknessRows([attempt(5, { TFNG: { correct: 1, total: 30 } }, false)], NOW);
  check("lượt không hợp lệ không vào bảng", rows, []);
}

console.log("\n— Thứ tự xếp hạng —");

{
  const rows = weaknessRows(
    [
      attempt(5, {
        TFNG: { correct: 18, total: 20 },
        MATCH_INFO: { correct: 5, total: 25 },
        GAP: { correct: 12, total: 20 },
      }),
    ],
    NOW,
  );
  check(
    "yếu nhất xếp trước",
    rows.map((r) => r.questionType),
    ["MATCH_INFO", "GAP", "TFNG"],
  );
}

{
  // Hòa độ chính xác: ưu tiên dạng có nhiều mẫu vì kết luận đáng tin hơn.
  const rows = weaknessRows(
    [
      attempt(5, {
        A_IT: { correct: 10, total: 20 },
        B_NHIEU: { correct: 20, total: 40 },
      }),
    ],
    NOW,
  );
  check("hòa thì dạng nhiều mẫu hơn đứng trước", rows[0].questionType, "B_NHIEU");
}

console.log("\n— Xu hướng —");

{
  // Nửa cũ 30%, nửa mới 90% → đang tốt lên.
  const rows = weaknessRows(
    [
      attempt(70, { TFNG: { correct: 3, total: 10 } }),
      attempt(10, { TFNG: { correct: 9, total: 10 } }),
    ],
    NOW,
  );
  check("tiến bộ rõ thì báo UP", rows[0].trend, "UP");
}

{
  const rows = weaknessRows(
    [
      attempt(70, { TFNG: { correct: 9, total: 10 } }),
      attempt(10, { TFNG: { correct: 3, total: 10 } }),
    ],
    NOW,
  );
  check("tụt rõ thì báo DOWN", rows[0].trend, "DOWN");
}

{
  // Chỉ có dữ liệu ở nửa mới: KHÔNG được kết luận xu hướng.
  const rows = weaknessRows([attempt(10, { TFNG: { correct: 5, total: 25 } })], NOW);
  check("thiếu dữ liệu nửa cũ thì để FLAT chứ không đoán", rows[0].trend, "FLAT");
}

{
  // Nửa cũ chỉ 3 câu — quá ít để so sánh, dù chênh lệch rất lớn.
  const rows = weaknessRows(
    [
      attempt(70, { TFNG: { correct: 0, total: 3 } }),
      attempt(10, { TFNG: { correct: 18, total: 20 } }),
    ],
    NOW,
  );
  check("nửa cũ quá ít mẫu thì không dám kết luận xu hướng", rows[0].trend, "FLAT");
}

console.log(
  failures === 0
    ? "\n✅ TẤT CẢ KIỂM THỬ SỔ SƠ HỞ ĐỀU ĐẠT\n"
    : `\n❌ ${failures} KIỂM THỬ THẤT BẠI\n`,
);
process.exit(failures === 0 ? 0 : 1);
