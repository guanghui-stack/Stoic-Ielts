import type { ReactNode } from "react";

const WIDTH = {
  medium: "max-w-4xl",
  wide: "max-w-6xl",
} as const;

export function AdminPageShell({
  eyebrow,
  title,
  lede,
  actions,
  width = "wide",
  children,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  actions?: ReactNode;
  width?: keyof typeof WIDTH;
  children: ReactNode;
}) {
  return (
    <main className={`command-tent-page mx-auto w-full px-6 py-10 ${WIDTH[width]}`}>
      <header className="command-tent-heading">
        <div className="min-w-0">
          <p className="label-caps">{eyebrow}</p>
          <h1>{title}</h1>
          {lede ? <p className="command-tent-lede">{lede}</p> : null}
        </div>
        {actions ? <div className="command-tent-actions">{actions}</div> : null}
      </header>
      {children}
    </main>
  );
}
