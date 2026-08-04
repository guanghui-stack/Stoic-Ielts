import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { requireUser } from "@/lib/session";
import { SectionHeading, NoteBox, ButtonLink } from "@/components/ui";
import { StudentNav } from "@/components/student/student-nav";
import { loadRankFacts } from "@/lib/ranks/facts";
import {
  MIN_SAMPLES,
  TREND_LABELS,
  WINDOW_DAYS,
  weaknessRows,
} from "@/lib/ranks/weakness";
import { QUESTION_TYPE_LABELS } from "@/lib/exercise-content";

export const metadata = { title: "Sổ Sơ Hở — Dạng câu yếu" };
export const dynamic = "force-dynamic";

const TREND_ICON = { UP: TrendingUp, FLAT: Minus, DOWN: TrendingDown } as const;
const TREND_TONE = {
  UP: "text-jade-ink",
  FLAT: "text-muted",
  DOWN: "text-danger",
} as const;

export default async function WeaknessPage() {
  const user = await requireUser();
  const now = new Date();
  const facts = await loadRankFacts(user.id, { now });
  const rows = weaknessRows(facts.attempts, now);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <StudentNav current="weakness" />


      <SectionHeading label="Sổ Sơ Hở" title="Dạng câu bạn hay sai" />

      <p className="mt-4 max-w-2xl text-[0.95rem] leading-relaxed text-ink-soft">
        Bảng này chỉ tính {WINDOW_DAYS} ngày gần nhất, và chỉ kết luận về một
        dạng câu khi bạn đã làm ít nhất {MIN_SAMPLES} câu của dạng đó. Sai vài
        câu không phải là điểm yếu, chỉ là chưa đủ dữ liệu để nói gì cả.
      </p>

      {rows.length === 0 ? (
        <NoteBox className="mt-8" title="Chưa đủ dữ liệu để kết luận">
          Bạn chưa làm đủ {MIN_SAMPLES} câu của bất kỳ dạng nào trong{" "}
          {WINDOW_DAYS} ngày qua. Cứ làm thêm vài đề nữa, bảng này sẽ tự hiện ra.
          <div className="mt-5">
            <ButtonLink href="/luyen-tap/reading" variant="primary">
              Vào Chiến Trận
            </ButtonLink>
          </div>
        </NoteBox>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full border-collapse border border-line bg-paper text-left">
            <caption className="sr-only">
              Độ chính xác theo dạng câu hỏi, yếu nhất xếp trước
            </caption>
            <thead>
              <tr className="border-b border-line bg-cream-deep">
                <th scope="col" className="px-4 py-3 font-ui text-xs uppercase tracking-wide text-muted">
                  Dạng câu
                </th>
                <th scope="col" className="px-4 py-3 text-right font-ui text-xs uppercase tracking-wide text-muted">
                  Đúng / Tổng
                </th>
                <th scope="col" className="px-4 py-3 text-right font-ui text-xs uppercase tracking-wide text-muted">
                  Độ chính xác
                </th>
                <th scope="col" className="px-4 py-3 text-right font-ui text-xs uppercase tracking-wide text-muted">
                  Xu hướng
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const Icon = TREND_ICON[row.trend];
                return (
                  <tr key={row.questionType} className="border-b border-line last:border-0">
                    <th scope="row" className="px-4 py-3 font-ui text-sm font-medium text-navy-deep">
                      {QUESTION_TYPE_LABELS[
                        row.questionType as keyof typeof QUESTION_TYPE_LABELS
                      ] ?? row.questionType}
                    </th>
                    <td className="px-4 py-3 text-right font-ui text-sm tabular-nums text-ink-soft">
                      {row.correct}/{row.total}
                    </td>
                    <td className="px-4 py-3 text-right font-ui text-sm tabular-nums font-semibold text-navy-deep">
                      {Math.round(row.accuracy * 100)}%
                    </td>
                    <td className={`px-4 py-3 text-right font-ui text-sm ${TREND_TONE[row.trend]}`}>
                      <span className="inline-flex items-center gap-1.5">
                        <Icon className="size-3.5" aria-hidden />
                        {TREND_LABELS[row.trend]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 && (
        <NoteBox className="mt-8" title="Đọc bảng này thế nào">
          Dạng đứng đầu là chỗ đáng đầu tư thời gian nhất, không phải chỗ đáng
          xấu hổ. Xu hướng chỉ hiện khi có đủ mẫu ở cả nửa đầu và nửa sau của{" "}
          {WINDOW_DAYS} ngày — nghỉ một tuần không bị đọc thành đang tệ đi.
        </NoteBox>
      )}
    </main>
  );
}
