"use client";

import { Fragment, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { routeExperience } from "@/lib/motion/route-policy";

type WorldShellProps = {
  header: ReactNode;
  children: ReactNode;
  footer: ReactNode;
};

export function WorldShell({ header, children, footer }: WorldShellProps) {
  const pathname = usePathname();
  const experience = routeExperience(pathname);
  if (!experience.renderWorldShell) {
    return <Fragment>{header}{children}{footer}</Fragment>;
  }
  return (
    <div
      className="world-shell"
      data-world-shell="true"
      data-route-area={experience.area}
      data-motion-tier={experience.motionTier}
    >
      {header}
      <div key={pathname} className="world-route-scene">{children}</div>
      {footer}
    </div>
  );
}
