"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export type AdminFormState = { error?: string; success?: string } | undefined;

/* ===== Quản lý học viên ===== */

export async function toggleUserActiveAction(userId: string) {
  const admin = await requireAdmin();
  if (userId === admin.id) return;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.role === "ADMIN") return;
  await db.user.update({
    where: { id: userId },
    data: { active: !user.active },
  });
  revalidatePath("/quan-tri/hoc-vien");
}

/**
 * XÓA VĨNH VIỄN một tài khoản học viên cùng toàn bộ bài làm.
 * Không thể hoàn tác — vì vậy có nhiều lớp bảo vệ:
 *  - phải gõ đúng email để xác nhận
 *  - không cho tự xóa chính mình
 *  - không cho xóa tài khoản quản trị khác
 */
export async function deleteUserAction(
  _prev: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const confirmEmail = String(formData.get("confirmEmail") ?? "").trim().toLowerCase();

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "Không tìm thấy học viên." };
  if (user.id === admin.id) return { error: "Không thể tự xóa tài khoản của chính bạn." };
  if (user.role === "ADMIN") {
    return { error: "Không thể xóa tài khoản quản trị. Hãy hạ quyền hoặc khóa tài khoản đó trước." };
  }
  if (confirmEmail !== user.email.toLowerCase()) {
    return { error: `Email xác nhận không khớp. Hãy gõ chính xác: ${user.email}` };
  }

  // Bài làm và quyền truy cập bị xóa theo (onDelete: Cascade)
  await db.user.delete({ where: { id: userId } });
  revalidatePath("/quan-tri/hoc-vien");
  return { success: `Đã xóa vĩnh viễn tài khoản ${user.email} cùng toàn bộ bài làm.` };
}

/**
 * Mở / thu hồi quyền làm TOÀN BỘ bài Reading cho một học viên (quà tặng, học
 * viên đóng học phí tại lớp, xử lý sự cố…).
 *
 * QUAN TRỌNG: chỉ đụng tới đúng một bản ghi mang nhãn ADMIN. Bản cũ xóa sạch
 * quyền của học viên nên khi tắt là xóa luôn cả những bài họ đã BỎ TIỀN MUA —
 * mất tiền thật của người học và không khôi phục được.
 */
export async function toggleAllExerciseAccessAction(userId: string) {
  await requireAdmin();

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const grantKey = `ADMIN:READING:ALL:${userId}`;
  const existing = await db.accessGrant.findUnique({ where: { grantKey } });

  if (existing?.status === "ACTIVE") {
    await db.accessGrant.update({
      where: { id: existing.id },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
        revokeReason: "ADMIN_TOGGLE",
      },
    });
  } else {
    await db.accessGrant.upsert({
      where: { grantKey },
      update: {
        status: "ACTIVE",
        startsAt: new Date(),
        expiresAt: null,
        revokedAt: null,
        revokeReason: null,
      },
      create: {
        userId,
        grantKey,
        feature: "READING",
        scope: "ALL",
        source: "ADMIN",
        status: "ACTIVE",
        startsAt: new Date(),
        expiresAt: null,
      },
    });
  }
  revalidatePath("/quan-tri/hoc-vien");
  revalidatePath("/luyen-tap");
}

/** Tương tự nhưng cho quyền chữa bài Feynman. */
export async function toggleAllFeynmanAccessAction(userId: string) {
  await requireAdmin();

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const grantKey = `ADMIN:FEYNMAN:ALL:${userId}`;
  const existing = await db.accessGrant.findUnique({ where: { grantKey } });

  if (existing?.status === "ACTIVE") {
    await db.accessGrant.update({
      where: { id: existing.id },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
        revokeReason: "ADMIN_TOGGLE",
      },
    });
  } else {
    await db.accessGrant.upsert({
      where: { grantKey },
      update: {
        status: "ACTIVE",
        startsAt: new Date(),
        expiresAt: null,
        revokedAt: null,
        revokeReason: null,
      },
      create: {
        userId,
        grantKey,
        feature: "FEYNMAN",
        scope: "ALL",
        source: "ADMIN",
        status: "ACTIVE",
        startsAt: new Date(),
        expiresAt: null,
      },
    });
  }
  revalidatePath("/quan-tri/hoc-vien");
}

export async function resetUserPasswordAction(
  _prev: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  if (newPassword.length < 8) {
    return { error: "Mật khẩu mới cần tối thiểu 8 ký tự." };
  }
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "Không tìm thấy học viên." };
  await db.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(newPassword, 10) },
  });
  revalidatePath("/quan-tri/hoc-vien");
  return { success: `Đã đặt lại mật khẩu cho ${user.email}.` };
}

/* ===== Quản lý bài tập ===== */

function parseExerciseForm(formData: FormData): {
  error?: string;
  data?: {
    skill: string;
    taskType: string;
    title: string;
    description: string;
    durationMinutes: number;
    content: string;
    published: boolean;
  };
} {
  const skill = String(formData.get("skill") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const durationMinutes = Number(formData.get("durationMinutes"));
  const published = formData.get("published") === "on";

  if (!["READING", "WRITING"].includes(skill)) {
    return { error: "Kỹ năng không hợp lệ (hiện hỗ trợ READING và WRITING)." };
  }
  if (title.length < 5) return { error: "Tiêu đề cần tối thiểu 5 ký tự." };
  if (!Number.isFinite(durationMinutes) || durationMinutes < 1 || durationMinutes > 240) {
    return { error: "Thời gian làm bài phải từ 1 đến 240 phút." };
  }

  let taskType: string;
  let content: string;

  if (skill === "WRITING") {
    const task = String(formData.get("task") ?? "");
    const prompt = String(formData.get("prompt") ?? "").trim();
    const guidance = String(formData.get("guidance") ?? "").trim();
    const minWords = Number(formData.get("minWords"));
    const dataTableRaw = String(formData.get("dataTable") ?? "").trim();

    if (!["TASK_1", "TASK_2"].includes(task)) return { error: "Chọn Task 1 hoặc Task 2." };
    if (prompt.length < 20) return { error: "Đề bài cần tối thiểu 20 ký tự." };
    if (!Number.isFinite(minWords) || minWords < 50 || minWords > 1000) {
      return { error: "Số từ tối thiểu phải từ 50 đến 1000." };
    }

    let dataTable: unknown = undefined;
    if (dataTableRaw) {
      try {
        dataTable = JSON.parse(dataTableRaw);
      } catch {
        return { error: "Bảng số liệu không phải JSON hợp lệ." };
      }
    }

    taskType = task === "TASK_1" ? "WRITING_TASK_1" : "WRITING_TASK_2";
    content = JSON.stringify({
      task,
      prompt,
      minWords,
      ...(guidance ? { guidance } : {}),
      ...(dataTable ? { dataTable } : {}),
    });
  } else {
    const contentRaw = String(formData.get("content") ?? "").trim();
    try {
      const parsed = JSON.parse(contentRaw);
      // Chấp nhận cả 2 dạng: { parts: [...] } (mới, 1–3 part) và
      // { passage, questionGroups } (dạng cũ, 1 passage)
      const parts = Array.isArray(parsed.parts)
        ? parsed.parts
        : parsed.passage && parsed.questionGroups
          ? [parsed]
          : null;
      if (!parts || parts.length === 0) {
        return { error: "JSON cần có mảng \"parts\" (hoặc passage + questionGroups)." };
      }
      if (parts.length > 3) {
        return { error: "Tối đa 3 part cho một bài Reading (giống đề thi thật)." };
      }
      const TYPES = [
        "TFNG",
        "MC",
        "MC_MULTI",
        "GAP",
        "MATCH_HEADINGS",
        "MATCH_INFO",
        "MATCH_FEATURES",
        "MATCH_ENDINGS",
      ];
      const WORD_LIMITS = [
        "ONE_WORD",
        "TWO_WORDS",
        "THREE_WORDS",
        "ONE_WORD_NUMBER",
        "TWO_WORDS_NUMBER",
        "THREE_WORDS_NUMBER",
      ];
      const MATCH_TYPES = [
        "MATCH_HEADINGS",
        "MATCH_INFO",
        "MATCH_FEATURES",
        "MATCH_ENDINGS",
      ];
      const seenIds = new Set<string>();
      for (let pi = 0; pi < parts.length; pi++) {
        const part = parts[pi];
        const label = `Part ${pi + 1}`;
        if (!part.passage?.title || !Array.isArray(part.passage?.paragraphs)) {
          return { error: `${label}: thiếu passage.title hoặc passage.paragraphs.` };
        }
        if (!Array.isArray(part.questionGroups) || part.questionGroups.length === 0) {
          return { error: `${label}: thiếu questionGroups.` };
        }
        for (const g of part.questionGroups) {
          if (!TYPES.includes(g.type)) {
            return { error: `${label}: loại câu hỏi không hỗ trợ: ${g.type}.` };
          }
          if (!Array.isArray(g.questions) || g.questions.length === 0) {
            return { error: `${label}: mỗi nhóm câu hỏi cần ít nhất 1 câu.` };
          }
          if (g.type === "GAP" && g.wordLimit && !WORD_LIMITS.includes(g.wordLimit)) {
            return { error: `${label}: wordLimit không hợp lệ: ${g.wordLimit}.` };
          }
          const isMatch = MATCH_TYPES.includes(g.type);
          if (isMatch) {
            if (!Array.isArray(g.options) || g.options.length < 2) {
              return { error: `${label} (${g.type}): cần danh sách "options" tối thiểu 2 mục ở cấp nhóm.` };
            }
          }
          for (const q of g.questions) {
            if (!q.id) return { error: `${label}: câu hỏi thiếu id.` };
            if (seenIds.has(q.id)) {
              return { error: `Trùng id câu hỏi "${q.id}" — id phải duy nhất trong TOÀN BỘ đề (kể cả giữa các part).` };
            }
            seenIds.add(q.id);

            if (g.type === "MATCH_HEADINGS") {
              if (!q.paragraph) {
                return { error: `${label} (MATCH_HEADINGS): mỗi câu cần "paragraph" (đoạn văn gắn ô thả, ví dụ "B").` };
              }
            } else if (!q.prompt) {
              return { error: `${label} (${g.type}): câu ${q.id} thiếu prompt.` };
            }

            if (g.type === "MC_MULTI") {
              if (!Array.isArray(q.options) || q.options.length < 3) {
                return { error: `${label} (MC_MULTI): câu ${q.id} cần tối thiểu 3 lựa chọn.` };
              }
              if (!Array.isArray(q.answer) || q.answer.length < 2) {
                return { error: `${label} (MC_MULTI): câu ${q.id} cần mảng answer tối thiểu 2 chữ cái (ví dụ ["A","C"]).` };
              }
            } else if (g.type === "MC") {
              if (!Array.isArray(q.options) || q.options.length < 2) {
                return { error: `${label} (MC): câu ${q.id} cần tối thiểu 2 lựa chọn.` };
              }
              if (!q.answer) return { error: `${label}: câu ${q.id} thiếu answer.` };
            } else if (!q.answer) {
              return { error: `${label}: câu ${q.id} thiếu answer.` };
            }
          }
        }
      }
      content = JSON.stringify(parsed);
    } catch (e) {
      if (e instanceof SyntaxError) return { error: "Nội dung không phải JSON hợp lệ." };
      throw e;
    }
    taskType = "READING_PASSAGE";
  }

  return {
    data: { skill, taskType, title, description, durationMinutes, content, published },
  };
}

export async function createExerciseAction(
  _prev: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
  await requireAdmin();
  const parsed = parseExerciseForm(formData);
  if (parsed.error) return { error: parsed.error };
  await db.exercise.create({ data: parsed.data! });
  revalidatePath("/quan-tri/bai-tap");
  redirect("/quan-tri/bai-tap");
}

export async function updateExerciseAction(
  exerciseId: string,
  _prev: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
  await requireAdmin();
  const parsed = parseExerciseForm(formData);
  if (parsed.error) return { error: parsed.error };
  await db.exercise.update({ where: { id: exerciseId }, data: parsed.data! });
  revalidatePath("/quan-tri/bai-tap");
  redirect("/quan-tri/bai-tap");
}

/** Đổi mức truy cập của bài tập: ai cũng làm được ⇄ cần quản trị viên mở khóa. */
export async function toggleExerciseAccessLevelAction(exerciseId: string) {
  await requireAdmin();
  const ex = await db.exercise.findUnique({ where: { id: exerciseId } });
  if (!ex) return;
  await db.exercise.update({
    where: { id: exerciseId },
    data: {
      accessLevel: ex.accessLevel === "RESTRICTED" ? "PUBLIC" : "RESTRICTED",
    },
  });
  revalidatePath("/quan-tri/bai-tap");
  revalidatePath("/quan-tri/hoc-vien");
  revalidatePath("/luyen-tap");
}

export async function toggleExercisePublishedAction(exerciseId: string) {
  await requireAdmin();
  const ex = await db.exercise.findUnique({ where: { id: exerciseId } });
  if (!ex) return;
  await db.exercise.update({
    where: { id: exerciseId },
    data: { published: !ex.published },
  });
  revalidatePath("/quan-tri/bai-tap");
  revalidatePath("/luyen-tap");
}

export async function deleteExerciseAction(exerciseId: string) {
  await requireAdmin();
  await db.exercise.delete({ where: { id: exerciseId } });
  revalidatePath("/quan-tri/bai-tap");
  revalidatePath("/luyen-tap");
}

/* ===== Chấm bài Writing ===== */

export async function gradeAttemptAction(
  attemptId: string,
  _prev: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const band = Number(formData.get("band"));
  const feedback = String(formData.get("feedback") ?? "").trim();

  if (!Number.isFinite(band) || band < 0 || band > 9 || (band * 2) % 1 !== 0) {
    return { error: "Band điểm phải từ 0 đến 9, bước nhảy 0.5 (ví dụ 6.5)." };
  }
  if (feedback.length < 10) {
    return { error: "Nhận xét cần tối thiểu 10 ký tự để có giá trị với học viên." };
  }

  const attempt = await db.attempt.findUnique({ where: { id: attemptId } });
  if (!attempt || attempt.status === "IN_PROGRESS") {
    return { error: "Bài làm không hợp lệ hoặc chưa được nộp." };
  }

  await db.attempt.update({
    where: { id: attemptId },
    data: {
      status: "GRADED",
      band,
      feedback,
      gradedAt: new Date(),
      gradedById: admin.id,
    },
  });
  revalidatePath("/quan-tri/cham-bai");
  redirect("/quan-tri/cham-bai");
}
