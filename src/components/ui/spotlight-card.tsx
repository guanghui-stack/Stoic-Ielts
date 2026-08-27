"use client";

import type { CSSProperties, PointerEvent } from "react";
import { Brain, BookOpen, Repeat } from "lucide-react";
import { useRef } from "react";

type SpotlightTone = "lavender" | "sage" | "gold";
type SpotlightIcon = "brain" | "book-open" | "repeat";

const ICONS = {
  brain: Brain,
  "book-open": BookOpen,
  repeat: Repeat,
} as const;

type StoicSpotlightCardProps = {
  index: string;
  title: string;
  functional: string;
  body: string;
  tone: SpotlightTone;
  icon: SpotlightIcon;
};

const TONE_COLORS: Record<SpotlightTone, string> = {
  lavender: "var(--color-stoic-lavender)",
  sage: "var(--color-stoic-sage)",
  gold: "var(--color-stoic-warning)",
};

export function StoicSpotlightCard({
  index,
  title,
  functional,
  body,
  tone,
  icon,
}: StoicSpotlightCardProps) {
  const Icon = ICONS[icon];
  const cardRef = useRef<HTMLElement>(null);

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    card.style.setProperty("--spotlight-x", `${event.clientX - rect.left}px`);
    card.style.setProperty("--spotlight-y", `${event.clientY - rect.top}px`);
    card.style.setProperty("--spotlight-opacity", "1");
  }

  function handlePointerLeave() {
    cardRef.current?.style.setProperty("--spotlight-opacity", "0");
  }

  const style = {
    "--spotlight-color": TONE_COLORS[tone],
  } as CSSProperties;

  return (
    <article
      ref={cardRef}
      className="stoic-spotlight-card group"
      style={style}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      tabIndex={0}
      aria-labelledby={`stoic-pillar-${index}-title`}
    >
      <div className="stoic-spotlight-card__wash" aria-hidden="true" />
      <div className="stoic-spotlight-card__content">
        <div className="flex items-center justify-between gap-4">
          <span className="stoic-spotlight-card__index" aria-hidden="true">{index}</span>
          <Icon className="h-7 w-7 text-navy-deep transition-transform duration-300 group-hover:-rotate-6 group-focus:-rotate-6" aria-hidden />
        </div>
        <div className="mt-14">
          <h3 id={`stoic-pillar-${index}-title`} className="font-display text-2xl font-semibold leading-tight text-navy-deep md:text-[1.7rem]">
            {title}
          </h3>
          <p className="mt-2 font-ui text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-stoic-primary-deep">
            {functional}
          </p>
          <p className="mt-5 max-w-sm text-[0.94rem] leading-relaxed text-ink-soft">
            {body}
          </p>
        </div>
      </div>
    </article>
  );
}
