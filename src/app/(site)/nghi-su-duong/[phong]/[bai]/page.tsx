import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bell, Lock } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import {
  channelFor,
  competitionLive,
  myVotes,
  viewerOf,
  type Viewer,
} from "@/lib/forum/service";
import {
  buildCommentTree,
  canDeleteComment,
  deleteMinutesLeft,
  MAX_DEPTH,
  pruneDeletedLeaves,
  type CommentNode,
} from "@/lib/forum/rules";
import {
  CommentForm,
  DeleteCommentButton,
  ReportForm,
} from "@/components/forum/forum-forms";
import { VoteButtons } from "@/components/forum/vote-buttons";
import { RichText } from "@/components/forum/rich-text";
import { ForumTags } from "@/components/forum/forum-tags";
import { ForumAuthorStatus } from "@/components/forum/forum-author-status";
import { ForumRealtimeBridge } from "@/components/forum/use-realtime-forum";
import { extractTagsFromBody } from "@/lib/forum/tags";
import { NoteBox } from "@/components/ui";
import { getThreadEngagement, countUnreadForumNotifications } from "@/lib/forum/engagement";
import { questionReferenceForPost } from "@/lib/forum/question-context";
import { QuestionReferenceCard } from "@/components/forum/question-reference-card";
import {
  FollowThreadButton,
  HelpfulReplyButton,
  UnderstoodBadge,
} from "@/components/forum/thread-engagement";
import styles from "@/components/forum/forum-discussions.module.css";

export const dynamic = "force-dynamic";

function fmt(d: Date) {
  return d.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

type CommentData = {
  id: string;
  parentId: string | null;
  createdAt: Date;
  score: number;
  upCount: number;
  downCount: number;
  body: string;
  status: string;
  authorName: string;
  authorId: string;
  /** Đã bị chính tác giả gỡ. Khác hẳn `HIDDEN` do quản trị viên ẩn. */
  deleted: boolean;
  /** Số phút tác giả còn được gỡ; 0 nghĩa là hết hạn hoặc không phải của mình. */
  deleteMinutes: number;
};

export default async function PostPage({
  params,
}: {
  params: Promise<{ phong: string; bai: string }>;
}) {
  const { phong, bai } = await params;
  const user = await requireUser();
  const viewer = await viewerOf(user);
  const live = await competitionLive();

  const channel = await channelFor(phong, viewer, live);
  if (!channel) notFound();

  const post = await db.forumPost.findUnique({
    where: { id: bai },
    select: {
      id: true,
      channelId: true,
      title: true,
      body: true,
      score: true,
      upCount: true,
      downCount: true,
      status: true,
      lockedAt: true,
      createdAt: true,
      author: { select: { id: true, name: true } },
    },
  });
  // Bài phải thuộc ĐÚNG phòng trên đường dẫn: thiếu phép kiểm này thì đổi tên
  // phòng trong URL là đọc được bài của phòng bậc trên.
  if (!post || post.channelId !== channel.id) notFound();
  if (post.status !== "VISIBLE" && !viewer.isAdmin) notFound();
  const postContent = extractTagsFromBody(post.body);

  const rows = await db.forumComment.findMany({
    where: { postId: post.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      parentId: true,
      createdAt: true,
      score: true,
      upCount: true,
      downCount: true,
      body: true,
      status: true,
      authorId: true,
      author: { select: { name: true } },
    },
  });

  const now = new Date();
  const comments: CommentData[] = rows
    // Lời bàn quản trị viên ẩn thì giấu hẳn khỏi học viên. Lời tác giả TỰ GỠ
    // vẫn đi tiếp để làm bia mộ giữ mạch hội thoại — `pruneDeletedLeaves` sẽ
    // bỏ những cái không còn ai trả lời.
    .filter(
      (row) =>
        row.status === "VISIBLE" || row.status === "DELETED" || viewer.isAdmin
    )
    .map((row) => ({
      id: row.id,
      parentId: row.parentId,
      createdAt: row.createdAt,
      score: row.score,
      upCount: row.upCount,
      downCount: row.downCount,
      body: row.body,
      status: row.status,
      authorName: row.author.name,
      authorId: row.authorId,
      deleted: row.status === "DELETED",
      deleteMinutes: canDeleteComment({
        authorId: row.authorId,
        viewerId: viewer.id,
        createdAt: row.createdAt,
        now,
      })
        ? deleteMinutesLeft(row.createdAt, now)
        : 0,
    }));

  const tree = pruneDeletedLeaves(buildCommentTree(comments));
  const [postVotes, commentVotes, engagement, questionReference, unreadCount] = await Promise.all([
    myVotes(viewer.id, "POST", [post.id]),
    myVotes(
      viewer.id,
      "COMMENT",
      comments.map((c) => c.id)
    ),
    getThreadEngagement(viewer, post.id),
    questionReferenceForPost(user, post.id),
    countUnreadForumNotifications(viewer),
  ]);

  const basePath = `/nghi-su-duong/${channel.key}/${post.id}`;
  const canWrite = channel.access.canWrite && !post.lockedAt;
  const renderedCommentCount = (() => {
    const count = (nodes: CommentNode<CommentData>[]): number =>
      nodes.reduce((total, node) => total + 1 + count(node.children), 0);
    return count(tree);
  })();

  return (
    <section className="mx-auto max-w-3xl px-6 py-12 md:py-16">
      <ForumRealtimeBridge levels={[channel.level]} />
      <div className={styles.headerRow}>
        <Link
          href={`/nghi-su-duong?bac=${channel.level}`}
          className="inline-flex min-h-11 items-center gap-2 font-ui text-sm font-semibold text-navy hover:text-gold"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Trở lại diễn đàn · Bậc {channel.level}
        </Link>
        <Link href="/nghi-su-duong/theo-doi" className={styles.inboxLink}>
          <Bell size={16} aria-hidden="true" />
          Theo dõi
          {unreadCount > 0 && <span className={styles.unreadCount}>{unreadCount}<span className="sr-only"> thông báo chưa đọc</span></span>}
        </Link>
      </div>

      <article className={`${styles.threadArticle} mt-6 border border-line bg-paper p-7 shadow-card`}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="border border-gold bg-gold-pale px-2 py-0.5 font-ui text-[0.68rem] font-bold uppercase tracking-wide text-gold">
            Bậc {channel.level}
          </span>
          <span className="font-ui text-xs text-muted">{channel.name}</span>
          {engagement?.helpfulCommentId && <UnderstoodBadge />}
        </div>
        <h1 className="font-display text-2xl font-bold leading-tight text-navy-deep md:text-3xl">
          {post.title}
        </h1>
        <p className="mt-2 font-ui text-xs text-muted">
          <ForumAuthorStatus userId={post.author.id} name={post.author.name} /> ·{" "}
          {fmt(post.createdAt)}
        </p>
        <ForumTags tags={postContent.tags} />
        <div className="rule-gold mt-4" />

        {questionReference && <QuestionReferenceCard reference={questionReference} />}

        {/*
          `RichText` dựng ra các phần tử React từ dấu quy ước — KHÔNG bao giờ
          dựng HTML từ chuỗi người dùng. Xem chú thích đầu `lib/forum/markup.ts`
          để hiểu vì sao đó là điều kiện an toàn, không phải lựa chọn phong cách.
        */}
        <RichText
          text={postContent.content}
          className="mt-5 text-[0.98rem] leading-relaxed text-ink"
        />

        {engagement?.helpfulCommentId && (
          <div className={styles.acceptedSummary}>
            <a href={`#phan-hoi-${engagement.helpfulCommentId}`} className={styles.textLink}>
              <UnderstoodBadge />
              Xem phản hồi
            </a>
            <p>Người hỏi đánh dấu phản hồi đã giúp mình hiểu; đây không phải xác nhận đáp án của giáo viên.</p>
          </div>
        )}

        {/*
          Một hàng flex-wrap chứa: cắm cờ · hạ cờ · Luận bàn · Báo cáo.
          Khi mở, ô soạn thảo tự xuống dòng riêng và rộng hết khung nhờ
          `w-full basis-full` bên trong — đó là cách sửa lỗi ô bị bóp hẹp.
        */}
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5">
          <VoteButtons
            targetType="POST"
            targetId={post.id}
            upCount={post.upCount}
            myValue={postVotes.get(post.id) ?? 0}
            path={basePath}
            disabled={viewer.banned}
          />
          {canWrite && (
            <CommentForm postId={post.id} channelKey={channel.key} />
          )}
          {engagement && (
            <FollowThreadButton postId={post.id} following={engagement.following} />
          )}
          <span className="ml-auto">
            <ReportForm targetType="POST" targetId={post.id} />
          </span>
        </div>
      </article>

      {post.lockedAt && (
        <NoteBox className="mt-6" title="Chủ đề đã đóng">
          Quản trị viên đã đóng chủ đề này. Nội dung giữ nguyên để đọc lại,
          nhưng không nhận thêm bình luận.
        </NoteBox>
      )}

      {!channel.access.canWrite && !post.lockedAt && (
        <NoteBox className="mt-6" title="Đang chỉ đọc">
          {live
            ? "Thử thách tháng đang diễn ra nên phần viết tạm khóa."
            : "Bạn chưa viết được ở bậc nội dung này."}
        </NoteBox>
      )}

      <h2 className="mt-10 font-display text-lg font-bold text-navy-deep">
        {renderedCommentCount} phản hồi
      </h2>
      {engagement?.canMarkHelpful && (
        <p className="mt-2 font-ui text-xs leading-relaxed text-muted">
          Chọn “Đã giúp mình hiểu” ở một phản hồi hữu ích. Bạn có thể đổi hoặc bỏ dấu này bất cứ lúc nào.
        </p>
      )}

      <div className="mt-4 space-y-4">
        {tree.map((node) => (
          <CommentBranch
            key={node.id}
            node={node}
            postId={post.id}
            channelKey={channel.key}
            basePath={basePath}
            votes={commentVotes}
            viewer={viewer}
            canWrite={canWrite}
            helpfulCommentId={engagement?.helpfulCommentId ?? null}
            canMarkHelpful={engagement?.canMarkHelpful ?? false}
            postAuthorId={post.author.id}
          />
        ))}
      </div>
    </section>
  );
}

/**
 * Một nhánh của cây thảo luận.
 *
 * Thụt lề theo `depth`, tối đa {@link MAX_DEPTH} tầng — sâu hơn nữa thì trên
 * điện thoại chỉ còn một cột chữ rộng vài ký tự. Trả lời ở tầng cuối gắn vào
 * chính tầng đó và nhắc tên người được trả lời.
 */
function CommentBranch({
  node,
  postId,
  channelKey,
  basePath,
  votes,
  viewer,
  canWrite,
  helpfulCommentId,
  canMarkHelpful,
  postAuthorId,
}: {
  node: CommentNode<CommentData>;
  postId: string;
  channelKey: string;
  basePath: string;
  votes: Map<string, 1 | -1 | 0>;
  viewer: Viewer;
  canWrite: boolean;
  helpfulCommentId: string | null;
  canMarkHelpful: boolean;
  postAuthorId: string;
}) {
  const atMaxDepth = node.depth >= MAX_DEPTH;
  const helpful = node.status === "VISIBLE" && helpfulCommentId === node.id;

  return (
    <div
      id={`phan-hoi-${node.id}`}
      className={`${styles.commentAnchor} ${helpful ? styles.acceptedComment : ""} ${node.depth === 0 ? "border-l-2 border-line pl-4" : "mt-3 border-l-2 border-line pl-4"}`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-ui text-xs text-muted">
        {node.deleted ? (
          <span className="font-semibold text-ink">—</span>
        ) : (
          <ForumAuthorStatus
            userId={node.authorId}
            name={node.authorName}
            className="font-semibold text-ink"
          />
        )}
        <span>{fmt(node.createdAt)}</span>
        {helpful && <UnderstoodBadge />}
        {node.status === "HIDDEN" && (
          <span className="inline-flex items-center gap-1 font-semibold text-danger">
            <Lock className="h-3 w-3" aria-hidden="true" />
            Đã ẩn (chỉ quản trị viên thấy)
          </span>
        )}
      </div>

      {/*
        Lời bàn tác giả đã gỡ chỉ còn là BIA MỘ: giữ chỗ để những câu trả lời
        bên dưới không treo lơ lửng, nhưng không hiện lại chữ đã gỡ. Tên tác
        giả cũng ẩn theo — họ đã rút lời thì không nên còn bị gắn với nó.
      */}
      {node.deleted ? (
        <p className="mt-1.5 font-ui text-sm italic text-muted">
          Lời bàn đã được tác giả gỡ.
        </p>
      ) : (
        <RichText
          text={node.body}
          className="mt-1.5 text-[0.94rem] leading-relaxed text-ink"
        />
      )}

      {/* Bia mộ không có nút nào: không bầu, không trả lời, không báo cáo một
          lời đã gỡ. Nhưng nhánh con bên dưới vẫn giữ đủ thao tác của chúng. */}
      {!node.deleted && (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <VoteButtons
            targetType="COMMENT"
            targetId={node.id}
            upCount={node.upCount}
            myValue={votes.get(node.id) ?? 0}
            path={basePath}
            disabled={viewer.banned}
          />
          {canWrite && (
            <CommentForm
              postId={postId}
              channelKey={channelKey}
              // Ở tầng cuối thì trả lời gắn vào CHÍNH bình luận này; máy chủ tự
              // kẹp độ sâu lại nên cây không thụt thêm.
              parentId={node.id}
              replyingTo={atMaxDepth ? node.authorName : undefined}
              label="Trả lời"
            />
          )}
          {node.deleteMinutes > 0 && (
            <DeleteCommentButton
              commentId={node.id}
              minutesLeft={node.deleteMinutes}
            />
          )}
          {canMarkHelpful && node.status === "VISIBLE" && node.authorId !== postAuthorId && (
            <HelpfulReplyButton postId={postId} commentId={node.id} selected={helpful} />
          )}
          <span className="ml-auto">
            <ReportForm targetType="COMMENT" targetId={node.id} />
          </span>
        </div>
      )}

      {node.children.length > 0 && (
        <div className="mt-3">
          {node.children.map((child) => (
            <CommentBranch
              key={child.id}
              node={child}
              postId={postId}
              channelKey={channelKey}
              basePath={basePath}
              votes={votes}
              viewer={viewer}
              canWrite={canWrite}
              helpfulCommentId={helpfulCommentId}
              canMarkHelpful={canMarkHelpful}
              postAuthorId={postAuthorId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
