import type { ReactNode } from "react";

const TONE = {
  paper: "bg-paper text-ink",
  mist: "ink-wash-fallback text-ink",
  ink: "bg-navy-deep text-paper",
} as const;

export function NarrativeSection({
  id,
  eyebrow,
  title,
  tone = "paper",
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  tone?: keyof typeof TONE;
  children: ReactNode;
}) {
  return (
    <section id={id} className={`world-narrative-section ${TONE[tone]}`}>
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <p className="label-caps">{eyebrow}</p>
        <h2 className="mt-3 max-w-3xl font-display text-3xl font-bold leading-tight md:text-5xl">
          {title}
        </h2>
        <div className="rule-gold mt-6" />
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}
