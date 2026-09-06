import { notFound } from "next/navigation";
import { QuestionReferenceCard } from "@/components/forum/question-reference-card";
import { QuestionPostForm } from "@/components/forum/question-post-form";
import { FollowThreadButton, HelpfulReplyButton, MarkNotificationReadButton, UnderstoodBadge } from "@/components/forum/thread-engagement";
import type { ForumQuestionReferenceView } from "@/lib/forum/question-rules";
import styles from "@/components/forum/forum-discussions.module.css";

export const metadata = { title: "Xem thử thảo luận câu hỏi" };

const reference: ForumQuestionReferenceView = {
  state: "available",
  passageTitle: "Urban gardens and the changing city",
  questionNumber: "7",
  questionType: "TFNG",
  exerciseHref: "/luyen-tap/reading",
  quote: {
    instruction: "Do the following statements agree with the information given in the reading passage?",
    prompt: "All urban gardening projects receive financial support from local authorities.",
    options: ["TRUE", "FALSE", "NOT GIVEN"],
    groupOptions: [],
    paragraphLabel: "C",
    paragraphText: "Some neighbourhood gardens receive support from local councils. Other projects rely on volunteers and donations from residents.",
    selectCount: 1,
    wordLimit: "",
    boxTitle: "",
    reuseOptions: null,
  },
};

export default function ForumDiscussionsPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <section className="mx-auto max-w-3xl px-4 py-10 font-ui md:px-6">
      <p className={styles.eyebrow}>Xem thử giao diện · dữ liệu minh họa</p>
      <article className={`${styles.threadArticle} mt-5 border border-line bg-paper p-7`}>
        <div className="flex flex-wrap items-center gap-3">
          <span className={styles.metadata}>Bậc 2 · Reading</span>
          <UnderstoodBadge />
        </div>
        <h1 className="mt-3 text-2xl font-medium leading-snug text-ink">Mình đang hiểu từ “all” trong câu 7 như thế nào?</h1>
        <p className="mt-2 text-xs text-muted">Minh Anh · 05/09/2026, 09:15</p>
        <QuestionReferenceCard reference={reference} />
        <p className="mt-5 text-sm leading-relaxed text-ink">Mình tìm thấy đoạn nói về hỗ trợ từ hội đồng địa phương, nhưng chưa rõ cách đối chiếu phạm vi của từ “all”. Mọi người giúp mình chỉ ra cách đọc bằng chứng nhé.</p>
        <fieldset disabled className="mt-5 flex flex-wrap gap-3">
          <legend className="sr-only">Các nút xem thử, không gửi dữ liệu</legend>
          <FollowThreadButton postId="preview" following />
          <FollowThreadButton postId="preview-other" following={false} />
        </fieldset>
        <div className={styles.acceptedSummary}>
          <UnderstoodBadge />
          <p>Người hỏi đánh dấu phản hồi đã giúp mình hiểu; đây không phải xác nhận đáp án của giáo viên.</p>
        </div>
      </article>
      <div className={`${styles.acceptedComment} mt-6 border-l-2 pl-4`}>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted">Quốc Minh <UnderstoodBadge /></div>
        <p className="mt-2 text-sm leading-relaxed text-ink">Bạn thử đọc hai câu cạnh nhau: câu đầu giới hạn ở “some”, còn câu tiếp theo nói đến “other projects”. Hãy so sánh phạm vi ấy với từ “all” trong câu hỏi.</p>
        <fieldset disabled className="mt-3 flex flex-wrap gap-3">
          <legend className="sr-only">Các nút xem thử, không gửi dữ liệu</legend>
          <HelpfulReplyButton postId="preview" commentId="preview-reply" selected />
          <HelpfulReplyButton postId="preview" commentId="preview-reply-other" selected={false} />
        </fieldset>
      </div>
      <QuestionReferenceCard reference={{
        state: "locked", passageTitle: reference.passageTitle, questionNumber: "7", questionType: "TFNG",
        exerciseHref: "/luyen-tap/reading", purchaseHref: "/luyen-tap/reading",
      }} />
      <QuestionReferenceCard reference={{
        state: "missing", passageTitle: reference.passageTitle, questionNumber: "7", questionType: "TFNG", exerciseHref: "/luyen-tap/reading",
      }} />
      <section className={styles.inboxSection}>
        <div className={styles.sectionHeading}><h2>Phản hồi dành cho bạn</h2><span>1 chưa đọc</span></div>
        <ul className={styles.inboxList}>
          <li className={`${styles.inboxItem} ${styles.unreadItem}`}>
            <div className={styles.itemContent}>
              <div className={styles.itemMeta}><span>Có người trả lời bạn</span><span>05/09/2026, 09:30</span><span>Chưa đọc</span></div>
              <p className={styles.notificationTitle}>Mình đang hiểu từ “all” trong câu 7 như thế nào?</p>
              <fieldset disabled className={styles.itemActions}>
                <legend className="sr-only">Các nút xem thử, không gửi dữ liệu</legend>
                <MarkNotificationReadButton notificationId="preview-notification" commentId="preview-reply" />
              </fieldset>
            </div>
          </li>
        </ul>
      </section>
      <section className={styles.inboxSection}>
        <h2 className="text-xl font-medium">Soạn câu hỏi · bản xem thử</h2>
        <QuestionPostForm attemptId="preview" questionId="preview-question" sourceHash="preview" defaultTitle="Urban gardens · Câu 7" levels={[{channelKey: "preview", level: 1, name: "Cộng đồng"}]} previewOnly />
      </section>
    </section>
  );
}
