"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ArrowLeft, MessageSquarePlus } from "lucide-react";
import { createQuestionPostAction } from "@/lib/actions/forum-question";
import { BODY_MAX, BODY_MIN, TITLE_MAX, TITLE_MIN } from "@/lib/forum/rules";
import type { ForumFormState } from "@/lib/actions/forum";
import type { PostLevelOption } from "./forum-forms";
import { RichText } from "./rich-text";
import styles from "./forum-discussions.module.css";

export function QuestionPostForm({attemptId, questionId, sourceHash, defaultTitle, levels, previewOnly = false}: {
  attemptId: string; questionId: string; sourceHash: string; defaultTitle: string; levels: PostLevelOption[];
  previewOnly?: boolean;
}) {
  const [state, action, pending] = useActionState<ForumFormState, FormData>(createQuestionPostAction, undefined);
  const [title, setTitle] = useState(defaultTitle);
  const [body, setBody] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [channelKey, setChannelKey] = useState(levels[0]?.channelKey ?? "");
  const [preview, setPreview] = useState(false);
  const previewHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {if (preview) previewHeading.current?.focus();}, [preview]);
  const fullBody = body.trim() + (reasoning.trim() ? `\n\nMình đã suy luận như thế này:\n${reasoning.trim()}` : "");
  const valid = title.trim().length >= TITLE_MIN && title.length <= TITLE_MAX && body.trim().length >= BODY_MIN && fullBody.length <= BODY_MAX;
  if (!levels.length) return null;

  return (
    <form action={action} className={styles.composer} onSubmit={(event) => {if (!preview || previewOnly) event.preventDefault();}}>
      <input type="hidden" name="attemptId" value={attemptId} />
      <input type="hidden" name="questionId" value={questionId} />
      <input type="hidden" name="sourceHash" value={sourceHash} />
      <div hidden={preview} className={styles.composerFields}>
        <label htmlFor="question-post-level">Ai có thể đọc thảo luận?</label>
        <select id="question-post-level" name="channelKey" className={styles.field} value={channelKey} onChange={(event) => setChannelKey(event.target.value)}>
          {levels.map((level) => <option key={level.channelKey} value={level.channelKey}>Từ Bậc {level.level} · {level.name}</option>)}
        </select>
        <p className={styles.metadata}>Nội dung câu hỏi gốc chỉ hiện với người đã có quyền mở bài đọc.</p>
        <label htmlFor="question-post-title">Tiêu đề</label>
        <input id="question-post-title" className={styles.field} name="title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={TITLE_MAX} minLength={TITLE_MIN} required />
        <p className={styles.metadata}>{title.length}/{TITLE_MAX} ký tự</p>
        <label htmlFor="question-post-body">Bạn đang vướng ở đâu?</label>
        <textarea id="question-post-body" className={styles.field} name="body" rows={5} value={body} onChange={(event) => setBody(event.target.value)} minLength={BODY_MIN} maxLength={BODY_MAX} required placeholder="Mình chưa hiểu cách đối chiếu câu hỏi này với bài đọc…" />
        <label htmlFor="question-post-reasoning">Bạn đã suy luận như thế nào? <span className={styles.metadata}>(không bắt buộc)</span></label>
        <textarea id="question-post-reasoning" className={styles.field} name="reasoning" rows={3} value={reasoning} onChange={(event) => setReasoning(event.target.value)} maxLength={BODY_MAX} />
        <p className={fullBody.length > BODY_MAX ? styles.error : styles.metadata}>{fullBody.length}/{BODY_MAX} ký tự nội dung · câu hỏi ít nhất {BODY_MIN} ký tự</p>
      </div>
      {preview && (
        <div className={styles.postPreview}>
          <p className={styles.eyebrow}>Nội dung sẽ đăng · từ Bậc {levels.find((level) => level.channelKey === channelKey)?.level}</p>
          <h2 ref={previewHeading} tabIndex={-1} className="scroll-mt-48">{title}</h2>
          <RichText text={fullBody} />
          <p className={styles.metadata}>Kèm thẻ câu hỏi ở trên. Chủ đề sẽ được tự động theo dõi để bạn nhận phản hồi.</p>
        </div>
      )}
      <p className={styles.metadata}>Điểm số, đáp án bạn đã chọn, toàn bộ bài làm và lời giải Feynman không được tự đưa vào bài đăng. Chỉ viết phần bạn muốn chia sẻ.</p>
      {state?.error && <p role="alert" className={styles.error}>{state.error}</p>}
      <div className={styles.itemActions}>
        {preview ? <>
          <button type="submit" disabled={pending || !valid || previewOnly} className={styles.primaryLink}><MessageSquarePlus size={16} aria-hidden="true" />{pending ? "Đang đăng…" : "Đăng câu hỏi"}</button>
          <button type="button" disabled={pending} onClick={() => setPreview(false)} className={styles.textLink}><ArrowLeft size={16} aria-hidden="true" />Sửa nội dung</button>
        </> : <button type="button" disabled={!valid} onClick={() => setPreview(true)} className={styles.primaryLink}>Xem lại trước khi đăng</button>}
      </div>
    </form>
  );
}
