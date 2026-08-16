import Link from "next/link";
import { Lock, MessagesSquare, ShieldAlert } from "lucide-react";
import { requireUser } from "@/lib/session";
import { channelsFor, competitionLive, viewerOf } from "@/lib/forum/service";
import { rankByLevel } from "@/lib/ranks/catalog";
import { ART_ASSETS } from "@/lib/brand/art-manifest";
import type { NextStepModel } from "@/lib/campaign/world";
import { NextStepGuide } from "@/components/world/next-step-guide";
import { SceneHero } from "@/components/world/scene-hero";
import { NoteBox } from "@/components/ui";

export const metadata = {
  title: "Nghị Sự Đường",
  description:
    "Nơi học viên cùng bậc bàn bài với nhau. Bậc trên quay về phòng dưới góp lời.",
};
export const dynamic = "force-dynamic";

const FORUM_NEXT_STEP: NextStepModel = {
  eyebrow: "Bước đầu tiên",
  title: "Chọn một phòng phù hợp với cấp bậc",
  body: "Nghị Sự Đường dùng để bàn cách học và giảng lại điều đã hiểu; nơi này không thay thế việc chữa bài Reading và Feynman.",
  href: "/hoc-vien",
  actionLabel: "Xem vị trí của tôi",
  entersStudy: false,
};

export default async function ForumHome() {
  const user = await requireUser();
  const viewer = await viewerOf(user);
  const live = await competitionLive();
  const channels = await channelsFor(viewer, live);

  const myRank = rankByLevel(viewer.level);

  return (
    <div>
      <SceneHero
        asset={ART_ASSETS.generalQuanVu}
        eyebrow="Nghị Sự Đường"
        title="Bàn bài cùng người cùng bậc"
        functionalLabel="Cộng đồng thảo luận phương pháp học"
      >
        <p className="text-lg leading-relaxed text-ink-soft">
          Mỗi bậc có một phòng riêng. Bạn vào được phòng của bậc mình và{" "}
          <strong>tất cả các phòng bậc dưới</strong> — lên cao rồi thì quay về
          giảng lại cho người đi sau, đó mới là chỗ kiến thức đọng lại.
        </p>
      </SceneHero>

      <section className="mx-auto max-w-4xl px-6 py-12 md:py-16">
        <NextStepGuide step={FORUM_NEXT_STEP} />

        {myRank && (
          <p className="mt-8 font-ui text-sm text-muted">
            Bậc hiện tại của bạn: <strong className="text-ink">{myRank.name}</strong>{" "}
            (bậc {viewer.level}) — mở {channels.length} phòng.
          </p>
        )}

        {live && (
          <NoteBox className="mt-8" title="Nguyệt Thí đang diễn ra">
            Phần viết tạm khóa cho tới khi kỳ thi kết thúc. Bạn vẫn đọc được mọi
            phòng. Lý do: một câu bàn về đề đang thi là đủ làm hỏng kỳ thi của
            người chưa vào phòng.
          </NoteBox>
        )}

        {viewer.banned && (
          <NoteBox className="mt-6" title="Tài khoản đang bị hạn chế">
            Bạn vẫn đọc được mọi phòng nhưng chưa đăng bài hay bình luận được.
            Liên hệ trung tâm nếu bạn cho rằng đây là nhầm lẫn.
          </NoteBox>
        )}

        <div className="mt-10 space-y-4">
          {channels.map((channel) => (
            <Link
              key={channel.id}
              href={`/nghi-su-duong/${channel.key}`}
              className="flex flex-wrap items-center justify-between gap-4 border border-line bg-paper p-6 shadow-card transition-colors hover:border-navy"
            >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-ui text-sm font-bold tabular-nums text-gold">
                  Bậc {channel.level}
                </span>
                <h2 className="font-display text-xl font-bold text-navy-deep">
                  {channel.name}
                </h2>
                {channel.locked && (
                  <span className="inline-flex items-center gap-1 border border-line-strong bg-cream-deep px-2 py-0.5 font-ui text-[0.68rem] font-semibold uppercase text-ink-soft">
                    <Lock className="h-3 w-3" aria-hidden="true" />
                    Đã khóa
                  </span>
                )}
                {channel.level < viewer.level && (
                  <span className="inline-flex items-center gap-1 border border-gold bg-gold-pale px-2 py-0.5 font-ui text-[0.68rem] font-semibold uppercase text-gold">
                    Phòng bậc dưới
                  </span>
                )}
              </div>
              <p className="mt-2 max-w-xl text-[0.92rem] leading-relaxed text-ink-soft">
                {channel.blurb}
              </p>
            </div>

            <span className="flex shrink-0 items-center gap-2 font-ui text-sm text-muted tabular-nums">
              <MessagesSquare className="h-4 w-4" aria-hidden="true" />
              {channel.postCount} chủ đề
            </span>
            </Link>
          ))}
        </div>

        <NoteBox className="mt-10" title="Nội quy ngắn">
          Chỉ chữ — ảnh, tệp và video sẽ có ở bản sau.{" "}
          <strong>Không bàn về đề đang thi.</strong> Thấy nội dung sai trái thì
          bấm <strong>Báo cáo</strong> thay vì cãi nhau — quản trị viên đọc hàng
          đợi đó mỗi ngày.
        </NoteBox>

        <p className="mt-6 flex items-start gap-2 font-ui text-xs leading-relaxed text-muted">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Bài viết ở đây do học viên tự đăng và không phải quan điểm của trung tâm.
        </p>
      </section>
    </div>
  );
}
