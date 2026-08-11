import Link from "next/link";
import { BookOpenCheck, Brain, Check, Coins, Sparkles } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { walletRemaining } from "@/lib/feynman-ai/rules";
import { isSePayConfigured } from "@/lib/payments/sepay";
import {
  OFFERS,
  formatVnd,
  FREE_PRACTICE_NOTICE,
  AI_EVIDENCE_NOTICE,
  type AttemptOfferCode,
} from "@/lib/payments/catalog";
import { PurchaseButton } from "@/components/payments/purchase-button";
import { ErrorBanner, NoteBox, SectionHeading } from "@/components/ui";

export const metadata = {
  title: "Bảng giá",
  description:
    "Đề thi Reading miễn phí. Trả phí ở lớp chữa sâu Feynman và lượt AI chấm.",
};
export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  "chua-cau-hinh":
    "Cổng thanh toán chưa được bật. Vui lòng liên hệ trung tâm để được mở khóa thủ công.",
  "san-pham": "Gói bạn chọn không còn tồn tại. Vui lòng chọn lại bên dưới.",
  "thieu-bai": "Chưa rõ bạn muốn mở bài nào. Hãy chọn bài từ danh sách luyện tập.",
  "qua-nhieu-don":
    "Bạn đang có quá nhiều đơn chờ thanh toán. Hãy hoàn tất hoặc hủy bớt rồi thử lại.",
  // Thiếu dòng này thì người dùng bị đá về đây kèm một dải báo lỗi RỖNG: họ bấm
  // mua, màn hình đổi trang, và không câu nào nói vì sao. Đã xảy ra thật với ba
  // gói cũ còn sót nút mua.
  "ngung-ban":
    "Gói bạn chọn đã dừng bán. Các gói đang áp dụng nằm ngay bên dưới.",
};

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ loi?: string; goi?: string; luot?: string }>;
}) {
  const { loi, goi, luot } = await searchParams;
  const user = await getCurrentUser();

  // Ví lượt AI là con số duy nhất trang này mua thẳng được, nên nó phải hiện
  // đúng số dư — mời nạp khi người ta còn đầy ví là cách nhanh nhất mất niềm tin.
  const budget = user
    ? await db.feynmanAiBudget.findUnique({ where: { userId: user.id } })
    : null;
  const credits = user
    ? walletRemaining(budget ?? { grantedTotal: 0, usedTotal: 0 })
    : null;

  const configured = isSePayConfigured();
  // Từ khối "hết lượt" trong phòng Feynman đá sang: giữ lại mã lượt làm bài để
  // mua xong quay đúng chỗ đang chữa dở, thay vì thả về trang chủ.
  const highlightTopUp = goi === "FEYNMAN_AI_TOPUP";
  const backToAttempt = typeof luot === "string" && luot.trim() ? luot.trim() : undefined;

  return (
    <section className="mx-auto max-w-5xl px-6 py-12 md:py-16">
      <SectionHeading
        label="Học phí trực tuyến"
        title="Đề thi miễn phí. Trả tiền cho phần chữa bài."
        align="center"
      />
      <p className="mx-auto mt-6 max-w-2xl text-center text-[0.98rem] leading-relaxed text-ink-soft">
        Toàn bộ đề Reading, chấm điểm, quy đổi band và đáp án đúng/sai đều miễn
        phí. Bạn chỉ trả tiền khi muốn mở lời giải chi tiết của giáo viên và lớp
        chữa sâu Feynman cho đúng lượt làm bài của mình.
      </p>

      {loi && (
        <div className="mx-auto mt-8 max-w-2xl">
          <ErrorBanner message={ERROR_MESSAGES[loi]} />
        </div>
      )}

      <div className="mt-8 flex items-start gap-3 border border-gold bg-gold-pale px-6 py-5">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden="true" />
        <p className="font-ui text-sm leading-relaxed text-ink">
          {FREE_PRACTICE_NOTICE}
        </p>
      </div>

      <div className="mt-12 grid gap-8 md:grid-cols-2">
        <AttemptPlanCard
          offerCode="FEYNMAN_ATTEMPT_FULL"
          icon="feynman"
          note="Dành cho đề ghép ba passage và đề Full Test 40 câu."
        />
        <AttemptPlanCard
          offerCode="FEYNMAN_ATTEMPT_SINGLE"
          icon="reading"
          note="Dành cho một passage lẻ trong kho luyện tập."
        />
      </div>

      <TopUpCard
        credits={credits}
        signedIn={Boolean(user)}
        configured={configured}
        highlight={highlightTopUp}
        attemptId={backToAttempt}
      />

      {!user && (
        <NoteBox className="mt-10" title="Cần đăng nhập">
          Quyền học và ví lượt AI gắn với tài khoản của bạn.{" "}
          <Link href="/dang-nhap" className="font-semibold text-navy underline underline-offset-4">
            Đăng nhập
          </Link>{" "}
          hoặc{" "}
          <Link href="/dang-ky" className="font-semibold text-navy underline underline-offset-4">
            tạo tài khoản miễn phí
          </Link>{" "}
          trước khi mua.
        </NoteBox>
      )}

      <NoteBox className="mt-6" title="Ví lượt AI dùng chung">
        Lượt AI chấm nằm ở ví chung của tài khoản: mua ở đề nào cũng tiêu được ở
        đề khác. Riêng nhịp chấm thì tính theo từng lượt làm bài — mỗi lượt chấm
        tối đa một lần mỗi ngày. {AI_EVIDENCE_NOTICE}
      </NoteBox>

      <NoteBox className="mt-6" title="Về quyền đã mua trước đây">
        Ba gói cũ (Reading mở lẻ, Reading 30 ngày, Feynman 30 ngày) đã dừng bán.
        Quyền bạn đã trả tiền vẫn còn nguyên và dùng hết thời hạn như cũ — không
        có gì bị xóa hay đổi.
      </NoteBox>
    </section>
  );
}

/**
 * Gói bán theo LƯỢT LÀM BÀI nên không mua thẳng ở đây được: máy chủ phải biết
 * mở cho lượt nào. Thẻ này chỉ in giá và chỉ đường về trang kết quả bài làm —
 * đặt một nút mua ở đây sẽ tạo đơn không gắn lượt nào và mở nhầm chỗ.
 */
function AttemptPlanCard({
  offerCode,
  icon,
  note,
}: {
  offerCode: AttemptOfferCode;
  icon: "reading" | "feynman";
  note: string;
}) {
  const offer = OFFERS[offerCode];
  const Icon = icon === "reading" ? BookOpenCheck : Brain;

  return (
    <article className="flex flex-col border border-line bg-paper p-8 shadow-card">
      <p className="label-caps flex items-center gap-2">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {offer.label.split("—")[0].trim()}
      </p>

      <p className="mt-4 font-display text-3xl font-bold text-navy-deep">
        {formatVnd(offer.amount)}
        <span className="ml-2 font-ui text-sm font-normal text-muted">
          / một lượt làm bài
        </span>
      </p>
      <p className="mt-1.5 font-ui text-xs text-muted">{note}</p>

      <ul className="mt-6 space-y-2.5">
        {[
          "Lời giải chi tiết của giáo viên cho tất cả các câu, giữ vĩnh viễn",
          "Luyện Feynman lại không giới hạn số lần",
          `Tặng ${offer.aiGradingCredits} lượt AI chấm vào ví chung`,
          `Hỏi AI tối đa ${offer.aiChatLimit} câu mỗi lần chấm`,
        ].map((b) => (
          <li key={b} className="flex gap-2.5 font-ui text-sm leading-relaxed text-ink-soft">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            {b}
          </li>
        ))}
      </ul>

      <p className="mt-auto pt-6 font-ui text-xs leading-relaxed text-muted">
        Mở từ trang kết quả của bài bạn vừa làm — gói gắn với đúng lượt đó.{" "}
        <Link href="/hoc-vien" className="font-semibold text-navy underline underline-offset-4">
          Đi tới hồ sơ học tập
        </Link>
      </p>
    </article>
  );
}

/** Gói duy nhất mua thẳng được ở trang này: nó không gắn với lượt làm bài nào. */
function TopUpCard({
  credits,
  signedIn,
  configured,
  highlight,
  attemptId,
}: {
  credits: number | null;
  signedIn: boolean;
  configured: boolean;
  highlight: boolean;
  attemptId?: string;
}) {
  const offer = OFFERS.FEYNMAN_AI_TOPUP;

  return (
    <article
      className={`mt-8 flex flex-col gap-6 border bg-paper p-8 shadow-card md:flex-row md:items-center md:justify-between ${
        highlight ? "border-gold" : "border-line"
      }`}
    >
      <div className="min-w-0">
        <p className="label-caps flex items-center gap-2">
          <Coins className="h-3.5 w-3.5" aria-hidden="true" />
          Ví lượt AI
        </p>
        <h2 className="mt-2.5 font-display text-xl font-bold text-navy-deep">
          {offer.label} · {formatVnd(offer.amount)}
        </h2>
        <p className="mt-2 max-w-xl font-ui text-sm leading-relaxed text-ink-soft">
          {offer.blurb} Không mở thêm quyền nào, chỉ cộng lượt — nên mua được bất
          cứ lúc nào, kể cả khi bạn chưa có gói chữa bài.
        </p>
        {credits !== null && (
          <p className="mt-3 font-ui text-sm text-ink">
            Ví của bạn còn <strong className="tabular-nums">{credits}</strong> lượt.
          </p>
        )}
      </div>

      <div className="shrink-0">
        {!signedIn ? (
          <Link
            href="/dang-nhap"
            className="inline-flex items-center gap-2 border border-navy px-7 py-3 font-ui text-[0.8rem] font-semibold uppercase tracking-[0.12em] text-navy transition-colors hover:bg-navy hover:text-paper"
          >
            Đăng nhập để nạp
          </Link>
        ) : !configured ? (
          <span className="inline-flex cursor-not-allowed items-center border border-line-strong bg-cream-deep px-7 py-3 font-ui text-[0.8rem] font-semibold uppercase tracking-[0.12em] text-muted">
            Tạm chưa mua được
          </span>
        ) : (
          <PurchaseButton
            offerCode="FEYNMAN_AI_TOPUP"
            attemptId={attemptId}
            variant="gold"
          >
            <Coins className="h-4 w-4" aria-hidden="true" />
            Nạp {offer.aiGradingCredits} lượt · {formatVnd(offer.amount)}
          </PurchaseButton>
        )}
      </div>
    </article>
  );
}
