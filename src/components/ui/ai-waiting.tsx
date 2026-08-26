import { BrainCircuit, Check, Circle } from "lucide-react";

export function AiWaiting({
  title = "Đang chuẩn bị phản hồi",
  description = "Hệ thống đang đọc câu trả lời và đối chiếu bằng chứng.",
  steps = ["Đọc câu trả lời", "Đối chiếu bằng chứng", "Chuẩn bị phản hồi"],
  activeStep = 0,
  mode = "panel",
}: {
  title?: string;
  description?: string;
  steps?: readonly string[];
  activeStep?: number;
  mode?: "panel" | "overlay";
}) {
  const content = (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="relative overflow-hidden rounded-stoic-lg border border-white/10 bg-stoic-slate-950 px-6 py-8 text-white shadow-stoic-3 md:px-8"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(184,168,248,.22),transparent_34%),radial-gradient(circle_at_88%_5%,rgba(216,91,120,.15),transparent_28%)]" />
      <div className="relative flex flex-col gap-7 sm:flex-row sm:items-center">
        <ControlOrbit />
        <div className="min-w-0 flex-1">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-stoic-lavender">
            STOIC · IELTS AI
          </p>
          <h2 className="mt-2 text-2xl font-light tracking-[-0.02em]">{title}</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">{description}</p>

          <ol className="mt-6 grid gap-3 sm:grid-cols-3">
            {steps.map((step, index) => {
              const completed = index < activeStep;
              const active = index === activeStep;
              return (
                <li
                  key={step}
                  className={`flex items-center gap-2.5 text-xs ${
                    active ? "text-white" : completed ? "text-stoic-lavender" : "text-white/45"
                  }`}
                >
                  <span
                    className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                      active
                        ? "border-stoic-lavender bg-stoic-primary/40"
                        : completed
                          ? "border-stoic-lavender/50 bg-stoic-lavender/10"
                          : "border-white/20"
                    }`}
                  >
                    {completed ? (
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <Circle className={`h-2.5 w-2.5 ${active ? "fill-current" : ""}`} aria-hidden="true" />
                    )}
                  </span>
                  <span>{step}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );

  if (mode === "overlay") {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-stoic-slate-950/70 p-4 backdrop-blur-sm">
        <div className="w-full max-w-3xl">{content}</div>
      </div>
    );
  }

  return content;
}

function ControlOrbit() {
  return (
    <div className="stoic-ai-orbit relative grid h-28 w-28 shrink-0 place-items-center self-center" aria-hidden="true">
      <span className="absolute inset-1 rounded-full border border-stoic-lavender/30" />
      <span className="stoic-ai-orbit__ring absolute inset-3 rounded-full border border-transparent border-t-stoic-lavender border-r-stoic-primary" />
      <span className="stoic-ai-orbit__ring stoic-ai-orbit__ring--reverse absolute inset-6 rounded-full border border-transparent border-b-stoic-ruby/80 border-l-white/40" />
      <span className="grid h-12 w-12 place-items-center rounded-full bg-white/10 shadow-[0_0_32px_rgba(184,168,248,.2)]">
        <BrainCircuit className="h-6 w-6 text-white" />
      </span>
    </div>
  );
}
