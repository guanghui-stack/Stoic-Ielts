"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { convertReputationToMerit } from "@/lib/forum/reputation-service";

export type ConvertReputationState =
  | { ok: true; message: string }
  | { ok: false; error: string }
  | undefined;

/**
 * Đổi toàn bộ uy vọng đang có sang Đức Hạnh.
 *
 * Không nhận số lượng từ biểu mẫu: đổi TẤT CẢ hoặc không đổi gì. Cho phép chọn
 * số lượng nghĩa là phải tin một con số do trình duyệt gửi lên, và đó là chỗ
 * duy nhất trong luồng này có thể bị bịa ra.
 */
export async function convertReputationAction(): Promise<ConvertReputationState> {
  const user = await requireUser();
  if (user.role !== "STUDENT") {
    return { ok: false, error: "Chỉ học viên mới có uy vọng để quy đổi." };
  }

  const result = await convertReputationToMerit(user.id);
  revalidatePath("/hoc-vien");

  if (result.ok) {
    return {
      ok: true,
      message: `Đã đổi ${result.converted} uy vọng thành ${result.converted} Đức Hạnh. Số dư Đức Hạnh: ${result.meritBalanceAfter}.`,
    };
  }
  if (result.reason === "ALREADY_DONE") {
    return { ok: false, error: "Uy vọng vừa được quy đổi ở một thao tác khác." };
  }
  return { ok: false, error: "Bạn chưa có uy vọng dương nào để quy đổi." };
}
