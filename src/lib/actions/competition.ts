"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/session";
import { eligibilityFor, finalizeCompetition } from "@/lib/competition/service";

export type CompetitionState = { error?: string; success?: string } | undefined;

const STUDENT_PATH = "/nguyet-thi";
const ADMIN_PATH = "/quan-tri/cuoc-thi";

/* ================================================================== */
/* Học viên                                                            */
/* ================================================================== */

/** Đăng ký dự thi. Điều kiện được xét lại NGAY TẠI ĐÂY, không tin vào giao diện. */
export async function registerForCompetitionAction(
  _prev: CompetitionState,
  formData: FormData
): Promise<CompetitionState> {
  const user = await requireUser();
  const competitionId = String(formData.get("competitionId") ?? "");
  const publicMode = String(formData.get("publicMode") ?? "PRIVATE");
  const publicAlias = String(formData.get("publicAlias") ?? "").trim();

  if (!["REAL_NAME", "ALIAS", "PRIVATE"].includes(publicMode)) {
    return { error: "Lựa chọn hiển thị không hợp lệ." };
  }
  if (publicMode === "ALIAS" && publicAlias.length < 2) {
    return { error: "Hãy nhập biệt danh (tối thiểu 2 ký tự)." };
  }

  const competition = await db.competition.findUnique({ where: { id: competitionId } });
  if (!competition) return { error: "Không tìm thấy kỳ thi." };
  if (competition.status !== "REGISTRATION") {
    return { error: "Kỳ thi này không còn nhận đăng ký." };
  }
  const now = new Date();
  if (now < competition.registrationOpenAt) {
    return { error: "Chưa tới thời gian đăng ký." };
  }
  if (now > competition.registrationCloseAt) {
    return { error: "Đã hết hạn đăng ký." };
  }

  const eligibility = await eligibilityFor(user.id, competition.registrationCloseAt);
  if (!eligibility.eligible) {
    const missing = eligibility.checks.filter((c) => !c.ok).map((c) => c.label);
    return { error: `Chưa đủ điều kiện: ${missing.join("; ")}.` };
  }

  try {
    await db.competitionEntry.create({
      data: {
        competitionId: competition.id,
        userId: user.id,
        publicMode,
        publicAlias: publicMode === "ALIAS" ? publicAlias : null,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: "Bạn đã đăng ký kỳ thi này rồi." };
    }
    throw error;
  }

  revalidatePath(STUDENT_PATH);
  return { success: "Đăng ký thành công. Hẹn gặp bạn ở phòng thi." };
}

/**
 * Vào làm một đề thi.
 *
 * Mỗi đề đúng MỘT lượt. Ràng buộc duy nhất (entryId, exerciseId) ở database
 * mới là thứ chặn thật — giao diện ẩn nút chỉ là lớp lịch sự bên ngoài.
 * Mất mạng giữa chừng thì quay lại đúng lượt cũ nếu còn thời gian.
 */
export async function startCompetitionAttemptAction(
  competitionExerciseId: string
) {
  const user = await requireUser();

  const item = await db.competitionExercise.findUnique({
    where: { id: competitionExerciseId },
    include: { competition: true, exercise: true },
  });
  if (!item) redirect(STUDENT_PATH);

  const now = new Date();
  if (item.competition.status !== "RUNNING") redirect(STUDENT_PATH);
  if (now < item.opensAt) redirect(`${STUDENT_PATH}?loi=CHUA_MO`);
  if (now > item.competition.endAt) redirect(`${STUDENT_PATH}?loi=DA_DONG`);

  const entry = await db.competitionEntry.findUnique({
    where: {
      competitionId_userId: { competitionId: item.competitionId, userId: user.id },
    },
    include: { attempts: { where: { exerciseId: item.exerciseId } } },
  });
  if (!entry) redirect(`${STUDENT_PATH}?loi=CHUA_DANG_KY`);
  if (entry.status === "DISQUALIFIED") redirect(`${STUDENT_PATH}?loi=BI_LOAI`);

  // Đã có lượt cho đề này
  const existing = entry.attempts[0];
  if (existing) {
    const attempt = await db.attempt.findUnique({
      where: { id: existing.attemptId },
      select: { id: true, status: true, deadlineAt: true },
    });
    if (attempt?.status === "IN_PROGRESS" && attempt.deadlineAt > now) {
      redirect(`/lam-bai/${attempt.id}`); // mất mạng giữa chừng → vào lại
    }
    redirect(`${STUDENT_PATH}?loi=DA_LAM`);
  }

  // Hạn nộp không bao giờ vượt quá lúc đóng cổng thi
  const deadline = new Date(
    Math.min(
      now.getTime() + item.exercise.durationMinutes * 60_000,
      item.competition.endAt.getTime()
    )
  );
  const previous = await db.attempt.count({
    where: { userId: user.id, exerciseId: item.exerciseId },
  });

  let attemptId: string;
  try {
    const created = await db.$transaction(async (tx) => {
      const attempt = await tx.attempt.create({
        data: {
          userId: user.id,
          exerciseId: item.exerciseId,
          attemptNumber: previous + 1,
          answers: "{}",
          deadlineAt: deadline,
        },
        select: { id: true },
      });
      await tx.competitionAttempt.create({
        data: {
          entryId: entry.id,
          exerciseId: item.exerciseId,
          attemptId: attempt.id,
        },
      });
      return attempt.id;
    });
    attemptId = created;
  } catch (error) {
    // Bấm hai lần cùng lúc: ràng buộc duy nhất chặn lượt thứ hai
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      redirect(`${STUDENT_PATH}?loi=DA_LAM`);
    }
    throw error;
  }

  redirect(`/lam-bai/${attemptId}`);
}

/* ================================================================== */
/* Quản trị viên                                                       */
/* ================================================================== */

export async function createCompetitionAction(
  _prev: CompetitionState,
  formData: FormData
): Promise<CompetitionState> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  const startAt = new Date(String(formData.get("startAt") ?? ""));
  const exerciseIds = formData.getAll("exerciseId").map(String).filter(Boolean);

  if (name.length < 3) return { error: "Tên kỳ thi quá ngắn." };
  if (code.length < 3) return { error: "Mã kỳ thi cần tối thiểu 3 ký tự." };
  if (Number.isNaN(startAt.getTime())) return { error: "Ngày bắt đầu không hợp lệ." };
  if (exerciseIds.length !== 3) return { error: "Cần chọn đúng 3 đề thi." };
  if (new Set(exerciseIds).size !== 3) return { error: "Không được chọn trùng đề." };

  const exercises = await db.exercise.findMany({
    where: { id: { in: exerciseIds }, skill: "READING" },
    select: { id: true, competitionOnly: true },
  });
  if (exercises.length !== 3) return { error: "Có đề không tồn tại hoặc không phải Reading." };
  if (exercises.some((e) => !e.competitionOnly)) {
    return {
      error:
        "Cả 3 đề phải được đánh dấu 'chỉ dùng cho cuộc thi'. Đề đã công khai thì học viên luyện trước được, cuộc thi mất ý nghĩa.",
    };
  }

  const existing = await db.competition.findUnique({ where: { code } });
  if (existing) return { error: `Mã ${code} đã tồn tại.` };

  const DAY = 24 * 60 * 60 * 1000;
  await db.competition.create({
    data: {
      code,
      name,
      status: "DRAFT",
      // Mở đăng ký trước 7 ngày, đóng đăng ký ngay trước giờ thi
      registrationOpenAt: new Date(startAt.getTime() - 7 * DAY),
      registrationCloseAt: startAt,
      startAt,
      endAt: new Date(startAt.getTime() + 7 * DAY),
      exercises: {
        create: exerciseIds.map((exerciseId, index) => ({
          exerciseId,
          orderIndex: index + 1,
          // Đề mở dần ngày 1 · 3 · 5 để thí sinh không dồn hết vào một buổi
          opensAt: new Date(startAt.getTime() + index * 2 * DAY),
        })),
      },
    },
  });

  revalidatePath(ADMIN_PATH);
  return { success: `Đã tạo kỳ thi ${code}. Mở đăng ký khi bạn sẵn sàng.` };
}

/** Chuyển trạng thái kỳ thi theo đúng thứ tự, không nhảy cóc. */
export async function advanceCompetitionAction(competitionId: string) {
  await requireAdmin();
  const competition = await db.competition.findUnique({
    where: { id: competitionId },
    select: { status: true },
  });
  if (!competition) return;

  const NEXT: Record<string, string> = {
    DRAFT: "REGISTRATION",
    REGISTRATION: "RUNNING",
    RUNNING: "REVIEW",
  };
  const next = NEXT[competition.status];
  if (!next) return; // REVIEW chỉ đi tiếp bằng nút chốt kết quả riêng

  await db.competition.update({
    where: { id: competitionId },
    data: { status: next },
  });
  revalidatePath(ADMIN_PATH);
  revalidatePath(STUDENT_PATH);
}

/**
 * Chốt kết quả. Chỉ chạy sau khi quản trị viên đã tự rà soát.
 * Tiền KHÔNG tự chuyển — hệ thống chỉ ghi "đã duyệt, chờ chi".
 */
export async function finalizeCompetitionAction(
  _prev: CompetitionState,
  formData: FormData
): Promise<CompetitionState> {
  await requireAdmin();
  const competitionId = String(formData.get("competitionId") ?? "");
  const confirm = String(formData.get("confirm") ?? "").trim().toUpperCase();
  if (confirm !== "CHOT") {
    return { error: 'Hãy gõ CHOT để xác nhận. Sau bước này kết quả được công bố.' };
  }

  try {
    const result = await finalizeCompetition(competitionId);
    revalidatePath(ADMIN_PATH);
    revalidatePath("/bang-vang");
    return {
      success: `Đã chốt: ${result.ranked} thí sinh được ghi vào Thành Quả, ${result.winners} giải được duyệt. Nhớ chuyển tiền thủ công cho người thắng.`,
    };
  } catch (error) {
    return { error: String(error instanceof Error ? error.message : error).slice(0, 200) };
  }
}

/** Loại một thí sinh sau khi rà soát. Luôn kèm lý do. */
export async function disqualifyEntryAction(
  _prev: CompetitionState,
  formData: FormData
): Promise<CompetitionState> {
  const admin = await requireAdmin();
  const entryId = String(formData.get("entryId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (reason.length < 10) {
    return { error: "Hãy ghi lý do rõ ràng (tối thiểu 10 ký tự) — đây là quyết định nặng." };
  }

  const entry = await db.competitionEntry.findUnique({ where: { id: entryId } });
  if (!entry) return { error: "Không tìm thấy thí sinh." };

  await db.$transaction([
    db.competitionEntry.update({
      where: { id: entryId },
      data: { status: "DISQUALIFIED" },
    }),
    // Ghi lại thành cờ liêm chính để có dấu vết, không xóa dữ liệu bài làm
    db.integrityFlag.create({
      data: {
        userId: entry.userId,
        competitionId: entry.competitionId,
        type: "MANUAL_DISQUALIFY",
        severity: "HIGH",
        status: "RESOLVED",
        detailsJson: JSON.stringify({ reason, by: admin.id }),
        resolvedAt: new Date(),
        resolvedById: admin.id,
      },
    }),
  ]);

  revalidatePath(ADMIN_PATH);
  return { success: "Đã loại thí sinh và ghi lại lý do." };
}
