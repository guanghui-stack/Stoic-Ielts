"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/session";
import { resolveIntegrityCase } from "@/lib/arena/integrity-service";
import {
  awardManualTitle,
  revokeTitleByReviewer,
} from "@/lib/arena/title-service";

const ADMIN_PATH = "/quan-tri/liem-chinh";

export type IntegrityActionState =
  | { error?: string; success?: string }
  | undefined;

/**
 * Đóng một hồ sơ liêm chính.
 *
 * HAI VIỆC TÁCH RIÊNG, và đó là điểm quan trọng nhất của cả màn hình này: đóng
 * hồ sơ là một nút, gắn danh hiệu là một nút khác, ở một biểu mẫu khác. Gộp lại
 * thì một cú bấm nhầm biến "đã xem, không có gì" thành một lời buộc tội công
 * khai với bạn học.
 */
export async function resolveIntegrityCaseAction(
  _prev: IntegrityActionState,
  formData: FormData,
): Promise<IntegrityActionState> {
  const admin = await requireAdmin();

  const caseId = String(formData.get("caseId") ?? "");
  const verdict = String(formData.get("verdict") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!caseId) return { error: "Thiếu mã hồ sơ." };
  if (verdict !== "CLEARED" && verdict !== "CONFIRMED") {
    return { error: "Kết luận không hợp lệ." };
  }
  if (!note) {
    return {
      error:
        "Bắt buộc ghi kết luận, kể cả khi kết luận là không có gì. Lần sau có khiếu nại, đây là thứ duy nhất trả lời được câu hỏi đã xem và nghĩ gì.",
    };
  }

  const ok = await resolveIntegrityCase({
    caseId,
    reviewerId: admin.id,
    verdict,
    note,
  });
  if (!ok) return { error: "Hồ sơ này đã được người khác đóng trước đó." };

  revalidatePath(ADMIN_PATH);
  return {
    success:
      verdict === "CLEARED"
        ? "Đã ghi: xem xong, không có gì. Người này không bị đánh dấu."
        : "Đã ghi kết luận có vi phạm. Gắn danh hiệu là một bước riêng ở dưới.",
  };
}

/**
 * Gắn một trong hai danh hiệu chỉ người xử được.
 *
 * Bằng chứng BẮT BUỘC, và tên người bấm được ghi vào bản ghi. Khi có khiếu nại,
 * câu hỏi đầu tiên luôn là "ai quyết định việc này", và không có tên thì không
 * ai trả lời được.
 */
export async function awardManualTitleAction(
  _prev: IntegrityActionState,
  formData: FormData,
): Promise<IntegrityActionState> {
  const admin = await requireAdmin();

  const userId = String(formData.get("userId") ?? "");
  const code = String(formData.get("code") ?? "");
  const evidence = String(formData.get("evidence") ?? "").trim();

  if (!userId) return { error: "Thiếu mã người học." };
  if (
    code !== "ARENA_M01_NGUY_TAO_QUAN_CONG" &&
    code !== "ARENA_M02_NOI_UNG_NGOAI_HOP"
  ) {
    return { error: "Mã danh hiệu không hợp lệ." };
  }
  if (evidence.length < 20) {
    return {
      error:
        "Bằng chứng phải viết đủ dài để người khác đọc lại hiểu được. Ít nhất hai mươi ký tự.",
    };
  }

  const ok = await awardManualTitle({
    userId,
    code,
    reviewerId: admin.id,
    evidence,
  });
  if (!ok) return { error: "Không tìm thấy danh hiệu này trong danh mục." };

  revalidatePath(ADMIN_PATH);
  return { success: "Đã gắn danh hiệu, kèm tên người gắn và bằng chứng." };
}

/**
 * Gỡ một danh hiệu.
 *
 * Đây là đường khiếu nại. Người học không thấy nút này: họ gửi khiếu nại qua
 * kênh thường, và người xét duyệt bấm ở đây. Gỡ là một sự kiện có ghi lý do,
 * không phải một phép xoá, nên vẫn tra được về sau.
 */
export async function revokeTitleAction(
  _prev: IntegrityActionState,
  formData: FormData,
): Promise<IntegrityActionState> {
  const admin = await requireAdmin();

  const userId = String(formData.get("userId") ?? "");
  const code = String(formData.get("code") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!userId || !code) return { error: "Thiếu mã người học hoặc mã danh hiệu." };
  if (!reason) return { error: "Gỡ danh hiệu bắt buộc phải ghi lý do." };

  const ok = await revokeTitleByReviewer({
    userId,
    code,
    reviewerId: admin.id,
    reason,
  });
  if (!ok) return { error: "Người này không đang mang danh hiệu đó." };

  revalidatePath(ADMIN_PATH);
  return { success: "Đã gỡ danh hiệu và ghi lại lý do." };
}
