/**
 * Phát hành CẢ MỘT MẺ câu Thí Bút cùng lúc.
 *
 * Chạy: node scripts/publish-thibut-batch.mjs <ten-me> <email-nguoi-duyet> --toi-chiu-trach-nhiem
 *
 * VÌ SAO CÓ SCRIPT NÀY, và vì sao nó khó dùng đến thế.
 *
 * Chốt duyệt từng câu ở `/quan-tri/thi-but` tồn tại để chặn câu do AI sinh ra
 * lọt xuống học viên mà chưa ai đọc. Nhưng nó giả định mỗi mẻ vài chục câu.
 * Với một cuốn sách bài tập 600 câu do chính chủ dự án soạn và đã có sẵn đáp
 * án, bấm 600 lần không làm ai an toàn hơn: nó chỉ khiến người ta bấm cho xong
 * mà không đọc, tức là mất chốt duyệt thật trong khi vẫn giữ hình thức của nó.
 *
 * Script này KHÔNG bỏ chốt duyệt. Nó đổi đơn vị duyệt từ MỘT CÂU sang MỘT MẺ,
 * và giữ nguyên phần quan trọng nhất: có một con người cụ thể chịu trách nhiệm,
 * tên người đó được ghi vào `reviewedById` của từng câu.
 *
 * Ba thứ script cố ý bắt phải gõ tay:
 *
 *   1. TÊN MẺ. Không có tuỳ chọn "phát hành tất cả". Muốn phát hành thì phải
 *      biết chính xác mình đang phát hành cái gì.
 *   2. EMAIL NGƯỜI DUYỆT. Phải là tài khoản ADMIN có thật.
 *   3. CỜ --toi-chiu-trach-nhiem. Gõ nhầm lệnh thì không có gì xảy ra.
 */
import { PrismaClient } from "@prisma/client";

const [batch, email, flag] = process.argv.slice(2);

if (!batch || !email || flag !== "--toi-chiu-trach-nhiem") {
  console.error("Cách dùng:");
  console.error(
    "  node scripts/publish-thibut-batch.mjs <ten-me> <email-nguoi-duyet> --toi-chiu-trach-nhiem",
  );
  console.error("\nVí dụ:");
  console.error(
    "  node scripts/publish-thibut-batch.mjs paraphrase-band-2-4 admin@wobridges.vn --toi-chiu-trach-nhiem",
  );
  process.exit(1);
}

const db = new PrismaClient();
try {
  const reviewer = await db.user.findUnique({
    where: { email },
    select: { id: true, name: true, role: true },
  });
  if (!reviewer) {
    console.error(`Không có tài khoản nào với email ${email}.`);
    process.exit(1);
  }
  if (reviewer.role !== "ADMIN") {
    console.error(
      `${email} không phải quản trị viên. Chỉ quản trị viên mới duyệt được kho câu.`,
    );
    process.exit(1);
  }

  const pending = await db.thiButItem.count({
    where: { sourceBatch: batch, status: "DRAFT" },
  });
  if (pending === 0) {
    console.error(`Mẻ "${batch}" không có câu nào đang chờ duyệt.`);
    process.exit(1);
  }

  const now = new Date();
  const result = await db.thiButItem.updateMany({
    where: { sourceBatch: batch, status: "DRAFT" },
    data: {
      status: "PUBLISHED",
      reviewedById: reviewer.id,
      reviewedAt: now,
      publishedAt: now,
      reviewNote: `Duyệt cả mẻ "${batch}". Nguồn do chủ dự án soạn, có sẵn đáp án và lời giải.`,
    },
  });

  const totals = await db.thiButItem.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const count = (s) => totals.find((t) => t.status === s)?._count._all ?? 0;

  console.log(`\nĐã phát hành ${result.count} câu của mẻ "${batch}".`);
  console.log(`Người chịu trách nhiệm: ${reviewer.name} <${email}>`);
  console.log(`\nKho hiện tại:`);
  console.log(`  chờ duyệt    ${count("DRAFT")}`);
  console.log(`  đã phát hành ${count("PUBLISHED")}`);
  console.log(`  đã loại      ${count("RETIRED")}`);
  console.log(
    `\nTừ giờ học viên có thể gặp những câu này khi vào Thí Bút. Câu nào sai thì`,
  );
  console.log(`vào /quan-tri/thi-but loại riêng câu đó, không cần đụng cả mẻ.`);
} finally {
  await db.$disconnect();
}
