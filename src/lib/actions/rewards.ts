"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/session";

export type RewardState = { error?: string; success?: string } | undefined;

/**
 * Phần thưởng "mở một bài trả phí kèm Feynman" sinh ra từ danh hiệu.
 *
 * Cố ý KHÔNG mở khóa ngay khi đạt danh hiệu: học viên chọn bài mình muốn rồi
 * gửi yêu cầu, quản trị viên duyệt. Việc này giữ cho trung tâm biết mình đang
 * tặng gì cho ai, và tránh cảnh phần thưởng rơi vào một bài học viên không cần.
 */

const ADMIN_PATH = "/quan-tri/phan-thuong";
const STUDENT_PATH = "/hoc-vien/danh-hieu";

/** Học viên chọn bài và gửi yêu cầu. */
export async function requestRewardAction(
  _prev: RewardState,
  formData: FormData
): Promise<RewardState> {
  const user = await requireUser();
  const rewardId = String(formData.get("rewardId") ?? "");
  const exerciseId = String(formData.get("exerciseId") ?? "");

  const reward = await db.rewardGrant.findUnique({ where: { id: rewardId } });
  if (!reward || reward.userId !== user.id) {
    return { error: "Không tìm thấy phần thưởng này." };
  }
  if (reward.status !== "EARNED") {
    return { error: "Phần thưởng này đã được gửi yêu cầu hoặc đã dùng rồi." };
  }
  if (reward.expiresAt <= new Date()) {
    await db.rewardGrant.update({
      where: { id: reward.id },
      data: { status: "EXPIRED" },
    });
    return { error: "Phần thưởng đã quá hạn 90 ngày." };
  }

  const exercise = await db.exercise.findUnique({
    where: { id: exerciseId },
    select: {
      id: true,
      published: true,
      skill: true,
      accessLevel: true,
      competitionOnly: true,
    },
  });
  if (
    !exercise ||
    !exercise.published ||
    exercise.skill !== "READING" ||
    exercise.accessLevel !== "RESTRICTED" ||
    exercise.competitionOnly
  ) {
    return { error: "Bài bạn chọn không nằm trong nhóm được đổi thưởng." };
  }

  await db.rewardGrant.update({
    where: { id: reward.id },
    data: {
      status: "REQUESTED",
      selectedExerciseId: exercise.id,
      requestedAt: new Date(),
    },
  });
  revalidatePath(STUDENT_PATH);
  revalidatePath(ADMIN_PATH);
  return {
    success:
      "Đã gửi yêu cầu. Trung tâm sẽ kiểm tra và mở bài cho bạn trong thời gian sớm nhất.",
  };
}

/**
 * Quản trị viên duyệt: cấp HAI quyền vĩnh viễn (Reading + Feynman) cho đúng
 * bài học viên đã chọn.
 *
 * Khóa `grantKey` cố định theo mã phần thưởng nên bấm duyệt hai lần cũng chỉ
 * cấp một lần — đây chính là điều kiện T10 trong đặc tả.
 */
export async function approveRewardAction(
  _prev: RewardState,
  formData: FormData
): Promise<RewardState> {
  const admin = await requireAdmin();
  const rewardId = String(formData.get("rewardId") ?? "");

  try {
    await db.$transaction(async (tx) => {
      const reward = await tx.rewardGrant.findUnique({ where: { id: rewardId } });
      if (!reward) throw new Error("Không tìm thấy phần thưởng.");
      if (reward.status !== "REQUESTED") {
        throw new Error(`Phần thưởng đang ở trạng thái ${reward.status}.`);
      }
      if (!reward.selectedExerciseId) throw new Error("Học viên chưa chọn bài.");
      if (reward.expiresAt <= new Date()) throw new Error("Phần thưởng đã quá hạn.");

      const now = new Date();
      const readingKey = `REWARD:${reward.id}:READING`;
      const feynmanKey = `REWARD:${reward.id}:FEYNMAN`;

      for (const item of [
        { feature: "READING", grantKey: readingKey },
        { feature: "FEYNMAN", grantKey: feynmanKey },
      ]) {
        await tx.accessGrant.upsert({
          where: { grantKey: item.grantKey },
          update: {},
          create: {
            userId: reward.userId,
            exerciseId: reward.selectedExerciseId,
            grantKey: item.grantKey,
            feature: item.feature,
            scope: "EXERCISE",
            source: "REWARD",
            status: "ACTIVE",
            startsAt: now,
            expiresAt: null,
          },
        });
      }

      await tx.rewardGrant.update({
        where: { id: reward.id },
        data: {
          status: "FULFILLED",
          reviewedAt: now,
          reviewedById: admin.id,
          fulfilledAt: now,
          readingGrantKey: readingKey,
          feynmanGrantKey: feynmanKey,
        },
      });
    });
  } catch (error) {
    return { error: String(error instanceof Error ? error.message : error).slice(0, 200) };
  }

  revalidatePath(ADMIN_PATH);
  revalidatePath("/luyen-tap/reading");
  return { success: "Đã mở bài và phần chữa bài Feynman cho học viên." };
}

/** Từ chối một yêu cầu (kèm lý do để học viên hiểu vì sao). */
export async function rejectRewardAction(
  _prev: RewardState,
  formData: FormData
): Promise<RewardState> {
  const admin = await requireAdmin();
  const rewardId = String(formData.get("rewardId") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (note.length < 5) return { error: "Hãy ghi lý do để học viên hiểu." };

  const reward = await db.rewardGrant.findUnique({ where: { id: rewardId } });
  if (!reward) return { error: "Không tìm thấy phần thưởng." };
  if (reward.status !== "REQUESTED") {
    return { error: `Phần thưởng đang ở trạng thái ${reward.status}.` };
  }

  // Trả về EARNED chứ không đóng hẳn: học viên vẫn còn quyền chọn bài khác
  // trong thời hạn 90 ngày. Từ chối một lựa chọn không phải là tước phần thưởng.
  await db.rewardGrant.update({
    where: { id: reward.id },
    data: {
      status: "EARNED",
      selectedExerciseId: null,
      requestedAt: null,
      reviewedAt: new Date(),
      reviewedById: admin.id,
      note,
    },
  });
  revalidatePath(ADMIN_PATH);
  revalidatePath(STUDENT_PATH);
  return { success: "Đã trả lại quyền chọn bài cho học viên kèm ghi chú." };
}
