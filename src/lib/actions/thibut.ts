"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireUser } from "@/lib/session";
import {
  reviewItem,
  startAttempt,
  submitAttempt,
} from "@/lib/thibut/thibut-service.ts";
import { THI_BUT_TARGETS, type ThiButTarget } from "@/lib/thibut/thibut.ts";

const ADMIN_PATH = "/quan-tri/thi-but";

export type ReviewState = { error?: string; success?: string } | undefined;

/**
 * Duyệt hoặc loại một câu trong kho Thí Bút.
 *
 * Chỉ quản trị viên. Đây không phải sự thận trọng thừa: một câu sai đáp án sẽ
 * lấy mất Quân Công của người ngay thẳng, và không tái lập được để xử tranh
 * chấp. Xem `docs/DAC-TA-DAU-TRUONG.md` mục 03.
 *
 * Người duyệt được ghi lại vào `reviewedById`. Khi có tranh chấp về một câu,
 * câu hỏi đầu tiên luôn là "ai đã duyệt cái này".
 */
export async function reviewThiButItemAction(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const admin = await requireAdmin();

  const itemId = String(formData.get("itemId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!itemId) return { error: "Thiếu mã câu hỏi." };
  if (decision !== "PUBLISH" && decision !== "RETIRE") {
    return { error: "Quyết định không hợp lệ." };
  }

  await reviewItem({
    itemId,
    reviewerId: admin.id,
    decision,
    note: note || undefined,
  });

  revalidatePath(ADMIN_PATH);
  return {
    success:
      decision === "PUBLISH"
        ? "Đã phát hành câu này. Từ giờ học viên có thể gặp nó."
        : "Đã loại câu này khỏi kho.",
  };
}

export type ThiButStartState =
  | { error: string }
  | { attemptId: string }
  | undefined;

/**
 * Học viên bắt đầu một lượt khảo hạch.
 *
 * Quân Công bị trừ NGAY ở đây, không đợi tới lúc chấm. Nếu chờ tới cuối mới
 * trừ thì một người mở được nhiều lượt song song bằng số Quân Công họ chỉ có
 * một lần.
 */
export async function startThiButAction(
  _prev: ThiButStartState,
  formData: FormData,
): Promise<ThiButStartState> {
  const user = await requireUser();

  const targetKind = String(formData.get("targetKind") ?? "");
  const targetId = String(formData.get("targetId") ?? "");

  if (!(THI_BUT_TARGETS as readonly string[]).includes(targetKind)) {
    return { error: "Mục tiêu không hợp lệ." };
  }
  if (!targetId) return { error: "Thiếu mục tiêu cần mở." };

  const result = await startAttempt({
    userId: user.id,
    targetKind: targetKind as ThiButTarget,
    targetId,
  });

  if (!result.ok) {
    switch (result.reason) {
      case "INSUFFICIENT_MERIT":
        return {
          error: `Cần ${result.cost} quân công, bạn đang có ${result.balance}. Học đủ ngày hoặc chữa bài để kiếm thêm.`,
        };
      case "COOLDOWN": {
        const minutes = Math.ceil((result.secondsLeft ?? 0) / 60);
        return {
          error: `Vừa trượt nên cần nghỉ thêm ${minutes} phút. Lượt tới chỉ tốn ${result.cost} quân công.`,
        };
      }
      case "POOL_EMPTY":
        return { error: "Kho câu khảo hạch chưa sẵn sàng. Hãy quay lại sau." };
      case "ALREADY_PASSED":
        return { error: "Bạn đã đoạt được thứ này rồi, không cần thi lại." };
    }
  }

  revalidatePath("/hoc-vien");
  return { attemptId: result.attemptId };
}

export type ThiButSubmitState =
  | { error: string }
  | { passed: boolean; correctCount: number; total: number }
  | undefined;

/**
 * Nộp bài. Máy khách chỉ gửi LỰA CHỌN, không bao giờ gửi điểm.
 *
 * Máy chủ đọc lại câu từ database rồi tự chấm. Đây là ranh giới không được
 * phép nới: nếu tin điểm do máy khách gửi lên thì mọi thứ phía trên chỉ là
 * trang trí.
 */
export async function submitThiButAction(
  _prev: ThiButSubmitState,
  formData: FormData,
): Promise<ThiButSubmitState> {
  const user = await requireUser();

  const attemptId = String(formData.get("attemptId") ?? "");
  if (!attemptId) return { error: "Thiếu mã lượt thi." };

  const answers: Record<string, number | null> = {};
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("answer:")) continue;
    const itemId = key.slice("answer:".length);
    const parsed = Number(value);
    answers[itemId] = Number.isInteger(parsed) ? parsed : null;
  }

  const result = await submitAttempt({ userId: user.id, attemptId, answers });
  if (!result.ok) {
    return {
      error:
        result.reason === "ALREADY_SUBMITTED"
          ? "Lượt này đã nộp rồi."
          : "Không tìm thấy lượt thi này.",
    };
  }

  revalidatePath("/hoc-vien");
  return {
    passed: result.result.passed,
    correctCount: result.result.correctCount,
    total: result.result.total,
  };
}
