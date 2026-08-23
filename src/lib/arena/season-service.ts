import "server-only";
import { db } from "@/lib/db";
import {
  FACTION_LABEL,
  FACTION_UNLOCK_LEVEL,
  SEASON_RULE_VERSION,
  factionPointsFor,
  factionStandings,
  isFaction,
  seasonCode,
  seasonResetRating,
  seasonWindowFrom,
  seasonWinner,
  type Contribution,
  type Faction,
  type FactionStanding,
} from "@/lib/arena/season.ts";

/**
 * Mùa giải và phe phái — tầng chạm database.
 *
 * KHÔNG CÓ JOB QUÉT. Mùa chuyển khi có người ĐỌC tới nó, đúng cách Quy Điền áp
 * phần trôi lúc đọc hồ sơ. Lý do đã trả giá một lần rồi: một job im lặng hỏng
 * thì không ai biết, mà ở đây cái hỏng là cả một mùa tám tuần không đóng.
 *
 * Chốt chặn chống đóng mùa hai lần là `updateMany` kèm điều kiện `status`, đúng
 * cách `promoteRank` đang làm. Hai request cùng lúc thì chỉ một cái đổi được
 * hàng, cái kia đọc lại và thấy mùa mới.
 */

export type Season = {
  id: string;
  code: string;
  ordinal: number;
  startAt: Date;
  endAt: Date;
  status: string;
  winnerFaction: string | null;
};

const SEASON_SELECT = {
  id: true,
  code: true,
  ordinal: true,
  startAt: true,
  endAt: true,
  status: true,
  winnerFaction: true,
} as const;

/* ===================== Mở và đóng mùa ===================== */

async function openSeason(ordinal: number, startAt: Date): Promise<Season> {
  const window = seasonWindowFrom(startAt);
  return db.arenaSeason.create({
    data: {
      code: seasonCode(ordinal),
      ordinal,
      startAt: window.startAt,
      endAt: window.endAt,
      status: "ACTIVE",
      ruleVersion: SEASON_RULE_VERSION,
    },
    select: SEASON_SELECT,
  });
}

/**
 * Mùa đang chạy. Tự mở mùa đầu, tự chuyển mùa khi hết hạn.
 *
 * Gọi ở mọi chỗ cần biết mùa nào: màn đấu trường, bảng xếp hạng phe, lúc quyết
 * toán trận. Rẻ trong trường hợp thường gặp (một truy vấn), và chỉ làm việc
 * nặng đúng một lần mỗi tám tuần.
 */
export async function currentSeason(now = new Date()): Promise<Season> {
  const active = await db.arenaSeason.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { ordinal: "desc" },
    select: SEASON_SELECT,
  });

  if (!active) {
    const last = await db.arenaSeason.findFirst({
      orderBy: { ordinal: "desc" },
      select: { ordinal: true },
    });
    return openSeason((last?.ordinal ?? 0) + 1, now);
  }

  if (now < active.endAt) return active;
  return closeSeasonAndOpenNext(active, now);
}

/**
 * Đóng một mùa và mở mùa kế.
 *
 * Thứ tự các bước có chủ ý: CHỐT trạng thái trước, rồi mới tính toán. Nếu tính
 * trước rồi mới chốt thì hai request song song cùng tính, cùng ghi, và mùa có
 * hai tin tổng kết khác nhau.
 */
async function closeSeasonAndOpenNext(season: Season, now: Date): Promise<Season> {
  const claimed = await db.arenaSeason.updateMany({
    where: { id: season.id, status: "ACTIVE" },
    data: { status: "ENDED", closedAt: now },
  });

  if (claimed.count === 0) {
    // Request khác đã đóng mùa này. Đọc lại và dùng kết quả của họ.
    const next = await db.arenaSeason.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { ordinal: "desc" },
      select: SEASON_SELECT,
    });
    if (next) return next;
    return openSeason(season.ordinal + 1, now);
  }

  const standings = await standingsOf(season.id);
  const winner = seasonWinner(standings);

  const resetCount = await pullRatingsToMiddle();

  await db.arenaSeason.update({
    where: { id: season.id },
    data: { winnerFaction: winner, ratingsReset: resetCount },
  });

  await announceSeasonResult(season, standings, winner);

  return openSeason(season.ordinal + 1, now);
}

/**
 * Kéo Chiến Lực về giữa, CHỈ với người thật.
 *
 * Bot cố ý KHÔNG bị kéo. Ba mươi bot tồn tại để mọi mức Chiến Lực đều có đối
 * thủ; dồn hết bot về 1000 là lấy mất đối thủ của người mạnh và người yếu ngay
 * tuần đầu mùa mới, tức làm hỏng đúng thứ mà bot sinh ra để giải quyết.
 *
 * Cấp bậc, kinh nghiệm và Quân Công KHÔNG bị đụng tới. Ba thứ đó là công sức
 * học thật, còn Chiến Lực chỉ là thước đo để ghép cặp trong một mùa.
 */
async function pullRatingsToMiddle(): Promise<number> {
  const profiles = await db.arenaProfile.findMany({
    where: { user: { isBot: false } },
    select: { id: true, chienLuc: true },
  });

  let changed = 0;
  for (const profile of profiles) {
    const next = seasonResetRating(profile.chienLuc);
    if (next === profile.chienLuc) continue;
    await db.arenaProfile.update({
      where: { id: profile.id },
      data: { chienLuc: next },
    });
    changed++;
  }
  return changed;
}

/* ===================== Chọn phe ===================== */

export type FactionChoiceState = {
  faction: Faction | null;
  canChoose: boolean;
  /** Lý do chưa chọn được, để hiện thẳng cho người dùng đọc. */
  reason: string;
  unlockLevel: number;
};

export async function factionChoiceState(
  userId: string,
  now = new Date(),
): Promise<FactionChoiceState> {
  const season = await currentSeason(now);
  const [profile, rank] = await Promise.all([
    db.arenaProfile.findUnique({
      where: { userId },
      select: { faction: true, factionSeasonId: true },
    }),
    db.userRank.findUnique({ where: { userId }, select: { currentLevel: true } }),
  ]);

  const faction =
    profile?.faction && isFaction(profile.faction) ? profile.faction : null;
  const level = rank?.currentLevel ?? 1;

  if (level < FACTION_UNLOCK_LEVEL) {
    return {
      faction,
      canChoose: false,
      reason: `Chọn phe mở từ cấp bậc ${FACTION_UNLOCK_LEVEL}. Hiện bạn ở cấp ${level}.`,
      unlockLevel: FACTION_UNLOCK_LEVEL,
    };
  }

  // Khoá suốt mùa. Cho đổi phe giữa mùa là mở đường chạy sang phe đang thắng
  // vào tuần cuối, và khi đó bảng xếp hạng phe không còn đo được điều gì.
  if (faction && profile?.factionSeasonId === season.id) {
    return {
      faction,
      canChoose: false,
      reason: `Phe đã chọn cho mùa ${season.code}. Đổi phe mở lại khi sang mùa mới.`,
      unlockLevel: FACTION_UNLOCK_LEVEL,
    };
  }

  return {
    faction,
    canChoose: true,
    reason: faction
      ? "Mùa mới đã mở. Bạn có thể giữ phe cũ hoặc chọn phe khác."
      : "Chọn một phe để điểm của bạn được tính vào bảng xếp hạng.",
    unlockLevel: FACTION_UNLOCK_LEVEL,
  };
}

export async function chooseFaction(input: {
  userId: string;
  faction: string;
  now?: Date;
}): Promise<{ ok: boolean; reason?: string }> {
  const now = input.now ?? new Date();
  if (!isFaction(input.faction)) return { ok: false, reason: "Phe không hợp lệ." };

  const state = await factionChoiceState(input.userId, now);
  if (!state.canChoose) return { ok: false, reason: state.reason };

  const season = await currentSeason(now);

  // ArenaProfile có thể chưa tồn tại nếu người này chưa vào đấu trường lần nào.
  await db.arenaProfile.upsert({
    where: { userId: input.userId },
    create: {
      userId: input.userId,
      faction: input.faction,
      factionChosenAt: now,
      factionSeasonId: season.id,
    },
    update: {
      faction: input.faction,
      factionChosenAt: now,
      factionSeasonId: season.id,
    },
  });

  return { ok: true };
}

/* ===================== Ghi điểm phe ===================== */

/**
 * Lần thứ mấy hai người này gặp nhau trong ngày hôm nay.
 *
 * Đếm theo `dateKey` giờ Việt Nam, đúng cách `StudyDay` đang làm, chứ không
 * theo hai mươi bốn giờ trượt: người dùng nghĩ theo NGÀY, và một luật mà họ
 * không đoán được thì không đổi được hành vi của họ.
 */
async function nthMeetingToday(
  userId: string,
  opponentId: string,
  now: Date,
): Promise<number> {
  const dayStart = new Date(now);
  dayStart.setUTCHours(dayStart.getUTCHours() + 7);
  dayStart.setUTCHours(0, 0, 0, 0);
  dayStart.setUTCHours(dayStart.getUTCHours() - 7);

  const met = await db.duel.count({
    where: {
      settledAt: { gte: dayStart, lte: now },
      sides: { some: { userId } },
      AND: [{ sides: { some: { userId: opponentId } } }],
    },
  });
  return Math.max(1, met);
}

/**
 * Ghi điểm phe cho một trận vừa quyết toán.
 *
 * Gọi SAU `settleDuel`, ngoài transaction tiền bạc, bọc try ở tầng gọi. Trả về
 * số dòng đã ghi, và 0 là trường hợp thường gặp nhất: phần lớn trận là trận với
 * bot hoặc trận của người chưa chọn phe.
 *
 * Chống ghi hai lần nằm ở ràng buộc `(seasonId, duelId, userId)` trong database
 * chứ không ở tầng logic, đúng cách `ledgerKey` của sổ Quân Công đang làm.
 */
export async function recordFactionPoints(input: {
  duelId: string;
  now?: Date;
}): Promise<number> {
  const now = input.now ?? new Date();

  const duel = await db.duel.findUnique({
    where: { id: input.duelId },
    select: {
      id: true,
      status: true,
      winnerId: true,
      sides: {
        select: {
          userId: true,
          user: {
            select: {
              isBot: true,
              arenaProfile: { select: { faction: true, chienLuc: true } },
            },
          },
        },
      },
    },
  });
  if (!duel || duel.sides.length !== 2) return 0;

  // Giảng hoà không sinh điểm phe: hai người bấm hoà ở giây thứ năm.
  const truce = duel.status === "TRUCE";
  const season = await currentSeason(now);

  let written = 0;
  for (const side of duel.sides) {
    const opponent = duel.sides.find((s) => s.userId !== side.userId);
    if (!opponent) continue;

    const faction = side.user.arenaProfile?.faction;
    if (!faction || !isFaction(faction)) continue;
    if (side.user.isBot) continue;

    const points = factionPointsFor({
      won: duel.winnerId === side.userId,
      truce,
      opponentIsBot: opponent.user.isBot,
      opponentRating: opponent.user.arenaProfile?.chienLuc ?? 1000,
      nthMeetingToday: await nthMeetingToday(side.userId, opponent.userId, now),
    });
    if (points <= 0) continue;

    try {
      await db.factionPointEntry.create({
        data: {
          seasonId: season.id,
          userId: side.userId,
          faction,
          duelId: duel.id,
          points,
        },
      });
      written++;
    } catch {
      // Ràng buộc duy nhất đã chặn: trận này đã ghi điểm rồi. Không phải lỗi.
    }
  }

  return written;
}

/* ===================== Bảng xếp hạng phe ===================== */

export async function standingsOf(seasonId: string): Promise<FactionStanding[]> {
  const rows = await db.factionPointEntry.groupBy({
    by: ["userId", "faction"],
    where: { seasonId },
    _sum: { points: true },
  });

  const contributions: Contribution[] = rows
    .filter((r) => isFaction(r.faction))
    .map((r) => ({
      userId: r.userId,
      faction: r.faction as Faction,
      points: r._sum.points ?? 0,
    }));

  return factionStandings(contributions);
}

export type ContributorRow = {
  userId: string;
  displayName: string;
  points: number;
};

/**
 * Nhóm đóng góp nhiều nhất của MỘT phe, để hiện dưới bảng xếp hạng.
 *
 * Chỉ hiện tên người đã bật cho hiện tên ở nơi công cộng. Ai tắt thì vẫn được
 * tính điểm đầy đủ, chỉ là hiện dưới dạng ẩn danh: đóng góp của họ không bị mất
 * chỉ vì họ không muốn lên bảng.
 */
export async function topContributors(
  seasonId: string,
  faction: Faction,
  take: number,
): Promise<ContributorRow[]> {
  const rows = await db.factionPointEntry.groupBy({
    by: ["userId"],
    where: { seasonId, faction },
    _sum: { points: true },
    orderBy: { _sum: { points: "desc" } },
    take,
  });
  if (rows.length === 0) return [];

  const users = await db.user.findMany({
    where: { id: { in: rows.map((r) => r.userId) } },
    select: {
      id: true,
      name: true,
      publicProfile: { select: { displayName: true, allowLeaderboard: true } },
    },
  });
  const byId = new Map(users.map((u) => [u.id, u]));

  return rows.map((r) => {
    const user = byId.get(r.userId);
    const shown = user?.publicProfile?.allowLeaderboard
      ? (user.publicProfile.displayName ?? user.name ?? "Vô danh")
      : "Ẩn danh";
    return { userId: r.userId, displayName: shown, points: r._sum.points ?? 0 };
  });
}

/** Điểm phe của chính người này trong mùa đang chạy. */
export async function myFactionPoints(
  userId: string,
  seasonId: string,
): Promise<number> {
  const row = await db.factionPointEntry.aggregate({
    where: { userId, seasonId },
    _sum: { points: true },
  });
  return row._sum.points ?? 0;
}

/* ===================== Lãnh địa ===================== */

/**
 * Phe đang giữ lãnh địa: phe thắng mùa TRƯỚC.
 *
 * Phần thưởng nằm ở mùa sau, nên nó vẫn còn ý nghĩa với người mới vào giữa mùa,
 * và phe thắng có thứ để giữ chứ không chỉ có thứ để khoe.
 */
export async function territoryOwner(): Promise<Faction | null> {
  const last = await db.arenaSeason.findFirst({
    where: { status: "ENDED", winnerFaction: { not: null } },
    orderBy: { ordinal: "desc" },
    select: { winnerFaction: true },
  });
  const code = last?.winnerFaction;
  return code && isFaction(code) ? code : null;
}

/* ===================== Tin tổng kết mùa ===================== */

async function announceSeasonResult(
  season: Season,
  standings: readonly FactionStanding[],
  winner: Faction | null,
): Promise<void> {
  const { postBulletin } = await import("@/lib/arena/bulletin-service");

  const board = standings
    .map((s) => `${FACTION_LABEL[s.faction]} ${s.score}`)
    .join(", ");

  await postBulletin({
    kind: "SEASON_RESULT",
    seasonId: season.id,
    headline: winner
      ? `Mùa ${season.code} khép lại, ${FACTION_LABEL[winner]} chiếm lãnh địa`
      : `Mùa ${season.code} khép lại, ba phe bất phân thắng bại`,
    detail: winner
      ? `Điểm nhóm đầu mỗi phe: ${board}. ${FACTION_LABEL[winner]} giữ lãnh địa tới hết mùa sau.`
      : `Điểm nhóm đầu mỗi phe: ${board}. Không phe nào đủ cách biệt để tuyên bố thắng, nên lãnh địa giữ nguyên chủ cũ.`,
    allowsPublicName: true,
  });
}
