"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { features } from "@/lib/features";
import {
  generateQualifications,
  expireStaleOffers,
} from "@/lib/competition/qualification-service";
import { tierPolicy, sourceBelongsToSeason, type CompetitionTier } from "@/lib/competition/tiers";

/**
 * Quản trị nguồn tuyển chọn cho Dương Thí và Thiên Thí.
 *
 * Đặc tả §11.4 đặt ra một giới hạn tuyệt đối cho khu này: KHÔNG có nút thêm
 * thí sinh tùy ý. Mọi ghế phải truy ngược được về một kết quả có thật ở một
 * kỳ nguồn đã chốt. Vì vậy ở đây chỉ có ba việc — gắn kỳ nguồn, sinh vé từ
 * kết quả đó, và gỡ một kỳ nguồn gắn nhầm.
 */

export type AdminQualState =
  | { error?: string; success?: string }
  | undefined;

async function guard(): Promise<{ error: string } | null> {
  if (!features.competitionTiers) {
    return { error: "Hệ ba tầng đại thí chưa được mở." };
  }
  await requireAdmin();
  return null;
}

function refresh(targetId: string) {
  revalidatePath("/quan-tri/tuyen-chon");
  revalidatePath(`/quan-tri/tuyen-chon/${targetId}`);
}

/**
 * Gắn một kỳ nguồn vào kỳ đích.
 *
 * Kiểm ba điều trước khi gắn, vì gắn sai thì vé sinh ra sẽ mời nhầm người:
 * đúng tầng nguồn, đúng mùa, và chưa vượt số kỳ nguồn cho phép.
 */
export async function attachSourceAction(
  _prev: AdminQualState,
  formData: FormData,
): Promise<AdminQualState> {
  const blocked = await guard();
  if (blocked) return blocked;

  const targetId = String(formData.get("targetId") ?? "");
  const sourceId = String(formData.get("sourceId") ?? "");

  const [target, source] = await Promise.all([
    db.competition.findUnique({
      where: { id: targetId },
      select: { id: true, tier: true, seasonKey: true },
    }),
    db.competition.findUnique({
      where: { id: sourceId },
      select: { id: true, tier: true, seasonKey: true, name: true },
    }),
  ]);

  if (!target || !source) return { error: "Không tìm thấy kỳ thi." };

  const policy = tierPolicy(target.tier as CompetitionTier);
  if (policy.sourceTier === null) {
    return { error: `${policy.name} dùng đăng ký mở, không có kỳ nguồn.` };
  }
  if (source.tier !== policy.sourceTier) {
    return {
      error: `${policy.name} chỉ nhận nguồn từ ${tierPolicy(policy.sourceTier).name}.`,
    };
  }
  if (!sourceBelongsToSeason(target.tier as CompetitionTier, target.seasonKey, source.seasonKey)) {
    return {
      error: `Kỳ ${source.name} thuộc mùa ${source.seasonKey}, không nằm trong ${target.seasonKey}.`,
    };
  }

  const count = await db.competitionSource.count({ where: { targetCompetitionId: targetId } });
  if (count >= policy.sourceCount) {
    return { error: `Đã đủ ${policy.sourceCount} kỳ nguồn.` };
  }

  try {
    await db.competitionSource.create({
      data: { targetCompetitionId: targetId, sourceCompetitionId: sourceId, orderIndex: count },
    });
  } catch {
    return { error: "Kỳ nguồn này đã được gắn rồi." };
  }

  refresh(targetId);
  return { success: `Đã gắn ${source.name} làm kỳ nguồn.` };
}

/**
 * Gỡ một kỳ nguồn.
 *
 * Chỉ cho gỡ khi CHƯA sinh vé nào. Gỡ sau khi đã mời người là rút lại lời mời
 * đã gửi, việc không được phép làm bằng một cú bấm.
 */
export async function detachSourceAction(
  _prev: AdminQualState,
  formData: FormData,
): Promise<AdminQualState> {
  const blocked = await guard();
  if (blocked) return blocked;

  const targetId = String(formData.get("targetId") ?? "");
  const sourceId = String(formData.get("sourceId") ?? "");

  const issued = await db.competitionQualification.count({
    where: { targetCompetitionId: targetId },
  });
  if (issued > 0) {
    return {
      error: "Đã sinh vé cho kỳ này rồi — không gỡ được kỳ nguồn nữa. Hãy thu hồi vé trước.",
    };
  }

  await db.competitionSource.deleteMany({
    where: { targetCompetitionId: targetId, sourceCompetitionId: sourceId },
  });

  refresh(targetId);
  return { success: "Đã gỡ kỳ nguồn." };
}

/**
 * Sinh vé tuyển chọn.
 *
 * Toàn bộ phán xét ai đủ điều kiện nằm ở `qualification.ts`. Action này chỉ
 * gọi xuống đó rồi kể lại kết quả — kể cả số ghế bỏ trống, vì ghế trống là
 * kết quả HỢP LỆ khi không đủ người đạt chuẩn, không phải lỗi cần che.
 */
export async function generateOffersAction(
  _prev: AdminQualState,
  formData: FormData,
): Promise<AdminQualState> {
  const blocked = await guard();
  if (blocked) return blocked;

  const targetId = String(formData.get("targetId") ?? "");
  const result = await generateQualifications(targetId);

  refresh(targetId);
  if (!result.ok) return { error: result.error };

  const parts = [`Đã sinh ${result.created} vé mời.`];
  if (result.unfilledSeats > 0) {
    parts.push(
      `${result.unfilledSeats} ghế bỏ trống vì không đủ người đạt ngưỡng — đúng như thể lệ, không hạ chuẩn để lấp.`,
    );
  }
  if (result.rejected.length > 0) {
    parts.push(`${result.rejected.length} người bị loại, xem lý do bên dưới.`);
  }
  return { success: parts.join(" ") };
}

/** Đánh dấu hết hạn những vé quá thời gian trả lời. */
export async function expireOffersAction(
  _prev: AdminQualState,
  formData: FormData,
): Promise<AdminQualState> {
  const blocked = await guard();
  if (blocked) return blocked;

  const targetId = String(formData.get("targetId") ?? "");
  const count = await expireStaleOffers();
  refresh(targetId);
  return { success: `Đã đánh dấu hết hạn ${count} vé.` };
}
