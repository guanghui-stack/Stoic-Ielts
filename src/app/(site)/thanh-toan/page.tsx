import Link from "next/link";
import { BookOpenCheck, Brain, Check, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { getAccessSnapshot } from "@/lib/access-grants";
import { feynmanSinglePrice } from "@/lib/payments/quote";
import { isSePayConfigured } from "@/lib/payments/sepay";
import {
  OFFERS,
  formatVnd,
  INTRO_PROMO_NOTICE,
  type OfferCode,
} from "@/lib/payments/catalog";
import { PurchaseButton } from "@/components/payments/purchase-button";
import { ErrorBanner, NoteBox, SectionHeading } from "@/components/ui";

export const metadata = {
  title: "Bảng giá",
  description:
    "Mở khóa bài luyện Reading và quy trình chữa bài Feynman của STOIC-IELTS.",
};
export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  "chua-cau-hinh":
    "Cổng thanh toán chưa được bật. Vui lòng liên hệ trung tâm để được mở khóa thủ công.",
  "san-pham": "Gói bạn chọn không còn tồn tại. Vui lòng chọn lại bên dưới.",
  "thieu-bai": "Chưa rõ bạn muốn mở bài nào. Hãy chọn bài từ danh sách luyện tập.",
  "qua-nhieu-don":
    "Bạn đang có quá nhiều đơn chờ thanh toán. Hãy hoàn tất hoặc hủy bớt rồi thử lại.",
};

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ loi?: string }>;
}) {
  const { loi } = await searchParams;
  const user = await getCurrentUser();

  // Học viên đã có quyền thì hiện "Đã mở" thay vì mời mua tiếp.
  const [readingAccess, feynmanAccess, feynmanPrice] = user
    ? await Promise.all([
        getAccessSnapshot(user.id, "READING"),
        getAccessSnapshot(user.id, "FEYNMAN"),
        feynmanSinglePrice(user.id),
      ])
    : [null, null, null];

  const configured = isSePayConfigured();

  return (
    <section className="mx-auto max-w-5xl px-6 py-12 md:py-16">
      <SectionHeading
        label="Học phí trực tuyến"
        title="Mở khóa đúng thứ bạn cần, không mua cả gói lớn"
        align="center"
      />
      <p className="mx-auto mt-6 max-w-2xl text-center text-[0.98rem] leading-relaxed text-ink-soft">
        Quyền làm bài Reading và quyền chữa bài Feynman là hai thứ tách rời. Bạn
        có thể chỉ mua bài mình cần, hoặc mua gói 30 ngày nếu đang luyện đều.
      </p>

      {loi && <div className="mx-auto mt-8 max-w-2xl"><ErrorBanner message={ERROR_MESSAGES[loi]} /></div>}

      {!configured && (
        <NoteBox className="mt-8" title="Thanh toán trực tuyến đang tạm đóng">
          Trung tâm chưa bật cổng thanh toán. Bạn vẫn có thể liên hệ để được mở
          khóa bài học thủ công.
        </NoteBox>
      )}

      {feynmanPrice?.isIntro && (
        <div className="mt-8 flex items-start gap-3 border border-gold bg-gold-pale px-6 py-5">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden="true" />
          <p className="font-ui text-sm leading-relaxed text-ink">
            {INTRO_PROMO_NOTICE}
          </p>
        </div>
      )}

      <div className="mt-12 grid gap-8 md:grid-cols-2">
        <PlanCard
          icon="reading"
          title="Reading"
          intro="Làm bài theo đúng giao diện phòng thi máy tính, chấm điểm ngay khi nộp."
          bullets={[
            "Đáp án cơ bản luôn miễn phí sau khi nộp bài",
            "Bài công khai không cần mua gì",
            "Gói 30 ngày phủ cả bài đăng thêm trong thời hạn",
          ]}
          packageOffer="READING_ALL_30D"
          singleOffer="READING_SINGLE"
          singleHref="/luyen-tap/reading"
          singleHint="Chọn bài trong danh sách rồi bấm mở bài đó."
          owned={
            readingAccess?.hasAll
              ? `Bạn đang có gói Reading${
                  readingAccess.allExpiresAt
                    ? ` tới ${readingAccess.allExpiresAt.toLocaleDateString("vi-VN")}`
                    : ""
                }`
              : null
          }
          signedIn={Boolean(user)}
          configured={configured}
        />

        <PlanCard
          icon="feynman"
          title="Feynman"
          intro="Lớp chữa sâu: tự giảng lại, tìm bằng chứng trong bài, nhận diện bẫy và rút quy tắc dùng cho bài sau."
          bullets={[
            "Có lời giải mẫu của giáo viên cho từng câu sai",
            "Chỉ mở được sau khi đã hoàn thành bài Reading",
            "Bản chữa bài đã tạo được giữ vĩnh viễn, kể cả khi hết gói",
          ]}
          packageOffer="FEYNMAN_ALL_30D"
          singleOffer="FEYNMAN_SINGLE"
          singleHref="/hoc-vien"
          singleHint="Mở từ trang kết quả của bài bạn vừa làm."
          singlePriceOverride={feynmanPrice?.amount}
          singleStrikethrough={feynmanPrice?.isIntro ? OFFERS.FEYNMAN_SINGLE.amount : undefined}
          owned={
            feynmanAccess?.hasAll
              ? `Bạn đang có gói Feynman${
                  feynmanAccess.allExpiresAt
                    ? ` tới ${feynmanAccess.allExpiresAt.toLocaleDateString("vi-VN")}`
                    : ""
                }`
              : null
          }
          signedIn={Boolean(user)}
          configured={configured}
        />
      </div>

      {!user && (
        <NoteBox className="mt-10" title="Cần đăng nhập">
          Quyền học gắn với tài khoản của bạn.{" "}
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

      <NoteBox className="mt-6" title="Về thời hạn">
        Gói 30 ngày tính đúng 30 ngày kể từ lúc thanh toán. Nếu bạn gia hạn khi
        gói cũ còn hạn, thời gian mới được cộng nối tiếp — không mất ngày nào.
        Bài mua lẻ thuộc về bạn vĩnh viễn.
      </NoteBox>
    </section>
  );
}

function PlanCard({
  icon,
  title,
  intro,
  bullets,
  packageOffer,
  singleOffer,
  singleHref,
  singleHint,
  singlePriceOverride,
  singleStrikethrough,
  owned,
  signedIn,
  configured,
}: {
  icon: "reading" | "feynman";
  title: string;
  intro: string;
  bullets: string[];
  packageOffer: OfferCode;
  singleOffer: OfferCode;
  singleHref: string;
  singleHint: string;
  singlePriceOverride?: number;
  singleStrikethrough?: number;
  owned: string | null;
  signedIn: boolean;
  configured: boolean;
}) {
  const pkg = OFFERS[packageOffer];
  const single = OFFERS[singleOffer];
  const singleAmount = singlePriceOverride ?? single.amount;
  const Icon = icon === "reading" ? BookOpenCheck : Brain;

  return (
    <article className="flex flex-col border border-line bg-paper p-8 shadow-card">
      <p className="label-caps flex items-center gap-2">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {title}
      </p>
      <p className="mt-4 text-[0.95rem] leading-relaxed text-ink-soft">{intro}</p>

      <ul className="mt-6 space-y-2.5">
        {bullets.map((b) => (
          <li key={b} className="flex gap-2.5 font-ui text-sm leading-relaxed text-ink-soft">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            {b}
          </li>
        ))}
      </ul>

      <div className="mt-8 border-t border-line pt-6">
        <p className="font-display text-3xl font-bold text-navy-deep">
          {formatVnd(pkg.amount)}
          <span className="ml-2 font-ui text-sm font-normal text-muted">/ 30 ngày</span>
        </p>
        <p className="mt-1.5 font-ui text-xs text-muted">{pkg.blurb}</p>
        <div className="mt-4">
          {owned ? (
            <p className="inline-flex items-center gap-2 border border-success bg-success-pale px-5 py-2.5 font-ui text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-success">
              <Check className="h-4 w-4" aria-hidden="true" />
              {owned}
            </p>
          ) : !signedIn ? (
            // Chưa đăng nhập không phải là "hết hàng" — chỉ ra đúng việc cần làm
            <Link
              href="/dang-nhap"
              className="inline-flex items-center gap-2 border border-navy px-7 py-3 font-ui text-[0.8rem] font-semibold uppercase tracking-[0.12em] text-navy transition-colors hover:bg-navy hover:text-paper"
            >
              Đăng nhập để mua
            </Link>
          ) : !configured ? (
            <span className="inline-flex cursor-not-allowed items-center border border-line-strong bg-cream-deep px-7 py-3 font-ui text-[0.8rem] font-semibold uppercase tracking-[0.12em] text-muted">
              Tạm chưa mua được
            </span>
          ) : (
            <PurchaseButton offerCode={packageOffer}>
              Mở toàn bộ 30 ngày · {formatVnd(pkg.amount)}
            </PurchaseButton>
          )}
        </div>
      </div>

      <div className="mt-6 border-t border-line pt-6">
        <p className="font-ui text-sm text-ink">
          Hoặc mua lẻ từng bài:{" "}
          {singleStrikethrough && (
            <span className="mr-1.5 text-muted line-through">
              {formatVnd(singleStrikethrough)}
            </span>
          )}
          <strong className="tabular-nums text-navy-deep">
            {formatVnd(singleAmount)}
          </strong>
          <span className="text-muted"> / bài</span>
        </p>
        <p className="mt-1.5 font-ui text-xs leading-relaxed text-muted">
          {singleHint}{" "}
          <Link href={singleHref} className="font-semibold text-navy underline underline-offset-4">
            Đi tới đó
          </Link>
        </p>
      </div>
    </article>
  );
}
