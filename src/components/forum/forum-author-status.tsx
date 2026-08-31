"use client";

import { useOnlineStudents } from "@/components/realtime/student-realtime-provider";

export function ForumAuthorStatus({
  userId,
  name,
  className,
}: {
  userId: string;
  name: string;
  className?: string;
}) {
  const presence = useOnlineStudents(true);
  const online = presence.onlineUserIds.has(userId);

  return (
    <span className={`inline-flex items-center gap-1.5 ${className ?? ""}`}>
      {presence.ready && (
        <span
          className={`inline-block size-2 shrink-0 rounded-full ${
            online ? "bg-success" : "bg-line-strong"
          }`}
          aria-label={online ? "Đang trực tuyến" : "Đang ngoại tuyến"}
          title={online ? "Đang trực tuyến" : "Đang ngoại tuyến"}
        />
      )}
      <span>{name}</span>
    </span>
  );
}
