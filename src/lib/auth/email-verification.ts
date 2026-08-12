import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { appUrl, sendMail } from "@/lib/mailer";
import { grantWelcomeCoins } from "@/lib/payments/coin-service";
import { WELCOME_COINS, formatCoins } from "@/lib/payments/coins";

/**
 * Xác minh email.
 *
 * VÌ SAO CÓ: quà chào mừng {@link WELCOME_COINS} xu tiêu được vào gói AI chấm,
 * mà mỗi lượt chấm là một hóa đơn OpenAI thật. Không có bước này thì lập tài
 * khoản ảo hàng loạt là cách lấy tiền của trung tâm mà không tốn gì.
 *
 * KHÔNG chặn đăng nhập. Người chưa xác minh vẫn dùng website bình thường, chỉ
 * là chưa nhận được xu. Chặn đăng nhập sẽ biến một trục trặc SMTP thành sự cố
 * "không ai vào được website", và cái giá đó lớn hơn nhiều so với thứ nó bảo vệ.
 */

/** Mã sống 24 giờ. Đủ dài cho người đọc mail muộn, đủ ngắn để không tồn mãi. */
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Chỉ lưu BĂM của mã, không lưu mã gốc.
 *
 * Ai đọc được database — bản sao lưu, log truy vấn, một lỗ rò — cũng không dựng
 * lại được mã để chiếm tài khoản. Mã gốc chỉ tồn tại đúng một chỗ: email đã gửi.
 */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Sinh mã mới rồi gửi thư. Trả về false nếu chưa cấu hình SMTP hoặc gửi hỏng.
 *
 * Mã cũ chưa dùng bị vô hiệu trước: nếu không, mỗi lần bấm "gửi lại" sẽ để lại
 * thêm một mã còn sống, và một hộp thư bị đọc trộm sau này vẫn dùng được mã cũ.
 */
export async function sendVerificationEmail(input: {
  userId: string;
  email: string;
  name: string;
}): Promise<boolean> {
  const token = randomBytes(32).toString("hex");

  await db.emailVerification.updateMany({
    where: { userId: input.userId, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  await db.emailVerification.create({
    data: {
      userId: input.userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });

  const link = `${appUrl()}/api/auth/xac-minh?ma=${token}`;

  return sendMail({
    to: input.email,
    subject: "Xác minh email — HỔ PHÙ · IELTS",
    text:
      `Chào ${input.name},\n\n` +
      `Bấm vào liên kết dưới đây để xác minh email và nhận ${formatCoins(WELCOME_COINS)} ` +
      `vào ví của bạn:\n\n${link}\n\n` +
      `Liên kết sống trong 24 giờ. Nếu bạn không tạo tài khoản nào ở HỔ PHÙ · ` +
      `IELTS thì bỏ qua thư này.\n`,
    html:
      `<p>Chào ${escapeHtml(input.name)},</p>` +
      `<p>Bấm vào nút dưới đây để xác minh email và nhận ` +
      `<strong>${formatCoins(WELCOME_COINS)}</strong> vào ví của bạn:</p>` +
      `<p><a href="${link}" style="display:inline-block;padding:12px 24px;` +
      `background:#1e3a5f;color:#fff;text-decoration:none;font-weight:600">` +
      `Xác minh email</a></p>` +
      `<p style="color:#666;font-size:13px">Liên kết sống trong 24 giờ. Nếu bạn ` +
      `không tạo tài khoản nào ở HỔ PHÙ · IELTS thì bỏ qua thư này.</p>`,
  });
}

export type VerifyOutcome =
  | { ok: true; coinsGranted: boolean }
  | { ok: false; reason: "KHONG_HOP_LE" | "HET_HAN" | "DA_DUNG" };

/**
 * Đổi mã lấy trạng thái đã xác minh, rồi tặng quà chào mừng.
 *
 * Đánh dấu mã đã dùng NGAY trong cùng transaction với việc xác minh: hai tab
 * cùng mở một liên kết thì chỉ một cái qua được, và mã không dùng lại được.
 * Quà tặng nằm NGOÀI transaction vì `grantWelcomeCoins` tự chống lặp bằng khóa
 * riêng — bỏ nó vào trong sẽ kéo dài transaction mà không thêm bảo đảm nào.
 */
export async function consumeVerificationToken(
  token: string
): Promise<VerifyOutcome> {
  if (!token || token.length < 32) {
    return { ok: false, reason: "KHONG_HOP_LE" };
  }

  const row = await db.emailVerification.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, userId: true, expiresAt: true, consumedAt: true },
  });
  if (!row) return { ok: false, reason: "KHONG_HOP_LE" };
  if (row.consumedAt) return { ok: false, reason: "DA_DUNG" };
  if (row.expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: "HET_HAN" };
  }

  const claimed = await db.emailVerification.updateMany({
    where: { id: row.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  // updateMany trả về SỐ HÀNG, không phải hàng. 0 nghĩa là tab kia đã giành
  // trước — không phải lỗi, chỉ là mình tới sau.
  if (claimed.count === 0) return { ok: false, reason: "DA_DUNG" };

  await db.user.updateMany({
    where: { id: row.userId, emailVerifiedAt: null },
    data: { emailVerifiedAt: new Date() },
  });

  const coinsGranted = await grantWelcomeCoins(row.userId);
  return { ok: true, coinsGranted };
}

/**
 * Đánh dấu đã xác minh cho tài khoản Google rồi tặng quà.
 *
 * Google đã kiểm `email_verified` trước khi trả hồ sơ về (xem
 * `api/auth/google/callback`), nên không cần gửi thêm thư nào.
 */
export async function markVerifiedByProvider(userId: string): Promise<void> {
  await db.user.updateMany({
    where: { id: userId, emailVerifiedAt: null },
    data: { emailVerifiedAt: new Date() },
  });
  await grantWelcomeCoins(userId);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
