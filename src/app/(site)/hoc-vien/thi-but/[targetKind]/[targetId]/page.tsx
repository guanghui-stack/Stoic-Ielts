import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";
import { requireUser } from "@/lib/session";
import { SectionHeading } from "@/components/ui";
import { ThiButStart } from "@/components/thibut/thi-but-start";
import { ThiButExam } from "@/components/thibut/thi-but-exam";
import {
  currentAttempt,
  lastResult,
  thiButGate,
} from "@/lib/thibut/thibut-service.ts";
import {
  PASS_THRESHOLD,
  THI_BUT_TARGETS,
  type ThiButTarget,
} from "@/lib/thibut/thibut.ts";

export const metadata = { title: "Thí Bút" };

/**
 * Một trang, ba bước, tự biết mình đang ở bước nào.
 *
 * Trạng thái nằm ở database chứ không ở máy khách, nên đóng tab giữa chừng rồi
 * mở lại vẫn đúng lượt đó, và quân công đã trừ không biến mất vào hư không.
 */
export default async function ThiButPage({
  params,
}: {
  params: Promise<{ targetKind: string; targetId: string }>;
}) {
  const { targetKind, targetId } = await params;
  if (!(THI_BUT_TARGETS as readonly string[]).includes(targetKind)) notFound();

  const user = await requireUser();
  const kind = targetKind as ThiButTarget;

  const live = await currentAttempt({ userId: user.id, targetKind: kind, targetId });

  // Bước 2: đang có lượt chưa nộp.
  if (live) {
    return (
      <div className="motion-page-entry mx-auto w-full max-w-3xl px-6 py-12">
        <SectionHeading label="Thí Bút" title="Bốn câu, ba phút" />
        <div className="mt-8">
          <ThiButExam
            attemptId={live.attemptId}
            items={live.items}
            deadlineIso={live.deadlineAt.toISOString()}
            threshold={PASS_THRESHOLD}
          />
        </div>
      </div>
    );
  }

  const [gate, previous] = await Promise.all([
    thiButGate({ userId: user.id, targetKind: kind, targetId }),
    lastResult({ userId: user.id, targetKind: kind, targetId }),
  ]);

  // Bước 3: đã qua rồi.
  if (previous?.passed) {
    return (
      <div className="motion-page-entry mx-auto w-full max-w-3xl px-6 py-12">
        <SectionHeading label="Thí Bút" title="Đã đoạt được" />
        <div className="mt-8 border border-jade bg-jade-pale p-8">
          <p className="flex items-center gap-2.5 font-display text-xl font-bold text-jade-ink">
            <Check className="h-5 w-5" aria-hidden="true" />
            Bạn đã qua khảo hạch và mở được thứ này bằng quân công.
          </p>
          <p className="mt-3 text-[0.98rem] leading-relaxed text-ink-soft">
            Không ai tặng bạn cái này. Bạn đoạt được nó.
          </p>
          <Link
            href={kind === "EXERCISE" ? `/luyen-tap/reading` : "/hoc-vien"}
            className="mt-6 inline-flex items-center gap-2 border border-navy px-6 py-2.5 font-ui text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-navy transition-colors hover:bg-navy hover:text-paper"
          >
            Vào làm ngay
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="motion-page-entry mx-auto w-full max-w-3xl px-6 py-12">
      <SectionHeading label="Thí Bút" title="Đoạt lấy bằng thực lực" />

      {/* Bước 1b: vừa trượt, hiện lời giải để lần này thành buổi học. */}
      {previous && !previous.passed ? (
        <div className="mt-8 border border-line bg-paper p-7">
          <p className="flex items-center gap-2.5 font-display text-xl font-bold text-ink">
            <X className="h-5 w-5 text-ash-ink" aria-hidden="true" />
            Lượt trước đúng {previous.correctCount} trên {previous.items.length},
            cần {PASS_THRESHOLD}
          </p>
          <p className="mt-3 text-[0.96rem] leading-relaxed text-ink-soft">
            Xem lại từng câu dưới đây trước khi vào lại. Đây mới là phần đáng
            giá của lượt vừa rồi.
          </p>

          <ol className="mt-6 flex flex-col gap-4">
            {previous.items.map((graded, index) => (
              <li
                key={graded.itemId}
                className="border-l-4 border-line-strong bg-cream-deep px-5 py-4"
              >
                <p className="font-ui text-[0.78rem] font-semibold text-ink">
                  Câu {index + 1}:{" "}
                  {graded.correct ? (
                    <span className="text-jade-ink">bạn làm đúng</span>
                  ) : (
                    <span className="text-fire-ink">bạn làm sai</span>
                  )}
                </p>
                <p className="mt-2 text-[0.94rem] leading-relaxed text-ink-soft">
                  {graded.explanation}
                </p>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <div className="mt-8">
        <ThiButStart
          targetKind={targetKind}
          targetId={targetId}
          cost={gate.cost}
          balance={gate.balance}
          canAfford={gate.canAfford}
          canRetry={gate.canRetry}
          secondsLeft={gate.secondsLeft}
          previousAttempts={gate.previousAttempts}
          poolReady={gate.poolReady}
        />
      </div>
    </div>
  );
}
