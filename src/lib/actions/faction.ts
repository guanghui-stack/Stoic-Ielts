"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { chooseFaction } from "@/lib/arena/season-service";
import { FACTION_LABEL, isFaction } from "@/lib/arena/season.ts";

export type FactionState = { error?: string; success?: string } | undefined;

/**
 * Chọn phe.
 *
 * Mọi điều kiện đều kiểm ở `chooseFaction`, không kiểm lại ở đây: cấp bậc tối
 * thiểu và khoá theo mùa là luật, và gác cùng một luật ở hai nơi là cách chắc
 * chắn để hai nơi lệch nhau sau lần chỉnh đầu tiên.
 */
export async function chooseFactionAction(
  _prev: FactionState,
  formData: FormData,
): Promise<FactionState> {
  const user = await requireUser();
  const faction = String(formData.get("faction") ?? "");

  if (!isFaction(faction)) return { error: "Hãy chọn một phe." };

  const result = await chooseFaction({ userId: user.id, faction });
  if (!result.ok) return { error: result.reason ?? "Chưa chọn phe được." };

  revalidatePath("/hoc-vien/dau-truong");
  revalidatePath("/hoc-vien/chien-dich");
  return {
    success: `Đã gia nhập ${FACTION_LABEL[faction]}. Phe giữ nguyên tới hết mùa này.`,
  };
}
