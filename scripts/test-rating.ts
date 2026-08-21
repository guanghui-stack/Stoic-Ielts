/**
 * Kiểm thử Chiến Lực, ghép cặp, Quy Điền.
 * Chạy: node --experimental-strip-types scripts/test-rating.ts
 *
 * Hai bài quan trọng nhất:
 *
 *   1. Quy Điền chỉ trôi XUỐNG và có SÀN. Nếu trôi về trung vị thì người đang
 *      thua sấp mặt được kéo lên, và cái giá đặt ra để phạt kẻ trốn hoá thành
 *      phần thưởng cho đúng người cần bắt.
 *   2. Ghép cặp phải nằm trong dải của CẢ HAI bên. Chỉ xét dải của người chờ
 *      lâu thì người vừa vào bị kéo vào một trận lệch hẳn mà họ không đồng ý.
 */
import {
  APPOINTMENT_GRACE_MINUTES,
  APPOINTMENT_MAX_LEAD_DAYS,
  APPOINTMENT_MIN_LEAD_MINUTES,
  BASE_RATING,
  BOT_CAP,
  BOT_FLOOR,
  BOT_RULES,
  K_PROVISIONAL,
  K_SETTLED,
  MATCH_BAND_MAX,
  MATCH_BAND_START,
  MUSTER_XP_BONUS,
  PRESENCE_HEARTBEAT_SECONDS,
  PRESENCE_TTL_SECONDS,
  QUY_DIEN_DRIFT_PER_DAY,
  RATING_RULE_VERSION,
  applyDuelResult,
  botAcceptDelaySeconds,
  botAccuracy,
  botOnlineAt,
  botScore,
  botSubmitAfterSeconds,
  checkAppointment,
  expectedScore,
  findOpponent,
  isPresent,
  kFactor,
  matchBand,
  musterMultiplier,
  musterWindowAt,
  quyDienDrift,
  targetBotCount,
  winRateVsStronger,
  type QueueEntry,
} from "../src/lib/arena/rating.ts";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${ok ? "✓" : "✗ THẤT BẠI:"} ${label}`);
  if (!ok) {
    console.log(`      mong đợi ${JSON.stringify(expected)}, nhận ${JSON.stringify(actual)}`);
    failures++;
  }
}
function near(label: string, actual: number, expected: number, tol = 0.005) {
  const ok = Math.abs(actual - expected) <= tol;
  console.log(`  ${ok ? "✓" : "✗ THẤT BẠI:"} ${label}`);
  if (!ok) {
    console.log(`      mong đợi ~${expected}, nhận ${actual}`);
    failures++;
  }
}

console.log("\n— Thang Chiến Lực —");

check("điểm khởi đầu 1000", BASE_RATING, 1000);
near("ngang sức thì kỳ vọng 50%", expectedScore(1000, 1000), 0.5);
near("hơn 100 điểm thì kỳ vọng 64%", expectedScore(1100, 1000), 0.64, 0.005);
near("hơn 300 điểm thì kỳ vọng 85%", expectedScore(1300, 1000), 0.849, 0.005);
check("người mới biến động mạnh hơn", kFactor(0), K_PROVISIONAL);
check("người đã quen biến động nhẹ hơn", kFactor(50), K_SETTLED);
check("K người mới lớn hơn K đã quen", K_PROVISIONAL > K_SETTLED, true);

{
  const w = applyDuelResult({ rating: 1000, opponentRating: 1000, duelsPlayed: 50, outcome: 1 });
  const l = applyDuelResult({ rating: 1000, opponentRating: 1000, duelsPlayed: 50, outcome: 0 });
  check("ngang sức, thắng thì cộng", w.delta > 0, true);
  check("ngang sức, thua thì trừ đúng bằng phần cộng", w.delta, -l.delta);
  check("luôn là số nguyên", Number.isInteger(w.after), true);
}
{
  const easyWin = applyDuelResult({ rating: 1300, opponentRating: 1000, duelsPlayed: 50, outcome: 1 });
  const hardWin = applyDuelResult({ rating: 1000, opponentRating: 1300, duelsPlayed: 50, outcome: 1 });
  check(
    "thắng người mạnh hơn được nhiều hơn thắng người yếu hơn",
    hardWin.delta > easyWin.delta,
    true,
  );
  const badLoss = applyDuelResult({ rating: 1300, opponentRating: 1000, duelsPlayed: 50, outcome: 0 });
  check("người mạnh thua người yếu thì mất nhiều", badLoss.delta < -15, true);
}
check(
  "Chiến Lực không bao giờ âm",
  applyDuelResult({ rating: 3, opponentRating: 2500, duelsPlayed: 0, outcome: 0 }).after >= 0,
  true,
);

console.log("\n— Quy Điền: trôi MỘT CHIỀU và có SÀN —");

check("không nghỉ thì không trôi", quyDienDrift({ rating: 1400, daysWithdrawn: 0 }), 1400);
check(
  "nghỉ 10 ngày thì mất 20 điểm",
  quyDienDrift({ rating: 1400, daysWithdrawn: 10 }),
  1400 - 10 * QUY_DIEN_DRIFT_PER_DAY,
);
check(
  "người MẠNH mất dần danh tiếng, nhưng dừng ở sàn",
  quyDienDrift({ rating: 1200, daysWithdrawn: 9999 }),
  BASE_RATING,
);
check(
  "người YẾU giữ nguyên chỗ đang đứng, không bị đẩy xuống thêm",
  quyDienDrift({ rating: 700, daysWithdrawn: 9999 }),
  700,
);
check(
  "và KHÔNG BAO GIỜ được kéo lên: đó là cả lý do luật này tồn tại",
  quyDienDrift({ rating: 700, daysWithdrawn: 60 }) <= 700,
  true,
);

console.log("\n— Ghép cặp: dải nới dần, và phải hợp CẢ HAI bên —");

check("dải ban đầu", matchBand(0), MATCH_BAND_START);
check("chờ 15 giây thì nới", matchBand(15), 100);
check("chờ 75 giây thì chạm trần", matchBand(75), MATCH_BAND_MAX);
check("chờ mãi cũng không quá trần", matchBand(9999), MATCH_BAND_MAX);

function q(over: Partial<QueueEntry> = {}): QueueEntry {
  return { userId: "x", rating: 1000, waitedSeconds: 0, metToday: new Set(), ...over };
}

{
  const seeker = q({ userId: "a", rating: 1000, waitedSeconds: 0 });
  const found = findOpponent(seeker, [q({ userId: "b", rating: 1030 })]);
  check("trong dải thì ghép được", found?.userId, "b");
}
{
  const seeker = q({ userId: "a", rating: 1000, waitedSeconds: 0 });
  const found = findOpponent(seeker, [q({ userId: "b", rating: 1200 })]);
  check("lệch 200 mà mới vào thì KHÔNG ghép", found, null);
}
{
  // Người chờ lâu có dải rộng, người vừa vào có dải hẹp. Không được ghép.
  const patient = q({ userId: "a", rating: 1000, waitedSeconds: 120 });
  const fresh = q({ userId: "b", rating: 1250, waitedSeconds: 0 });
  check(
    "dải của người chờ lâu KHÔNG kéo được người vừa vào vào trận lệch",
    findOpponent(patient, [fresh]),
    null,
  );
}
{
  const both = q({ userId: "a", rating: 1000, waitedSeconds: 120 });
  const alsoPatient = q({ userId: "b", rating: 1250, waitedSeconds: 120 });
  check("cả hai cùng chờ lâu thì ghép được", findOpponent(both, [alsoPatient])?.userId, "b");
}
{
  const seeker = q({ userId: "a", rating: 1000, metToday: new Set(["b"]) });
  const found = findOpponent(seeker, [
    q({ userId: "b", rating: 1000 }),
    q({ userId: "c", rating: 1040 }),
  ]);
  check("ưu tiên người CHƯA gặp hôm nay, dù lệch hơn một chút", found?.userId, "c");
}
{
  const seeker = q({ userId: "a", rating: 1000, metToday: new Set(["b", "c"]) });
  const found = findOpponent(seeker, [
    q({ userId: "b", rating: 1000 }),
    q({ userId: "c", rating: 1040 }),
  ]);
  check("hết người mới thì vẫn ghép người cũ, còn hơn không ai", found?.userId, "b");
}
{
  const seeker = q({ userId: "a", rating: 1000 });
  const found = findOpponent(seeker, [
    q({ userId: "b", rating: 1045 }),
    q({ userId: "c", rating: 1005 }),
  ]);
  check("trong số hợp lệ, chọn người GẦN NHẤT", found?.userId, "c");
}
check("không tự ghép với chính mình", findOpponent(q({ userId: "a" }), [q({ userId: "a" })]), null);

console.log("\n— Giờ điểm binh —");

check("20 giờ nằm trong khung tối", musterWindowAt(20)?.label, "Điểm binh buổi tối");
check("21 giờ vẫn trong khung", musterWindowAt(21) !== null, true);
check("22 giờ đã ngoài khung", musterWindowAt(22), null);
check("15 giờ không có khung nào", musterWindowAt(15), null);
check("trong khung thì được thưởng", musterMultiplier(20), 1 + MUSTER_XP_BONUS);
check("ngoài khung thì hệ số 1", musterMultiplier(15), 1);
check("thưởng phải dương, nếu không thì khung giờ vô nghĩa", MUSTER_XP_BONUS > 0, true);

console.log("\n— Có mặt: theo nhịp tim, không theo trạng thái kết nối —");

const NOW = new Date("2026-08-21T10:00:00Z");
check("vừa thấy thì đang có mặt", isPresent(new Date(NOW.getTime() - 5_000), NOW), true);
check(
  "quá hạn thì coi như đã rời sân",
  isPresent(new Date(NOW.getTime() - (PRESENCE_TTL_SECONDS + 5) * 1000), NOW),
  false,
);
check(
  "nhịp tim phải dày hơn hạn sống, nếu không thì ai cũng bị coi là đã rời",
  PRESENCE_HEARTBEAT_SECONDS * 2 < PRESENCE_TTL_SECONDS,
  true,
);

console.log("\n— Dân số bot —");

check("sân rỗng vẫn giữ sàn 5 bot", targetBotCount(0), BOT_FLOOR);
check("ít người thật thì sàn thắng luật 25 phần trăm", targetBotCount(3), BOT_FLOOR);
check("đông người thì theo tỷ lệ", targetBotCount(60), 20);
check("không bao giờ vượt trần 30", targetBotCount(9999), BOT_CAP);
check(
  "ở mức dân số lớn, bot chiếm không quá 25 phần trăm",
  targetBotCount(90) / (90 + targetBotCount(90)) <= 0.25 + 0.001,
  true,
);
check("bot KHÔNG sinh điểm phe", BOT_RULES.earnsFactionPoints, false);
check("nhưng VẪN tính Chiến Lực", BOT_RULES.affectsRating, true);
check("không đếm vào Danh Bất Phù Thực", BOT_RULES.countsForTitleDanhBatPhuThuc, false);
check("và bị loại khỏi chat", BOT_RULES.allowedInChat, false);

console.log("\n— Bot đánh như thế nào —");

check("Chiến Lực gốc thì đúng một nửa", botAccuracy(1000), 0.5);
check("Chiến Lực cao hơn thì chính xác hơn", botAccuracy(1300) > botAccuracy(1000), true);
check("Chiến Lực thấp hơn thì kém hơn", botAccuracy(700) < botAccuracy(1000), true);
check("có sàn, không bao giờ về 0", botAccuracy(-9999) > 0, true);
check("có trần, không bao giờ đúng hết", botAccuracy(99999) < 1, true);

{
  const roll = () => 0.4;
  check(
    "cùng Chiến Lực thì cùng điểm khi cùng may rủi",
    botScore(1000, 13, roll),
    botScore(1000, 13, roll),
  );
  check("điểm không bao giờ vượt số câu", botScore(9999, 13, () => 0), 13);
  check("điểm không bao giờ âm", botScore(0, 13, () => 1), 0);
}

{
  // Giờ online phải LỆCH NHAU giữa các bot. Ba mươi bot cùng thức một khung là
  // dấu hiệu lộ rõ ngang với việc Chiến Lực trùng nhau.
  const at3 = Array.from({ length: 30 }, (_, i) => botOnlineAt(i, 3));
  const at15 = Array.from({ length: 30 }, (_, i) => botOnlineAt(i, 15));
  check("không phải bot nào cũng thức lúc 3 giờ sáng", at3.every(Boolean), false);
  check("nhưng cũng không phải ai cũng ngủ", at3.some(Boolean), true);
  check(
    "hai khung giờ khác nhau cho hai tập bot khác nhau",
    JSON.stringify(at3) !== JSON.stringify(at15),
    true,
  );
  const awake = at15.filter(Boolean).length;
  check("lúc 15 giờ chỉ một phần bot thức", awake > 0 && awake < 30, true);
}

{
  check("bot nghĩ trước khi nhận, không nhận tức khắc", botAcceptDelaySeconds(() => 0) >= 4, true);
  check("nhưng không nghĩ lâu tới mức thư hết hạn", botAcceptDelaySeconds(() => 0.999) < 90, true);
  const d = 1200;
  check("nộp sớm nhất là 35 phần trăm thời lượng", botSubmitAfterSeconds(d, () => 0), Math.floor(d * 0.35));
  check("nộp muộn nhất vẫn trước khi hết giờ", botSubmitAfterSeconds(d, () => 0.999) < d, true);
}

console.log("\n— Hẹn trận —");

check(
  "hẹn quá gấp thì chặn",
  checkAppointment({ at: new Date(NOW.getTime() + 60_000), now: NOW }),
  { ok: false, reason: "TOO_SOON" },
);
check(
  "hẹn sau 30 phút thì được",
  checkAppointment({ at: new Date(NOW.getTime() + 30 * 60_000), now: NOW }),
  { ok: true },
);
check(
  "hẹn quá xa thì chặn",
  checkAppointment({
    at: new Date(NOW.getTime() + (APPOINTMENT_MAX_LEAD_DAYS + 1) * 24 * 60 * 60_000),
    now: NOW,
  }),
  { ok: false, reason: "TOO_FAR" },
);
check("có thời gian ân hạn sau giờ hẹn", APPOINTMENT_GRACE_MINUTES > 0, true);
check("khoảng báo trước tối thiểu dương", APPOINTMENT_MIN_LEAD_MINUTES > 0, true);

console.log("\n— Thắng suất trước đối thủ mạnh hơn —");

check(
  "chưa từng gặp người mạnh hơn thì trả null, KHÔNG phải 0",
  winRateVsStronger([{ myRating: 1200, opponentRating: 1000, won: true }]),
  null,
);
check(
  "chỉ tính trận gặp người mạnh hơn",
  winRateVsStronger([
    { myRating: 1000, opponentRating: 1200, won: true },
    { myRating: 1000, opponentRating: 1200, won: false },
    { myRating: 1000, opponentRating: 800, won: true },
  ]),
  0.5,
);

check("có bản luật để tra ngược", typeof RATING_RULE_VERSION === "string" && RATING_RULE_VERSION.length > 0, true);

console.log(
  failures === 0
    ? "\n✅ TẤT CẢ KIỂM THỬ CHIẾN LỰC VÀ GHÉP CẶP ĐỀU ĐẠT\n"
    : `\n❌ CÓ ${failures} KIỂM THỬ THẤT BẠI\n`,
);
process.exit(failures === 0 ? 0 : 1);
