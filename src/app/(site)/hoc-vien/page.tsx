import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  LogOut,
  KeyRound,
  RotateCcw,
  Coins,
  Handshake,
  MailWarning,
  MessageCircle,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { logoutAction } from "@/lib/actions/auth";
import { resendVerificationAction } from "@/lib/actions/account";
import { getCoinWallet } from "@/lib/payments/coin-service";
import { WELCOME_COINS, formatCoins } from "@/lib/payments/coins";
import { getMeritWallet } from "@/lib/merit/merit-service";
import { ButtonLink, NoteBox, SubmitButton } from "@/components/ui";
import { StudentNav } from "@/components/student/student-nav";
import { AvatarUploader } from "@/components/student/avatar-uploader";
import { GoalsCard } from "@/components/student/goals-card";
import { StudyCalendar } from "@/components/ui/study-calendar";
import { WeeklyStats, type WeeklyRow } from "@/components/student/weekly-stats";
import { HistoryTabs, type HistoryItem } from "@/components/student/history-tabs";
import { AchievementSummaryCard } from "@/components/achievements/achievement-summary-card";
import { RankDashboardBlock } from "@/components/ranks/rank-dashboard-block";
import { RealtimeLogoutButton } from "@/components/realtime/realtime-logout-button";
import { MeritSealIcon } from "@/components/merit/merit-seal-icon";
import { studentAvatarSource } from "@/lib/avatar/source";

export const metadata: Metadata = { title: "Hồ sơ học tập" };

const VN_TZ = "Asia/Ho_Chi_Minh";
const DAY_MS = 24 * 60 * 60 * 1000;

/** Khóa ngày dạng yyyy-mm-dd theo giờ Việt Nam. */
function dateKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: VN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function keyToLabel(key: string): string {
  const [y, m, d] = key.split("-");
  return `${d}/${m}/${y}`;
}

function fmt(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleString("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: VN_TZ,
  });
}

export default async function StudentDashboard({
  searchParams,
}: {
  searchParams: Promise<{ "xac-minh"?: string; "vi-sao"?: string }>;
}) {
  const user = await requireUser();
  const { "xac-minh": verifyResult, "vi-sao": verifyReason } = await searchParams;

  const [wallet, account, merit, arena, friendCount] = await Promise.all([
    getCoinWallet(user.id),
    db.user.findUnique({
      where: { id: user.id },
      select: {
        emailVerifiedAt: true,
        uploadedAvatar: { select: { updatedAt: true } },
      },
    }),
    getMeritWallet(user.id),
    // Đọc thẳng chứ không gọi `getArenaProfile`: hàm đó TẠO hồ sơ nếu chưa có,
    // và một trang chỉ để xem không nên tự sinh dữ liệu. Người chưa vào đấu
    // trường lần nào thì khối chỉ số này không hiện, đúng như nó phải thế.
    db.arenaProfile.findUnique({
      where: { userId: user.id },
      select: { chienLuc: true, wins: true, losses: true, truces: true },
    }),
    db.friendship.count({
      where: {
        status: "ACCEPTED",
        OR: [
          {
            userAId: user.id,
            userB: { active: true, role: "STUDENT", isBot: false },
          },
          {
            userBId: user.id,
            userA: { active: true, role: "STUDENT", isBot: false },
          },
        ],
      },
    }),
  ]);
  const verified = Boolean(account?.emailVerifiedAt);

  const attempts = await db.attempt.findMany({
    where: { userId: user.id, exercise: { skill: "READING" } },
    include: { exercise: true },
    orderBy: { startedAt: "desc" },
  });

  const finished = attempts.filter((a) => a.status !== "IN_PROGRESS");
  // Server Component: dựng lại mỗi lần tải trang nên đọc giờ hiện tại là đúng ý đồ.
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();
  const inProgress = attempts.filter(
    (a) => a.status === "IN_PROGRESS" && a.deadlineAt.getTime() > nowMs
  );
  const readingDone = finished.filter((a) => a.exercise.skill === "READING");
  const bestReading = readingDone.reduce<number | null>((best, a) => {
    if (a.scoreRaw == null || a.scoreTotal == null || a.scoreTotal === 0) return best;
    const pct = (a.scoreRaw / a.scoreTotal) * 100;
    return best == null || pct > best ? pct : best;
  }, null);

  /* ===== Lịch chuyên cần (tháng hiện tại, giờ VN) ===== */
  const now = new Date();
  const todayKey = dateKey(now);
  const monthPrefix = todayKey.slice(0, 8); // "yyyy-mm-"

  const activityDates = [
    ...new Set(
      finished
        .filter((a) => a.submittedAt)
        .map((a) => dateKey(a.submittedAt!))
        .filter((key) => key.startsWith(monthPrefix))
    ),
  ];

  /* ===== Thống kê 7 ngày gần nhất ===== */
  const weekKeys: string[] = [];
  for (let i = 6; i >= 0; i--) {
    weekKeys.push(dateKey(new Date(now.getTime() - i * DAY_MS)));
  }
  const weeklyRows: WeeklyRow[] = weekKeys.map((key) => {
    const dayAttempts = finished.filter(
      (a) => a.submittedAt && dateKey(a.submittedAt) === key
    );
    const minutes = dayAttempts.reduce((sum, a) => {
      const spent = Math.round(
        (a.submittedAt!.getTime() - a.startedAt.getTime()) / 60000
      );
      return sum + Math.min(Math.max(spent, 1), a.exercise.durationMinutes);
    }, 0);
    return {
      label: keyToLabel(key),
      r: dayAttempts.filter((a) => a.exercise.skill === "READING").length,
      minutes,
    };
  });

  /* ===== Lịch thi ===== */
  const examKey = user.examDate ? dateKey(user.examDate) : null;
  let daysLeft: number | null = null;
  if (examKey) {
    const toUtc = (k: string) => Date.parse(`${k}T00:00:00Z`);
    daysLeft = Math.round((toUtc(examKey) - toUtc(todayKey)) / DAY_MS);
  }

  /* ===== Lịch sử theo tab ===== */
  const historyItems: HistoryItem[] = finished.map((a) => ({
    id: a.id,
    title: a.exercise.title,
    submittedAtLabel: fmt(a.submittedAt),
    resultLabel: `${a.scoreRaw}/${a.scoreTotal}`,
    href: `/hoc-vien/bai-lam/${a.id}`,
  }));

  return (
    <div>
      <section className="border-b border-line bg-paper">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
          <div className="min-w-0">
            <p className="label-caps">Nội Tâm · Hồ sơ học tập</p>
            <h1 className="mt-3 font-display text-3xl font-bold text-navy-deep md:text-4xl">
              Xin chào, {user.name}
            </h1>
            <div className="rule-gold mt-5" />
            <p className="mt-4 font-ui text-sm text-muted">{user.email}</p>
            <p className="mt-3 inline-flex items-center gap-2 border border-gold bg-gold-pale px-4 py-1.5 font-ui text-sm font-semibold text-ink">
              <Coins className="h-4 w-4 text-gold" aria-hidden="true" />
              Ví: <span className="tabular-nums">{formatCoins(wallet.balance)}</span>
            </p>

            {/*
              Bốn chỉ số đặt cạnh nhau, vì CHÍNH SỰ ĐẶT CẠNH NHAU tạo ra câu hỏi.
              Xem đặc tả mục 05.

              Mỗi chỉ số có hình dạng riêng chứ không chỉ khác màu, theo
              BRAND-GUIDELINE mục 8.3: Đức Hạnh đi với con dấu, Chiến Lực đi với
              mũi tên, Hoà khí đi với cái bắt tay.

              Hoà khí CHỈ đến từ giảng hoà, không đến từ hoà điểm. Nó không đo sự
              bế tắc mà đo sự nhún nhường, nên nhãn phải nói đúng điều đó.
            */}
            {arena ? (
              <dl className="mt-4 grid grid-cols-2 gap-px border border-line bg-line md:grid-cols-4">
                <div className="bg-paper px-5 py-3">
                  <dt className="label-caps">Đức Hạnh</dt>
                  <dd className="mt-1 flex items-center gap-2">
                    <MeritSealIcon size={19} className="text-stoic-primary" aria-hidden="true" />
                    <span className="font-display text-xl font-bold tabular-nums text-navy-deep">
                      {merit.balance}
                    </span>
                  </dd>
                  <p className="mt-0.5 font-ui text-[0.68rem] leading-snug text-muted">
                    số dư hiện tại
                  </p>
                </div>
                <div className="bg-paper px-5 py-3">
                  <dt className="label-caps">Năng lực đối chiếu</dt>
                  <dd className="mt-1 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-azure-ink" aria-hidden="true" />
                    <span className="font-display text-xl font-bold tabular-nums text-navy-deep">
                      {arena.chienLuc}
                    </span>
                  </dd>
                </div>
                <div className="bg-paper px-5 py-3">
                  <dt className="label-caps">Kết quả đối chiếu</dt>
                  <dd className="mt-1 font-display text-xl font-bold tabular-nums text-navy-deep">
                    {arena.wins}/{arena.losses}
                  </dd>
                </div>
                <div className="bg-paper px-5 py-3">
                  <dt className="label-caps">Hoà giải</dt>
                  <dd className="mt-1 flex items-center gap-2">
                    <Handshake className="h-4 w-4 text-silver-blue-ink" aria-hidden="true" />
                    <span className="font-display text-xl font-bold tabular-nums text-navy-deep">
                      {arena.truces}
                    </span>
                  </dd>
                  <p className="mt-0.5 font-ui text-[0.68rem] leading-snug text-muted">
                    số lần chủ động hoà giải
                  </p>
                </div>
              </dl>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Link
                href="/doi-mat-khau"
                className="world-action motion-press flex min-h-11 items-center gap-2 border border-line px-5 font-ui text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-ink-soft transition-colors hover:border-navy hover:text-navy"
              >
                <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                Đổi mật khẩu
              </Link>
              <form action={logoutAction}>
                <RealtimeLogoutButton
                  className="world-action motion-press flex min-h-11 cursor-pointer items-center gap-2 border border-line px-5 font-ui text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-ink-soft transition-colors hover:border-danger hover:text-danger"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                  Đăng xuất
                </RealtimeLogoutButton>
              </form>
            </div>
          </div>

          <aside className="relative overflow-hidden border border-line bg-canvas p-6 shadow-[0_1.2rem_3rem_-2rem_rgb(35_43_83_/_0.42)]">
            <div aria-hidden="true" className="pointer-events-none absolute -right-14 -top-16 size-40 rounded-full bg-stoic-lavender-pale" />
            <div className="relative">
              <AvatarUploader
                src={studentAvatarSource({
                  id: user.id,
                  avatarUrl: user.avatarUrl,
                  uploadedAvatar: account?.uploadedAvatar ?? null,
                })}
                googleAvatarSrc={user.avatarUrl}
                name={user.name}
                email={user.email}
              />
              <div className="mt-5 grid grid-cols-2 gap-px border border-line bg-line text-center">
                <div className="bg-paper px-3 py-3">
                  <UsersRound className="mx-auto size-4 text-stoic-primary" aria-hidden="true" />
                  <p className="mt-1 font-display text-xl font-bold tabular-nums text-navy-deep">{friendCount}</p>
                  <p className="font-ui text-[0.67rem] uppercase tracking-[0.1em] text-muted">Bạn bè</p>
                </div>
                <Link
                  href="/hoc-vien/tin-nhan"
                  className="world-action motion-press flex min-h-20 flex-col items-center justify-center bg-paper px-3 py-3 font-ui text-xs font-semibold text-navy-deep hover:bg-stoic-lavender-pale"
                >
                  <MessageCircle className="size-4 text-stoic-primary" aria-hidden="true" />
                  <span className="mt-2">Tin nhắn</span>
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {verifyResult === "xong" && (
        <div className="mx-auto max-w-6xl px-6 pt-8">
          <NoteBox title="Đã xác minh email">
            Cảm ơn bạn. {formatCoins(WELCOME_COINS)} quà chào mừng đã vào ví.
          </NoteBox>
        </div>
      )}
      {verifyResult === "da-co" && (
        <div className="mx-auto max-w-6xl px-6 pt-8">
          <NoteBox title="Email đã được xác minh từ trước">
            Không có gì thay đổi — quà chào mừng đã vào ví của bạn trước đó rồi.
          </NoteBox>
        </div>
      )}
      {verifyResult === "loi" && (
        <div className="mx-auto max-w-6xl px-6 pt-8">
          <NoteBox title="Liên kết xác minh không dùng được">
            {verifyReason === "HET_HAN"
              ? "Liên kết đã quá 24 giờ. Bấm nút gửi lại bên dưới để nhận thư mới."
              : verifyReason === "DA_DUNG"
                ? "Liên kết này đã được dùng rồi. Nếu email của bạn vẫn chưa xác minh, hãy gửi lại thư mới."
                : "Liên kết không hợp lệ. Hãy gửi lại thư xác minh."}
          </NoteBox>
        </div>
      )}

      {!verified && (
        <div className="mx-auto max-w-6xl px-6 pt-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-l-4 border-gold bg-gold-pale px-6 py-5">
            <p className="flex items-start gap-3 font-ui text-sm leading-relaxed text-ink">
              <MailWarning className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden="true" />
              <span>
                <strong>Email chưa được xác minh.</strong> Xác minh xong bạn nhận
                ngay {formatCoins(WELCOME_COINS)} vào ví — đủ mở 16 đề Reading.
                Thư đã gửi tới {user.email}.
              </span>
            </p>
            <form action={resendVerificationAction}>
              <SubmitButton variant="outline">Gửi lại thư xác minh</SubmitButton>
            </form>
          </div>
        </div>
      )}

      <section className="mx-auto max-w-6xl space-y-8 px-6 py-12">
        <StudentNav current="student" />

        {/* Cấp bậc đứng đầu vì nó trả lời câu hỏi "giờ làm gì tiếp". Tự ẩn khi
            cờ ENABLE_RANK_ENGINE còn tắt. */}
        <RankDashboardBlock userId={user.id} />

        {/* Mục tiêu + lịch thi */}
        <GoalsCard
          targets={{
            overall: user.targetOverall,
            reading: user.targetReading,
          }}
          examDateValue={examKey ?? ""}
          examDateLabel={examKey ? keyToLabel(examKey) : "—"}
          daysLeft={daysLeft}
        />

        {/* Lịch chuyên cần + thống kê tuần */}
        <div className="grid gap-6 lg:grid-cols-2">
          <StudyCalendar
            activityDates={activityDates}
            streakDates={activityDates}
            initialMonth={todayKey.slice(0, 7)}
            title="Kỷ luật ngày"
          />
          <WeeklyStats rows={weeklyRows} />
        </div>

        {/* Danh hiệu: chỉ tóm tắt, KHÔNG truy vấn cả danh mục ở trang này */}
        <AchievementSummaryCard userId={user.id} />

        {/* Thống kê tổng */}
        <div className="grid gap-px border border-line bg-line sm:grid-cols-2">
          <div className="bg-paper p-6">
            <p className="label-caps flex items-center gap-2">
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              Reading đã làm
            </p>
            <p className="mt-3 font-display text-4xl font-bold text-navy-deep">
              {readingDone.length}
            </p>
          </div>
          <div className="bg-paper p-6">
            <p className="label-caps flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              Reading tốt nhất
            </p>
            <p className="mt-3 font-display text-4xl font-bold text-success">
              {bestReading != null ? `${Math.round(bestReading)}%` : "—"}
            </p>
          </div>
        </div>

        {/* Bài đang làm dở */}
        {inProgress.length > 0 && (
          <div className="space-y-4">
            {inProgress.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-4 border-l-4 border-gold bg-cream-deep px-6 py-4"
              >
                <div>
                  <p className="font-ui font-semibold text-ink">{a.exercise.title}</p>
                  <p className="mt-1 font-ui text-sm text-ink-soft">
                    Hạn nộp: {fmt(a.deadlineAt)} — đồng hồ vẫn đang chạy!
                  </p>
                </div>
                <Link
                  href={`/lam-bai/${a.id}`}
                  className="flex items-center gap-2 border border-gold bg-gold px-5 py-2 font-ui text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-navy-deep hover:border-gold-soft hover:bg-gold-soft"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  Tiếp tục làm
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Lịch sử Reading */}
        {finished.length === 0 ? (
          <NoteBox title="Chưa có bài làm nào">
            Hãy bắt đầu với một bài Reading để làm quen với áp lực thời gian.{" "}
            <Link
              href="/luyen-tap/reading"
              className="font-semibold text-navy underline decoration-gold decoration-2 underline-offset-4"
            >
              Vào phòng luyện tập
            </Link>
            .
          </NoteBox>
        ) : (
          <HistoryTabs items={historyItems} />
        )}

        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/luyen-tap/reading" variant="primary">
            Reading Academic
          </ButtonLink>
          <ButtonLink href="/luyen-tap/reading/general" variant="outline">
            Reading General
          </ButtonLink>
          <ButtonLink href="/hoc-vien/dau-truong" variant="outline">
            Thử thách đối chiếu
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
