/**
 * Kiểm thử Thí Bút TRÊN DATABASE THẬT.
 * Chạy: node --experimental-strip-types --import ./scripts/alias-loader.mjs scripts/test-thibut-db.ts
 *
 * Bốn thứ chỉ kiểm được ở đây, và cả bốn đều hỏng im lặng:
 *
 *   1. Đáp án có rò xuống máy khách không
 *   2. Quân Công có bị trừ ĐÚNG LÚC BẮT ĐẦU không
 *   3. Qua rồi thì quyền có thật sự được mở không, và mở với source nào
 *   4. Trượt thì có mất Quân Công mà KHÔNG có hàng không
 *
 * Điều số 4 nghe như một lỗi, nhưng nó chính là cơ chế: nếu trượt vẫn được
 * hàng thì Quân Công đang định giá món hàng, và tỷ giá với Xu xuất hiện.
 *
 * File tự dọn dẹp ở cuối, kể cả khi có bài thất bại.
 */
import { db } from "@/lib/db";
import { BASE_COST, PASS_THRESHOLD } from "@/lib/thibut/thibut.ts";
import {
  startAttempt,
  submitAttempt,
  thiButGate,
} from "@/lib/thibut/thibut-service.ts";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${ok ? "✓" : "✗ THẤT BẠI:"} ${label}`);
  if (!ok) {
    console.log(`      mong đợi ${JSON.stringify(expected)}, nhận ${JSON.stringify(actual)}`);
    failures++;
  }
}

/**
 * Tra đáp án ĐÚNG của các câu vừa được phát, đọc thẳng từ database.
 *
 * Không được đoán đáp án. Bộ chọn câu lấy từ TOÀN BỘ kho đã phát hành, nên khi
 * kho có nội dung thật thì lượt thi sẽ gồm câu thật chứ không phải câu do bài
 * kiểm thử này tạo ra. Bài kiểm thử phải đúng bất kể kho chứa gì.
 */
async function correctAnswers(itemIds: readonly string[]) {
  const rows = await db.thiButItem.findMany({
    where: { id: { in: [...itemIds] } },
    select: { id: true, answerIndex: true },
  });
  const byId = new Map(rows.map((r) => [r.id, r.answerIndex]));
  return { byId };
}

const STAMP = Date.now();
const BATCH = `test-${STAMP}`;
let userId = "";

async function cleanup() {
  await db.thiButItem.deleteMany({ where: { sourceBatch: BATCH } });
  if (userId) await db.user.deleteMany({ where: { id: userId } });
}

try {
  const user = await db.user.create({
    data: {
      email: `thibut-test-${STAMP}@wobridges.invalid`,
      name: "Tài khoản thử Thí Bút",
      role: "STUDENT",
    },
    select: { id: true },
  });
  userId = user.id;

  const exercise = await db.exercise.findFirst({
    where: { skill: "READING" },
    select: { id: true },
  });
  if (!exercise) throw new Error("Database chưa có đề Reading nào.");

  // Kho 8 câu đã duyệt, đáp án luôn là phương án số 1 để bài kiểm thử tất định.
  const types = ["PARAPHRASE", "VOCAB_IN_CONTEXT", "COLLOCATION", "SENTENCE_GRAMMAR"];
  await db.thiButItem.createMany({
    data: Array.from({ length: 8 }, (_, i) => ({
      type: types[i % 4],
      difficulty: "MEDIUM",
      prompt: `Câu thử số ${i}`,
      options: JSON.stringify(["sai", "ĐÚNG", "sai", "sai"]),
      answerIndex: 1,
      explanation: `LOI-GIAI-BI-MAT-${i}`,
      status: "PUBLISHED",
      sourceBatch: BATCH,
      publishedAt: new Date(),
    })),
  });

  // Nạp Quân Công đủ cho hai lượt.
  await db.meritWallet.create({
    data: { userId, earnedTotal: BASE_COST * 3, burnedTotal: 0 },
  });

  console.log("\n— Trạng thái trước khi vào —");

  const gate0 = await thiButGate({
    userId,
    targetKind: "EXERCISE",
    targetId: exercise.id,
  });
  check("kho đã sẵn sàng", gate0.poolReady, true);
  check("lượt đầu tốn giá gốc", gate0.cost, BASE_COST);
  check("đủ Quân Công", gate0.canAfford, true);
  check("chưa trượt nên không phải chờ", gate0.canRetry, true);

  console.log("\n— Bắt đầu: đáp án KHÔNG được rời máy chủ —");

  const started = await startAttempt({
    userId,
    targetKind: "EXERCISE",
    targetId: exercise.id,
  });
  if (!started.ok) throw new Error(`Không bắt đầu được: ${started.reason}`);

  check("phát đúng bốn câu", started.items.length, 4);
  const payload = JSON.stringify(started.items);
  check("gói gửi đi KHÔNG chứa lời giải", payload.includes("LOI-GIAI-BI-MAT"), false);
  check("gói gửi đi KHÔNG chứa answerIndex", payload.includes("answerIndex"), false);
  check(
    "nhưng vẫn đủ phương án để chọn",
    started.items.every((i) => i.options.length === 4),
    true,
  );

  console.log("\n— Quân Công bị trừ NGAY LÚC BẮT ĐẦU, không đợi chấm —");

  check("số dư đã giảm đúng giá lượt", started.balanceAfter, BASE_COST * 3 - BASE_COST);
  const ledgerAfterStart = await db.meritLedger.findMany({
    where: { userId },
    select: { kind: true, amount: true },
  });
  check("sổ cái ghi một dòng STAKE", ledgerAfterStart, [
    { kind: "STAKE", amount: BASE_COST },
  ]);

  console.log("\n— Trượt: mất Quân Công mà KHÔNG có hàng —");

  // Chọn sai hết: lấy đáp án thật rồi cố tình chọn khác đi.
  const startedKey = await correctAnswers(started.items.map((i) => i.id));
  const failAnswers = Object.fromEntries(
    started.items.map((i) => [i.id, ((startedKey.byId.get(i.id) ?? 0) + 1) % 4]),
  );
  const failed = await submitAttempt({
    userId,
    attemptId: started.attemptId,
    answers: failAnswers,
  });
  if (!failed.ok) throw new Error("Không nộp được bài");

  check("trượt", failed.result.passed, false);
  check("đúng 0 câu", failed.result.correctCount, 0);
  check("KHÔNG mở quyền nào", failed.unlocked, false);
  check(
    "và đây mới là điểm mấu chốt: quyền truy cập vẫn trống",
    await db.accessGrant.count({ where: { userId } }),
    0,
  );
  check(
    "Quân Công KHÔNG được hoàn lại",
    (await db.meritWallet.findUnique({ where: { userId } }))?.burnedTotal,
    BASE_COST,
  );
  check(
    "nhưng trượt thành buổi học: có lời giải cho từng câu",
    failed.result.items.every((g) => g.explanation.trim().length > 0),
    true,
  );

  console.log("\n— Nộp lại lượt đã nộp thì bị từ chối —");

  const again = await submitAttempt({
    userId,
    attemptId: started.attemptId,
    answers: failAnswers,
  });
  check("không chấm lại lượt cũ", again.ok, false);
  if (!again.ok) check("lý do đúng", again.reason, "ALREADY_SUBMITTED");

  console.log("\n— Vừa trượt thì phải chờ, và lượt sau rẻ hơn —");

  const gate1 = await thiButGate({
    userId,
    targetKind: "EXERCISE",
    targetId: exercise.id,
  });
  check("đang trong thời gian chờ", gate1.canRetry, false);
  check("lượt sau rẻ hơn lượt đầu", gate1.cost < BASE_COST, true);

  const blocked = await startAttempt({
    userId,
    targetKind: "EXERCISE",
    targetId: exercise.id,
  });
  check("không vào được khi đang chờ", blocked.ok, false);
  if (!blocked.ok) check("lý do là COOLDOWN", blocked.reason, "COOLDOWN");

  console.log("\n— Qua: quyền mở ra, và ghi source MERIT chứ không phải PURCHASE —");

  // Lùi thời điểm trượt để hết thời gian chờ, thay vì phải đợi thật 30 phút.
  await db.thiButAttempt.update({
    where: { id: started.attemptId },
    data: { submittedAt: new Date(Date.now() - 60 * 60 * 1000) },
  });

  const second = await startAttempt({
    userId,
    targetKind: "EXERCISE",
    targetId: exercise.id,
  });
  if (!second.ok) throw new Error(`Không vào được lượt hai: ${second.reason}`);
  check("lượt hai tốn ít hơn lượt đầu", second.cost < BASE_COST, true);

  const secondKey = await correctAnswers(second.items.map((i) => i.id));
  const passAnswers = Object.fromEntries(
    second.items.map((i) => [i.id, secondKey.byId.get(i.id) ?? 0]),
  );
  const passed = await submitAttempt({
    userId,
    attemptId: second.attemptId,
    answers: passAnswers,
  });
  if (!passed.ok) throw new Error("Không nộp được lượt hai");

  check("qua", passed.result.passed, true);
  check("đúng cả bốn, vượt ngưỡng ba", passed.result.correctCount >= PASS_THRESHOLD, true);
  check("quyền đã mở", passed.unlocked, true);

  const grant = await db.accessGrant.findFirst({
    where: { userId },
    select: { source: true, feature: true, scope: true, exerciseId: true, status: true },
  });
  check("có đúng một quyền", await db.accessGrant.count({ where: { userId } }), 1);
  check("source là MERIT, không phải PURCHASE", grant?.source, "MERIT");
  check("mở đúng đề đó", grant?.exerciseId, exercise.id);
  check("đúng tính năng và phạm vi", [grant?.feature, grant?.scope], ["READING", "EXERCISE"]);

  console.log("\n— Qua rồi thì không lấy Quân Công lần nữa cho cùng cánh cửa —");

  const third = await startAttempt({
    userId,
    targetKind: "EXERCISE",
    targetId: exercise.id,
  });
  check("bị từ chối", third.ok, false);
  if (!third.ok) check("lý do là ĐÃ QUA", third.reason, "ALREADY_PASSED");

  const finalWallet = await db.meritWallet.findUnique({ where: { userId } });
  check(
    "tổng đã tiêu bằng đúng hai lượt, không hơn",
    finalWallet?.burnedTotal,
    started.cost + second.cost,
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
    ? "\n✅ THÍ BÚT CHẠY ĐÚNG: ĐÁP ÁN KHÔNG RÒ, TRỪ ĐÚNG LÚC, TRƯỢT KHÔNG CÓ HÀNG\n"
    : `\n❌ CÓ ${failures} KIỂM THỬ THẤT BẠI\n`,
);
process.exit(failures === 0 ? 0 : 1);
