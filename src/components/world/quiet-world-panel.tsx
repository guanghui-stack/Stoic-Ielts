import type { ReactNode } from "react";

export function QuietWorldPanel({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  children: ReactNode;
}) {
  return (
    <section className="world-quiet-frame ink-wash-fallback px-6 py-14 md:py-20">
      <div className="mx-auto max-w-lg border border-line bg-paper p-7 shadow-lift md:p-10">
        <p className="label-caps">{eyebrow}</p>
        <h1 className="mt-3 font-display text-3xl font-bold text-navy-deep">{title}</h1>
        {lede ? <p className="mt-4 text-[0.96rem] leading-relaxed text-ink-soft">{lede}</p> : null}
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}
