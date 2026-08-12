import Link from "next/link";
import { Eye, EyeOff, Lock, LockOpen, Pin, UserX } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import {
  resolveReportAction,
  toggleChannelLockAction,
  toggleCommentVisibilityAction,
  toggleForumBanAction,
  togglePostLockAction,
  togglePostPinAction,
  togglePostVisibilityAction,
} from "@/lib/actions/admin-forum";

export const metadata = { title: "Kiểm duyệt Nghị Sự Đường" };
export const dynamic = "force-dynamic";

function fmt(d: Date) {
  return d.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

const ICON_BTN =
  "inline-flex cursor-pointer items-center gap-1.5 border border-line px-2.5 py-1.5 font-ui text-[0.7rem] font-semibold uppercase tracking-[0.06em] text-ink-soft transition-colors hover:border-navy hover:text-navy";

export default async function AdminForumPage() {
  await requireAdmin();

  const [channels, reports, recentPosts, bannedUsers] = await Promise.all([
    db.forumChannel.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { posts: true } } },
    }),
    db.forumReport.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { reporter: { select: { name: true, email: true } } },
    }),
    db.forumPost.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
      include: {
        author: { select: { id: true, name: true } },
        channel: { select: { key: true, name: true } },
      },
    }),
    db.user.findMany({
      where: { forumBannedAt: { not: null } },
      select: { id: true, name: true, email: true, forumBannedAt: true },
      orderBy: { forumBannedAt: "desc" },
    }),
  ]);

  // Báo cáo trỏ tới bài hay bình luận bằng targetId thô, nên phải nạp riêng
  // rồi ghép — một truy vấn cho mỗi loại, không phải một truy vấn mỗi báo cáo.
  const postIds = reports.filter((r) => r.targetType === "POST").map((r) => r.targetId);
  const commentIds = reports.filter((r) => r.targetType === "COMMENT").map((r) => r.targetId);

  const [reportedPosts, reportedComments] = await Promise.all([
    postIds.length
      ? db.forumPost.findMany({
          where: { id: { in: postIds } },
          select: {
            id: true,
            title: true,
            body: true,
            status: true,
            author: { select: { id: true, name: true } },
            channel: { select: { key: true } },
          },
        })
      : Promise.resolve([]),
    commentIds.length
      ? db.forumComment.findMany({
          where: { id: { in: commentIds } },
          select: {
            id: true,
            body: true,
            status: true,
            postId: true,
            author: { select: { id: true, name: true } },
            post: { select: { channel: { select: { key: true } } } },
          },
        })
      : Promise.resolve([]),
  ]);

  const postById = new Map(reportedPosts.map((p) => [p.id, p]));
  const commentById = new Map(reportedComments.map((c) => [c.id, c]));

  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <p className="label-caps">Kiểm duyệt</p>
      <h1 className="mt-3 font-display text-3xl font-bold text-navy-deep md:text-4xl">
        Nghị Sự Đường
      </h1>
      <div className="rule-gold mt-5" />
      <p className="mt-5 max-w-3xl text-[0.95rem] leading-relaxed text-ink-soft">
        Nguyên tắc ở đây là <strong>ẩn, không xóa</strong>. Nội dung bị báo cáo
        vẫn nằm trong database để tra cứu khi có tranh chấp — xóa cứng là tự tay
        vứt bằng chứng của chính mình.
      </p>

      {/* ===== Hàng đợi báo cáo ===== */}
      <h2 className="mt-10 font-display text-xl font-bold text-navy-deep">
        Báo cáo chờ xử lý{" "}
        <span className={reports.length > 0 ? "text-danger" : "text-muted"}>
          ({reports.length})
        </span>
      </h2>

      {reports.length === 0 ? (
        <p className="mt-4 border border-line bg-paper px-5 py-4 font-ui text-sm text-muted">
          Không có báo cáo nào đang chờ.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {reports.map((report) => {
            const post = postById.get(report.targetId);
            const comment = commentById.get(report.targetId);
            const author = post?.author ?? comment?.author;
            const channelKey = post?.channel.key ?? comment?.post.channel.key;
            const hidden = (post ?? comment)?.status !== "VISIBLE";
            const excerpt = post ? `${post.title} — ${post.body}` : comment?.body;

            return (
              <article key={report.id} className="border border-danger bg-paper p-5">
                <p className="font-ui text-xs text-muted">
                  {report.reporter.name} báo cáo lúc {fmt(report.createdAt)} ·{" "}
                  {report.targetType === "POST" ? "Bài viết" : "Bình luận"}
                </p>
                <p className="mt-2 font-ui text-sm font-semibold text-danger">
                  Lý do: {report.reason}
                </p>

                <div className="mt-3 max-h-40 overflow-y-auto whitespace-pre-wrap break-words border-l-4 border-line bg-cream px-4 py-3 text-[0.9rem] leading-relaxed text-ink">
                  {excerpt ?? "(Nội dung không còn tồn tại)"}
                </div>

                <p className="mt-2 font-ui text-xs text-muted">
                  Tác giả: {author?.name ?? "—"}
                  {hidden && (
                    <span className="ml-2 font-semibold text-danger">Đang bị ẩn</span>
                  )}
                  {channelKey && post && (
                    <>
                      {" · "}
                      <Link
                        href={`/nghi-su-duong/${channelKey}/${post.id}`}
                        className="font-semibold text-navy underline underline-offset-4"
                      >
                        Mở bài
                      </Link>
                    </>
                  )}
                  {channelKey && comment && (
                    <>
                      {" · "}
                      <Link
                        href={`/nghi-su-duong/${channelKey}/${comment.postId}`}
                        className="font-semibold text-navy underline underline-offset-4"
                      >
                        Mở bài chứa bình luận
                      </Link>
                    </>
                  )}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {post && (
                    <form action={togglePostVisibilityAction.bind(null, post.id)}>
                      <button type="submit" className={ICON_BTN}>
                        {hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        {hidden ? "Hiện lại bài" : "Ẩn bài"}
                      </button>
                    </form>
                  )}
                  {comment && (
                    <form action={toggleCommentVisibilityAction.bind(null, comment.id)}>
                      <button type="submit" className={ICON_BTN}>
                        {hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        {hidden ? "Hiện lại bình luận" : "Ẩn bình luận"}
                      </button>
                    </form>
                  )}
                  {author && (
                    <form action={toggleForumBanAction.bind(null, author.id)}>
                      <button type="submit" className={ICON_BTN}>
                        <UserX className="h-3.5 w-3.5" />
                        Cấm đăng tác giả
                      </button>
                    </form>
                  )}

                  <form action={resolveReportAction} className="flex items-center gap-2">
                    <input type="hidden" name="reportId" value={report.id} />
                    <input
                      name="adminNote"
                      placeholder="Ghi chú xử lý"
                      className="border border-line-strong bg-paper px-2.5 py-1.5 font-ui text-xs text-ink"
                    />
                    <button type="submit" name="status" value="RESOLVED" className={ICON_BTN}>
                      Đã xử lý
                    </button>
                    <button type="submit" name="status" value="DISMISSED" className={ICON_BTN}>
                      Bỏ qua
                    </button>
                  </form>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ===== Chín phòng ===== */}
      <h2 className="mt-12 font-display text-xl font-bold text-navy-deep">
        Chín phòng
      </h2>
      <div className="mt-4 overflow-x-auto border border-line">
        <table className="w-full min-w-[40rem] border-collapse font-ui text-sm">
          <thead>
            <tr className="bg-cream-deep text-ink">
              <th className="px-4 py-3 text-left font-semibold">Bậc</th>
              <th className="px-4 py-3 text-left font-semibold">Phòng</th>
              <th className="px-4 py-3 text-center font-semibold">Chủ đề</th>
              <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {channels.map((channel) => (
              <tr key={channel.id} className="bg-paper">
                <td className="px-4 py-3 tabular-nums text-ink-soft">{channel.level}</td>
                <td className="px-4 py-3 font-semibold text-ink">
                  {channel.name}
                  {channel.locked && (
                    <span className="ml-2 border border-danger bg-danger-pale px-2 py-0.5 text-xs font-semibold text-danger">
                      Đã khóa
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-center tabular-nums text-ink-soft">
                  {channel._count.posts}
                </td>
                <td className="px-4 py-3 text-right">
                  <form action={toggleChannelLockAction.bind(null, channel.id)}>
                    <button type="submit" className={ICON_BTN}>
                      {channel.locked ? <LockOpen className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                      {channel.locked ? "Mở phòng" : "Khóa phòng"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ===== Bài mới nhất ===== */}
      <h2 className="mt-12 font-display text-xl font-bold text-navy-deep">
        25 bài mới nhất
      </h2>
      {recentPosts.length === 0 ? (
        <p className="mt-4 border border-line bg-paper px-5 py-4 font-ui text-sm text-muted">
          Chưa có bài nào.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-line border border-line bg-paper">
          {recentPosts.map((post) => (
            <li key={post.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <Link
                  href={`/nghi-su-duong/${post.channel.key}/${post.id}`}
                  className="font-ui text-sm font-semibold text-navy hover:text-gold"
                >
                  {post.title}
                </Link>
                <p className="mt-0.5 font-ui text-xs text-muted">
                  {post.author.name} · {post.channel.name} · {fmt(post.createdAt)}
                  {post.status !== "VISIBLE" && (
                    <span className="ml-2 font-semibold text-danger">Đang bị ẩn</span>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <form action={togglePostPinAction.bind(null, post.id)}>
                  <button type="submit" className={ICON_BTN}>
                    <Pin className="h-3.5 w-3.5" />
                    {post.pinnedAt ? "Bỏ ghim" : "Ghim"}
                  </button>
                </form>
                <form action={togglePostLockAction.bind(null, post.id)}>
                  <button type="submit" className={ICON_BTN}>
                    {post.lockedAt ? <LockOpen className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                    {post.lockedAt ? "Mở lại" : "Đóng"}
                  </button>
                </form>
                <form action={togglePostVisibilityAction.bind(null, post.id)}>
                  <button type="submit" className={ICON_BTN}>
                    {post.status === "VISIBLE" ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {post.status === "VISIBLE" ? "Ẩn" : "Hiện"}
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* ===== Đang bị cấm đăng ===== */}
      <h2 className="mt-12 font-display text-xl font-bold text-navy-deep">
        Đang bị cấm đăng ({bannedUsers.length})
      </h2>
      <p className="mt-2 font-ui text-sm text-ink-soft">
        Cấm đăng <strong>không</strong> cấm đọc — khóa học và lịch sử của họ vẫn
        còn nguyên.
      </p>
      {bannedUsers.length === 0 ? (
        <p className="mt-4 border border-line bg-paper px-5 py-4 font-ui text-sm text-muted">
          Không có ai đang bị cấm.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-line border border-line bg-paper">
          {bannedUsers.map((user) => (
            <li key={user.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <span className="font-ui text-sm text-ink">
                {user.name}{" "}
                <span className="text-muted">
                  {user.email} · từ {user.forumBannedAt ? fmt(user.forumBannedAt) : "—"}
                </span>
              </span>
              <form action={toggleForumBanAction.bind(null, user.id)}>
                <button type="submit" className={ICON_BTN}>
                  Bỏ cấm
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
