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
}: {
  src?: string | null;
  name: string;
  email: string;
}) {
  const [failed, setFailed] = useState(!src);
  const label = `Ảnh đại diện của ${name || email}`;

  return (
    <div
      className="student-avatar"
      role="img"
      aria-label={label}
      data-avatar-source={src && !failed ? "google" : "fallback"}
    >
      {src && !failed ? (
        <img
          src={src}
          alt=""
          className="student-avatar__image"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="student-avatar__fallback" aria-hidden="true">
          {name || email ? initials(name, email) : <UserRound className="size-6" />}
        </span>
      )}
    </div>
  );
}
