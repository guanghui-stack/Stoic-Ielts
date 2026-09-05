"use client";

import { Fragment, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { routeExperience } from "@/lib/motion/route-policy";

type WorldShellProps = {
  header: ReactNode;
  children: ReactNode;
  footer: ReactNode;
  quickAccess?: ReactNode;
};

export function WorldShell({ header, children, footer, quickAccess }: WorldShellProps) {
  const pathname = usePathname();
  const experience = routeExperience(pathname);
  if (!experience.renderWorldShell) {
    return <Fragment>{header}{children}{footer}{quickAccess}</Fragment>;
  }
  return (
    <div
      className="world-shell flex min-h-screen flex-col"
      data-world-shell="true"
      data-route-area={experience.area}
      data-motion-tier={experience.motionTier}
    >
      {header}
      <div key={pathname} className="world-route-scene">{children}</div>
      {footer}
      {quickAccess}
    </div>
  );
}
