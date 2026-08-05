/**
 * Kiểm thử TÍCH HỢP tuyển chọn ba tầng — chạm database thật.
 * Chạy: npm run test:qualification-db   (cần MySQL cục bộ)
 *
 * Bổ sung cho `test-competition-qualification.ts` vốn chỉ kiểm hàm thuần.
 * File này kiểm phần NỐI: chốt chặn phía máy chủ, giao dịch nhận vé, và tính
 * idempotent khi sinh vé hai lần.
 *
 * Bất biến quan trọng nhất, theo đặc tả Muc 13.1: người không có vé ACCEPTED
 * KHÔNG được tạo CompetitionEntry cho Dương Thí hay Thiên Thí, kể cả khi gọi
 * thẳng Server Action. Giao diện ẩn nút không phải là bảo vệ.
 *
 * CHỐT AN TOÀN: từ chối chạy nếu DATABASE_URL không trỏ localhost.
 */

import fs from "node:fs";
import { db } from "@/lib/db";
import {
  acceptQualification,
  assertMayEnter,
  declineQualification,
} from "@/lib/competition/qualification-service";

const url = fs.readFileSync(".env", "utf8").match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/)?.[1] ?? "";
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
  console.error("TỪ CHỐI: DATABASE_URL không trỏ localhost. Script này ghi và xoá dữ liệu.");
  process.exit(1);
}

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${ok ? "✓" : "✗ THẤT BẠI:"} ${label}`);
  if (!ok) {
    console.log(`      mong đợi ${JSON.stringify(expected)}, nhận ${JSON.stringify(actual)}`);
    failures++;
  }
}

const stamp = Date.now();
const created: { users: string[]; competitions: string[] } = { users: [], competitions: [] };

async function makeUser(tag: string) {
  const user = await db.user.create({
    data: {
      email: `qual-${tag}-${stamp}@local.test`,
      name: `Qual Test ${tag}`,
      passwordHash: "x",
      role: "STUDENT",
    },
    select: { id: true },
  });
  created.users.push(user.id);
  return user.id;
}

async function makeCompetition(tier: string, tag: string) {
  const now = new Date();
  const comp = await db.competition.create({
    data: {
      code: `TEST-${tier}-${tag}-${stamp}`,
      name: `Kỳ thử ${tier} ${tag}`,
      tier,
      seasonKey: tier === "QUARTERLY" ? "2026-Q3" : "2026",
      registrationOpenAt: now,
      registrationCloseAt: now,
      startAt: now,
      endAt: now,
    },
    select: { id: true },
  });
  created.competitions.push(comp.id);
  return comp.id;
}

async function cleanup() {
  await db.competitionQualification
    .deleteMany({ where: { targetCompetitionId: { in: created.competitions } } })
    .catch(() => {});
  await db.competitionEntry
    .deleteMany({ where: { competitionId: { in: created.competitions } } })
    .catch(() => {});
  await db.competition.deleteMany({ where: { id: { in: created.competitions } } }).catch(() => {});
  await db.user.deleteMany({ where: { id: { in: created.users } } }).catch(() => {});
}

try {
  console.log("\n— Chốt chặn phía máy chủ —");

  const quarterly = await makeCompetition("QUARTERLY", "guard");
  const outsider = await makeUser("outsider");

  const blocked = await assertMayEnter(quarterly, outsider);
  check("người KHÔNG có vé bị chặn vào Dương Thí", blocked.ok, false);

  const monthly = await makeCompetition("MONTHLY", "open");
  const anyone = await makeUser("anyone");
  const openTier = await assertMayEnter(monthly, anyone);
  check("Nguyệt Thí vẫn cho đăng ký mở", openTier.ok, true);

  console.log("\n— Nhận vé —");

  const invited = await makeUser("invited");
  const offer = await db.competitionQualification.create({
    data: {
      targetCompetitionId: quarterly,
      sourceCompetitionId: monthly,
      sourceEntryId: `entry-${stamp}`,
      userId: invited,
      sourceRank: 2,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    select: { id: true },
  });

  const stillBlocked = await assertMayEnter(quarterly, invited);
  check("có vé nhưng CHƯA nhận thì vẫn bị chặn", stillBlocked.ok, false);

  const accepted = await acceptQualification(offer.id, invited);
  check("nhận vé thành công", accepted.ok, true);

  const nowAllowed = await assertMayEnter(quarterly, invited);
  check("sau khi nhận vé thì được vào", nowAllowed.ok, true);

  const entry = await db.competitionEntry.findUnique({
    where: { competitionId_userId: { competitionId: quarterly, userId: invited } },
    select: { entrySource: true, qualificationId: true },
  });
  check("suất thi ghi nguồn là QUALIFIED", entry?.entrySource, "QUALIFIED");
  check("suất thi truy ngược được về vé", entry?.qualificationId, offer.id);

  const twice = await acceptQualification(offer.id, invited);
  check("nhận lại lần hai không tạo suất thi thứ hai", twice.ok, true);
  const entryCount = await db.competitionEntry.count({
    where: { competitionId: quarterly, userId: invited },
  });
  check("vẫn chỉ có đúng một suất thi", entryCount, 1);

  console.log("\n— Không nhận vé của người khác —");

  const stranger = await makeUser("stranger");
  const stolen = await acceptQualification(offer.id, stranger);
  check("không nhận được vé của người khác", stolen.ok, false);

  console.log("\n— Vé hết hạn —");

  const late = await makeUser("late");
  const expired = await db.competitionQualification.create({
    data: {
      targetCompetitionId: quarterly,
      sourceCompetitionId: monthly,
      sourceEntryId: `entry-late-${stamp}`,
      userId: late,
      sourceRank: 5,
      expiresAt: new Date(Date.now() - 1000),
    },
    select: { id: true },
  });
  const tooLate = await acceptQualification(expired.id, late);
  check("vé quá hạn không nhận được", tooLate.ok, false);
  const afterExpire = await db.competitionQualification.findUnique({
    where: { id: expired.id },
    select: { status: true },
  });
  check("vé quá hạn được đánh dấu EXPIRED", afterExpire?.status, "EXPIRED");
  const lateEntry = await db.competitionEntry.count({
    where: { competitionId: quarterly, userId: late },
  });
  check("vé quá hạn KHÔNG tạo suất thi nào", lateEntry, 0);

  console.log("\n— Từ chối vé —");

  const decliner = await makeUser("decliner");
  const toDecline = await db.competitionQualification.create({
    data: {
      targetCompetitionId: quarterly,
      sourceCompetitionId: monthly,
      sourceEntryId: `entry-dec-${stamp}`,
      userId: decliner,
      sourceRank: 4,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    select: { id: true },
  });
  const declined = await declineQualification(toDecline.id, decliner);
  check("từ chối vé thành công", declined.ok, true);
  const afterDecline = await acceptQualification(toDecline.id, decliner);
  check("từ chối rồi thì không nhận lại được", afterDecline.ok, false);
  check(
    "từ chối xong vẫn bị chặn vào kỳ thi",
    (await assertMayEnter(quarterly, decliner)).ok,
    false,
  );
} finally {
  await cleanup();
  await db.$disconnect();
}

console.log(
  failures === 0
    ? "\n✅ TẤT CẢ KIỂM THỬ TÍCH HỢP TUYỂN CHỌN ĐỀU ĐẠT\n"
    : `\n❌ ${failures} KIỂM THỬ THẤT BẠI\n`,
);
process.exit(failures === 0 ? 0 : 1);
