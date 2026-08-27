import "server-only";
import nodemailer from "nodemailer";

/**
 * Gửi email — NƠI DUY NHẤT đọc `SMTP_PASS`.
 *
 * Cùng khuôn với `openai-client.ts` và `google-oauth.ts`: mật khẩu không đi qua
 * bất kỳ giá trị trả về nào, không vào log, không vào database.
 *
 * SUY THOÁI AN TOÀN: thiếu cấu hình thì `mailEnabled()` trả false và mọi lời
 * gọi gửi mail lặng lẽ trả về `false` thay vì ném lỗi. Lý do: một trục trặc
 * SMTP không được phép làm hỏng việc đăng ký. Hệ quả có chủ đích là tài khoản
 * không xác minh được email thì KHÔNG nhận quà chào mừng — không có mail thì
 * không có tiền miễn phí, đó là mặc định an toàn.
 */

export function mailEnabled(): boolean {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
  );
}

/** Địa chỉ hiện ở ô "Từ". Mặc định về chính tài khoản SMTP nếu không khai. */
function mailFrom(): string {
  return (
    process.env.MAIL_FROM ||
    `STOIC · IELTS <${process.env.SMTP_USER ?? "no-reply@localhost"}>`
  );
}

function transport() {
  const port = Number.parseInt(process.env.SMTP_PORT ?? "465", 10);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    // 465 là SMTPS (mã hóa ngay từ đầu); 587 là STARTTLS (nâng cấp sau khi
    // chào hỏi). Đoán sai cái này thì kết nối treo cho tới lúc hết giờ.
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Gửi một email. Không bao giờ ném lỗi ra ngoài.
 *
 * @returns true nếu máy chủ SMTP đã nhận thư
 */
export async function sendMail(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<boolean> {
  if (!mailEnabled()) return false;
  try {
    await transport().sendMail({
      from: mailFrom(),
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    return true;
  } catch (error) {
    // In mã lỗi thôi, KHÔNG in toàn bộ đối tượng lỗi: nodemailer có thói quen
    // đính kèm cả cấu hình kết nối, và trong đó có mật khẩu.
    const code =
      error instanceof Error ? error.message.slice(0, 120) : "khong ro";
    console.error(`[wobridges] Gui mail that bai: ${code}`);
    return false;
  }
}

/** Địa chỉ gốc của website, dùng để dựng liên kết trong email. */
export function appUrl(): string {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
}
