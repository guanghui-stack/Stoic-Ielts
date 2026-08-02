import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import {
  sanitizeReadingParts,
  type WritingContent,
} from "@/lib/exercise-content";
import { assemblyTitle, readingContentForAttempt } from "@/lib/attempt-content";
import { StudyHeartbeat } from "@/components/study/study-heartbeat";
import { WritingExam } from "@/components/exam/exam-room";
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
  if (attempt.status !== "IN_PROGRESS") redirect(`/hoc-vien/bai-lam/${attempt.id}`);

  const props = {
    attemptId: attempt.id,
    title: attempt.assemblyId
      ? await assemblyTitle(attempt.assemblyId)
      : attempt.exercise.title,
    deadlineIso: attempt.deadlineAt.toISOString(),
    initialAnswers: attempt.answers,
  };

  if (attempt.exercise.skill === "READING") {
    const content = await readingContentForAttempt(attempt);
    return (
      <>
        <StudyHeartbeat kind="READING" />
        <ReadingCbtExam {...props} parts={sanitizeReadingParts(content)} />
      </>
    );
  }

  if (attempt.exercise.skill === "WRITING") {
    const content = JSON.parse(attempt.exercise.content) as WritingContent;
    return <WritingExam {...props} content={content} />;
  }

  redirect("/luyen-tap");
}
