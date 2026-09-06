import Link from "next/link";
import {
  Bell,
  Lock,
  MessageSquare,
  Pin,
  ShieldAlert,
} from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import {
  channelsFor,
  competitionLive,
  myVotes,
  viewerOf,
} from "@/lib/forum/service";
import { SCORE_LABEL } from "@/lib/forum/rules";
import { rankByLevel } from "@/lib/ranks/catalog";
import { ART_ASSETS } from "@/lib/brand/art-manifest";
import type { NextStepModel } from "@/lib/campaign/world";
import { NextStepGuide } from "@/components/world/next-step-guide";
import { SceneHero } from "@/components/world/scene-hero";
import { NewPostForm } from "@/components/forum/forum-forms";
import { ForumTags } from "@/components/forum/forum-tags";
import { ForumAuthorStatus } from "@/components/forum/forum-author-status";
import { ForumRealtimeBridge } from "@/components/forum/use-realtime-forum";
import { VoteButtons } from "@/components/forum/vote-buttons";
import { extractTagsFromBody } from "@/lib/forum/tags";
import { NoteBox } from "@/components/ui";
import { countUnreadForumNotifications } from "@/lib/forum/engagement";
import { UnderstoodBadge } from "@/components/forum/thread-engagement";
import styles from "@/components/forum/forum-discussions.module.css";

export const metadata = {
  title: "Diễn Đàn",
  description:
    "Một diễn đàn chung, tự phân tầng nội dung theo bậc hiện tại của học viên.",
};
export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

const FORUM_NEXT_STEP: NextStepModel = {
  eyebrow: "Bước đầu tiên",
  title: "Mở một chủ đề đúng với bậc người đọc",
  body: "Diễn đàn dùng để hỏi rõ, chia sẻ bằng chứng và giảng lại điều đã hiểu; nơi này không thay thế việc tự chữa bài Reading và Feynman.",
  href: "/hoc-vien",
  actionLabel: "Xem vị trí của tôi",
  entersStudy: false,
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function positivePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

function fmt(d: Date) {
  return d.toLocaleString("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function feedHref(filter: string, page = 1): string {
  const query = new URLSearchParams();
  if (filter !== "all") query.set("bac", filter);
  if (page > 1) query.set("trang", String(page));
  const suffix = query.toString();
  return suffix ? `/nghi-su-duong?${suffix}` : "/nghi-su-duong";
}

export default async function ForumHome({
  searchParams,
}: {
  searchParams: Promise<{
    bac?: string | string[];
    trang?: string | string[];
  }>;
}) {
  const user = await requireUser();
  const viewer = await viewerOf(user);
  const live = await competitionLive();
  const channels = await channelsFor(viewer, live);
  const params = await searchParams;
  const requestedFilter = firstParam(params.bac) ?? "all";
  const page = positivePage(firstParam(params.trang));

  const requestedLevel =
    requestedFilter === "mine"
      ? viewer.level
      : Number.parseInt(requestedFilter, 10);
  const selectedChannel = Number.isInteger(requestedLevel)
    ? channels.find((channel) => channel.level === requestedLevel)
    : undefined;
  const activeFilter =
    requestedFilter === "mine" && selectedChannel
      ? "mine"
      : selectedChannel
        ? String(selectedChannel.level)
        : "all";
  const visibleChannelIds = selectedChannel
    ? [selectedChannel.id]
    : channels.map((channel) => channel.id);

  const where = {
    channelId: { in: visibleChannelIds },
    status: "VISIBLE",
  } as const;
  const [posts, total, unreadCount] = await Promise.all([
    db.forumPost.findMany({
      where,
      orderBy: [
        { pinnedAt: "desc" },
        { lastActivityAt: "desc" },
        { id: "desc" },
      ],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        body: true,
        score: true,
        upCount: true,
        downCount: true,
        commentCount: true,
        pinnedAt: true,
        lockedAt: true,
        createdAt: true,
        helpfulReply: {select: {comment: {select: {status: true, postId: true}}}},
        questionReference: {select: {passageTitle: true, questionNumber: true}},
        author: { select: { id: true, name: true } },
        channel: {
          select: { key: true, level: true, name: true, locked: true },
        },
      },
    }),
    db.forumPost.count({ where }),
    countUnreadForumNotifications(viewer),
  ]);
  const votes = await myVotes(
    viewer.id,
    "POST",
    posts.map((post) => post.id),
  );
  const postsWithTags = posts.map((post) => ({
    ...post,
    tags: extractTagsFromBody(post.body).tags,
  }));

  const myRank = rankByLevel(viewer.level);
  const writableLevels = channels
    .filter((channel) => channel.access.canWrite)
    .map((channel) => ({
      channelKey: channel.key,
      level: channel.level,
      name: channel.name,
    }));
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <SceneHero
        asset={ART_ASSETS.generalQuanVu}
        eyebrow="Diễn đàn học tập"
        title="Một cộng đồng, đúng nội dung cho từng chặng"
        functionalLabel="Cộng đồng thảo luận phương pháp học"
      >
        <p className="text-lg leading-relaxed text-ink-soft">
          Mọi cuộc thảo luận nằm trong một dòng chung. Bạn đọc được các chủ đề
          từ Bậc 1 đến bậc hiện tại; nhãn trên mỗi bài cho biết bậc tối thiểu
          được phép xem.
        </p>
      </SceneHero>

      <section className="mx-auto max-w-4xl px-6 py-12 md:py-16">
        <ForumRealtimeBridge levels={channels.map((channel) => channel.level)} />
        <NextStepGuide step={FORUM_NEXT_STEP} />

        <div className={`${styles.headerRow} mt-8`}>
          <p className="font-ui text-sm font-medium text-ink">Dòng thảo luận chung</p>
          <Link href="/nghi-su-duong/theo-doi" className={styles.inboxLink}>
            <Bell size={16} aria-hidden="true" />
            Theo dõi
            {unreadCount > 0 && <span className={styles.unreadCount}>{unreadCount}<span className="sr-only"> thông báo chưa đọc</span></span>}
          </Link>
        </div>

        {myRank && (
          <p className="mt-8 font-ui text-sm text-muted">
            Bậc hiện tại của bạn:{" "}
            <strong className="text-ink">{myRank.name}</strong> (Bậc{
            " "}{viewer.level}) — đang xem được nội dung Bậc 1–{viewer.level}.
          </p>
        )}

        {live && (
          <NoteBox className="mt-8" title="Thử thách tháng đang diễn ra">
            Phần viết tạm khóa cho tới khi kỳ thi kết thúc. Bạn vẫn đọc được
            các chủ đề phù hợp với bậc hiện tại.
          </NoteBox>
        )}

        {viewer.banned && (
          <NoteBox className="mt-6" title="Tài khoản đang bị hạn chế">
            Bạn vẫn đọc được diễn đàn nhưng chưa đăng bài hay bình luận được.
            Liên hệ trung tâm nếu bạn cho rằng đây là nhầm lẫn.
          </NoteBox>
        )}

        {writableLevels.length > 0 ? (
          <div className="mt-8">
            <NewPostForm
              levels={writableLevels}
              defaultLevel={viewer.level}
            />
          </div>
        ) : !live && !viewer.banned ? (
          <NoteBox className="mt-8" title="Các bậc đang tạm khóa phần viết">
            Quản trị viên đang khóa những bậc bạn có thể truy cập. Bạn vẫn đọc
            lại được các cuộc thảo luận đã có.
          </NoteBox>
        ) : null}

        <nav
          aria-label="Lọc chủ đề theo bậc"
          className="mt-10 flex flex-wrap gap-2 border-y border-line py-4"
        >
          <Link
            href={feedHref("all")}
            aria-current={activeFilter === "all" ? "page" : undefined}
            className={`min-h-11 border px-4 py-2.5 font-ui text-sm font-semibold transition-colors ${
              activeFilter === "all"
                ? "border-navy bg-navy text-paper"
                : "border-line text-ink-soft hover:border-navy hover:text-navy"
            }`}
          >
            Tất cả
          </Link>
          <Link
            href={feedHref("mine")}
            aria-current={activeFilter === "mine" ? "page" : undefined}
            className={`min-h-11 border px-4 py-2.5 font-ui text-sm font-semibold transition-colors ${
              activeFilter === "mine"
                ? "border-navy bg-navy text-paper"
                : "border-line text-ink-soft hover:border-navy hover:text-navy"
            }`}
          >
            Bậc của tôi
          </Link>
          {channels.map((channel) => {
            const key = String(channel.level);
            return (
              <Link
                key={channel.id}
                href={feedHref(key)}
                aria-current={activeFilter === key ? "page" : undefined}
                className={`min-h-11 border px-4 py-2.5 font-ui text-sm font-semibold transition-colors ${
                  activeFilter === key
                    ? "border-gold bg-gold-pale text-gold"
                    : "border-line text-ink-soft hover:border-gold hover:text-gold"
                }`}
              >
                Bậc {channel.level}
              </Link>
            );
          })}
        </nav>

        {postsWithTags.length === 0 ? (
          <NoteBox className="mt-10" title="Chưa có chủ đề phù hợp">
            {page > 1
              ? "Trang này không còn chủ đề. Hãy quay lại trang trước."
              : "Hãy mở chủ đề đầu tiên: một câu hỏi thật hoặc một lỗi bạn chưa hiểu đều là điểm bắt đầu tốt."}
          </NoteBox>
        ) : (
          <ul className="mt-8 divide-y divide-line border-y border-line">
            {postsWithTags.map((post) => {
              const detailPath = `/nghi-su-duong/${post.channel.key}/${post.id}`;
              return (
                <li key={post.id} className="flex items-start gap-4 py-5">
                  <div className="shrink-0 pt-0.5">
                    <VoteButtons
                      targetType="POST"
                      targetId={post.id}
                      upCount={post.upCount}
                      myValue={votes.get(post.id) ?? 0}
                      path="/nghi-su-duong"
                      disabled={viewer.banned}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="border border-gold bg-gold-pale px-2 py-0.5 font-ui text-[0.68rem] font-bold uppercase tracking-wide text-gold">
                        Bậc {post.channel.level}
                      </span>
                      <span className="font-ui text-xs text-muted">
                        {post.channel.name}
                      </span>
                      {post.helpfulReply?.comment.status === "VISIBLE" && post.helpfulReply.comment.postId === post.id && <UnderstoodBadge />}
                    </div>
                    <Link
                      href={detailPath}
                      className="font-display text-lg font-bold leading-snug text-navy-deep hover:text-gold"
                    >
                      {post.title}
                    </Link>
                    <ForumTags tags={post.tags} />
                    {post.questionReference && <p className="mt-2 font-ui text-xs text-muted">{post.questionReference.passageTitle} · Câu {post.questionReference.questionNumber}</p>}
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 font-ui text-xs text-muted">
                      <ForumAuthorStatus
                        userId={post.author.id}
                        name={post.author.name}
                      />
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
                      {(post.lockedAt || post.channel.locked) && (
                        <span className="inline-flex items-center gap-1 font-semibold text-ink-soft">
                          <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                          Đã đóng
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-8 flex items-center justify-between gap-4 font-ui text-sm">
          {page > 1 ? (
            <Link
              href={feedHref(activeFilter, page - 1)}
              className="min-h-11 border border-line px-4 py-2.5 font-semibold text-navy hover:border-navy"
            >
              Trang trước
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted">
            Trang {Math.min(page, totalPages)}/{totalPages} · {total} chủ đề
          </span>
          {page < totalPages ? (
            <Link
              href={feedHref(activeFilter, page + 1)}
              className="min-h-11 border border-line px-4 py-2.5 font-semibold text-navy hover:border-navy"
            >
              Trang sau
            </Link>
          ) : (
            <span />
          )}
        </div>

        <NoteBox className="mt-10" title="Nội quy ngắn">
          Gắn thẻ ngắn để người khác tìm đúng cuộc trao đổi. Phiên bản hiện tại
          chỉ hỗ trợ chữ. <strong>Không bàn về đề đang thi.</strong> Thấy nội
          dung sai trái thì bấm <strong>Báo cáo</strong> thay vì cãi nhau.
        </NoteBox>

        <p className="mt-6 flex items-start gap-2 font-ui text-xs leading-relaxed text-muted">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Bài viết ở đây do học viên tự đăng và không phải quan điểm của trung tâm.
        </p>
      </section>
    </div>
  );
}
