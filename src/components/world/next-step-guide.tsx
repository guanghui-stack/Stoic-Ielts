import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { NextStepModel } from "@/lib/campaign/world";

export function NextStepGuide({ step }: { step: NextStepModel }) {
  const titleId = `world-next-step-${step.href.replace(/[^a-z0-9]+/gi, "-")}`;

  return (
    <aside className="world-next-step" aria-labelledby={titleId}>
      <p className="label-caps">{step.eyebrow}</p>
      <h2
        id={titleId}
        className="mt-3 font-display text-2xl font-bold text-navy-deep"
      >
        {step.title}
      </h2>
      <p className="mt-3 text-[0.96rem] leading-relaxed text-ink-soft">{step.body}</p>
      <Link
        href={step.href}
        className="world-action mt-6 inline-flex min-h-11 items-center gap-2 border border-navy bg-navy px-6 py-3 font-ui text-sm font-semibold text-paper"
      >
        {step.actionLabel}
        <ArrowRight className="size-4" aria-hidden />
      </Link>
      <p className="mt-3 font-ui text-xs text-muted">
        {step.entersStudy
          ? "Bước này đưa bạn vào khu học tập tĩnh."
          : "Bước này tiếp tục trong bản đồ hành trình."}
      </p>
    </aside>
  );
}
