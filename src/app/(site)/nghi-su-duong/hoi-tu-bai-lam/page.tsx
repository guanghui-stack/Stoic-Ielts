import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getQuestionDraft } from "@/lib/forum/question-context";
import { channelsFor, competitionLive, viewerOf } from "@/lib/forum/service";
import { QuestionReferenceCard } from "@/components/forum/question-reference-card";
import { QuestionPostForm } from "@/components/forum/question-post-form";
import styles from "@/components/forum/forum-discussions.module.css";

export const metadata = {title: "Hỏi cộng đồng từ bài đã nộp", robots: {index: false, follow: false}};
export const dynamic = "force-dynamic";

export default async function AskFromAttemptPage({searchParams}: {
  searchParams: Promise<{luot?: string; cau?: string}>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const attemptId = typeof params.luot === "string" ? params.luot : "";
  const questionId = typeof params.cau === "string" ? params.cau : "";
  const draft = await getQuestionDraft(user, attemptId, questionId);
  if (!draft.ok) return <section className={styles.inboxPage}><h1 className="text-xl font-medium">Chưa mở được câu hỏi</h1><p role="alert" className="mt-4">{draft.error}</p><Link className={styles.textLink} href="/hoc-vien">Trở về bài làm của bạn</Link></section>;
  const viewer = await viewerOf(user);
  const channels = await channelsFor(viewer, await competitionLive());
  const levels = channels.filter((channel) => channel.access.canWrite).map((channel) => ({channelKey: channel.key, level: channel.level, name: channel.name}));
  return (
    <section className={`${styles.inboxPage} font-ui`}>
      <Link href={`/hoc-vien/bai-lam/${encodeURIComponent(attemptId)}#cau-${encodeURIComponent(questionId)}`} className={styles.textLink}><ArrowLeft size={16} aria-hidden="true" />Trở về câu {draft.value.attemptQuestionNumber} trong bài làm</Link>
      <header className={styles.inboxHeader}>
        <p className={styles.eyebrow}>Hỏi từ câu đã nộp</p>
        <h1>Cùng làm rõ điều bạn chưa hiểu</h1>
        <p>Thẻ bên dưới tự nối thảo luận với câu hỏi gốc. Viết điều bạn muốn hỏi rồi xem lại trước khi đăng.</p>
      </header>
      <QuestionReferenceCard reference={draft.value.view} />
      {draft.value.attemptQuestionNumber !== draft.value.reference.questionNumber && <p className={`${styles.metadata} mt-3`}>Câu {draft.value.attemptQuestionNumber} trong đề ghép tương ứng câu {draft.value.reference.questionNumber} của bài đọc này.</p>}
      {levels.length ? <QuestionPostForm attemptId={attemptId} questionId={questionId} sourceHash={draft.value.reference.sourceHash} defaultTitle={draft.value.defaultTitle} levels={levels} />
        : <p className={styles.questionNotice}>Diễn đàn hiện đang khóa phần viết đối với tài khoản của bạn. Bạn có thể quay lại khi phần viết được mở.</p>}
    </section>
  );
}
