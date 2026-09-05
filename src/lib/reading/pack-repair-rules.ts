import { createHash } from "node:crypto";

/**
 * Luật vá đề Reading đã seed nhầm bản hỏng.
 *
 * Tách khỏi cơ sở dữ liệu để kiểm chứng được: đây là đoạn duy nhất trong hệ
 * thống GHI ĐÈ nội dung đề đã nằm trên máy chủ, nên phải chắc chắn nó không
 * bao giờ đụng vào bài quản trị viên đã tự sửa.
 */

export type RepairEntry = Readonly<{
  title: string;
  /** Mã băm của nội dung bản HỎNG mà chính ta từng đẩy lên. */
  brokenSha256: string;
}>;

/** Mã băm nội dung đề, tính trên đúng chuỗi đang lưu trong cột `content`. */
export function contentFingerprint(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Có được phép ghi đè bản đang nằm trên máy chủ không?
 *
 * Chỉ khi nội dung hiện tại còn khớp y hệt bản hỏng đã biết. Lệch một ký tự
 * cũng có nghĩa là ai đó đã sửa tay, và khi đó công sức của họ được ưu tiên
 * hơn bản vá tự động.
 */
export function shouldOverwrite(
  currentContent: string | null | undefined,
  entry: RepairEntry,
): boolean {
  if (!currentContent) return false;
  if (!entry.brokenSha256) return false;
  return contentFingerprint(currentContent) === entry.brokenSha256;
}
