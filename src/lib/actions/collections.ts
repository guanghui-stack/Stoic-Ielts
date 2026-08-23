"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import {
  processAchievementEvent,
  recordAchievementEvent,
} from "@/lib/achievements/engine";

export type CollectionState = { error?: string; success?: string } | undefined;

const PATH = "/quan-tri/bo-de";

/**
 * Bộ đề đóng băng.
 *
 * Bốn danh hiệu kiểu "hoàn thành toàn bộ đề miễn phí" phải xét trên một danh
 * sách CỐ ĐỊNH. Nếu xét trên "mọi đề hiện có", chỉ cần đăng thêm một bài là
 * học viên vừa đạt danh hiệu bỗng dưng mất nó — điều không bao giờ được phép
 * xảy ra. Đóng băng chính là lời hứa đó với người học.
 */

export async function createCollectionAction(
  _prev: CollectionState,
  formData: FormData
): Promise<CollectionState> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "");

  if (name.length < 3) return { error: "Tên bộ đề quá ngắn." };
  if (code.length < 3) return { error: "Mã bộ đề cần tối thiểu 3 ký tự (chữ HOA, số, gạch)." };

  const existing = await db.exerciseCollection.findUnique({ where: { code } });
  if (existing) return { error: `Mã ${code} đã tồn tại.` };

  await db.exerciseCollection.create({
    data: { code, name, kind: "FREE_READING", status: "DRAFT" },
  });
  revalidatePath(PATH);
  return { success: `Đã tạo bộ đề ${code}. Giờ hãy chọn bài rồi kích hoạt.` };
}

/** Thêm/bớt một bài khỏi bộ đề. Chỉ làm được khi bộ đề còn ở trạng thái nháp. */
export async function toggleCollectionItemAction(
  collectionId: string,
  exerciseId: string
) {
  await requireAdmin();
  const collection = await db.exerciseCollection.findUnique({
    where: { id: collectionId },
    select: { status: true },
  });
  if (!collection || collection.status !== "DRAFT") return;

  const existing = await db.exerciseCollectionItem.findUnique({
    where: { collectionId_exerciseId: { collectionId, exerciseId } },
  });
  if (existing) {
    await db.exerciseCollectionItem.delete({ where: { id: existing.id } });
  } else {
    const count = await db.exerciseCollectionItem.count({ where: { collectionId } });
    await db.exerciseCollectionItem.create({
      data: { collectionId, exerciseId, sortOrder: count },
    });
  }
  revalidatePath(PATH);
}

/**
 * Đóng băng và kích hoạt bộ đề.
 *
 * Chỉ MỘT bộ đề được ACTIVE tại một thời điểm: hai bộ cùng hoạt động thì
 * không ai biết danh hiệu "toàn bộ đề" đang nói về bộ nào.
 */
export async function activateCollectionAction(
  _prev: CollectionState,
  formData: FormData
): Promise<CollectionState> {
  await requireAdmin();
  const collectionId = String(formData.get("collectionId") ?? "");

  const collection = await db.exerciseCollection.findUnique({
    where: { id: collectionId },
    include: { items: { select: { id: true } } },
  });
  if (!collection) return { error: "Không tìm thấy bộ đề." };
  if (collection.status === "ACTIVE") return { error: "Bộ đề này đang hoạt động." };
  if (collection.items.length < 8) {
    return {
      error: `Bộ đề cần tối thiểu 8 bài để mở được các danh hiệu (hiện ${collection.items.length}).`,
    };
  }

  const now = new Date();
  await db.$transaction([
    // Bộ đang chạy chuyển sang lưu trữ; danh hiệu học viên đã đạt ở bộ đó
    // KHÔNG bị đụng tới vì chúng gắn với mã bộ đề (cycleKey).
    db.exerciseCollection.updateMany({
      where: { kind: collection.kind, status: "ACTIVE" },
      data: { status: "ARCHIVED", endsAt: now },
    }),
    db.exerciseCollection.update({
      where: { id: collection.id },
      data: { status: "ACTIVE", frozenAt: now, startsAt: now },
    }),
  ]);

  // Xét lại danh hiệu theo bộ đề cho mọi học viên đang hoạt động
  const students = await db.user.findMany({
    where: { role: "STUDENT", active: true, isBot: false },
    select: { id: true },
  });
  for (const student of students) {
    const eventId = await recordAchievementEvent({
      userId: student.id,
      type: "COLLECTION_ACTIVATED",
      key: `${collection.code}:${student.id}`,
      payload: { collectionCode: collection.code },
    });
    if (eventId) await processAchievementEvent(eventId);
  }

  revalidatePath(PATH);
  revalidatePath("/hoc-vien/danh-hieu");
  return {
    success: `Đã đóng băng và kích hoạt ${collection.code} với ${collection.items.length} bài.`,
  };
}
