/**
 * Đấu trường — tầng chạm database, giai đoạn P4.
 *
 * Có mặt, hàng đợi ghép cặp, Quy Điền, cập nhật Chiến Lực.
 *
 * MỘT SAI LỆCH SO VỚI ĐẶC TẢ, và lý do:
 *
 *   Đặc tả nhắc tới SSE cho đấu trường. Dự án này KHÔNG có SSE ở đâu cả, và
 *   chính đặc tả mục 04 đã ghi "logic dò mất kết nối vốn rất khó tin cậy với
 *   SSE trên Hostinger". Nên P4 dùng NHỊP TIM và MỐC THỜI GIAN, đúng cách
 *   `StudyPresence` và `api/study/heartbeat` đang làm.
 *
 *   Đổi lại được ba thứ: không phụ thuộc kết nối sống, đọc được sau khi máy chủ
 *   khởi động lại, và không cần viết logic dò mất kết nối. Cái giá là danh sách
 *   người có mặt trễ tối đa một nhịp tim, khoảng 15 giây. Với một sân đấu mà
 *   trận kéo dài 10 tới 15 phút thì độ trễ đó không ai nhận ra.
 */
import "server-only";
import { db } from "@/lib/db";
import {
  APPOINTMENT_GRACE_MINUTES,
  BASE_RATING,
  PRESENCE_TTL_SECONDS,
  checkAppointment,
  applyDuelResult,
  findOpponent,
  quyDienDrift,
  targetBotCount,
  type QueueEntry,
} from "@/lib/arena/rating.ts";

/* ===================== Hồ sơ đấu trường ===================== */

/**
 * Lấy hồ sơ, tạo nếu chưa có, và ÁP PHẦN TRÔI của Quy Điền nếu tới hạn.
 *
 * Áp phần trôi ở đây thay vì chạy một job riêng: hồ sơ chỉ có ý nghĩa khi có
 * người đọc nó, và đọc tới đâu tính tới đó thì không bao giờ có một job im lặng
 * hỏng mà không ai biết.
 */
export async function getArenaProfile(userId: string, now = new Date()) {
  const profile = await db.arenaProfile.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });

  if (!profile.quyDienAt) return profile;

  const since = profile.driftedAt ?? profile.quyDienAt;
  const days = Math.floor((now.getTime() - since.getTime()) / 86_400_000);
  if (days <= 0) return profile;

  const drifted = quyDienDrift({ rating: profile.chienLuc, daysWithdrawn: days });
  if (drifted === profile.chienLuc) {
    // Đã chạm sàn. Vẫn ghi mốc để lần sau không tính lại cùng những ngày đó.
    return db.arenaProfile.update({
      where: { userId },
      data: { driftedAt: now },
    });
  }
  return db.arenaProfile.update({
    where: { userId },
    data: { chienLuc: drifted, driftedAt: now },
  });
}

/* ===================== Quy Điền ===================== */

export async function enterQuyDien(userId: string, now = new Date()) {
  await db.matchQueueEntry.deleteMany({ where: { userId } });
  await db.arenaPresence.deleteMany({ where: { userId } });
  return db.arenaProfile.upsert({
    where: { userId },
    create: { userId, quyDienAt: now, driftedAt: now },
    update: { quyDienAt: now, driftedAt: now },
  });
}

/**
 * Quay lại đấu trường.
 *
 * Áp nốt phần trôi TRƯỚC khi xoá mốc, nếu không thì bấm Quy Điền rồi quay lại
 * ngay là cách xoá sạch cái giá.
 */
export async function leaveQuyDien(userId: string, now = new Date()) {
  await getArenaProfile(userId, now);
  return db.arenaProfile.update({
    where: { userId },
    data: { quyDienAt: null, driftedAt: null },
  });
}

export async function isInQuyDien(userId: string): Promise<boolean> {
  const p = await db.arenaProfile.findUnique({
    where: { userId },
    select: { quyDienAt: true },
  });
  return Boolean(p?.quyDienAt);
}

/* ===================== Có mặt ===================== */

/**
 * Nhịp tim. Gọi mỗi 15 giây từ màn đấu trường.
 *
 * Người đang Quy Điền KHÔNG được ghi nhận có mặt: họ đã tuyên bố rút, và có mặt
 * mà không ai thách được thì chỉ làm danh sách dài ra vô ích.
 */
export async function heartbeat(input: {
  userId: string;
  status?: "IDLE" | "QUEUED" | "IN_DUEL";
  now?: Date;
}): Promise<boolean> {
  const now = input.now ?? new Date();
  if (await isInQuyDien(input.userId)) return false;

  await db.arenaPresence.upsert({
    where: { userId: input.userId },
    create: { userId: input.userId, lastSeenAt: now, status: input.status ?? "IDLE" },
    update: { lastSeenAt: now, status: input.status ?? "IDLE" },
  });
  return true;
}

export type PresentPlayer = {
  userId: string;
  name: string;
  chienLuc: number;
  status: string;
  isBot: boolean;
};

/**
 * Ai đang có mặt.
 *
 * Lọc theo `lastSeenAt` chứ không xoá bản ghi cũ: một hàng cũ vô hại, còn xoá
 * thì mất luôn khả năng biết ai vừa rời sân lúc nào.
 */
export async function presentPlayers(now = new Date()): Promise<PresentPlayer[]> {
  const cutoff = new Date(now.getTime() - PRESENCE_TTL_SECONDS * 1000);
  const rows = await db.arenaPresence.findMany({
    where: { lastSeenAt: { gt: cutoff } },
    orderBy: { lastSeenAt: "desc" },
    take: 200,
  });
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.userId);
  const [users, profiles] = await Promise.all([
    db.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, isBot: true },
    }),
    db.arenaProfile.findMany({
      where: { userId: { in: ids } },
      select: { userId: true, chienLuc: true },
    }),
  ]);
  const userById = new Map(users.map((u) => [u.id, u]));
  const ratingById = new Map(profiles.map((p) => [p.userId, p.chienLuc]));

  return rows
    .map((r) => {
      const u = userById.get(r.userId);
      if (!u) return null;
      return {
        userId: r.userId,
        name: u.name,
        chienLuc: ratingById.get(r.userId) ?? BASE_RATING,
        status: r.status,
        isBot: u.isBot,
      };
    })
    .filter((x): x is PresentPlayer => x !== null);
}

/* ===================== Hàng đợi ghép cặp ===================== */

export async function joinQueue(input: {
  userId: string;
  stake: number;
  now?: Date;
}): Promise<boolean> {
  const now = input.now ?? new Date();
  if (await isInQuyDien(input.userId)) return false;

  const profile = await getArenaProfile(input.userId, now);
  await db.matchQueueEntry.upsert({
    where: { userId: input.userId },
    create: {
      userId: input.userId,
      rating: profile.chienLuc,
      stake: input.stake,
      joinedAt: now,
    },
    // Giữ nguyên `joinedAt` khi gọi lại: nếu ghi đè thì mỗi nhịp tim lại đặt
    // lại thời gian chờ về 0 và dải ghép cặp không bao giờ nới ra.
    update: { rating: profile.chienLuc, stake: input.stake },
  });
  await heartbeat({ userId: input.userId, status: "QUEUED", now });
  return true;
}

export async function leaveQueue(userId: string): Promise<void> {
  await db.matchQueueEntry.deleteMany({ where: { userId } });
}

/**
 * Tìm đối thủ cho một người đang trong hàng đợi.
 *
 * Chỉ ĐỌC và trả về gợi ý; việc tạo trận do tầng gọi làm, để hàm này kiểm thử
 * được và để không có hai chỗ cùng tạo trận.
 */
export async function findMatch(input: {
  userId: string;
  now?: Date;
}): Promise<string | null> {
  const now = input.now ?? new Date();
  const entries = await db.matchQueueEntry.findMany({ take: 200 });
  const mine = entries.find((e) => e.userId === input.userId);
  if (!mine) return null;

  // Đối thủ đã gặp hôm nay, để ưu tiên người mới.
  const dayAgo = new Date(now.getTime() - 86_400_000);
  const recent = await db.duelSide.findMany({
    where: { userId: input.userId, createdAt: { gt: dayAgo } },
    select: { duel: { select: { sides: { select: { userId: true } } } } },
  });
  const metToday = new Set<string>();
  for (const r of recent) {
    for (const s of r.duel.sides) {
      if (s.userId !== input.userId) metToday.add(s.userId);
    }
  }

  const toEntry = (e: (typeof entries)[number]): QueueEntry => ({
    userId: e.userId,
    rating: e.rating,
    waitedSeconds: Math.floor((now.getTime() - e.joinedAt.getTime()) / 1000),
    // Chỉ người tìm mới cần danh sách đã gặp; các ứng viên khác để rỗng, vì
    // ta không đọc lịch sử của từng người trong hàng đợi cho một lần ghép.
    metToday: e.userId === input.userId ? metToday : new Set<string>(),
  });

  const found = findOpponent(
    toEntry(mine),
    entries.filter((e) => e.userId !== input.userId).map(toEntry),
  );
  return found?.userId ?? null;
}

/* ===================== Cập nhật Chiến Lực sau trận ===================== */

/**
 * Ghi kết quả trận vào hồ sơ hai bên.
 *
 * Gọi SAU khi `settleDuel` đã chốt kết quả. Tách khỏi quyết toán Quân Công là
 * có chủ ý: Chiến Lực sai thì bảng xếp hạng lệch, Quân Công sai thì có người
 * mất tiền. Hai mức hậu quả khác nhau thì không nên nằm chung một transaction
 * mà một lỗi nhỏ ở bên nhẹ làm quay lui cả bên nặng.
 *
 * Giảng hoà KHÔNG gọi hàm này: trung tính ở mọi chiều, kể cả Chiến Lực.
 */
export async function applyDuelToRatings(input: {
  duelId: string;
  winnerId: string | null;
  now?: Date;
}): Promise<void> {
  const now = input.now ?? new Date();
  const duel = await db.duel.findUnique({
    where: { id: input.duelId },
    select: { status: true, sides: { select: { userId: true } } },
  });
  if (!duel || duel.sides.length !== 2) return;
  if (duel.status !== "SETTLED") return;

  const [aId, bId] = duel.sides.map((s) => s.userId);
  const [a, b] = await Promise.all([
    getArenaProfile(aId, now),
    getArenaProfile(bId, now),
  ]);

  const outcomeFor = (userId: string): 0 | 0.5 | 1 => {
    if (input.winnerId === null) return 0.5;
    return input.winnerId === userId ? 1 : 0;
  };

  const changeA = applyDuelResult({
    rating: a.chienLuc,
    opponentRating: b.chienLuc,
    duelsPlayed: a.duelsPlayed,
    outcome: outcomeFor(aId),
  });
  const changeB = applyDuelResult({
    rating: b.chienLuc,
    opponentRating: a.chienLuc,
    duelsPlayed: b.duelsPlayed,
    outcome: outcomeFor(bId),
  });

  await db.$transaction([
    db.arenaProfile.update({
      where: { userId: aId },
      data: {
        chienLuc: changeA.after,
        duelsPlayed: { increment: 1 },
        wins: outcomeFor(aId) === 1 ? { increment: 1 } : undefined,
        losses: outcomeFor(aId) === 0 ? { increment: 1 } : undefined,
      },
    }),
    db.arenaProfile.update({
      where: { userId: bId },
      data: {
        chienLuc: changeB.after,
        duelsPlayed: { increment: 1 },
        wins: outcomeFor(bId) === 1 ? { increment: 1 } : undefined,
        losses: outcomeFor(bId) === 0 ? { increment: 1 } : undefined,
      },
    }),
  ]);
}

/** Giảng hoà chỉ ghi MỘT dấu vào cột Hoà khí. Không đụng Chiến Lực. */
export async function recordTruce(duelId: string): Promise<void> {
  const duel = await db.duel.findUnique({
    where: { id: duelId },
    select: { sides: { select: { userId: true } } },
  });
  if (!duel) return;
  for (const s of duel.sides) {
    await db.arenaProfile.upsert({
      where: { userId: s.userId },
      create: { userId: s.userId, truces: 1 },
      update: { truces: { increment: 1 } },
    });
  }
}

/* ===================== Hẹn trận ===================== */

export type AppointmentResult =
  | { ok: true; appointmentId: string }
  | { ok: false; reason: "SELF" | "TOO_SOON" | "TOO_FAR" | "DUPLICATE" };

/**
 * Đặt lịch đấu với ai đó vào giờ sau.
 *
 * Đây là cách DUY NHẤT để hai người bận vẫn đấu được, khi trận buộc phải diễn
 * ra đồng thời. Không có nó thì đấu trường chỉ phục vụ những người tình cờ
 * online cùng lúc, và đó là phần lớn lý do sân rỗng.
 */
export async function createAppointment(input: {
  fromUserId: string;
  toUserId: string;
  stake: number;
  scheduledAt: Date;
  now?: Date;
}): Promise<AppointmentResult> {
  const now = input.now ?? new Date();
  if (input.fromUserId === input.toUserId) return { ok: false, reason: "SELF" };

  const check = checkAppointment({ at: input.scheduledAt, now });
  if (!check.ok) return { ok: false, reason: check.reason };

  // Một cặp chỉ được có một lịch đang chờ. Cùng lý do chiến thư chỉ được treo
  // một lá: không có luật này thì hộp thư của người kia thành bãi rác.
  const existing = await db.duelAppointment.findFirst({
    where: {
      fromUserId: input.fromUserId,
      toUserId: input.toUserId,
      status: { in: ["PENDING", "ACCEPTED"] },
    },
    select: { id: true },
  });
  if (existing) return { ok: false, reason: "DUPLICATE" };

  const row = await db.duelAppointment.create({
    data: {
      fromUserId: input.fromUserId,
      toUserId: input.toUserId,
      stake: Math.max(0, Math.floor(input.stake)),
      scheduledAt: input.scheduledAt,
    },
    select: { id: true },
  });
  return { ok: true, appointmentId: row.id };
}

export async function respondToAppointment(input: {
  appointmentId: string;
  userId: string;
  accept: boolean;
}): Promise<boolean> {
  const result = await db.duelAppointment.updateMany({
    where: {
      id: input.appointmentId,
      toUserId: input.userId,
      status: "PENDING",
    },
    data: { status: input.accept ? "ACCEPTED" : "DECLINED" },
  });
  return result.count > 0;
}

/**
 * Lịch hẹn sắp tới của một người, cả lịch mình đặt lẫn lịch người khác đặt cho.
 *
 * Lọc bỏ những lịch đã quá giờ ân hạn: giữ chúng trên màn hình chỉ làm người ta
 * tưởng còn kịp.
 */
export async function upcomingAppointments(userId: string, now = new Date()) {
  const cutoff = new Date(now.getTime() - APPOINTMENT_GRACE_MINUTES * 60_000);
  const rows = await db.duelAppointment.findMany({
    where: {
      OR: [{ fromUserId: userId }, { toUserId: userId }],
      status: { in: ["PENDING", "ACCEPTED"] },
      scheduledAt: { gt: cutoff },
    },
    orderBy: { scheduledAt: "asc" },
    take: 20,
    select: {
      id: true,
      fromUserId: true,
      toUserId: true,
      stake: true,
      status: true,
      scheduledAt: true,
      fromUser: { select: { name: true } },
      toUser: { select: { name: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    stake: r.stake,
    status: r.status,
    scheduledAt: r.scheduledAt,
    /** Mình là người đặt lịch hay người được mời. */
    isMine: r.fromUserId === userId,
    otherName: r.fromUserId === userId ? r.toUser.name : r.fromUser.name,
  }));
}

/* ===================== Bảng xếp hạng ===================== */

/**
 * Bảng xếp hạng Chiến Lực.
 *
 * Người đang Quy Điền BIẾN KHỎI BẢNG. Đó là một phần của cái giá, và cũng là
 * thứ khiến bảng nói đúng: nó liệt kê những người đang thật sự ra trận.
 */
export async function leaderboard(take = 50) {
  const rows = await db.arenaProfile.findMany({
    where: { quyDienAt: null },
    orderBy: { chienLuc: "desc" },
    take,
    select: {
      userId: true,
      chienLuc: true,
      wins: true,
      losses: true,
      truces: true,
      duelsPlayed: true,
    },
  });
  if (rows.length === 0) return [];

  const users = await db.user.findMany({
    where: { id: { in: rows.map((r) => r.userId) } },
    select: { id: true, name: true, isBot: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));
  return rows.map((r) => ({
    ...r,
    name: byId.get(r.userId)?.name ?? "Ẩn danh",
    isBot: byId.get(r.userId)?.isBot ?? false,
  }));
}

/* ===================== Dân số bot ===================== */

/**
 * Số bot NÊN có mặt, và số đang có mặt.
 *
 * Bot dư rút qua ĐÚNG CỬA mà người thật dùng, tức Quy Điền. Không cần code đặc
 * biệt, và nhìn từ ngoài y hệt một người bận việc tạm nghỉ.
 */
export async function botPopulation(now = new Date()) {
  const present = await presentPlayers(now);
  const humans = present.filter((p) => !p.isBot).length;
  const bots = present.length - humans;
  return { humans, bots, target: targetBotCount(humans) };
}

