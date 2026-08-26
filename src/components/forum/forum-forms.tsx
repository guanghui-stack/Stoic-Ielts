"use client";

import { useActionState, useState } from "react";
import {
  MessageSquarePlus,
  CircleAlert,
  MessagesSquare,
  Trash2,
} from "lucide-react";
import {
  createCommentAction,
  createPostAction,
  deleteCommentAction,
  reportAction,
  type ForumFormState,
} from "@/lib/actions/forum";
import { BODY_MAX, COMMENT_MAX, TITLE_MAX } from "@/lib/forum/rules";
import { MarkupEditor } from "@/components/forum/markup-editor";
import { TagsInput } from "@/components/ui/tags-input";

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
      <TagsInput
        name="tags"
        maxTags={5}
        tone="focus"
        placeholder="Ví dụ: matching headings"
        hint="Thêm tối đa 5 chủ đề để người khác tìm đúng cuộc trao đổi."
      />
      <MarkupEditor
        name="body"
        rows={9}
        maxLength={BODY_MAX}
        required
        placeholder="Nội dung. Bôi đen chữ rồi bấm nút định dạng ở trên."
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
 * Nút "Luận bàn" và ô soạn thảo của nó.
 *
 * Nút nằm CÙNG HÀNG với Cắm cờ và Hạ cờ; ô soạn thảo chỉ hiện khi bấm vào.
 *
 * Mấu chốt bố cục: khi mở, ô nằm trong một khối `w-full basis-full`. Hàng chứa
 * nó là `flex flex-wrap`, nên phần tử chiếm trọn bề ngang bị đẩy xuống dòng
 * riêng và rộng hết khung. Trước đây ô soạn thảo là một phần tử thường trong
 * hàng flex, nên nó bị bóp lại còn một cột hẹp nằm lệch giữa các nút.
 */
export function CommentForm({
  postId,
  channelKey,
  parentId = "",
  replyingTo,
  label = "Luận bàn",
}: {
  postId: string;
  channelKey: string;
  parentId?: string;
  /** Tên người được trả lời, chỉ để hiện gợi nhắc trong ô. */
  replyingTo?: string;
  label?: string;
}) {
  const [state, action, pending] = useActionState<ForumFormState, FormData>(
    createCommentAction,
    undefined
  );
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={label}
        aria-label={label}
        className="inline-flex cursor-pointer items-center gap-1.5 border border-line px-2.5 py-1.5 font-ui text-xs font-semibold text-ink-soft transition-colors hover:border-navy hover:text-navy"
      >
        <MessagesSquare className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </button>
    );
  }

  return (
    <div className="w-full basis-full">
      <form action={action} className="mt-3 w-full space-y-2">
        <input type="hidden" name="postId" value={postId} />
        <input type="hidden" name="channelKey" value={channelKey} />
        <input type="hidden" name="parentId" value={parentId} />
        <MarkupEditor
          name="body"
          rows={parentId ? 4 : 6}
          maxLength={COMMENT_MAX}
          required
          autoFocus
          placeholder={
            replyingTo ? `Trả lời ${replyingTo}…` : "Góp một lời vào cuộc bàn…"
          }
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
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="cursor-pointer font-ui text-xs text-muted hover:text-ink"
          >
            Thôi
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * Nút tác giả tự gỡ lời bàn của mình.
 *
 * Chỉ dựng ra khi máy chủ đã xác nhận còn trong cửa sổ gỡ — nhưng đó chỉ là
 * phép lịch sự với mắt người dùng. Thứ thật sự chặn nằm ở `canDeleteComment`
 * phía máy chủ, vì một nút ẩn đi không ngăn được ai gửi biểu mẫu bằng tay.
 *
 * Có bước hỏi lại: gỡ xong là không lấy lại được, và nút này nằm ngay cạnh
 * nút Trả lời.
 */
export function DeleteCommentButton({
  commentId,
  minutesLeft,
}: {
  commentId: string;
  minutesLeft: number;
}) {
  const [asking, setAsking] = useState(false);

  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        title={`Gỡ lời bàn này — còn ${minutesLeft} phút`}
        className="inline-flex cursor-pointer items-center gap-1.5 font-ui text-xs text-muted hover:text-danger"
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        Gỡ ({minutesLeft} phút)
      </button>
    );
  }

  return (
    <form action={deleteCommentAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="commentId" value={commentId} />
      <span className="font-ui text-xs text-ink-soft">Gỡ hẳn lời bàn này?</span>
      <button
        type="submit"
        className="cursor-pointer border border-danger px-2.5 py-1 font-ui text-[0.7rem] font-semibold uppercase tracking-[0.06em] text-danger"
      >
        Gỡ
      </button>
      <button
        type="button"
        onClick={() => setAsking(false)}
        className="cursor-pointer font-ui text-xs text-muted hover:text-ink"
      >
        Thôi
      </button>
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
  const [open, setOpen] = useState(false);

  if (state?.success) {
    return <p className="font-ui text-xs text-success">{state.success}</p>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex cursor-pointer items-center gap-1.5 font-ui text-xs text-muted hover:text-danger"
      >
        <CircleAlert className="h-3.5 w-3.5" aria-hidden="true" />
        Báo cáo
      </button>
    );
  }

  return (
    <div className="w-full basis-full">
      <form action={action} className="mt-3 w-full space-y-2">
        <input type="hidden" name="targetType" value={targetType} />
        <input type="hidden" name="targetId" value={targetId} />
        <input
          name="reason"
          required
          minLength={10}
          autoFocus
          placeholder="Vì sao nội dung này cần xem lại?"
          className={FIELD}
        />
        <Feedback state={state} />
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={pending}
            className="cursor-pointer border border-danger px-4 py-1.5 font-ui text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-danger disabled:opacity-60"
          >
            {pending ? "Đang gửi…" : "Gửi báo cáo"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="cursor-pointer font-ui text-xs text-muted hover:text-ink"
          >
            Thôi
          </button>
        </div>
      </form>
    </div>
  );
}
