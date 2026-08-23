import "server-only";
import { db } from "@/lib/db";
import { canAnnounce, type BulletinKind } from "@/lib/arena/season.ts";

/**
 * Bảng Bố Cáo — tầng chạm database.
 *
 * Đặc tả mục 06 đặt ra ba điều bắt buộc, và cả ba đều nằm ở đây:
 *
 * 1. **Chỉ nhóm cấp cao mới bố cáo.** Ai lên cấp cũng bố cáo thì bảng thành rác
 *    trong một tuần và tin Hoá Long mất hết trọng lượng.
 * 2. **Phải cho tắt**, dùng đúng `PublicProfile.allowHall` đã có, không làm cờ
 *    mới. Ai tắt thì không tin nào của họ lên bảng.
 * 3. **Chỉ bố cáo tin vinh danh.** Danh hiệu chất vấn nằm im trên hồ sơ, và
 *    `canAnnounce` chặn cả ba nhóm đấu trường, kể cả nhóm chuộc lỗi công khai.
 *
 * Cửa DUY NHẤT ghi vào bảng là `postBulletin`. Mọi lối vào khác đều gọi qua nó,
 * nên ba chốt trên không có đường nào đi vòng.
 */

/* ===================== Cửa duy nhất để ghi ===================== */

export async function postBulletin(input: {
  kind: BulletinKind;
  userId?: string;
  seasonId?: string;
  headline: string;
  detail?: string;
  displayName?: string;
  rankLevel?: number;
  titleCategory?: string;
  allowsPublicName: boolean;
}): Promise<boolean> {
  const decision = canAnnounce({
    kind: input.kind,
    rankLevel: input.rankLevel,
    titleCategory: input.titleCategory,
    allowsPublicName: input.allowsPublicName,
  });
  if (!decision.allowed) return false;

  await db.bulletin.create({
    data: {
      kind: input.kind,
      userId: input.userId ?? null,
      seasonId: input.seasonId ?? null,
      // Chốt tên lại lúc bố cáo. Người đổi tên hiển thị về sau không làm sai
      // lệch tin đã đăng, và tin cũ vẫn gỡ được bằng `visible`.
      displayName: input.displayName ?? null,
      headline: input.headline.slice(0, 200),
      detail: input.detail ?? null,
    },
  });
  return true;
}

/** Tên hiện trên bảng, và quyền có được hiện hay không. */
async function publicIdentity(
  userId: string,
): Promise<{ displayName: string; allowsPublicName: boolean }> {
  const row = await db.publicProfile.findUnique({
    where: { userId },
    select: { displayName: true, allowHall: true },
  });
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { name: true, isBot: true },
  });

  return {
    displayName: row?.displayName ?? user?.name ?? "Vô danh",
    // Bot không bao giờ lên bảng. Một tin bố cáo bot lên cấp là lời nói dối với
    // cả cộng đồng, và nó xuất hiện đúng vào lúc trang trọng nhất.
    allowsPublicName: Boolean(row?.allowHall) && !user?.isBot,
  };
}

/* ===================== Ba loại tin ===================== */

/**
 * Hoá Long. Chỉ từ cấp bậc 7 trở lên, xem `BULLETIN_MIN_RANK_LEVEL`.
 *
 * Gọi từ `promoteRank`, ngoài transaction và bọc try: một tin không lên bảng
 * thì thiếu một dòng, còn quay lui việc thăng cấp thì mất công của cả tháng.
 */
export async function announceRankUp(input: {
  userId: string;
  toLevel: number;
  rankName: string;
}): Promise<boolean> {
  const who = await publicIdentity(input.userId);
  return postBulletin({
    kind: "RANK_UP",
    userId: input.userId,
    displayName: who.displayName,
    rankLevel: input.toLevel,
    allowsPublicName: who.allowsPublicName,
    headline: `${who.displayName} thăng ${input.rankName}`,
    detail: `Hoá Long lên cấp bậc ${input.toLevel}.`,
  });
}

/**
 * Danh hiệu vinh danh.
 *
 * `titleCategory` BẮT BUỘC truyền vào, vì đó là thứ `canAnnounce` dùng để chặn
 * ba nhóm danh hiệu đấu trường. Thiếu nó thì cái chặn im lặng không chạy.
 */
export async function announceTitle(input: {
  userId: string;
  titleName: string;
  titleCategory: string;
  rankLevel: number;
}): Promise<boolean> {
  const who = await publicIdentity(input.userId);
  return postBulletin({
    kind: "TITLE_EARNED",
    userId: input.userId,
    displayName: who.displayName,
    rankLevel: input.rankLevel,
    titleCategory: input.titleCategory,
    allowsPublicName: who.allowsPublicName,
    headline: `${who.displayName} nhận danh hiệu ${input.titleName}`,
  });
}

/* ===================== Đọc bảng ===================== */

export type BulletinRow = {
  id: string;
  kind: string;
  headline: string;
  detail: string | null;
  createdAt: Date;
};

export async function listBulletins(take = 30): Promise<BulletinRow[]> {
  return db.bulletin.findMany({
    where: { visible: true },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      kind: true,
      headline: true,
      detail: true,
      createdAt: true,
    },
  });
}

/**
 * Gỡ một tin khỏi bảng mà KHÔNG xoá hàng.
 *
 * Người đổi ý và tắt hiện tên thì tin cũ phải gỡ được, nhưng xoá hàng là xoá
 * luôn khả năng trả lời câu hỏi "tin đó từng đăng chưa" khi có khiếu nại.
 */
export async function hideBulletin(id: string): Promise<boolean> {
  const result = await db.bulletin.updateMany({
    where: { id, visible: true },
    data: { visible: false },
  });
  return result.count > 0;
}

/**
 * Gỡ MỌI tin mang tên một người.
 *
 * Gọi khi họ tắt hiện tên ở nơi công cộng. Tắt cờ mà tin cũ vẫn nằm đó thì cái
 * nút đó chỉ là lời hứa suông.
 */
export async function hideBulletinsOf(userId: string): Promise<number> {
  const result = await db.bulletin.updateMany({
    where: { userId, visible: true },
    data: { visible: false },
  });
  return result.count;
}
