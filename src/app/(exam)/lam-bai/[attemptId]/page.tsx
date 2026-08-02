import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { sanitizeReadingParts } from "@/lib/exercise-content";
import { assemblyTitle, readingContentForAttempt } from "@/lib/attempt-content";
import { StudyHeartbeat } from "@/components/study/study-heartbeat";
import { ReadingCbtExam } from "@/components/exam/reading-cbt";

export const metadata = { title: "Phòng làm bài" };

export default async function ExamPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const user = await requireUser();

  const attempt = await db.attempt.findUnique({
    where: { id: attemptId },
    include: { exercise: true },
  });
  if (!attempt || attempt.userId !== user.id) redirect("/hoc-vien");
  if (attempt.exercise.skill !== "READING") redirect("/luyen-tap/reading");
  if (attempt.status !== "IN_PROGRESS") redirect(`/hoc-vien/bai-lam/${attempt.id}`);

  const props = {
    attemptId: attempt.id,
    title: attempt.assemblyId
      ? await assemblyTitle(attempt.assemblyId)
      : attempt.exercise.title,
    deadlineIso: attempt.deadlineAt.toISOString(),
    initialAnswers: attempt.answers,
  };

  const content = await readingContentForAttempt(attempt);
  return (
    <>
      <StudyHeartbeat kind="READING" />
      <ReadingCbtExam {...props} parts={sanitizeReadingParts(content)} />
    </>
  );
}
