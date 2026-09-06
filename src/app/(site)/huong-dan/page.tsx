import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Coins,
  Mail,
  Phone,
  ShieldCheck,
  Swords,
  Trophy,
} from "lucide-react";
import { BADGE_INFO } from "@/components/competition/badges";
import { NarrativeSection } from "@/components/world/narrative-section";
import { ButtonLink, NoteBox, PageHero } from "@/components/ui";
import { COIN_UNIT_VND, WELCOME_COINS, TOPUP_TIERS } from "@/lib/payments/coins";
import { MERIT_EARN, QUALIFIED_DAY_MIN_SECONDS } from "@/lib/merit/merit";
import { BASE_COST, RETRY_COOLDOWN_MINUTES, costOfAttempt } from "@/lib/thibut/thibut";
import { INVITE_TTL_SECONDS, MAX_STAKE, MIN_STAKE } from "@/lib/arena/duel";

export const metadata = {
  title: "Hướng dẫn",
  description:
    "Cách dùng website STOIC · IELTS: làm bài Reading, chữa lỗi, tiêu xu, kiếm Đức Hạnh và thắng cược ở Đấu trường.",
};

/**
 * Trang hướng dẫn cho học viên.
 *
 * MỌI CON SỐ trên trang này được nhập từ chính các tệp luật đang chạy
 * (`payments/coins`, `merit/merit`, `thibut/thibut`, `arena/duel`), không gõ
 * tay. Một trang hướng dẫn nói sai giá là một trang phản tác dụng: học viên
 * đọc xong vẫn bấm nhầm, và lần sau họ không tin trang này nữa.
 */

const READING_UNLOCK_COINS = 9;
const FEYNMAN_FULL_COINS = 39;
const FEYNMAN_SINGLE_COINS = 19;

const STEPS = [
  {
    title: "Tạo tài khoản và xác minh email",
    body: `Đăng ký bằng email của bạn, rồi mở hộp thư và bấm liên kết xác minh. Xác minh xong, ví của bạn được tặng ${WELCOME_COINS} xu để bắt đầu.`,
  },
  {
    title: "Chọn đúng kho đề",
    body: "Academic dành cho du học và hồ sơ chuyên môn; General dành cho định cư và việc phổ thông. Hai kho tách hẳn nhau — luyện nhầm kho là đang giỏi lên ở một kỳ thi mình không dự.",
  },
  {
    title: "Làm bài trong điều kiện thật",
    body: "Vào phòng thi là giao diện chuyển sang chế độ mô phỏng: có đồng hồ đếm ngược và tự nộp khi hết giờ. Cứ làm hết sức, đừng dừng giữa chừng để tra cứu.",
  },
  {
    title: "Xem đáp án rồi chữa lỗi",
    body: "Đáp án cơ bản mở miễn phí ngay sau khi nộp. Với các câu sai, hãy đi tiếp bước chữa bài Feynman: bạn tự giảng lại vì sao chọn sai, rồi mới được xem lời giải đầy đủ.",
  },
  {
    title: "Quay lại vào ngày mai",
    body: `Một ngày học đạt chuẩn cần ít nhất ${Math.round(QUALIFIED_DAY_MIN_SECONDS / 60)} phút học thật và có ít nhất một việc hoàn thành. Đều đặn quan trọng hơn một buổi học dài rồi nghỉ cả tuần.`,
  },
];

const COIN_USES = [
  { label: "Mở một đề Reading", cost: `${READING_UNLOCK_COINS} xu`, note: "Mở một lần, làm lại bao nhiêu lượt cũng được." },
  { label: "Chữa bài sâu cho một lượt Full Test", cost: `${FEYNMAN_FULL_COINS} xu`, note: "Kèm 10 lượt AI chấm." },
  { label: "Chữa bài sâu cho một lượt đề đơn", cost: `${FEYNMAN_SINGLE_COINS} xu`, note: "Kèm 10 lượt AI chấm." },
  { label: "Nạp thêm 10 lượt AI chấm", cost: "29 xu", note: "Cộng vào ví chung của tài khoản." },
];

const MERIT_SOURCES = [
  { label: "Một ngày học đạt chuẩn", amount: `+${MERIT_EARN.STUDY_DAY}` },
  { label: "Hoàn tất một lượt chữa bài Feynman", amount: `+${MERIT_EARN.FEYNMAN_REVIEW}` },
  { label: "Đạt một dấu mốc", amount: `+${MERIT_EARN.TITLE_MIN} đến +${MERIT_EARN.TITLE_MAX}` },
  { label: "Lên một cấp bậc", amount: `+${MERIT_EARN.RANK_UP}` },
  { label: "Thắng cược ở Đấu trường", amount: "+ đúng mức đã cược" },
];

export default function GuidePage() {
  const topUps = Object.values(TOPUP_TIERS);
  const retryCost = costOfAttempt(1);

  return (
    <div>
      <PageHero
        label="Hướng dẫn"
        title="Dùng website này thế nào"
        lede="Một trang duy nhất trả lời bốn câu hỏi hay gặp nhất: bắt đầu từ đâu, xu dùng để làm gì, Đức Hạnh kiếm ở đâu, và Đấu trường hoạt động ra sao."
      />

      {/* ===================== Bắt đầu ===================== */}
      <NarrativeSection
        id="bat-dau"
        eyebrow="Năm bước đầu tiên"
        title="Từ lúc đăng ký tới lúc chữa xong bài đầu tiên"
        tone="paper"
      >
        <ol className="grid gap-5 md:grid-cols-2">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="flex gap-4 border border-line bg-paper p-6 shadow-card"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-navy font-display text-base font-bold text-navy-deep">
                {index + 1}
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold text-navy-deep">
                  {step.title}
                </h3>
                <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/dang-ky" variant="primary">
            Tạo tài khoản
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </ButtonLink>
          <ButtonLink href="/luyen-tap/reading" variant="outline">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            Vào kho đề Reading
          </ButtonLink>
        </div>
      </NarrativeSection>

      {/* ===================== Hai loại tài sản ===================== */}
      <NarrativeSection
        id="xu-va-duc-hanh"
        eyebrow="Xu và Đức Hạnh"
        title="Tài khoản của bạn có hai loại tài sản, và chúng không đổi qua lại"
        tone="mist"
      >
        <p className="max-w-3xl text-[1.02rem] leading-relaxed text-ink-soft">
          Đây là điều dễ nhầm nhất, nên nói ngay: <strong>Xu mua bằng tiền</strong>,
          còn <strong>Đức Hạnh chỉ kiếm được bằng việc học và bằng thắng trận</strong>.
          Không có cách nào đổi xu lấy Đức Hạnh hay ngược lại. Cố ý làm vậy để
          không ai mua được thành tích.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {/* --- Xu --- */}
          <article className="flex flex-col border border-line bg-paper p-7 shadow-card">
            <p className="label-caps flex items-center gap-2">
              <Coins className="h-4 w-4" aria-hidden="true" />
              Xu — mua học liệu
            </p>
            <h3 className="mt-3 font-display text-2xl font-semibold text-navy-deep">
              1 xu = {COIN_UNIT_VND.toLocaleString("vi-VN")}đ
            </h3>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-soft">
              Xu là cách duy nhất để trả tiền trên website. Bạn nạp xu một lần
              rồi tiêu dần, thay vì thanh toán riêng cho từng món.
            </p>

            <p className="mt-6 label-caps">Mức nạp</p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {topUps.map((tier) => (
                <li
                  key={tier.label}
                  className="border border-line bg-cream px-4 py-3 font-ui text-sm text-ink"
                >
                  <span className="block font-semibold text-navy-deep">
                    {tier.coins} xu
                  </span>
                  <span className="text-xs text-muted">{tier.label}</span>
                </li>
              ))}
            </ul>

            <p className="mt-6 label-caps">Xu dùng để làm gì</p>
            <ul className="mt-3 space-y-2">
              {COIN_USES.map((use) => (
                <li
                  key={use.label}
                  className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-line pb-2 font-ui text-sm text-ink-soft"
                >
                  <span className="text-ink">{use.label}</span>
                  <span className="font-semibold tabular-nums text-navy">
                    {use.cost}
                  </span>
                  <span className="w-full text-xs text-muted">{use.note}</span>
                </li>
              ))}
            </ul>

            <p className="mt-6 text-[0.95rem] leading-relaxed text-ink-soft">
              Tài khoản mới được tặng <strong>{WELCOME_COINS} xu</strong> ngay sau
              khi xác minh email — đủ để mở vài đề đầu tiên mà chưa cần nạp đồng
              nào.
            </p>

            <div className="mt-6">
              <ButtonLink href="/thanh-toan" variant="outline">
                Xem ví và nạp xu
              </ButtonLink>
            </div>
          </article>

          {/* --- Đức Hạnh --- */}
          <article className="flex flex-col border border-line bg-paper p-7 shadow-card">
            <p className="label-caps flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Đức Hạnh — không bán, chỉ kiếm
            </p>
            <h3 className="mt-3 font-display text-2xl font-semibold text-navy-deep">
              Trả cho công sức, không trả cho tiền
            </h3>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-soft">
              Đức Hạnh ghi lại việc bạn đã thật sự làm. Nó không có giá bằng tiền
              và không bao giờ được bán, nên số Đức Hạnh của một người nói đúng
              điều họ đã bỏ ra.
            </p>

            <p className="mt-6 label-caps">Kiếm Đức Hạnh ở đâu</p>
            <ul className="mt-3 space-y-2">
              {MERIT_SOURCES.map((source) => (
                <li
                  key={source.label}
                  className="flex items-baseline justify-between gap-3 border-b border-line pb-2 font-ui text-sm"
                >
                  <span className="text-ink">{source.label}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-navy">
                    {source.amount}
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-6 label-caps">Đức Hạnh tiêu vào đâu</p>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-soft">
              Hai chỗ, và chỉ hai chỗ. Một là <strong>Thí Bút</strong>: trả{" "}
              {BASE_COST} Đức Hạnh để giành quyền làm một đề mà không phải mở
              bằng xu — trượt thì lượt sau rẻ hơn ({retryCost} Đức Hạnh) nhưng
              phải chờ {RETRY_COOLDOWN_MINUTES} phút. Hai là{" "}
              <strong>đặt cược ở Đấu trường</strong>, nói ở phần ngay dưới.
            </p>

            <div className="mt-6">
              <ButtonLink href="/hoc-vien" variant="outline">
                Xem số Đức Hạnh của bạn
              </ButtonLink>
            </div>
          </article>
        </div>

        <NoteBox title="Một câu để nhớ" className="mt-8 max-w-3xl">
          Xu mở học liệu. Đức Hạnh chứng minh bạn đã học. Tiền không mua được
          Đức Hạnh, và Đức Hạnh không quy ra tiền.
        </NoteBox>
      </NarrativeSection>

      {/* ===================== Đấu trường ===================== */}
      <NarrativeSection
        id="dau-truong"
        eyebrow="Đấu trường"
        title="Cách kiếm Đức Hạnh bằng thách đấu và thắng cược"
        tone="paper"
      >
        <p className="max-w-3xl text-[1.02rem] leading-relaxed text-ink-soft">
          Đấu trường là nơi hai học viên làm CÙNG một đề, cùng lúc, và ai làm tốt
          hơn thì thắng. Nếu trận có cược, người thắng nhận thêm đúng số Đức Hạnh
          đã cược — đây là cách kiếm Đức Hạnh nhanh nhất trên website, và cũng là
          cách duy nhất có thể mất Đức Hạnh.
        </p>

        <ol className="mt-10 grid gap-5 md:grid-cols-2">
          <GuideStep
            index={1}
            title="Vào Đấu trường"
            body="Mở từ menu Đấu trường ở đầu trang, hoặc bấm biểu tượng hai thanh kiếm trên thanh lối tắt dọc ở cạnh phải màn hình."
          />
          <GuideStep
            index={2}
            title="Chọn đối thủ và mức cược"
            body={`Danh sách hiện những người đang có mặt. Bấm thách đấu, rồi chọn cược từ ${MIN_STAKE} đến ${MAX_STAKE} Đức Hạnh. Để mức 0 là đấu không cược — vẫn tính Chiến Lực, chỉ không ai mất gì.`}
          />
          <GuideStep
            index={3}
            title="Chiến thư có hạn 90 giây"
            body={`Người bị thách có ${INVITE_TTL_SECONDS} giây để trả lời. Khi có ai thách bạn, chấm báo sẽ sáng ngay trên biểu tượng Đấu trường ở thanh lối tắt bên phải, dù bạn đang ở trang nào.`}
          />
          <GuideStep
            index={4}
            title="Nhận lời là vào phòng thi ngay"
            body="Cược bị trừ khỏi ví của cả hai người ngay lúc nhận lời, và cả hai vào thẳng phòng thi với cùng một đề. Bỏ ngang giữa chừng bị xử thua."
          />
        </ol>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <ResultCard
            tone="win"
            title="Thắng"
            body="Nhận lại phần cược của mình, cộng thêm đúng bấy nhiêu nữa. Ròng: cộng một lần mức cược."
          />
          <ResultCard
            tone="draw"
            title="Hoà"
            body="Hoàn cược cho cả hai. Không ai được, không ai mất."
          />
          <ResultCard
            tone="loss"
            title="Thua"
            body="Mất đúng mức đã cược. Không mất thêm gì khác, và điểm kinh nghiệm vẫn được ghi."
          />
        </div>

        <NoteBox title="Đừng cược nhiều hơn mức bạn chịu mất" className="mt-8 max-w-3xl">
          Cược cao không làm bạn đọc nhanh hơn. Hãy bắt đầu ở mức {MIN_STAKE} Đức
          Hạnh cho vài trận đầu để quen nhịp, rồi mới tăng.
        </NoteBox>

        <div className="mt-8">
          <ButtonLink href="/hoc-vien/dau-truong" variant="primary">
            <Swords className="h-4 w-4" aria-hidden="true" />
            Vào Đấu trường
          </ButtonLink>
        </div>
      </NarrativeSection>

      {/* ===================== Thử thách tháng ===================== */}
      <NarrativeSection
        id="thu-thach-thang"
        eyebrow="Thử thách định kỳ"
        title="Ba mức giải của kỳ thử thách tháng"
        tone="ink"
      >
        <p className="max-w-3xl text-[1.02rem] leading-relaxed text-paper/80">
          Mỗi tháng có một kỳ bảy ngày với ba đề Reading. Đạt chuẩn nào thì nhận
          giải của chuẩn đó; không ai đạt thì giải để trống, chứ tiêu chuẩn không
          bị hạ xuống cho đủ người.
        </p>

        <ul className="mt-10 grid gap-4 sm:grid-cols-3">
          {BADGE_INFO.map(({ code, title, prizeLabel, prizeCoins, requirement }) => (
            <li
              key={code}
              className="rounded-stoic-md border border-line bg-cream p-6 text-center"
            >
              <p className="font-display text-lg font-medium text-navy-deep">
                {title}
              </p>
              <p className="mt-2 font-display text-2xl font-medium text-navy">
                {prizeLabel}
              </p>
              <p className="mt-1 font-ui text-sm font-semibold text-navy">
                + {prizeCoins} xu
              </p>
              <p className="mt-2 font-ui text-xs leading-relaxed text-ink-soft">
                {requirement}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-8">
          <ButtonLink href="/nguyet-thi" variant="gold">
            <Trophy className="h-4 w-4" aria-hidden="true" />
            Xem thử thách tháng
          </ButtonLink>
        </div>
      </NarrativeSection>

      {/* ===================== Kẹt ở đâu ===================== */}
      <NarrativeSection
        id="ho-tro"
        eyebrow="Khi bạn kẹt"
        title="Hỏi trung tâm, đừng ngồi đoán"
        tone="paper"
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-[1.02rem] leading-relaxed text-ink-soft">
              Quên mật khẩu, nạp xu chưa vào, hay có câu hỏi về một đề cụ thể —
              nhắn cho trung tâm là cách nhanh nhất. Bạn cũng có thể hỏi các học
              viên khác ở Diễn đàn.
            </p>
            <ul className="mt-6 space-y-3 font-ui text-sm text-ink">
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 shrink-0 text-navy" aria-hidden="true" />
                <a href="tel:+84917920345" className="hover:text-navy-deep">
                  0917 920 345
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 shrink-0 text-navy" aria-hidden="true" />
                <a href="mailto:info@stoic-ielts.online" className="hover:text-navy-deep">
                  info@stoic-ielts.online
                </a>
              </li>
            </ul>
          </div>

          <NoteBox title="Đi tiếp từ đây">
            <span className="block">
              <Link href="/nghi-su-duong" className="underline">
                Diễn đàn
              </Link>{" "}
              — hỏi và trả lời cùng học viên khác.
            </span>
            <span className="mt-2 block">
              <Link href="/dien-danh-vong" className="underline">
                Dấu mốc cộng đồng
              </Link>{" "}
              — xem người khác đã đi tới đâu.
            </span>
            <span className="mt-2 block">
              <Link href="/bang-vang" className="underline">
                Thành quả
              </Link>{" "}
              — kết quả và dấu mốc đã được ghi nhận.
            </span>
          </NoteBox>
        </div>
      </NarrativeSection>
    </div>
  );
}

function GuideStep({
  index,
  title,
  body,
}: {
  index: number;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-4 border border-line bg-paper p-6 shadow-card">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-navy font-display text-base font-bold text-navy-deep">
        {index}
      </span>
      <div>
        <h3 className="font-display text-lg font-semibold text-navy-deep">
          {title}
        </h3>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">{body}</p>
      </div>
    </li>
  );
}

const RESULT_TONE = {
  win: "border-jade bg-jade-pale",
  draw: "border-line bg-cream",
  loss: "border-vermilion bg-vermilion-pale",
} as const;

function ResultCard({
  tone,
  title,
  body,
}: {
  tone: keyof typeof RESULT_TONE;
  title: string;
  body: string;
}) {
  return (
    <div className={`border p-6 ${RESULT_TONE[tone]}`}>
      <p className="font-display text-lg font-semibold text-navy-deep">{title}</p>
      <p className="mt-2 font-ui text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}
