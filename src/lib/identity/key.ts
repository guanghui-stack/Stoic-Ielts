/**
 * Khóa danh tính — chặn một người tạo nhiều tài khoản để thi nhiều lượt.
 *
 * KHÔNG BAO GIỜ lưu số CCCD dạng rõ trong MySQL. Số giấy tờ được chuẩn hóa rồi
 * băm HMAC bằng pepper chỉ tồn tại ở biến môi trường máy chủ. Kết quả đủ để so
 * trùng (cùng số giấy tờ luôn ra cùng khóa) nhưng không thể đảo ngược thành số
 * gốc nếu database bị lộ.
 *
 * Vì sao HMAC chứ không phải SHA-256 thuần: không gian số CCCD Việt Nam chỉ 12
 * chữ số. Băm thuần thì kẻ có database dò cạn toàn bộ trong vài giờ. Pepper bí
 * mật làm việc dò cạn vô nghĩa khi chưa lấy được biến môi trường.
 *
 * File này CHỈ chạy phía máy chủ.
 */

import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/** Tuổi tối thiểu dự Nguyệt Thí — trùng khuyến nghị độ tuổi của chính IELTS. */
export const MIN_COMPETITION_AGE = 16;

export class IdentityError extends Error {
  constructor(public code: "MISSING_PEPPER" | "INVALID_DOCUMENT_NUMBER" | "UNDERAGE") {
    super(code);
  }
}

function pepper(): string {
  const value = process.env.IDENTITY_PEPPER?.trim();
  // Thiếu pepper thì DỪNG, tuyệt đối không lùi về băm thuần: một lần chạy nhầm
  // sẽ sinh ra loạt khóa yếu lẫn vào dữ liệu thật mà không ai nhận ra.
  if (!value || value.length < 32) throw new IdentityError("MISSING_PEPPER");
  return value;
}

/**
 * Chuẩn hóa số giấy tờ trước khi băm.
 *
 * Người dùng gõ "012 345 678 901", "012-345-678-901" hay có khoảng trắng thừa
 * đều phải ra cùng một khóa, nếu không việc chặn trùng sẽ vô dụng.
 */
export function normalizeDocumentNumber(raw: string): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 20) {
    throw new IdentityError("INVALID_DOCUMENT_NUMBER");
  }
  return digits;
}

export function identityKey(documentNumber: string): string {
  const normalized = normalizeDocumentNumber(documentNumber);
  return createHmac("sha256", pepper()).update(`VN-ID:${normalized}`).digest("hex");
}

/** So khớp khóa theo thời gian hằng định để không rò rỉ qua thời gian phản hồi. */
export function identityKeyEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/** Bốn số cuối để nhân viên đối chiếu bằng mắt khi xác minh thủ công. */
export function documentLast4(documentNumber: string): string {
  return normalizeDocumentNumber(documentNumber).slice(-4);
}
