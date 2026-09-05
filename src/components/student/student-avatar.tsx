"use client";

import { UserRound } from "lucide-react";
import { useState } from "react";

function initials(name: string, email: string): string {
  const source = name.trim() || email.split("@")[0] || "Học viên";
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length > 1) return `${words[0][0]}${words.at(-1)?.[0] ?? ""}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function StudentAvatar({
  src,
  name,
  email,
  size = "md",
  online = false,
  showStatus = false,
  className = "",
}: {
  src?: string | null;
  name: string;
  email: string;
  size?: "sm" | "md" | "lg" | "xl";
  online?: boolean;
  showStatus?: boolean;
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = !src || failedSrc === src;
  const statusLabel = showStatus
    ? online
      ? ", đang trực tuyến"
      : ", đang ngoại tuyến"
    : "";
  const label = `Ảnh đại diện của ${name || email}${statusLabel}`;

  return (
    <span
      className={`student-avatar ${className}`}
      role="img"
      aria-label={label}
      data-avatar-source={src && !failed ? "image" : "fallback"}
      data-size={size}
      data-show-status={showStatus ? "true" : "false"}
      data-online={online ? "true" : "false"}
    >
      {src && !failed ? (
        // Next/Image khong phu hop voi data URL WebP dong va anh Google co
        // kich thuoc nho; giu img de co fallback onError tai cho.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="student-avatar__image"
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <span className="student-avatar__fallback" aria-hidden="true">
          {name || email ? initials(name, email) : <UserRound className="size-6" />}
        </span>
      )}
    </span>
  );
}
