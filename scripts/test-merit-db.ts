/**
 * Kiểm thử sổ cái Quân Công TRÊN DATABASE THẬT.
 * Chạy: node --experimental-strip-types --import ./scripts/alias-loader.mjs scripts/test-merit-db.ts
 *
 * `scripts/test-merit.ts` đã phủ luật thuần. File này phủ đúng một thứ mà luật
 * thuần không thể phủ, và cũng là thứ hỏng im lặng nhất trong cả hệ:
 *
 *   GỌI HAI LẦN THÌ CHỈ ĐƯỢC TRẢ MỘT LẦN.
 *
 * Khoá `MERIT:STUDY:<userId>:<dateKey>` nằm ở ràng buộc unique của database.
 * Một bài kiểm thử bằng hàm thuần sẽ luôn báo đạt dù ràng buộc đó bị quên khai
 * trong `init-db.ts`, và lỗi chỉ lộ ra khi có người được trả gấp đôi.
 *
 * File này tự dọn dẹp: tài khoản thử bị xoá ở cuối, kể cả khi có bài thất bại.
 */
import { db } from "@/lib/db";
import { MERIT_EARN } from "@/lib/merit/merit.ts";
import {
  creditQualifiedStudyDays,
  getMeritWallet,
} from "@/lib/merit/merit-service.ts";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${ok ? "✓" : "✗ THẤT BẠI:"} ${label}`);
  if (!ok) {
    console.log(`      mong đợi ${JSON.stringify(expected)}, nhận ${JSON.stringify(actual)}`);
    failures++;
  }
}

const STAMP = Date.now();
const EMAIL = `merit-test-${STAMP}@wobridges.invalid`;
let userId = "";

async function cleanup() {
  if (!userId) return;
  // Xoá User kéo theo MeritWallet, MeritLedger, StudyDay, Attempt nhờ cascade.
  await db.user.deleteMany({ where: { id: userId } });
}

try {
  const user = await db.user.create({
    data: { email: EMAIL, name: "Tài khoản thử Quân Công", role: "STUDENT" },
    select: { id: true },
  });
  userId = user.id;

  const exercise = await db.exercise.findFirst({
    where: { skill: "READING" },
    select: { id: true, durationMinutes: true },
  });
  if (!exercise) throw new Error("Database chưa có đề Reading nào để dựng bài thử.");

  // Hai ngày đủ giờ, một ngày thiếu giờ.
  await db.studyDay.createMany({
    data: [
      { userId, dateKey: "2026-08-01", activeSeconds: 1_800 },
      { userId, dateKey: "2026-08-02", activeSeconds: 1_800 },
      { userId, dateKey: "2026-08-03", activeSeconds: 600 },
    ],
  });

  // Nộp bài vào ngày 01 và ngày 03. Giờ Việt Nam, nên chọn giữa trưa cho chắc.
  await db.attempt.createMany({
    data: [
      {
        userId,
        exerciseId: exercise.id,
        status: "GRADED",
        answers: "{}",
        attemptNumber: 1,
        deadlineAt: new Date("2026-08-01T06:00:00Z"),
        submittedAt: new Date("2026-08-01T05:00:00Z"), // 12:00 giờ VN
      },
      {
        userId,
        exerciseId: exercise.id,
        status: "GRADED",
        answers: "{}",
        attemptNumber: 2,
        deadlineAt: new Date("2026-08-03T06:00:00Z"),
        submittedAt: new Date("2026-08-03T05:00:00Z"),
      },
    ],
  });

  console.log("\n— Ghi công lần đầu —");

  const first = await creditQualifiedStudyDays(userId);
  check(
    "chỉ ngày 01 đạt chuẩn: ngày 02 đủ giờ nhưng không nộp, ngày 03 có nộp nhưng thiếu giờ",
    first.creditedDays,
    ["2026-08-01"],
  );
  check("số dư bằng đúng một ngày học", first.balance, MERIT_EARN.STUDY_DAY);

  console.log("\n— Gọi lại: KHÔNG được trả thêm lần nào —");

  const second = await creditQualifiedStudyDays(userId);
  check("lần hai không ghi công ngày nào", second.creditedDays, []);
  check("số dư không đổi", second.balance, MERIT_EARN.STUDY_DAY);

  const rows = await db.meritLedger.count({ where: { userId } });
  check("sổ cái chỉ có đúng một dòng", rows, 1);

  console.log("\n— Hai tiến trình chạy song song cũng chỉ trả một lần —");

  await db.studyDay.create({
    data: { userId, dateKey: "2026-08-04", activeSeconds: 1_800 },
  });
  await db.attempt.create({
    data: {
      userId,
      exerciseId: exercise.id,
      status: "GRADED",
      answers: "{}",
      attemptNumber: 3,
      deadlineAt: new Date("2026-08-04T06:00:00Z"),
      submittedAt: new Date("2026-08-04T05:00:00Z"),
    },
  });

  // Đây là bài mô phỏng hai cú bấm nhanh hoặc một job chạy lại chồng lên chính
  // nó. Nếu khoá chống ghi hai lần chỉ là một câu `if` thì bài này sẽ trả gấp
  // đôi, còn nếu nó là ràng buộc unique thì một bên thắng, một bên rút lui.
  const [a, b] = await Promise.all([
    creditQualifiedStudyDays(userId),
    creditQualifiedStudyDays(userId),
  ]);
  const creditedTwice = [...a.creditedDays, ...b.creditedDays];
  check("tổng cộng chỉ ghi công ngày 04 đúng một lần", creditedTwice, ["2026-08-04"]);

  const wallet = await getMeritWallet(userId);
  check("ví có đúng hai ngày học", wallet.balance, MERIT_EARN.STUDY_DAY * 2);
  check("earnedTotal khớp số dư vì chưa tiêu gì", wallet.earnedTotal, wallet.balance);
  check("chưa tiêu đồng nào", wallet.burnedTotal, 0);

  const finalRows = await db.meritLedger.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { kind: true, amount: true, balanceAfter: true, studyDateKey: true },
  });
  check("sổ cái có đúng hai dòng", finalRows.length, 2);
  check("mọi số tiền đều dương", finalRows.every((r) => r.amount > 0), true);
  check("mọi dòng đều là EARN", finalRows.every((r) => r.kind === "EARN"), true);
  check(
    "balanceAfter tăng dần đúng bước",
    finalRows.map((r) => r.balanceAfter),
    [MERIT_EARN.STUDY_DAY, MERIT_EARN.STUDY_DAY * 2],
  );
  check(
    "mỗi dòng ghi rõ ngày nào được ghi công",
    finalRows.map((r) => r.studyDateKey),
    ["2026-08-01", "2026-08-04"],
  );
} catch (error) {
  console.error("\n✗ LỖI KHI CHẠY:", error);
  failures++;
} finally {
  await cleanup();
  await db.$disconnect();
}

console.log(
  failures === 0
    ? "\n✅ SỔ CÁI QUÂN CÔNG CHỐNG GHI HAI LẦN ĐÚNG NHƯ THIẾT KẾ\n"
    : `\n❌ CÓ ${failures} KIỂM THỬ THẤT BẠI\n`,
);
process.exit(failures === 0 ? 0 : 1);
