import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
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
import { NoteBox } from "@/components/ui";

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
      author: { select: { name: true } },
    },
  });
  // Bài phải thuộc ĐÚNG phòng trên đường dẫn: thiếu phép kiểm này thì đổi tên
  // phòng trong URL là đọc được bài của phòng bậc trên.
  if (!post || post.channelId !== channel.id) notFound();
  if (post.status !== "VISIBLE" && !viewer.isAdmin) notFound();

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
  const [postVotes, commentVotes] = await Promise.all([
    myVotes(viewer.id, "POST", [post.id]),
    myVotes(
      viewer.id,
      "COMMENT",
      comments.map((c) => c.id)
    ),
  ]);

  const basePath = `/nghi-su-duong/${channel.key}/${post.id}`;
  const canWrite = channel.access.canWrite && !post.lockedAt;

  return (
    <section className="mx-auto max-w-3xl px-6 py-12 md:py-16">
      <Link
        href={`/nghi-su-duong/${channel.key}`}
        className="inline-flex items-center gap-2 font-ui text-sm font-semibold text-navy hover:text-gold"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Phòng {channel.name}
      </Link>

      <article className="mt-6 border border-line bg-paper p-7 shadow-card">
        <h1 className="font-display text-2xl font-bold leading-tight text-navy-deep md:text-3xl">
          {post.title}
        </h1>
        <p className="mt-2 font-ui text-xs text-muted">
          {post.author.name} · {fmt(post.createdAt)}
        </p>
        <div className="rule-gold mt-4" />

        {/*
          `RichText` dựng ra các phần tử React từ dấu quy ước — KHÔNG bao giờ
          dựng HTML từ chuỗi người dùng. Xem chú thích đầu `lib/forum/markup.ts`
          để hiểu vì sao đó là điều kiện an toàn, không phải lựa chọn phong cách.
        */}
        <RichText
          text={post.body}
          className="mt-5 text-[0.98rem] leading-relaxed text-ink"
        />

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
            downCount={post.downCount}
            myValue={postVotes.get(post.id) ?? 0}
            path={basePath}
            disabled={viewer.banned}
          />
          {canWrite && (
            <CommentForm postId={post.id} channelKey={channel.key} />
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
            : "Bạn chưa viết được ở phòng này."}
        </NoteBox>
      )}

      <h2 className="mt-10 font-display text-lg font-bold text-navy-deep">
        {comments.length} phản hồi
      </h2>

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
}: {
  node: CommentNode<CommentData>;
  postId: string;
  channelKey: string;
  basePath: string;
  votes: Map<string, 1 | -1 | 0>;
  viewer: Viewer;
  canWrite: boolean;
}) {
  const atMaxDepth = node.depth >= MAX_DEPTH;

  return (
    <div
      className={
        node.depth === 0
          ? "border-l-2 border-line pl-4"
          : "mt-3 border-l-2 border-line pl-4"
      }
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-ui text-xs text-muted">
        <span className="font-semibold text-ink">
          {node.deleted ? "—" : node.authorName}
        </span>
        <span>{fmt(node.createdAt)}</span>
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
            downCount={node.downCount}
            myValue={votes.get(node.id) ?? 0}
            path={basePath}
            disabled={viewer.banned}
            compact
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
