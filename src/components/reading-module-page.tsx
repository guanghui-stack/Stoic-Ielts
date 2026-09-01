import Link from "next/link";
import { ArrowRight, BookOpen, Check, Layers } from "lucide-react";
import { READING_NAV } from "@/lib/nav";
import { ExerciseList } from "@/components/exercise-list";

/** Khung chung cho hai kho Reading, dùng cùng design system Stoic hiện hành. */
export function ReadingModulePage({
  module,
}: {
  module: "ACADEMIC" | "GENERAL";
}) {
  const info = READING_NAV.find((item) => item.module === module)!;
  const other = READING_NAV.find((item) => item.module !== module)!;

  return (
    <div
      className="stoic-reading-surface"
      data-reading-module={module.toLowerCase()}
    >
      <section className="relative overflow-hidden border-b border-stoic-line bg-stoic-canvas">
        <div
          className="pointer-events-none absolute -right-24 -top-36 h-96 w-96 rounded-full bg-stoic-lavender/20 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-28 left-[8%] h-72 w-72 rounded-full bg-stoic-sherbet/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative mx-auto grid max-w-6xl gap-12 px-6 py-16 lg:grid-cols-[minmax(0,1fr)_25rem] lg:items-center lg:py-20">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.09em] text-stoic-primary-deep">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              Luyện tập · Reading {info.label}
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-[-0.045em] text-stoic-ink sm:text-5xl lg:text-[3.55rem]">
              Kho Reading {info.label}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-stoic-ink-secondary sm:text-[1.05rem]">
              {info.blurb}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href={other.href}
                className="inline-flex min-h-11 items-center gap-2 rounded-stoic-pill border border-stoic-primary px-5 py-2.5 text-sm font-semibold text-stoic-primary-deep transition-colors hover:bg-stoic-primary-soft/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stoic-primary/35"
              >
                Xem kho {other.label}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <span className="inline-flex min-h-11 items-center gap-2 px-1 text-sm font-medium text-stoic-ink-muted">
                <Check className="h-4 w-4 text-stoic-sage" aria-hidden="true" />
                Làm lại không giới hạn
              </span>
            </div>
          </div>

          <ReadingLevelVisual />
        </div>
      </section>

      <section className="px-6 py-12 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-5 rounded-stoic-lg border border-stoic-primary/25 bg-stoic-canvas p-6 shadow-stoic-1 md:flex-row md:items-center md:justify-between md:p-7">
            <div className="flex min-w-0 gap-4">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-stoic-md bg-stoic-primary-soft/70 text-stoic-primary-deep">
                <Layers className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-stoic-primary-deep">
                  Full Test · 60 phút
                </p>
                <h2 className="mt-1.5 text-xl font-semibold tracking-[-0.025em] text-stoic-ink">
                  Ghép ba passage thành một đề hoàn chỉnh
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stoic-ink-muted">
                  Hệ thống cân bằng độ khó để kết quả band sát với bài thi thật
                  hơn một passage đơn.
                </p>
              </div>
            </div>
            <Link
              href={`/luyen-tap/reading/ghep-de?dang=${module}`}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-stoic-pill border border-stoic-primary bg-stoic-primary px-5 py-2.5 text-sm font-semibold text-white shadow-stoic-1 transition-colors hover:border-stoic-primary-deep hover:bg-stoic-primary-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stoic-primary/35"
            >
              Ghép đề
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="mb-6 mt-12 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-stoic-primary-deep">
                Kho passage
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-stoic-ink sm:text-3xl">
                Chọn bài theo mục tiêu luyện tập
              </h2>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-stoic-ink-muted sm:text-right">
              Nhấn tên passage để xem độ khó và dạng câu hỏi. Dấu tick dùng để
              xác nhận cách mở bài.
            </p>
          </div>

          <ExerciseList readingType={module} />

          <aside className="mt-8 flex gap-3 rounded-stoic-md border border-stoic-line bg-stoic-canvas px-5 py-4 text-sm leading-relaxed text-stoic-ink-muted shadow-stoic-1">
            <BookOpen
              className="mt-0.5 h-4 w-4 shrink-0 text-stoic-primary"
              aria-hidden="true"
            />
            <p>
              <strong className="font-semibold text-stoic-ink">Mẹo luyện tập:</strong>{" "}
              đọc câu hỏi trước để biết mình cần tìm gì; sau khi nộp, dành thời
              gian chữa bài thay vì chỉ nhìn điểm.
            </p>
          </aside>
        </div>
      </section>
    </div>
  );
}

/** Minh họa ba tầng passage, không dùng số thứ tự nội bộ của database. */
function ReadingLevelVisual() {
  const levels = [
    { passage: "Passage 1", level: "Dễ", width: "w-[78%]" },
    { passage: "Passage 2", level: "Vừa", width: "w-[88%]" },
    { passage: "Passage 3", level: "Khó", width: "w-full" },
  ];

  return (
    <div
      className="relative overflow-hidden rounded-stoic-lg border border-stoic-primary/20 bg-stoic-canvas-soft p-5 shadow-stoic-2 sm:p-6"
      aria-hidden="true"
    >
      <div className="absolute right-0 top-0 h-32 w-32 rounded-bl-full bg-stoic-primary-soft/70" />
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.09em] text-stoic-primary-deep">
            Cấu trúc IELTS
          </p>
          <p className="mt-1 text-sm font-semibold text-stoic-ink">
            Độ khó tăng dần
          </p>
        </div>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-stoic-pill bg-stoic-primary text-white shadow-stoic-1">
          <BookOpen className="h-4 w-4" />
        </span>
      </div>

      <div className="relative mt-6 space-y-3">
        {levels.map((item, index) => (
          <div
            key={item.passage}
            className={`${item.width} ml-auto rounded-stoic-md border border-stoic-line bg-stoic-canvas px-4 py-3 shadow-stoic-1`}
          >
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-stoic-ink">
                {item.passage}
              </span>
              <span
                className={`rounded-stoic-pill px-2.5 py-1 text-[0.68rem] font-semibold ${
                  index === 0
                    ? "bg-jade-pale text-jade-ink"
                    : index === 1
                      ? "bg-stoic-primary-soft/65 text-stoic-primary-deep"
                      : "bg-danger-pale text-stoic-ruby"
                }`}
              >
                {item.level}
              </span>
            </div>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-stoic-pill bg-stoic-line">
              <div
                className={`h-full rounded-stoic-pill ${
                  index === 0
                    ? "w-2/5 bg-stoic-sage"
                    : index === 1
                      ? "w-2/3 bg-stoic-primary"
                      : "w-full bg-stoic-ruby"
                }`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
