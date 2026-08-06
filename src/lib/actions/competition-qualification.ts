"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { features } from "@/lib/features";
import {
  acceptQualification,
  declineQualification,
} from "@/lib/competition/qualification-service";

/**
 * Server Action cho vé tuyển chọn Dương Thí và Thiên Thí.
 *
 * Tự xác thực người dùng và tự kiểm cờ tính năng. Không dựa vào việc giao
 * diện đã ẩn nút — một action còn sống là một cửa vào, và người gọi thẳng nó
 * không đi qua giao diện bao giờ.
 */

export type QualificationState =
  | { error?: string; success?: string }
  | undefined;

async function guarded(
  action: (userId: string) => Promise<{ ok: true } | { ok: false; error: string }>,
  successMessage: string,
): Promise<QualificationState> {
  if (!features.competitionTiers) {
    return { error: "Hệ ba tầng đại thí chưa được mở." };
  }
  const user = await getCurrentUser();
  if (!user) return { error: "Bạn cần đăng nhập." };

  const result = await action(user.id);
  if (!result.ok) return { error: result.error };

  revalidatePath("/duong-thi");
  revalidatePath("/thien-thi");
  return { success: successMessage };
}

export async function acceptQualificationAction(
  _prev: QualificationState,
  formData: FormData,
): Promise<QualificationState> {
  const id = String(formData.get("qualificationId") ?? "");
  return guarded(
    (userId) => acceptQualification(id, userId),
    "Đã nhận vé. Bạn là thí sinh chính thức của kỳ này.",
  );
}

export async function declineQualificationAction(
  _prev: QualificationState,
  formData: FormData,
): Promise<QualificationState> {
  const id = String(formData.get("qualificationId") ?? "");
  return guarded(
    (userId) => declineQualification(id, userId),
    "Đã từ chối vé. Ghế sẽ được nhường cho người kế tiếp.",
  );
}
