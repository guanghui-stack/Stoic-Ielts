"use client";

import { useActionState } from "react";
import { Bell, BellRing, Check, CircleCheck } from "lucide-react";
import type { ForumFormState } from "@/lib/actions/forum";
import {
  markForumNotificationReadAction,
  setHelpfulReplyAction,
  setThreadFollowAction,
} from "@/lib/actions/forum-engagement";
import styles from "./forum-discussions.module.css";

export const HELPFUL_DISCLAIMER =
  "Người hỏi đánh dấu phản hồi đã giúp mình hiểu; đây không phải xác nhận đáp án của giáo viên.";

function ActionFeedback({ state }: { state: ForumFormState }) {
  return (
    <span className={styles.feedback} aria-live="polite" aria-atomic="true">
      {state?.error ? (
        <span role="alert" className={styles.error}>{state.error}</span>
      ) : state?.success ? (
        <span className={styles.success}>{state.success}</span>
      ) : null}
    </span>
  );
}

export function UnderstoodBadge() {
  return (
    <span className={styles.understoodBadge} title={HELPFUL_DISCLAIMER}>
      <CircleCheck size={14} aria-hidden="true" />
      Đã hiểu
      <span className="sr-only">. {HELPFUL_DISCLAIMER}</span>
    </span>
  );
}

export function FollowThreadButton({
  postId,
  following,
  disabled = false,
}: {
  postId: string;
  following: boolean;
  disabled?: boolean;
}) {
  const [state, action, pending] = useActionState<ForumFormState, FormData>(
    setThreadFollowAction,
    undefined,
  );
  const Icon = following ? BellRing : Bell;

  return (
    <form action={action} className={styles.actionForm}>
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="following" value={String(!following)} />
      <button
        type="submit"
        aria-pressed={following}
        aria-label={following ? "Bỏ theo dõi chủ đề" : "Theo dõi chủ đề"}
        title={following ? "Bấm để tắt thông báo trong chủ đề này" : "Nhận thông báo khi chủ đề có phản hồi"}
        disabled={disabled || pending}
        className={styles.actionButton}
      >
        <Icon size={16} aria-hidden="true" />
        {pending ? "Đang lưu…" : following ? "Đang theo dõi" : "Theo dõi chủ đề"}
      </button>
      <ActionFeedback state={state} />
    </form>
  );
}

export function HelpfulReplyButton({
  postId,
  commentId,
  selected,
}: {
  postId: string;
  commentId: string;
  selected: boolean;
}) {
  const [state, action, pending] = useActionState<ForumFormState, FormData>(
    setHelpfulReplyAction,
    undefined,
  );

  return (
    <form action={action} className={styles.actionForm}>
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="commentId" value={selected ? "" : commentId} />
      <button
        type="submit"
        disabled={pending}
        aria-pressed={selected}
        className={`${styles.actionButton} ${styles.helpfulButton}`}
      >
        <CircleCheck size={16} aria-hidden="true" />
        {pending ? "Đang lưu…" : selected ? "Bỏ dấu đã hiểu" : "Đã giúp mình hiểu"}
      </button>
      <ActionFeedback state={state} />
    </form>
  );
}

export function MarkNotificationReadButton({
  notificationId,
  commentId,
}: {
  notificationId: string;
  commentId: string;
}) {
  const [state, action, pending] = useActionState<ForumFormState, FormData>(
    markForumNotificationReadAction,
    undefined,
  );

  return (
    <form action={action} className={styles.actionForm}>
      <input type="hidden" name="notificationId" value={notificationId} />
      <input type="hidden" name="commentId" value={commentId} />
      <button type="submit" disabled={pending} className={styles.actionButton}>
        <Check size={16} aria-hidden="true" />
        {pending ? "Đang lưu…" : "Đánh dấu đã đọc"}
      </button>
      <ActionFeedback state={state} />
    </form>
  );
}
