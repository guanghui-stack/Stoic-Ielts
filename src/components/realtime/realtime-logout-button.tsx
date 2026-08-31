"use client";

import type { ReactNode } from "react";
import { announceRealtimeLogout } from "@/components/realtime/student-realtime-provider";

export function RealtimeLogoutButton({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      onClick={announceRealtimeLogout}
      className={className}
    >
      {children}
    </button>
  );
}
