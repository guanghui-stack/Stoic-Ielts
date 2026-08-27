import type { ReactNode } from "react";

export function QuietWorldPanel({
  eyebrow,
  title,
  lede,
  children,
  variant = "default",
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  children: ReactNode;
  variant?: "default" | "auth";
}) {
  const isAuth = variant === "auth";

  return (
    <section
      className={
        isAuth
          ? "world-quiet-frame ink-wash-fallback flex min-h-[calc(100svh-5rem)] items-center justify-center px-4 py-10 md:px-6 md:py-16"
          : "world-quiet-frame ink-wash-fallback px-6 py-14 md:py-20"
      }
    >
      <div
        className={
          isAuth
            ? "w-full max-w-md rounded-3xl border border-line bg-gradient-to-b from-paper via-cream/45 to-paper p-6 shadow-lift md:p-8"
            : "mx-auto max-w-lg border border-line bg-paper p-7 shadow-lift md:p-10"
        }
      >
        {!isAuth ? (
          <>
            <p className="label-caps">{eyebrow}</p>
            <h1 className="mt-3 font-display text-3xl font-bold text-navy-deep">{title}</h1>
            {lede ? <p className="mt-4 text-[0.96rem] leading-relaxed text-ink-soft">{lede}</p> : null}
            <div className="mt-8">{children}</div>
          </>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
