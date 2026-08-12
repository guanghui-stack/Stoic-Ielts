import Link from "next/link";
import { Lock, Shuffle, SquareCheck, Trophy } from "lucide-react";
import { requireUser } from "@/lib/session";
import {
  assemblyCandidates,
  createAssemblyAction,
} from "@/lib/actions/reading-assembly";
import {
  planAutoAssembly,
  isAssemblable,
  PASSAGES_PER_TEST,
  TARGET_QUESTIONS,
  FULL_TEST_MINUTES,
} from "@/lib/reading-assembly";
import { MODULE_LABELS } from "@/lib/nav";
import { getCoinWallet } from "@/lib/payments/coin-service";
import { formatCoins } from "@/lib/payments/coins";
import { OFFERS } from "@/lib/payments/catalog";
import { CoinPurchaseButton } from "@/components/payments/purchase-button";
import { ErrorBanner, NoteBox, SectionHeading, SubmitButton } from "@/components/ui";
import { ManualAssemblyPicker } from "@/components/exam/manual-assembly-picker";

export const metadata = { title: "Ghép đề Full Test" };
export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  NOT_ENOUGH_PASSAGES:
    "Kho đề chưa đủ ba bài đọc để ghép. Vui lòng quay lại sau khi trung tâm đăng thêm đề.",
  NEED_EXACTLY_THREE: "Hãy chọn đúng ba bài đọc.",
  DUPLICATE_PASSAGE: "Không thể chọn trùng một bài đọc.",
  PASSAGE_NOT_ALLOWED: "Một trong ba bài bạn chọn hiện không dùng để ghép được.",
  CHUA_MUA_DU: "Bạn chưa mở khóa đủ ba bài trong đề này.",
};

const TIER_LABELS: Record<string, string> = {
  EASY: "Dễ",
  MEDIUM: "Vừa",
  HARD: "Khó",
  UNKNOWN: "Chưa xếp",
};

export default async function AssemblyPage({
  searchParams,
}: {
  searchParams: Promise<{ loi?: string; dang?: string }>;
}) {
  const { loi, dang } = await searchParams;
  const user = await requireUser();

  // Chỉ ghép trong một dạng đề. Mặc định Academic vì đa số học viên thi dạng này.
  const readingType = dang === "GENERAL" ? "GENERAL" : "ACADEMIC";
  const wallet = await getCoinWallet(user.id);
  const unlockCost = OFFERS.READING_UNLOCK.priceCoins;
  const moduleLabel = MODULE_LABELS[readingType];
  const otherType = readingType === "GENERAL" ? "ACADEMIC" : "GENERAL";

  const candidates = await assemblyCandidates(user.id, readingType);
  const usable = candidates.filter(isAssemblable);
  const autoPlan = planAutoAssembly(candidates);

  return (
    <section className="mx-auto max-w-4xl px-6 py-12 md:py-16">
      <SectionHeading
        label={`Reading ${moduleLabel}`}
        title="Ghép ba bài đọc thành một đề Full Test"
      />

      <p className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 border-l-4 border-line-strong bg-cream-deep px-5 py-3.5 font-ui text-sm text-ink-soft">
        Đang ghép từ kho <strong className="text-ink">{moduleLabel}</strong>.
        <Link
          href={`/luyen-tap/reading/ghep-de?dang=${otherType}`}
          className="font-semibold text-navy underline underline-offset-4 hover:text-gold"
        >
          Chuyển sang {MODULE_LABELS[otherType]}
        </Link>
      </p>
      <p className="mt-6 max-w-2xl text-[0.98rem] leading-relaxed text-ink-soft">
        Đề một bài đọc chỉ có hơn chục câu, nên một câu đúng sai đã làm lệch
        khoảng nửa band. Làm trọn ba bài trong {FULL_TEST_MINUTES} phút cho bạn
        con số sát thực tế hơn — và đúng cảm giác sức bền của phòng thi thật.
      </p>

      {loi && (
        <div className="mt-8">
          <ErrorBanner message={ERRORS[loi] ?? "Không ghép được đề. Vui lòng thử lại."} />
        </div>
      )}

      {/* ===== Chế độ tự động ===== */}
      <article className="mt-10 border border-line bg-paper p-8 shadow-card">
        <p className="label-caps flex items-center gap-2">
          <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
          Chế độ 1 · Hệ thống ghép
        </p>
        <h2 className="mt-3 font-display text-2xl font-bold text-navy-deep">
          Để hệ thống chọn đề cho bạn
        </h2>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-soft">
          Ưu tiên bài bạn chưa từng làm, cân bằng ba mức độ khó và gộp lại gần{" "}
          {TARGET_QUESTIONS} câu nhất có thể.
        </p>

        <p className="mt-4 flex items-start gap-2 border-l-4 border-gold bg-gold-pale px-5 py-4 font-ui text-sm leading-relaxed text-ink">
          <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
          <span>
            <strong>Chỉ đề ở chế độ này được tính danh hiệu</strong> và điều kiện
            dự Nguyệt Thí. Bạn tự chọn bài thì kết quả chỉ để luyện tập — nếu
            không, ai cũng có thể gom ba bài dễ để lấy band cao.
          </span>
        </p>

        {autoPlan.ok ? (
          <>
            <ol className="mt-6 divide-y divide-line border-y border-line">
              {autoPlan.parts.map((part, index) => (
                <li key={part.exerciseId} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-3">
                  <span className="font-ui text-sm font-bold tabular-nums text-gold">
                    Passage {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 text-ink">{part.title}</span>
                  <span className="font-ui text-xs text-muted">
                    {part.questionCount} câu · {TIER_LABELS[part.tier]}
                  </span>
                  {part.accessLevel === "RESTRICTED" && (
                    <span
                      className={`inline-flex items-center gap-1 border px-2 py-0.5 font-ui text-[0.68rem] font-semibold uppercase ${
                        part.owned
                          ? "border-success bg-success-pale text-success"
                          : "border-line-strong bg-cream-deep text-ink-soft"
                      }`}
                    >
                      <Lock className="h-3 w-3" aria-hidden="true" />
                      {part.owned ? "Đã mở" : "Cần mở khóa"}
                    </span>
                  )}
                </li>
              ))}
            </ol>
            <p className="mt-4 font-ui text-sm text-ink-soft">
              Tổng {autoPlan.totalQuestions} câu · {autoPlan.durationMinutes} phút
            </p>

            {autoPlan.missingAccess.length > 0 ? (
              // Phải mở đủ CẢ BA bài mới ghép được. Hiện từng nút riêng thay vì
              // một nút gộp: mỗi lần bấm là một giao dịch xu độc lập, và học
              // viên có thể đã mở sẵn một hai bài từ trước.
              <div className="mt-6">
                <p className="font-ui text-sm text-ink-soft">
                  Còn {autoPlan.missingAccess.length} bài chưa mở, tổng{" "}
                  <strong className="tabular-nums text-ink">
                    {formatCoins(autoPlan.missingAccess.length * unlockCost)}
                  </strong>
                  . Ví bạn còn{" "}
                  <strong className="tabular-nums text-ink">
                    {formatCoins(wallet.balance)}
                  </strong>
                  .
                </p>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  {autoPlan.missingAccess.map((part) =>
                    wallet.balance >= unlockCost ? (
                      <CoinPurchaseButton
                        key={part.exerciseId}
                        offerCode="READING_UNLOCK"
                        exerciseId={part.exerciseId}
                        variant="outline"
                      >
                        <Lock className="h-4 w-4" aria-hidden="true" />
                        Mở &ldquo;{part.title}&rdquo; · {formatCoins(unlockCost)}
                      </CoinPurchaseButton>
                    ) : null
                  )}
                  <Link
                    href="/thanh-toan"
                    className="inline-flex items-center gap-2 border border-gold bg-gold px-6 py-2.5 font-ui text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-paper transition-colors hover:bg-[#9d7223]"
                  >
                    Nạp xu
                  </Link>
                </div>
              </div>
            ) : (
              <form action={createAssemblyAction} className="mt-6">
                <input type="hidden" name="mode" value="AUTO" />
                <input type="hidden" name="readingType" value={readingType} />
                <SubmitButton>
                  <Shuffle className="h-4 w-4" aria-hidden="true" />
                  Bắt đầu đề này
                </SubmitButton>
              </form>
            )}
          </>
        ) : (
          <NoteBox className="mt-6" title="Chưa ghép được">
            Kho {moduleLabel} hiện có {usable.length} bài đọc dùng để ghép được, cần
            tối thiểu {PASSAGES_PER_TEST}. Trung tâm sẽ bổ sung thêm đề.
          </NoteBox>
        )}
      </article>

      {/* ===== Chế độ tự chọn ===== */}
      <article className="mt-8 border border-line bg-paper p-8 shadow-card">
        <p className="label-caps flex items-center gap-2">
          <SquareCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Chế độ 2 · Bạn tự chọn
        </p>
        <h2 className="mt-3 font-display text-2xl font-bold text-navy-deep">
          Tự chọn ba bài đọc
        </h2>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-soft">
          Hợp khi bạn muốn luyện đúng chủ đề mình yếu, hoặc làm lại bài cũ để
          kiểm tra xem kiến thức còn ở lại không.{" "}
          <strong className="text-ink">Kết quả không tính vào danh hiệu.</strong>
        </p>

        {usable.length < PASSAGES_PER_TEST ? (
          <NoteBox className="mt-6">
            Cần ít nhất {PASSAGES_PER_TEST} bài đọc; hiện có {usable.length}.
          </NoteBox>
        ) : (
          <ManualAssemblyPicker
            candidates={usable.map((c) => ({
              exerciseId: c.exerciseId,
              title: c.title,
              questionCount: c.questionCount,
              tierLabel: TIER_LABELS[c.tier],
              owned: c.owned,
              restricted: c.accessLevel === "RESTRICTED",
              attemptCount: c.attemptCount,
            }))}
            action={createAssemblyAction}
            readingType={readingType}
          />
        )}
      </article>

      <p className="mt-8 text-center">
        <Link
          href={readingType === "GENERAL" ? "/luyen-tap/reading/general" : "/luyen-tap/reading"}
          className="font-ui text-sm font-semibold text-navy underline-offset-4 hover:text-gold hover:underline"
        >
          Quay lại kho Reading {moduleLabel}
        </Link>
      </p>
    </section>
  );
}
