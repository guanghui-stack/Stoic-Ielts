"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

export type ProfileState = { error?: string; success?: string } | undefined;

/**
 * Hồ sơ công khai của học viên.
 *
 * MẶC ĐỊNH LÀ KHÔNG CÔNG KHAI GÌ CẢ. Học viên phải chủ động bật, và tên hiển
 * thị do họ tự đặt — email, điểm chi tiết và lịch sử học tập không bao giờ ra
 * khỏi tài khoản của họ.
 */
export async function savePublicProfileAction(
  _prev: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const user = await requireUser();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const allowHall = formData.get("allowHall") === "on";

  if (allowHall && displayName.length < 2) {
    return { error: "Hãy đặt tên hiển thị (tối thiểu 2 ký tự) trước khi công khai." };
  }
  if (displayName.length > 40) {
    return { error: "Tên hiển thị tối đa 40 ký tự." };
  }

  await db.publicProfile.upsert({
    where: { userId: user.id },
    update: { displayName: displayName || user.name, allowHall },
    create: { userId: user.id, displayName: displayName || user.name, allowHall },
  });

  // Tắt cờ mà tin cũ vẫn nằm trên Thông Báo thì cái nút này chỉ là lời hứa
  // suông. Gỡ bằng `visible`, không xoá hàng, để còn tra được khi có khiếu nại.
  let hidden = 0;
  if (!allowHall) {
    try {
      const { hideBulletinsOf } = await import("@/lib/arena/bulletin-service");
      hidden = await hideBulletinsOf(user.id);
    } catch (error) {
      console.error("[wobridges] Khong go duoc tin bo cao cu:", error);
    }
  }

  revalidatePath("/hoc-vien/danh-hieu");
  revalidatePath("/dien-danh-vong");
  revalidatePath("/bang-bo-cao");
  return {
    success: allowHall
      ? "Đã bật hiển thị tên bạn ở Dấu Mốc Cộng Đồng và Thông Báo."
      : hidden > 0
        ? `Đã tắt và gỡ ${hidden} tin cũ khỏi Thông Báo. Dấu mốc của bạn vẫn được tính vào tổng số nhưng ẩn danh.`
        : "Đã tắt. Dấu mốc của bạn vẫn được tính vào tổng số nhưng ẩn danh.",
  };
}

/**
 * Chọn một danh hiệu để hiển thị cạnh tên.
 * Danh hiệu riêng tư KHÔNG bao giờ trang bị được.
 */
export async function equipTitleAction(awardId: string) {
  const user = await requireUser();

  if (awardId === "none") {
    await db.publicProfile.updateMany({
      where: { userId: user.id },
      data: { equippedTitleAwardId: null },
    });
    revalidatePath("/hoc-vien/danh-hieu");
    return;
  }

  const award = await db.userTitle.findUnique({
    where: { id: awardId },
    include: { title: { select: { visibility: true } } },
  });
  if (
    !award ||
    award.userId !== user.id ||
    award.status !== "EARNED" ||
    award.title.visibility === "PRIVATE_ONLY"
  ) {
    return;
  }

  await db.publicProfile.upsert({
    where: { userId: user.id },
    update: { equippedTitleAwardId: awardId },
    create: {
      userId: user.id,
      displayName: user.name,
      equippedTitleAwardId: awardId,
    },
  });
  revalidatePath("/hoc-vien/danh-hieu");
}
