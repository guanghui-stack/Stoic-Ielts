"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { planWithdrawal } from "@/lib/identity/data-rights";

/**
 * Quyền dữ liệu của thí sinh — gửi yêu cầu xem, xoá, rút đồng ý.
 *
 * KHÔNG xoá dữ liệu ngay tại đây. Ba lý do, theo đúng thứ tự quan trọng:
 *
 *  1. Xoá là thao tác không hoàn tác được. Một cú bấm nhầm không được phép
 *     xoá vĩnh viễn hồ sơ học tập của ai.
 *  2. Một phần dữ liệu phải giữ lại theo nghĩa vụ tuân thủ, và chỉ người mới
 *     phân biệt được phần nào.
 *  3. Hồ sơ đang bị rà soát thì nhật ký phải giữ tới khi khép lại — quyết
 *     định của chủ dự án ngày 06/08/2026. Nếu không, ai sắp bị loại cũng chỉ
 *     cần rút đồng ý là xoá sạch bằng chứng chống lại mình.
 */

export type DataRightsState =
  | { error?: string; success?: string }
  | undefined;

/** Hồ sơ có đang trong diện rà soát không. */
async function isUnderReview(userId: string): Promise<boolean> {
  const [flagged, openAppeal] = await Promise.all([
    db.competitionEntry.count({
      where: { userId, reviewStatus: { not: "CLEAR" } },
    }),
    db.competitionAppeal.count({
      where: { userId, status: { notIn: ["RESOLVED", "REJECTED"] } },
    }),
  ]);
  return flagged > 0 || openAppeal > 0;
}

async function submit(
  kind: "EXPORT" | "DELETE" | "WITHDRAW_CONSENT",
  successMessage: string,
): Promise<DataRightsState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Bạn cần đăng nhập." };

  // Một yêu cầu cùng loại đang chờ thì không tạo thêm — tránh việc bấm nhiều
  // lần sinh ra một hàng chờ giả khiến nhân viên tưởng có nhiều người yêu cầu.
  const pending = await db.dataRightsRequest.findFirst({
    where: { userId: user.id, kind, status: { in: ["PENDING", "IN_PROGRESS"] } },
    select: { id: true },
  });
  if (pending) {
    return { error: "Bạn đã có một yêu cầu cùng loại đang chờ xử lý." };
  }

  const underReview = await isUnderReview(user.id);
  const plan = planWithdrawal(underReview);

  await db.dataRightsRequest.create({
    data: {
      userId: user.id,
      kind,
      scopeJson: JSON.stringify({
        underReview,
        erasable: plan.erasable.map((c) => c.code),
        retained: plan.retained.map((r) => ({ code: r.category.code, reason: r.reason })),
      }),
    },
  });

  revalidatePath("/hoc-vien/du-lieu-cua-toi");
  return { success: successMessage };
}

export async function requestExportAction(): Promise<DataRightsState> {
  return submit(
    "EXPORT",
    "Đã gửi yêu cầu. Trung tâm sẽ gửi bản sao dữ liệu của bạn qua email đăng ký.",
  );
}

export async function requestDeletionAction(): Promise<DataRightsState> {
  return submit(
    "DELETE",
    "Đã gửi yêu cầu xoá. Trung tâm sẽ liên hệ xác nhận trước khi thực hiện, vì thao tác này không hoàn tác được.",
  );
}

export async function withdrawConsentAction(): Promise<DataRightsState> {
  return submit(
    "WITHDRAW_CONSENT",
    "Đã ghi nhận việc rút đồng ý. Bạn sẽ không dự được kỳ thi nào cần xác minh danh tính cho tới khi đồng ý lại.",
  );
}
