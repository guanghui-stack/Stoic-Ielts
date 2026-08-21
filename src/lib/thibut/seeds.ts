import "server-only";
import { db } from "@/lib/db";
import bank from "../../../data/thibut-paraphrase-600.json";

/**
 * Gieo kho câu Thí Bút khi máy chủ khởi động.
 *
 * VÌ SAO Ở ĐÂY chứ không phải một lệnh chạy tay: triển khai của dự án này là
 * push lên `main` rồi Hostinger tự chạy. Chủ dự án không mở terminal trên máy
 * chủ, và không nên phải mở. Mọi thứ khác trong hệ đã đi đường này rồi: đề bài,
 * danh mục cấp bậc, danh hiệu, chín phòng Nghị Sự Đường.
 *
 * VỀ CHỐT DUYỆT. Kho câu bình thường vào ở trạng thái DRAFT và phải có người
 * duyệt, vì một câu sai đáp án sẽ lấy mất quân công của người ngay thẳng. Mẻ
 * này là ngoại lệ CÓ TÊN và có lý do ghi lại được:
 *
 *   - Chủ dự án tự soạn 600 câu, kèm sẵn đáp án và lời giải
 *   - Chủ dự án duyệt toàn bộ mẻ ngày 2026-08-20
 *   - Căn khớp số câu và số đáp án đã kiểm bằng máy: 200/200 và 400/400,
 *     không thiếu không thừa một số nào
 *
 * Người duyệt được ghi vào `reviewedById` của từng câu, đúng như khi duyệt tay.
 * Mẻ MỚI vẫn vào DRAFT như cũ; hàm này chỉ biết đúng một mẻ tên dưới đây.
 */
const BATCH = "paraphrase-band-2-4";

const REVIEW_NOTE =
  'Duyệt cả mẻ "paraphrase-band-2-4". Nguồn do chủ dự án soạn, có sẵn đáp án và lời giải.';

type BankItem = {
  type: string;
  difficulty: string;
  prompt: string;
  options: string[];
  answerIndex: number;
  explanation: string;
};

export async function seedThiButBank(): Promise<{
  created: number;
  published: number;
}> {
  const items = bank as BankItem[];

  // Đã gieo rồi thì thôi. So theo số lượng chứ không theo cờ applyOnce: nếu ai
  // đó lỡ xoá vài câu thì lần khởi động sau bù lại, thay vì im lặng bỏ qua.
  const existing = await db.thiButItem.count({ where: { sourceBatch: BATCH } });
  if (existing >= items.length) return { created: 0, published: 0 };

  const have = new Set(
    (
      await db.thiButItem.findMany({
        where: { sourceBatch: BATCH },
        select: { prompt: true, options: true },
      })
    ).map((r) => `${r.prompt}|${r.options}`),
  );

  const missing = items
    .map((i) => ({
      type: i.type,
      difficulty: i.difficulty,
      prompt: i.prompt,
      options: JSON.stringify(i.options),
      answerIndex: i.answerIndex,
      explanation: i.explanation,
      status: "DRAFT",
      sourceBatch: BATCH,
    }))
    .filter((i) => !have.has(`${i.prompt}|${i.options}`));

  if (missing.length === 0) return { created: 0, published: 0 };

  await db.thiButItem.createMany({ data: missing });

  // Phát hành, ghi tên quản trị viên làm người chịu trách nhiệm.
  //
  // Chưa có quản trị viên thì để nguyên DRAFT chứ không phát hành khuyết danh:
  // một câu không truy được ai duyệt thì không tra được khi có tranh chấp.
  const admin = await db.user.findFirst({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!admin) return { created: missing.length, published: 0 };

  const now = new Date();
  const result = await db.thiButItem.updateMany({
    where: { sourceBatch: BATCH, status: "DRAFT" },
    data: {
      status: "PUBLISHED",
      reviewedById: admin.id,
      reviewedAt: now,
      publishedAt: now,
      reviewNote: REVIEW_NOTE,
    },
  });

  return { created: missing.length, published: result.count };
}
