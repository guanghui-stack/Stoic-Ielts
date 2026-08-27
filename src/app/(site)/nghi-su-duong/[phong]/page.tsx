import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageSquare, Pin, Lock } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import {
  channelFor,
  competitionLive,
  myVotes,
  viewerOf,
} from "@/lib/forum/service";
import { SCORE_LABEL } from "@/lib/forum/rules";
import { NewPostForm } from "@/components/forum/forum-forms";
import { VoteButtons } from "@/components/forum/vote-buttons";
import { NoteBox, SectionHeading } from "@/components/ui";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

function fmt(d: Date) {
  return d.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ phong: string }>;
}) {
  const { phong } = await params;
  const user = await requireUser();
  const viewer = await viewerOf(user);
  const live = await competitionLive();

  // `channelFor` đã lọc theo quyền đọc, nên không tìm thấy có thể là "không có
  // phòng" hoặc "chưa đủ bậc". Trả 404 cho cả hai là cố ý: nói "phòng này tồn
  // tại nhưng bạn chưa đủ bậc" là đã tiết lộ có gì ở trên.
  const channel = await channelFor(phong, viewer, live);
  if (!channel) notFound();

  const posts = await db.forumPost.findMany({
    where: { channelId: channel.id, status: "VISIBLE" },
    orderBy: [{ pinnedAt: "desc" }, { lastActivityAt: "desc" }],
    take: PAGE_SIZE,
    select: {
      id: true,
      title: true,
      score: true,
      upCount: true,
      downCount: true,
      commentCount: true,
      pinnedAt: true,
      lockedAt: true,
      createdAt: true,
      lastActivityAt: true,
      author: { select: { name: true } },
    },
  });

  const votes = await myVotes(
    viewer.id,
    "POST",
    posts.map((p) => p.id)
  );
  const basePath = `/nghi-su-duong/${channel.key}`;

  return (
    <section className="mx-auto max-w-4xl px-6 py-12 md:py-16">
      <Link
        href="/nghi-su-duong"
        className="inline-flex items-center gap-2 font-ui text-sm font-semibold text-navy hover:text-gold"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Tất cả các phòng
      </Link>

      <div className="mt-6">
        <SectionHeading
          label={`Chặng ${channel.level}`}
          title={`Phòng ${channel.name}`}
        />
        <p className="mt-5 max-w-2xl text-[0.95rem] leading-relaxed text-ink-soft">
          {channel.blurb}
        </p>
      </div>

      {!channel.access.canWrite && (
        <NoteBox className="mt-8" title="Đang chỉ đọc">
          {live
            ? "Thử thách tháng đang diễn ra nên phần viết tạm khóa. Mở lại ngay sau khi kỳ thi kết thúc."
            : channel.locked
              ? "Quản trị viên đang khóa phòng này."
              : "Tài khoản của bạn đang bị hạn chế đăng bài."}
        </NoteBox>
      )}

      {channel.access.canWrite && (
        <div className="mt-8">
          <NewPostForm channelKey={channel.key} />
        </div>
      )}

      {posts.length === 0 ? (
        <NoteBox className="mt-10" title="Phòng này chưa có chủ đề nào">
          {channel.access.canWrite
            ? "Hãy mở chủ đề đầu tiên: một câu hỏi thật hoặc một lỗi bạn chưa hiểu đều là điểm bắt đầu tốt."
            : "Chưa ai đăng gì ở đây."}
        </NoteBox>
      ) : (
        <ul className="mt-10 divide-y divide-line border-y border-line">
          {posts.map((post) => (
            <li key={post.id} className="flex items-start gap-4 py-5">
              <div className="shrink-0 pt-0.5">
                <VoteButtons
                  targetType="POST"
                  targetId={post.id}
                  upCount={post.upCount}
                  downCount={post.downCount}
                  myValue={votes.get(post.id) ?? 0}
                  path={basePath}
                  disabled={!channel.access.canRead || viewer.banned}
                />
              </div>

              <div className="min-w-0 flex-1">
                <Link
                  href={`${basePath}/${post.id}`}
                  className="font-display text-lg font-bold leading-snug text-navy-deep hover:text-gold"
                >
                  {post.title}
                </Link>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 font-ui text-xs text-muted">
                  <span>{post.author.name}</span>
                  <span>{fmt(post.createdAt)}</span>
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                    {post.commentCount}
                  </span>
                  <span className="tabular-nums">
                    {post.score} {SCORE_LABEL}
                  </span>
                  {post.pinnedAt && (
                    <span className="inline-flex items-center gap-1 font-semibold text-gold">
                      <Pin className="h-3.5 w-3.5" aria-hidden="true" />
                      Ghim
                    </span>
                  )}
                  {post.lockedAt && (
                    <span className="inline-flex items-center gap-1 font-semibold text-ink-soft">
                      <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                      Đã đóng
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {posts.length === PAGE_SIZE && (
        <p className="mt-6 font-ui text-xs text-muted">
          Đang hiện {PAGE_SIZE} chủ đề mới nhất.
        </p>
      )}
    </section>
  );
}
