import { randomBytes } from "node:crypto";
import Link from "next/link";
import { BookOpenCheck, Brain, Check, Coins, Sparkles, Wallet } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { getCoinWallet } from "@/lib/payments/coin-service";
import { isSePayConfigured } from "@/lib/payments/sepay";
import {
  OFFERS,
  formatVnd,
  FREE_PRACTICE_NOTICE,
  AI_EVIDENCE_NOTICE,
  type AttemptOfferCode,
} from "@/lib/payments/catalog";
import {
  TOPUP_TIERS,
  bonusCoinsOf,
  formatCoins,
  listTopUpTiers,
  type TopUpTierCode,
} from "@/lib/payments/coins";
import {
  CoinPurchaseButton,
  TopUpButton,
} from "@/components/payments/purchase-button";
import { QuietWorldPanel } from "@/components/world/quiet-world-panel";
import { ErrorBanner, NoteBox } from "@/components/ui";

export const metadata = {
  title: "Bảng giá",
  description:
    "Đề thi Reading miễn phí. Nạp xu để mở lớp chữa sâu Feynman và lượt AI chấm.",
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
  searchParams: Promise<{ loi?: string; thieu?: string; luot?: string }>;
}) {
  const { loi, thieu, luot } = await searchParams;
  const user = await getCurrentUser();

  const wallet = user ? await getCoinWallet(user.id) : null;
  const configured = isSePayConfigured();

  // Từ khối "hết lượt" trong phòng Feynman đá sang: giữ lại mã lượt làm bài để
  // nạp xong quay đúng chỗ đang chữa dở, thay vì thả về trang chủ.
  const backToAttempt =
    typeof luot === "string" && luot.trim() ? luot.trim() : undefined;

  // Thiếu xu là lối vào phổ biến nhất của trang này, nên câu báo phải nói đúng
  // số còn thiếu chứ không chỉ "không đủ".
  const missing = Number.parseInt(thieu ?? "", 10);
  const shortMessage =
    loi === "thieu-xu" && Number.isFinite(missing) && missing > 0
      ? `Ví của bạn còn thiếu ${formatCoins(missing)} cho gói vừa chọn. Nạp thêm rồi bấm mua lại.`
      : loi === "thieu-xu"
        ? "Ví của bạn không đủ xu cho gói vừa chọn."
        : ERROR_MESSAGES[loi ?? ""];

  /**
   * Khóa chống trừ hai lần cho gói nạp lượt AI — gói duy nhất không có khóa tự
   * nhiên vì mua lại nhiều lần là đúng ý. Sinh mới mỗi lần dựng trang, nên hai
   * cú bấm trên cùng một trang là một lần trừ, tải lại trang thì mua tiếp được.
   */
  const spendToken = randomBytes(12).toString("hex");

  return (
    <div>
      <QuietWorldPanel
        eyebrow="Học phí trực tuyến"
        title="Đề thi miễn phí. Nạp xu cho phần chữa bài."
        lede="Toàn bộ đề Reading, chấm điểm, quy đổi band và đáp án đúng/sai đều miễn phí. Bạn nạp xu vào ví, rồi dùng xu mở lời giải chi tiết của giáo viên và lớp chữa sâu Feynman cho đúng lượt làm bài của mình."
      >
        {shortMessage && <ErrorBanner message={shortMessage} />}

        {wallet && (
          <div
            className={`flex flex-wrap items-center justify-between gap-4 border border-gold bg-gold-pale px-6 py-5 ${shortMessage ? "mt-6" : ""}`}
          >
            <p className="flex items-center gap-3 font-ui text-sm text-ink">
              <Wallet className="h-5 w-5 shrink-0 text-gold" aria-hidden="true" />
              <span>
                Ví của bạn đang có{" "}
                <strong className="tabular-nums">{formatCoins(wallet.balance)}</strong>
              </span>
            </p>
            <p className="font-ui text-xs text-muted">
              Đã nạp {formatCoins(wallet.grantedTotal)} · đã tiêu{" "}
              {formatCoins(wallet.spentTotal)}
            </p>
          </div>
        )}
      </QuietWorldPanel>

      <section className="mx-auto max-w-5xl px-6 py-12 md:py-16">

      {/* ===== Nạp ví ===== */}
      <h2 className="font-display text-2xl font-bold text-navy-deep">
        Nạp xu vào ví
      </h2>
      <p className="mt-2 font-ui text-sm leading-relaxed text-ink-soft">
        1 xu = 1.000đ. Hai mốc lớn được tặng thêm xu. Xu không hết hạn và dùng
        được cho mọi bài.
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {listTopUpTiers().map((code) => (
          <TopUpCard
            key={code}
            code={code}
            signedIn={Boolean(user)}
            configured={configured}
            attemptId={backToAttempt}
          />
        ))}
      </div>

      {!configured && (
        <NoteBox className="mt-6" title="Thanh toán trực tuyến đang tạm đóng">
          Trung tâm chưa bật cổng thanh toán. Bạn vẫn có thể liên hệ để được nạp
          xu thủ công.
        </NoteBox>
      )}

      {/* ===== Tiêu xu ===== */}
      <h2 className="mt-14 font-display text-2xl font-bold text-navy-deep">
        Xu dùng để mở gì
      </h2>

      <div className="mt-6 flex items-start gap-3 border border-line bg-cream-deep px-6 py-5">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden="true" />
        <p className="font-ui text-sm leading-relaxed text-ink">
          {FREE_PRACTICE_NOTICE}
        </p>
      </div>

      <div className="mt-6 grid gap-8 md:grid-cols-2">
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

      <AiTopUpCard
        signedIn={Boolean(user)}
        balance={wallet?.balance ?? 0}
        spendToken={spendToken}
      />

      {!user && (
        <NoteBox className="mt-10" title="Cần đăng nhập">
          Ví xu gắn với tài khoản của bạn.{" "}
          <Link href="/dang-nhap" className="font-semibold text-navy underline underline-offset-4">
            Đăng nhập
          </Link>{" "}
          hoặc{" "}
          <Link href="/dang-ky" className="font-semibold text-navy underline underline-offset-4">
            tạo tài khoản miễn phí
          </Link>{" "}
          trước khi nạp.
        </NoteBox>
      )}

      <NoteBox className="mt-6" title="Điều cần biết về xu">
        Xu <strong>không hết hạn</strong> và dùng được cho mọi bài. Xu{" "}
        <strong>không đổi ngược ra tiền mặt</strong> và không chuyển cho tài
        khoản khác — nó là tín dụng học phí trả trước, không phải tiền gửi.
        {" "}Lượt AI chấm là thứ khác: gói tặng kèm, đếm riêng, không mua thẳng
        bằng xu được. {AI_EVIDENCE_NOTICE}
      </NoteBox>

        <NoteBox className="mt-6" title="Về quyền đã mua trước đây">
          Ba gói cũ (Reading mở lẻ, Reading 30 ngày, Feynman 30 ngày) đã dừng bán.
          Quyền bạn đã trả tiền vẫn còn nguyên và dùng hết thời hạn như cũ — không
          có gì bị xóa hay quy đổi thành xu.
        </NoteBox>
      </section>
    </div>
  );
}

/** Một mốc nạp. Phần thưởng hiện rõ, vì đó là lý do duy nhất chọn mốc lớn. */
function TopUpCard({
  code,
  signedIn,
  configured,
  attemptId,
}: {
  code: TopUpTierCode;
  signedIn: boolean;
  configured: boolean;
  attemptId?: string;
}) {
  const tier = TOPUP_TIERS[code];
  const bonus = bonusCoinsOf(code);

  return (
    <article
      className={`flex flex-col border bg-paper p-6 shadow-card ${
        bonus > 0 ? "border-gold" : "border-line"
      }`}
    >
      <p className="font-display text-2xl font-bold text-navy-deep">
        {formatCoins(tier.coins)}
      </p>
      <p className="mt-1 font-ui text-sm text-ink-soft tabular-nums">
        {formatVnd(tier.amountVnd)}
      </p>

      {bonus > 0 ? (
        <p className="mt-3 inline-flex w-fit items-center gap-1.5 border border-gold bg-gold-pale px-2.5 py-0.5 font-ui text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-gold">
          <Sparkles className="h-3 w-3" aria-hidden="true" />
          Tặng thêm {bonus} xu
        </p>
      ) : (
        <p className="mt-3 font-ui text-xs text-muted">Đúng tỉ giá gốc</p>
      )}

      <div className="mt-auto pt-5">
        {!signedIn ? (
          <Link
            href="/dang-nhap"
            className="inline-flex w-full items-center justify-center border border-navy px-5 py-2.5 font-ui text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-navy transition-colors hover:bg-navy hover:text-paper"
          >
            Đăng nhập để nạp
          </Link>
        ) : !configured ? (
          <span className="inline-flex w-full cursor-not-allowed items-center justify-center border border-line-strong bg-cream-deep px-5 py-2.5 font-ui text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-muted">
            Tạm chưa nạp được
          </span>
        ) : (
          <TopUpButton
            tierCode={code}
            attemptId={attemptId}
            variant={bonus > 0 ? "gold" : "primary"}
            className="motion-press w-full"
          >
            Nạp {formatVnd(tier.amountVnd)}
          </TopUpButton>
        )}
      </div>
    </article>
  );
}

/**
 * Gói bán theo LƯỢT LÀM BÀI nên không mua thẳng ở đây được: máy chủ phải biết
 * mở cho lượt nào. Thẻ này chỉ in giá và chỉ đường về trang kết quả bài làm —
 * đặt một nút mua ở đây sẽ trừ xu cho một lượt không xác định.
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
        {formatCoins(offer.priceCoins)}
        <span className="ml-2 font-ui text-sm font-normal text-muted">
          / một lượt làm bài
        </span>
      </p>
      <p className="mt-1.5 font-ui text-xs text-muted">
        Tương đương {formatVnd(offer.amount)} · {note}
      </p>

      <ul className="mt-6 space-y-2.5">
        {[
          "Lời giải chi tiết của giáo viên cho tất cả các câu, giữ vĩnh viễn",
          "Luyện Feynman lại không giới hạn số lần",
          `Tặng ${offer.aiGradingCredits} lượt AI chấm vào ví lượt`,
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

/** Gói duy nhất tiêu xu được ngay ở trang này: nó không gắn với lượt nào. */
function AiTopUpCard({
  signedIn,
  balance,
  spendToken,
}: {
  signedIn: boolean;
  balance: number;
  spendToken: string;
}) {
  const offer = OFFERS.FEYNMAN_AI_TOPUP;
  const enough = balance >= offer.priceCoins;

  return (
    <article className="mt-8 flex flex-col gap-6 border border-line bg-paper p-8 shadow-card md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <p className="label-caps flex items-center gap-2">
          <Coins className="h-3.5 w-3.5" aria-hidden="true" />
          Lượt AI chấm
        </p>
        <h3 className="mt-2.5 font-display text-xl font-bold text-navy-deep">
          {offer.label} · {formatCoins(offer.priceCoins)}
        </h3>
        <p className="mt-2 max-w-xl font-ui text-sm leading-relaxed text-ink-soft">
          {offer.blurb} Mua được bất cứ lúc nào, kể cả khi bạn chưa có gói chữa
          bài nào.
        </p>
      </div>

      <div className="shrink-0">
        {!signedIn ? (
          <Link
            href="/dang-nhap"
            className="inline-flex items-center gap-2 border border-navy px-7 py-3 font-ui text-[0.8rem] font-semibold uppercase tracking-[0.12em] text-navy transition-colors hover:bg-navy hover:text-paper"
          >
            Đăng nhập để mua
          </Link>
        ) : !enough ? (
          // Không đủ xu thì nói thẳng còn thiếu bao nhiêu, thay vì để họ bấm
          // rồi bị đá ngược về đúng trang này.
          <p className="max-w-[16rem] font-ui text-sm leading-relaxed text-muted">
            Cần thêm{" "}
            <strong className="tabular-nums text-ink">
              {formatCoins(offer.priceCoins - balance)}
            </strong>{" "}
            — nạp ví ở phần trên rồi quay lại.
          </p>
        ) : (
          <CoinPurchaseButton
            offerCode="FEYNMAN_AI_TOPUP"
            spendToken={spendToken}
            className="motion-press"
          >
            <Coins className="h-4 w-4" aria-hidden="true" />
            Đổi {formatCoins(offer.priceCoins)} lấy {offer.aiGradingCredits} lượt
          </CoinPurchaseButton>
        )}
      </div>
    </article>
  );
}
