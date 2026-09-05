"use client";

import { BookA, Mail, MessagesSquare, Swords, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ExpandableTabs } from "@/components/ui/expandable-tabs";
import { DictionaryPanel } from "@/components/dictionary/dictionary-panel";
import { useUnreadMessages } from "@/components/chat/use-unread-messages";
import { activeStudentShortcut, showStudentQuickAccess, STUDENT_SHORTCUTS } from "@/lib/student/quick-access";
import { routeExperience } from "@/lib/motion/route-policy";
import styles from "./student-quick-access.module.css";

const ICONS = { messages: Mail, profile: UserRound, forum: MessagesSquare, arena: Swords };

export function StudentQuickAccess({ userId }: { userId: string }) {
  const pathname = usePathname();
  const visible = showStudentQuickAccess(pathname);
  const unread = useUnreadMessages(userId, visible);
  if (!visible) return null;

  return (
    <StudentQuickAccessView pathname={pathname} hasUnread={unread} />
  );
}

/** Tách phần hiển thị để xem thử được mọi trạng thái mà không cần tài khoản thật. */
export function StudentQuickAccessView({ pathname, hasUnread }: { pathname: string; hasUnread: boolean }) {
  const [dictionaryOpen, setDictionaryOpen] = useState(false);
  if (!showStudentQuickAccess(pathname)) return null;

  return (
    <>
      <div className={styles.clearance} aria-hidden="true" />
      <aside
        className={styles.dock}
        data-student-quick-access="true"
        data-dictionary-open={dictionaryOpen ? "true" : undefined}
      >
        <p className={styles.caption}>Kết nối & cùng tiến bộ</p>
        {dictionaryOpen && <DictionaryPanel onClose={() => setDictionaryOpen(false)} />}
        <ExpandableTabs
          label="Lối tắt học viên"
          activeHref={activeStudentShortcut(pathname)}
          motion={routeExperience(pathname).motionTier > 0}
          tabs={[
            ...STUDENT_SHORTCUTS.map((item) => ({
              ...item,
              icon: ICONS[item.icon],
              notification: item.icon === "messages" && hasUnread ? "Có tin nhắn chưa đọc" : undefined,
            })),
            // Tra từ là mục HÀNH ĐỘNG, mở bảng ngay tại trang đang đọc. Nó không
            // có đường dẫn riêng nên cũng không nằm trong STUDENT_SHORTCUTS —
            // danh sách đó là các đích điều hướng, dùng để tô mục đang mở.
            {
              href: "#tra-tu",
              title: "Tra từ",
              icon: BookA,
              onSelect: () => setDictionaryOpen((open) => !open),
              expanded: dictionaryOpen,
            },
          ]}
        />
      </aside>
    </>
  );
}
