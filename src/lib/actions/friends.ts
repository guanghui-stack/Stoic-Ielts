"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { respondToFriendRequest, sendFriendRequest } from "@/lib/friends/service";
import type { FriendshipState } from "@/lib/friends/rules";

const MESSAGES_PATH = "/hoc-vien/tin-nhan";

export type FriendActionState = {
  error?: string;
  success?: string;
  state?: FriendshipState;
} | undefined;

export async function sendFriendRequestAction(
  _previous: FriendActionState,
  formData: FormData,
): Promise<FriendActionState> {
  const user = await requireUser();
  const result = await sendFriendRequest(
    user.id,
    String(formData.get("otherUserId") ?? "").trim(),
  );
  if (!result.ok) return { error: result.error };
  revalidatePath(MESSAGES_PATH);
  revalidatePath("/hoc-vien");
  return {
    success: result.value.state === "FRIENDS" ? "Đã kết bạn." : "Đã gửi lời mời.",
    state: result.value.state,
  };
}

export async function respondToFriendRequestAction(
  _previous: FriendActionState,
  formData: FormData,
): Promise<FriendActionState> {
  const user = await requireUser();
  const rawResponse = String(formData.get("response") ?? "");
  if (rawResponse !== "ACCEPT" && rawResponse !== "DECLINE") {
    return { error: "Phản hồi lời mời không hợp lệ." };
  }
  const response = rawResponse;
  const result = await respondToFriendRequest(
    user.id,
    String(formData.get("otherUserId") ?? "").trim(),
    response,
  );
  if (!result.ok) return { error: result.error };
  revalidatePath(MESSAGES_PATH);
  revalidatePath("/hoc-vien");
  return {
    success: response === "ACCEPT" ? "Đã chấp nhận lời mời." : "Đã bỏ qua lời mời.",
    state: result.value.state,
  };
}
