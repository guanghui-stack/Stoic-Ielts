"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import {
  enterQuyDien,
  joinQueue,
  leaveQueue,
  leaveQuyDien,
} from "@/lib/arena/arena-service.ts";
import {
  acceptInvite,
  activeDuelFor,
  declineInvite,
  sendInvite,
} from "@/lib/arena/duel-service.ts";

const ARENA_PATH = "/hoc-vien/dau-truong";

export type ArenaState = { error?: string; success?: string } | undefined;

/**
 * Vào hàng đợi ghép cặp.
 *
 * Mức cược 0 nghĩa là xin hạng không cược, và đó là đường hợp lệ chứ không phải
 * lỗi đầu vào: cửa đấu trường luôn mở, chỉ sới cược là đóng.
 */
export async function joinQueueAction(
  _prev: ArenaState,
  formData: FormData,
): Promise<ArenaState> {
  const user = await requireUser();
  const stake = Number(formData.get("stake") ?? 0);

  const ok = await joinQueue({
    userId: user.id,
    stake: Number.isFinite(stake) && stake > 0 ? Math.floor(stake) : 0,
  });
  if (!ok) {
    return {
      error: "Bạn đang Quy Điền. Quay lại đấu trường trước đã.",
    };
  }
  revalidatePath(ARENA_PATH);
  return { success: "Đã vào hàng đợi. Dải ghép cặp sẽ nới dần nếu chưa gặp ai." };
}

export async function leaveQueueAction(): Promise<void> {
  const user = await requireUser();
  await leaveQueue(user.id);
  revalidatePath(ARENA_PATH);
}

/**
 * Quy Điền: tạm rút khỏi đấu trường.
 *
 * Câu chữ trên màn hình phải nói rõ CÁI GIÁ, vì đó là toàn bộ điểm khác biệt
 * giữa Quy Điền và Án Binh Bất Động: một bên tuyên bố và trả giá, một bên im
 * lặng lẩn tránh.
 */
export async function toggleQuyDienAction(
  _prev: ArenaState,
  formData: FormData,
): Promise<ArenaState> {
  const user = await requireUser();
  const enter = String(formData.get("enter") ?? "") === "1";

  if (enter) {
    await enterQuyDien(user.id);
    revalidatePath(ARENA_PATH);
    return {
      success:
        "Đã Quy Điền. Không ai thách được bạn, và Chiến Lực sẽ trôi xuống dần cho tới mốc gốc.",
    };
  }

  await leaveQuyDien(user.id);
  revalidatePath(ARENA_PATH);
  return { success: "Đã trở lại đấu trường." };
}

export type InviteReplyState =
  | { error: string }
  | { accepted: true; attemptId: string | null }
  | { declined: true }
  | undefined;

/**
 * Nhận chiến thư.
 *
 * Đây là chỗ Quân Công thật sự bị trừ, nên câu lỗi phải nói rõ chuyện gì xảy
 * ra chứ không chỉ nói "không được".
 */
export async function acceptInviteAction(
  _prev: InviteReplyState,
  formData: FormData,
): Promise<InviteReplyState> {
  const user = await requireUser();
  const inviteId = String(formData.get("inviteId") ?? "");
  if (!inviteId) return { error: "Thiếu mã chiến thư." };

  const result = await acceptInvite({ inviteId, userId: user.id });
  if (!result.ok) {
    switch (result.reason) {
      case "EXPIRED":
        return { error: "Chiến thư đã hết hạn. Thư chỉ sống 90 giây." };
      case "INSUFFICIENT":
        return { error: "Không đủ quân công để nhận mức cược này." };
      case "NO_EXERCISE":
        return { error: "Chưa có đề nào dùng cho đấu trường." };
      case "NOT_FOUND":
        return { error: "Không tìm thấy chiến thư này." };
    }
  }

  // Lấy lượt làm bài của chính mình để dẫn thẳng vào phòng thi.
  const mine = await activeDuelFor(user.id);
  revalidatePath(ARENA_PATH);
  return { accepted: true, attemptId: mine?.attemptId ?? null };
}

export async function declineInviteAction(
  _prev: InviteReplyState,
  formData: FormData,
): Promise<InviteReplyState> {
  const user = await requireUser();
  const inviteId = String(formData.get("inviteId") ?? "");
  if (!inviteId) return { error: "Thiếu mã chiến thư." };

  await declineInvite({ inviteId, userId: user.id });
  revalidatePath(ARENA_PATH);
  return { declined: true };
}

export type ChallengeState = { error?: string; success?: string } | undefined;

export async function challengeAction(
  _prev: ChallengeState,
  formData: FormData,
): Promise<ChallengeState> {
  const user = await requireUser();
  const toUserId = String(formData.get("toUserId") ?? "");
  const stake = Number(formData.get("stake") ?? 0);

  if (!toUserId) return { error: "Chưa chọn đối thủ." };

  const result = await sendInvite({
    fromUserId: user.id,
    toUserId,
    stake: Number.isFinite(stake) && stake > 0 ? Math.floor(stake) : 0,
    toWasPresent: true,
  });

  if (!result.ok) {
    switch (result.reason) {
      case "SELF":
        return { error: "Không thách đấu chính mình được." };
      case "ALREADY_PENDING":
        return { error: "Bạn đã gửi một chiến thư cho người này và họ chưa trả lời." };
      case "BAD_STAKE":
        return {
          error: `Mức cược không hợp lệ. Còn thiếu ${result.need ?? 0} quân công, hoặc vượt mức cho phép.`,
        };
    }
  }

  revalidatePath(ARENA_PATH);
  return { success: "Đã gửi chiến thư. Thư sống 90 giây." };
}
