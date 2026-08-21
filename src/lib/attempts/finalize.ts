import "server-only";
import { db } from "@/lib/db";
import { gradeReading, type ReadingAnswers } from "@/lib/exercise-content";
import { calculateReadingBand, isValidAchievementAttempt } from "@/lib/reading-band";
import { processAchievementEvent, recordAchievementEvent } from "@/lib/achievements/engine";
import { readingContentForAttempt } from "@/lib/attempt-content";

/**
 * ĐƯỜNG CHẤM BÀI DUY NHẤT của hệ thống.
 *
 * Năm nơi có thể kết thúc một lượt làm bài, và cả năm PHẢI đi qua đây:
 *   1. Học viên bấm nộp.
 *   2. Hết giờ, client tự nộp.
 *   3. Ngưỡng liêm chính (3 strike / 10 giây rời màn hình thi).
 *   4. Giám thị ra lệnh nộp.
 *   5. Hết hạn nối lại sau khi rớt mạng.
 *
 * Vì sao phải tách khỏi `actions/attempts.ts`: file đó mang chỉ thị `"use server"`,
 * nên MỌI hàm export từ đó đều trở thành server action mà trình duyệt gọi được.
 * Export hàm chấm bài từ đó đồng nghĩa với việc bất kỳ ai cũng gọi được nó với
 * `attemptId` tùy ý — tức là chấm bài của người khác. Đặt ở đây, sau
 * `import "server-only"`, thì chỉ mã máy chủ gọi được.
 *
 * IDEMPOTENT: chỉ lượt đang IN_PROGRESS mới được chấm. Gọi hai lần thì lần sau
 * không làm gì. Đây là thứ chặn nộp trùng khi client và máy chủ cùng nộp một lúc
 * — tình huống rất dễ xảy ra lúc hết giờ.
 */

export type SubmissionReason =
  | "NORMAL"
  | "TIMEOUT"
  | "INTEGRITY_AUTO"
  | "PROCTOR"
  | "DISCONNECT_EXPIRED";

export type FinalizeResult =
  | { finalized: false; reason: "NOT_FOUND" | "ALREADY_FINALIZED" | "NOT_READING" }
  | { finalized: true; status: string; band: number | null; scoreRaw: number | null };

export async function finalizeReadingAttempt(
  attemptId: string,
  options: {
    submissionReason: SubmissionReason;
    /** Ghi đè trạng thái liêm chính — dùng khi bị buộc nộp vì ngưỡng hoặc giám thị. */
    integrityStatus?: "CLEAR" | "REVIEW" | "FLAGGED";
  }
): Promise<FinalizeResult> {
  const attempt = await db.attempt.findUnique({
    where: { id: attemptId },
    include: { exercise: true, assembly: true, competitionAttempt: true },
  });
  if (!attempt) return { finalized: false, reason: "NOT_FOUND" };
  if (attempt.status !== "IN_PROGRESS") return { finalized: false, reason: "ALREADY_FINALIZED" };
  if (attempt.exercise.skill !== "READING") return { finalized: false, reason: "NOT_READING" };

  const auto = options.submissionReason !== "NORMAL";
  const integrityStatus = options.integrityStatus ?? attempt.integrityStatus;

  // Đề ghép có thời lượng riêng (60 phút như thi thật), không dùng thời lượng
  // của passage đầu tiên.
  const durationMinutes = attempt.assembly?.durationMinutes ?? attempt.exercise.durationMinutes;

  const now = new Date();
  // Thời gian làm bài THẬT, kẹp theo thời lượng đề để lượt bị treo qua đêm
  // không biến thành một con số vô lý.
  const elapsedSeconds = Math.max(
    0,
    Math.min(
      Math.round((now.getTime() - attempt.startedAt.getTime()) / 1000),
      durationMinutes * 60
    )
  );

  const content = await readingContentForAttempt(attempt);
  const answers = JSON.parse(attempt.answers || "{}") as ReadingAnswers;
  const graded = gradeReading(content, answers);
  const scoreRaw = graded.scoreRaw;
  const scoreTotal = graded.scoreTotal;
  const status = "GRADED"; // Reading chấm máy, không cần giáo viên

  const answeredCount = Object.values(answers).filter(
    (v) => v !== null && v !== undefined && String(v).trim() !== ""
  ).length;

  // Band phải được CHỐT ngay lúc chấm: nếu tính lại khi hiển thị, đổi thang
  // quy đổi về sau sẽ âm thầm làm thay đổi kết quả cũ của học viên.
  const bandResult = calculateReadingBand(content, scoreRaw, scoreTotal);
  const band = bandResult?.band ?? null;
  const bandScaleVersion = bandResult?.scaleVersion ?? null;

  const validForAchievements = isValidAchievementAttempt({
    status,
    // Đề học viên TỰ CHỌN passage không tính danh hiệu — chốt ngay tại đây
    // để trang kết quả nói đúng sự thật, không đợi engine lọc lại.
    achievementEligible:
      attempt.exercise.achievementEligible &&
      (attempt.assembly === null || attempt.assembly.countsForAchievements),
    band,
    answeredCount,
    scoreTotal,
    elapsedSeconds,
    durationMinutes,
    integrityStatus,
  });

  // Điều kiện `status: "IN_PROGRESS"` trong updateMany là KHÓA CHỐNG NỘP TRÙNG.
  // Hai tiến trình cùng chấm một lượt thì chỉ một cái đổi được bản ghi; cái kia
  // nhận count = 0 và dừng, thay vì ghi đè kết quả đã chấm.
  const updated = await db.attempt.updateMany({
    where: { id: attemptId, status: "IN_PROGRESS" },
    data: {
      status,
      submittedAt: now,
      autoSubmitted: auto,
      submissionReason: options.submissionReason,
      integrityStatus,
      scoreRaw,
      scoreTotal,
      band,
      bandScaleVersion,
      answeredCount,
      elapsedSeconds,
      validForAchievements,
      gradedAt: now,
    },
  });
  if (updated.count === 0) return { finalized: false, reason: "ALREADY_FINALIZED" };

  // Bài thi Nguyệt Thí: chụp lại kết quả sang bảng riêng NGAY lúc chấm.
  // Xếp hạng sau này đọc từ ảnh chụp đó, nên sửa đề về sau không làm thay đổi
  // kết quả một cuộc thi đã diễn ra.
  if (attempt.competitionAttempt) {
    await db.competitionAttempt.update({
      where: { attemptId },
      data: {
        bandSnapshot: band,
        rawSnapshot: scoreRaw,
        elapsedSeconds,
        submittedAt: now,
        // Bị buộc nộp vì liêm chính thì hồ sơ vào hàng chờ rà soát — KHÔNG phải
        // bị loại. Việc loại cần hai quản trị viên xem bằng chứng rồi mới quyết.
        integrityStatus: integrityStatus === "CLEAR" ? "CLEAR" : "REVIEW",
      },
    });
  }

  // Xét danh hiệu SAU khi bài đã được chốt điểm. Cố ý không nằm trong cùng
  // transaction: nếu việc xét danh hiệu lỗi, học viên vẫn phải nộp bài được —
  // danh hiệu là phần thưởng, không phải điều kiện để học.
  const eventId = await recordAchievementEvent({
    userId: attempt.userId,
    type: "READING_GRADED",
    key: attemptId,
    payload: { attemptId },
  });
  if (eventId) await processAchievementEvent(eventId);

  // Nếu lượt này thuộc một trận thì đẩy ĐIỂM ĐÃ CHẤM sang đó.
  //
  // Đây là cửa duy nhất để một kết quả đi vào trận đấu. Máy khách không có
  // đường nào tự khai điểm: nó chỉ gửi đáp án, `gradeReading` ở trên chấm, và
  // con số truyền đi dưới đây là `scoreRaw` do chính hàm chấm trả về.
  //
  // Đặt SAU phần danh hiệu và ngoài mọi transaction, cùng lý do: nếu ghi kết
  // quả trận lỗi thì học viên vẫn phải nộp được bài. Trận là phần thêm, bài làm
  // mới là sản phẩm chính.
  try {
    const { recordDuelAttemptResult } = await import("@/lib/arena/duel-service");
    await recordDuelAttemptResult({
      attemptId,
      userId: attempt.userId,
      scoreRaw,
      now,
    });
  } catch (err) {
    console.error("[wobridges] Khong ghi duoc ket qua tran:", err);
  }

  return { finalized: true, status, band, scoreRaw };
}
