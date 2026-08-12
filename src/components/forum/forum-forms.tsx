"use client";

import { useActionState, useState } from "react";
import { MessageSquarePlus, Flag as FlagIcon, Reply } from "lucide-react";
import {
  createCommentAction,
  createPostAction,
  reportAction,
  type ForumFormState,
} from "@/lib/actions/forum";
import {
  BODY_MAX,
  COMMENT_MAX,
  TITLE_MAX,
} from "@/lib/forum/rules";

const FIELD =
  "w-full border border-line-strong bg-paper px-3.5 py-2.5 font-ui text-sm text-ink placeholder:text-muted focus:border-navy focus:outline-none";

function Feedback({ state }: { state: ForumFormState }) {
  if (state?.error) {
    return (
      <p role="alert" className="font-ui text-sm text-danger">
        {state.error}
      </p>
    );
  }
  if (state?.success) {
    return <p className="font-ui text-sm text-success">{state.success}</p>;
  }
  return null;
}

/** Đăng bài mới trong một phòng. */
export function NewPostForm({ channelKey }: { channelKey: string }) {
  const [state, action, pending] = useActionState<ForumFormState, FormData>(
    createPostAction,
    undefined
  );
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex cursor-pointer items-center gap-2 border border-navy bg-navy px-6 py-2.5 font-ui text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-paper transition-colors hover:bg-navy-deep"
      >
        <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
        Mở một chủ đề
      </button>
    );
  }

  return (
    <form action={action} className="space-y-3 border border-line bg-paper p-6">
      <input type="hidden" name="channelKey" value={channelKey} />
      <input
        name="title"
        required
        maxLength={TITLE_MAX}
        placeholder="Tiêu đề — nói thẳng vấn đề bạn muốn bàn"
        className={FIELD}
      />
      <textarea
        name="body"
        required
        rows={8}
        maxLength={BODY_MAX}
        placeholder="Nội dung. Chỉ nhận chữ — ảnh và tệp sẽ có ở bản sau."
        className={`${FIELD} resize-y leading-relaxed`}
      />
      <Feedback state={state} />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="cursor-pointer border border-navy bg-navy px-6 py-2.5 font-ui text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-paper disabled:opacity-60"
        >
          {pending ? "Đang đăng…" : "Đăng bài"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="cursor-pointer border border-line px-5 py-2.5 font-ui text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-ink-soft hover:border-navy hover:text-navy"
        >
          Hủy
        </button>
      </div>
    </form>
  );
}

/**
 * Trả lời bài, hoặc trả lời một bình luận.
 *
 * `parentId` rỗng = trả lời chính bài viết. Có giá trị = tạo một nhánh con.
 */
export function CommentForm({
  postId,
  channelKey,
  parentId = "",
  replyingTo,
  autoOpen = false,
}: {
  postId: string;
  channelKey: string;
  parentId?: string;
  /** Tên người được trả lời, chỉ để hiện gợi nhắc. */
  replyingTo?: string;
  autoOpen?: boolean;
}) {
  const [state, action, pending] = useActionState<ForumFormState, FormData>(
    createCommentAction,
    undefined
  );
  const [open, setOpen] = useState(autoOpen);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex cursor-pointer items-center gap-1.5 font-ui text-xs font-semibold text-navy hover:text-gold"
      >
        <Reply className="h-3.5 w-3.5" aria-hidden="true" />
        Trả lời
      </button>
    );
  }

  return (
    <form action={action} className="mt-2 space-y-2">
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="channelKey" value={channelKey} />
      <input type="hidden" name="parentId" value={parentId} />
      <textarea
        name="body"
        required
        rows={parentId ? 3 : 5}
        maxLength={COMMENT_MAX}
        placeholder={
          replyingTo ? `Trả lời ${replyingTo}…` : "Góp một lời vào cuộc bàn…"
        }
        className={`${FIELD} resize-y leading-relaxed`}
      />
      <Feedback state={state} />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="cursor-pointer border border-navy px-5 py-2 font-ui text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-navy transition-colors hover:bg-navy hover:text-paper disabled:opacity-60"
        >
          {pending ? "Đang gửi…" : "Gửi"}
        </button>
        {!autoOpen && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="cursor-pointer font-ui text-xs text-muted hover:text-ink"
          >
            Thôi
          </button>
        )}
      </div>
    </form>
  );
}

/** Báo cáo một bài hoặc một bình luận. */
export function ReportForm({
  targetType,
  targetId,
}: {
  targetType: "POST" | "COMMENT";
  targetId: string;
}) {
  const [state, action, pending] = useActionState<ForumFormState, FormData>(
    reportAction,
    undefined
  );

  if (state?.success) {
    return <p className="font-ui text-xs text-success">{state.success}</p>;
  }

  return (
    <details>
      <summary className="inline-flex cursor-pointer items-center gap-1.5 font-ui text-xs text-muted hover:text-danger">
        <FlagIcon className="h-3.5 w-3.5" aria-hidden="true" />
        Báo cáo
      </summary>
      <form action={action} className="mt-2 space-y-2">
        <input type="hidden" name="targetType" value={targetType} />
        <input type="hidden" name="targetId" value={targetId} />
        <input
          name="reason"
          required
          minLength={10}
          placeholder="Vì sao nội dung này cần xem lại?"
          className={FIELD}
        />
        <Feedback state={state} />
        <button
          type="submit"
          disabled={pending}
          className="cursor-pointer border border-danger px-4 py-1.5 font-ui text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-danger disabled:opacity-60"
        >
          {pending ? "Đang gửi…" : "Gửi báo cáo"}
        </button>
      </form>
    </details>
  );
}
