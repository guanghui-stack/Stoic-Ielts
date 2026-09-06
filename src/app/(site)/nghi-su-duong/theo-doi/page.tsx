import Link from "next/link";
import { ArrowLeft, BellRing, MessageSquare, Reply } from "lucide-react";
import { requireUser } from "@/lib/session";
import { viewerOf } from "@/lib/forum/service";
import { ForumRealtimeBridge } from "@/components/forum/use-realtime-forum";
import {
  countUnreadForumNotifications,
  listFollowedForumThreads,
  listForumNotifications,
} from "@/lib/forum/engagement";
import {
  FollowThreadButton,
  MarkNotificationReadButton,
  UnderstoodBadge,
} from "@/components/forum/thread-engagement";
import styles from "@/components/forum/forum-discussions.module.css";

export const metadata = { title: "Theo dõi thảo luận" };
export const dynamic = "force-dynamic";

function fmt(date: Date) {
  return date.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

export default async function FollowedDiscussionsPage() {
  const user = await requireUser();
  const viewer = await viewerOf(user);
  const [notifications, followedThreads, unreadCount] = await Promise.all([
    listForumNotifications(viewer),
    listFollowedForumThreads(viewer),
    countUnreadForumNotifications(viewer),
  ]);

  return (
    <section className={`${styles.inboxPage} font-ui`}>
      <ForumRealtimeBridge levels={[]} />
      <Link href="/nghi-su-duong" className={styles.textLink}>
        <ArrowLeft size={16} aria-hidden="true" /> Trở lại diễn đàn
      </Link>
      <header className={styles.inboxHeader}>
        <p className={styles.eyebrow}>Diễn đàn học tập</p>
        <div className={styles.headerRow}>
          <h1>Theo dõi thảo luận</h1>
          {unreadCount > 0 && (
            <span className={styles.understoodBadge}>
              <BellRing size={15} aria-hidden="true" /> {unreadCount} chưa đọc
            </span>
          )}
        </div>
        <p>
          Trở lại những câu hỏi bạn đang trao đổi. Chủ đề bạn mở được theo dõi tự động;
          bạn cũng nhận lời trả lời trực tiếp vào bình luận của mình. Bỏ theo dõi để tắt thông báo trong chủ đề đó.
        </p>
      </header>

      <section className={styles.inboxSection} aria-labelledby="forum-notifications-heading">
        <div className={styles.sectionHeading}>
          <h2 id="forum-notifications-heading">Phản hồi dành cho bạn</h2>
          {notifications.length === 50 && <span>50 thông báo gần nhất</span>}
        </div>
        {notifications.length === 0 ? (
          <div className={styles.emptyState}>
            <strong>Chưa có thông báo trả lời.</strong>
            Theo dõi một chủ đề để nhận thông báo khi có phản hồi mới.
          </div>
        ) : (
          <ul className={styles.inboxList}>
            {notifications.map((notification) => {
              const unread = notification.readAt === null;
              const href = `/nghi-su-duong/${notification.channelKey}/${notification.postId}#phan-hoi-${notification.commentId}`;
              const Icon = notification.kind === "DIRECT_REPLY" ? Reply : MessageSquare;
              return (
                <li key={notification.id} className={`${styles.inboxItem} ${unread ? styles.unreadItem : ""}`}>
                  <Icon size={18} className={styles.notificationIcon} aria-hidden="true" />
                  <div className={styles.itemContent}>
                    <div className={styles.itemMeta}>
                      <span>{notification.kind === "DIRECT_REPLY" ? "Có người trả lời bạn" : "Chủ đề có phản hồi mới"}</span>
                      <span>{fmt(notification.updatedAt)}</span>
                      <span>{unread ? "Chưa đọc" : "Đã đọc"}</span>
                    </div>
                    <Link href={href} className={styles.notificationTitle}>{notification.postTitle}</Link>
                    <div className={styles.itemActions}>
                      <Link href={href} className={styles.textLink}>Xem phản hồi</Link>
                      {unread && <MarkNotificationReadButton notificationId={notification.id} commentId={notification.commentId} />}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className={styles.inboxSection} aria-labelledby="forum-following-heading">
        <div className={styles.sectionHeading}>
          <h2 id="forum-following-heading">Chủ đề đang theo dõi</h2>
          <span>{followedThreads.length === 50 ? "50 chủ đề hoạt động gần nhất" : `${followedThreads.length} chủ đề`}</span>
        </div>
        {followedThreads.length === 0 ? (
          <div className={styles.emptyState}>
            <strong>Bạn chưa theo dõi chủ đề nào.</strong>
            Mở một cuộc trao đổi rồi chọn “Theo dõi chủ đề” để dễ quay lại.
            <div><Link href="/nghi-su-duong" className={styles.textLink}>Xem các cuộc thảo luận</Link></div>
          </div>
        ) : (
          <ul className={styles.inboxList}>
            {followedThreads.map((thread) => (
              <li key={thread.id} className={styles.inboxItem}>
                <div className={styles.itemContent}>
                  <div className={styles.itemMeta}>
                    <span>Bậc {thread.level}</span>
                    <span>{thread.commentCount} phản hồi</span>
                    <span>Cập nhật {fmt(thread.lastActivityAt)}</span>
                    {thread.helpfulCommentId && <UnderstoodBadge />}
                  </div>
                  <Link href={`/nghi-su-duong/${thread.channelKey}/${thread.id}`} className={styles.threadTitle}>
                    {thread.title}
                  </Link>
                  <div className={styles.itemActions}>
                    <FollowThreadButton postId={thread.id} following />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
