import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import {
  channelFor,
  competitionLive,
  viewerOf,
} from "@/lib/forum/service";

export const dynamic = "force-dynamic";

/**
 * Giữ đường dẫn phòng cũ để bookmark và liên kết đã chia sẻ không bị hỏng.
 * Sau khi kiểm quyền ở máy chủ, người xem được đưa về feed chung đã lọc đúng
 * bậc. Trả 404 trước khi redirect để không làm lộ một bậc chưa được phép xem.
 */
export default async function LegacyChannelPage({
  params,
}: {
  params: Promise<{ phong: string }>;
}) {
  const { phong } = await params;
  const user = await requireUser();
  const viewer = await viewerOf(user);
  const channel = await channelFor(phong, viewer, await competitionLive());
  if (!channel) notFound();
  redirect(`/nghi-su-duong?bac=${channel.level}`);
}
