/**
 * Kiểm thử luật trận.
 * Chạy: node --experimental-strip-types scripts/test-duel.ts
 *
 * Bài quan trọng nhất ở đây không phải bài "ai thắng", mà là bài KIỂM TỔNG SỔ
 * CÁI: sau mỗi kịch bản, tổng Quân Công ròng của hai bên phải đúng bằng thứ
 * đặc tả hứa, và không được có một đồng nào chuyển thẳng từ ví này sang ví kia.
 *
 * Sai ở đây thì hoặc có người mất Quân Công oan, hoặc có người in ra Quân Công
 * từ hư không, và cả hai đều không có thông báo lỗi nào.
 */
import {
  ARENA_INVITE_EVENT,
  arenaUserChannel,
  buildArenaInviteCreatedPayload,
  isArenaInviteCreatedPayload,
} from "../src/lib/arena/realtime-rules.ts";
import {
  ALLOWED_TRANSITIONS,
  DUEL_STATUSES,
  DUEL_XP,
  FREE_TIER_XP_RATIO,
  IDLE_DECLINE_THRESHOLD,
  INVITE_TTL_SECONDS,
  MAX_STAKE,
  MIN_STAKE,
  TRUCE_OFFER,
  canTransition,
  countableDeclines,
  decideStake,
  decideWinner,
  duelExperience,
  duelLedgerKey,
  hasStakeDeducted,
  inviteExpired,
  isTerminal,
  refundEntries,
  settlementEntries,
  truceExperience,
  truceGate,
  type DuelStatus,
  type MeritEntry,
  type SideResult,
} from "../src/lib/arena/duel.ts";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${ok ? "✓" : "✗ THẤT BẠI:"} ${label}`);
  if (!ok) {
    console.log(`      mong đợi ${JSON.stringify(expected)}, nhận ${JSON.stringify(actual)}`);
    failures++;
  }
}

const A = "user-a";
const B = "user-b";

function side(over: Partial<SideResult> = {}): SideResult {
  return {
    userId: A,
    score: 10,
    elapsedMs: 600_000,
    submitted: true,
    surrendered: false,
    abandoned: false,
    ...over,
  };
}

/**
 * Quân Công ròng của một người sau cả trận, tính từ dòng STAKE lúc ARMED cộng
 * các dòng quyết toán.
 */
function net(userId: string, stake: number, entries: readonly MeritEntry[]): number {
  let total = -stake; // dòng STAKE ghi lúc ARMED
  for (const e of entries) {
    if (e.userId !== userId) continue;
    total += e.kind === "STAKE" || e.kind === "BURN" ? -e.amount : e.amount;
  }
  return total;
}

console.log("\n— Vòng đời: bảng chuyển trạng thái —");

check("khai đủ 11 trạng thái", DUEL_STATUSES.length, 11);
check(
  "mọi trạng thái đều có mục trong bảng chuyển",
  DUEL_STATUSES.every((s) => Array.isArray(ALLOWED_TRANSITIONS[s])),
  true,
);
check("INVITED đi tới ARMED được", canTransition("INVITED", "ARMED"), true);
check("INVITED KHÔNG nhảy thẳng tới SETTLED", canTransition("INVITED", "SETTLED"), false);
check("LIVE đi tới RESOLVING được", canTransition("LIVE", "RESOLVING"), true);
check("SETTLED là trạng thái cuối", isTerminal("SETTLED"), true);
check("TRUCE là trạng thái cuối", isTerminal("TRUCE"), true);
check("HELD KHÔNG phải cuối: người xét duyệt phải kết luận được", isTerminal("HELD"), false);
check("HELD đi tới SETTLED được", canTransition("HELD", "SETTLED"), true);
check("HELD đi tới VOIDED được", canTransition("HELD", "VOIDED"), true);
check(
  "không trạng thái nào tự chuyển về chính nó",
  DUEL_STATUSES.every((s) => !ALLOWED_TRANSITIONS[s].includes(s)),
  true,
);
check(
  "mọi đích đến đều là trạng thái hợp lệ",
  DUEL_STATUSES.every((s) =>
    ALLOWED_TRANSITIONS[s].every((t) => (DUEL_STATUSES as readonly string[]).includes(t)),
  ),
  true,
);

console.log("\n— Trước ARMED thì chưa trừ đồng nào —");

check("INVITED chưa trừ", hasStakeDeducted("INVITED"), false);
check("DECLINED chưa trừ", hasStakeDeducted("DECLINED"), false);
check("EXPIRED chưa trừ", hasStakeDeducted("EXPIRED"), false);
check("ARMED đã trừ", hasStakeDeducted("ARMED"), true);
check("LIVE đã trừ", hasStakeDeducted("LIVE"), true);

console.log("\n— Hai hạng trận: cửa luôn mở, chỉ sới cược là đóng —");

check("cược 0 là hạng không cược, KHÔNG phải lỗi", decideStake({ requested: 0, challengerBalance: 0, opponentBalance: 0 }), {
  ok: true,
  tier: "FREE",
  stake: 0,
});
check(
  "người hết sạch Quân Công vẫn vào được hạng không cược",
  decideStake({ requested: 0, challengerBalance: 0, opponentBalance: 999 }).ok,
  true,
);
check("cược hợp lệ", decideStake({ requested: 20, challengerBalance: 50, opponentBalance: 50 }), {
  ok: true,
  tier: "STAKED",
  stake: 20,
});
check("dưới mức tối thiểu bị chặn", decideStake({ requested: 1, challengerBalance: 50, opponentBalance: 50 }), {
  ok: false,
  reason: "BELOW_MIN",
  need: MIN_STAKE,
});
check("trên mức tối đa bị chặn", decideStake({ requested: 999, challengerBalance: 9999, opponentBalance: 9999 }), {
  ok: false,
  reason: "ABOVE_MAX",
  need: MAX_STAKE,
});
check(
  "kiểm CẢ HAI bên: người bị thách nghèo hơn thì cũng chặn",
  decideStake({ requested: 50, challengerBalance: 999, opponentBalance: 30 }),
  { ok: false, reason: "INSUFFICIENT", need: 20 },
);

console.log("\n— Chiến thư sống 90 giây —");

const T0 = new Date("2026-08-21T10:00:00Z");
check("thư 90 giây", INVITE_TTL_SECONDS, 90);
check("vừa gửi thì còn sống", inviteExpired(T0, new Date(T0.getTime() + 10_000)), false);
check("đúng 90 giây là hết hạn", inviteExpired(T0, new Date(T0.getTime() + 90_000)), true);
check("quá 90 giây là hết hạn", inviteExpired(T0, new Date(T0.getTime() + 91_000)), true);

console.log("\n— Bốn chốt bảo vệ người bị dội chiến thư —");

const base = { wasPresent: true, wasInDuel: false };
check(
  "đếm theo NGƯỜI THÁCH, không theo số thư: một người gửi 10 thư chỉ tính 1",
  countableDeclines(
    Array.from({ length: 10 }, () => ({ ...base, challengerId: "x", dateKey: "2026-08-21" })),
  ),
  1,
);
check(
  "cùng người thách, hai ngày khác nhau vẫn chỉ tính 1 người",
  countableDeclines([
    { ...base, challengerId: "x", dateKey: "2026-08-21" },
    { ...base, challengerId: "x", dateKey: "2026-08-22" },
  ]),
  1,
);
check(
  "mười người thách khác nhau thì tính 10",
  countableDeclines(
    Array.from({ length: 10 }, (_, i) => ({ ...base, challengerId: `x${i}`, dateKey: "2026-08-21" })),
  ),
  10,
);
check(
  "đang trong trận khác thì KHÔNG tính",
  countableDeclines([{ challengerId: "x", dateKey: "d", wasPresent: true, wasInDuel: true }]),
  0,
);
check(
  "không có mặt ở đấu trường thì KHÔNG tính",
  countableDeclines([{ challengerId: "x", dateKey: "d", wasPresent: false, wasInDuel: false }]),
  0,
);
check("ngưỡng là 10 người khác nhau", IDLE_DECLINE_THRESHOLD, 10);

console.log("\n— Giảng hoà: chỉ nửa đầu, và chưa nộp quá một phần ba —");

const START = new Date("2026-08-21T10:00:00Z");
const END = new Date("2026-08-21T10:20:00Z"); // 20 phút
const truceBase = {
  status: "LIVE" as DuelStatus,
  startedAt: START,
  deadlineAt: END,
  totalQuestions: 12,
};

check(
  "phút thứ 5, chưa ai làm gì: được",
  truceGate({ ...truceBase, now: new Date("2026-08-21T10:05:00Z"), answeredByEach: [0, 0] }),
  { canOffer: true },
);
check(
  "phút thứ 15 là quá nửa: KHÔNG được, chặn đường thoát phút chót",
  truceGate({ ...truceBase, now: new Date("2026-08-21T10:15:00Z"), answeredByEach: [0, 0] }),
  { canOffer: false, reason: "TOO_LATE" },
);
check(
  "đúng mốc nửa thời gian vẫn được",
  truceGate({ ...truceBase, now: new Date("2026-08-21T10:10:00Z"), answeredByEach: [0, 0] }).canOffer,
  true,
);
check(
  "một bên đã làm 5 trên 12 câu, quá một phần ba: KHÔNG được",
  truceGate({ ...truceBase, now: new Date("2026-08-21T10:02:00Z"), answeredByEach: [5, 0] }),
  { canOffer: false, reason: "TOO_MUCH_ANSWERED" },
);
check(
  "đúng 4 trên 12 câu, tức tròn một phần ba: vẫn được",
  truceGate({ ...truceBase, now: new Date("2026-08-21T10:02:00Z"), answeredByEach: [4, 4] }).canOffer,
  true,
);
check(
  "trận chưa vào LIVE thì không đề nghị được",
  truceGate({ ...truceBase, status: "ARMED", now: START, answeredByEach: [0, 0] }),
  { canOffer: false, reason: "NOT_LIVE" },
);
check("có sẵn hai câu lời thoại", [TRUCE_OFFER.offer.length > 20, TRUCE_OFFER.accept.length > 10], [true, true]);

console.log("\n— Phân định thắng thua —");

check(
  "hơn điểm thì thắng",
  decideWinner(side({ userId: A, score: 11 }), side({ userId: B, score: 9 })),
  { kind: "WIN", winnerId: A, loserId: B, by: "SCORE" },
);
check(
  "bằng điểm thì NHANH HƠN thắng",
  decideWinner(
    side({ userId: A, score: 10, elapsedMs: 500_000 }),
    side({ userId: B, score: 10, elapsedMs: 700_000 }),
  ),
  { kind: "WIN", winnerId: A, loserId: B, by: "TIME" },
);
check(
  "bằng cả hai mới hoà, và điều đó gần như không xảy ra",
  decideWinner(side({ userId: A }), side({ userId: B })),
  { kind: "DRAW" },
);
check(
  "đầu hàng thì thua dù điểm cao hơn",
  decideWinner(
    side({ userId: A, score: 12, surrendered: true }),
    side({ userId: B, score: 3 }),
  ),
  { kind: "WIN", winnerId: B, loserId: A, by: "FORFEIT" },
);
check(
  "bỏ mặc thì cũng thua dù điểm cao hơn",
  decideWinner(
    side({ userId: A, score: 12, abandoned: true }),
    side({ userId: B, score: 3 }),
  ),
  { kind: "WIN", winnerId: B, loserId: A, by: "FORFEIT" },
);
check(
  "cả hai cùng bỏ thì hoà",
  decideWinner(
    side({ userId: A, abandoned: true }),
    side({ userId: B, surrendered: true }),
  ),
  { kind: "DRAW" },
);

console.log("\n— Quyết toán: huỷ và phát, KHÔNG chuyển ví sang ví —");

const STAKE = 20;
const win = decideWinner(side({ userId: A, score: 11 }), side({ userId: B, score: 9 }));
const winEntries = settlementEntries({ verdict: win, tier: "STAKED", stake: STAKE, sides: [A, B] });

check(
  "người thắng nhận đúng hai dòng: hoàn cược và phần thắng",
  winEntries.filter((e) => e.userId === A).map((e) => e.kind),
  ["REFUND", "MINT"],
);
check("người thua KHÔNG có dòng nào khi quyết toán", winEntries.filter((e) => e.userId === B).length, 0);
check("ròng của người thắng: cộng đúng một lần mức cược", net(A, STAKE, winEntries), STAKE);
check("ròng của người thua: trừ đúng một lần mức cược", net(B, STAKE, winEntries), -STAKE);
check(
  "KHÔNG có dòng BURN thêm cho người thua: dòng STAKE lúc ARMED chính là phần bị huỷ",
  winEntries.some((e) => e.kind === "BURN"),
  false,
);
check(
  "mọi số tiền đều dương, chiều nằm ở kind",
  winEntries.every((e) => e.amount > 0),
  true,
);

// Bài chống thông đồng: hai tài khoản cày cho nhau thì tổng bằng không.
check(
  "tổng ròng hai bên bằng KHÔNG, nên hai tài khoản cày cho nhau không sinh ra gì",
  net(A, STAKE, winEntries) + net(B, STAKE, winEntries),
  0,
);

const drawEntries = settlementEntries({
  verdict: { kind: "DRAW" },
  tier: "STAKED",
  stake: STAKE,
  sides: [A, B],
});
check("hoà thì cả hai được hoàn cược", drawEntries.map((e) => e.kind), ["REFUND", "REFUND"]);
check("ròng khi hoà bằng 0", [net(A, STAKE, drawEntries), net(B, STAKE, drawEntries)], [0, 0]);

const truceEntries = refundEntries({ tier: "STAKED", stake: STAKE, sides: [A, B], reason: "Giảng hoà" });
check("giảng hoà: ròng bằng 0 cả hai", [net(A, STAKE, truceEntries), net(B, STAKE, truceEntries)], [0, 0]);

check(
  "hạng KHÔNG CƯỢC thì không sinh dòng sổ cái nào",
  settlementEntries({ verdict: win, tier: "FREE", stake: 0, sides: [A, B] }),
  [],
);

console.log("\n— Khoá chống ghi hai lần —");

check("khoá gồm trận, người và chiều", duelLedgerKey("d1", A, "MINT"), "DUEL:d1:user-a:MINT");
check(
  "hai chiều khác nhau ra hai khoá khác nhau",
  duelLedgerKey("d1", A, "MINT") !== duelLedgerKey("d1", A, "REFUND"),
  true,
);
check(
  "cùng trận cùng người cùng chiều ra CÙNG một khoá, nên ghi lại lần hai bị chặn",
  duelLedgerKey("d1", A, "MINT"),
  duelLedgerKey("d1", A, "MINT"),
);

console.log("\n— Kinh nghiệm: đầu hàng phải RẺ HƠN bỏ mặc —");

check("thắng", duelExperience({ side: side(), won: true, tier: "STAKED" }), DUEL_XP.WIN);
check("thua vẫn dương, vì vẫn là một lần đọc đề thật", duelExperience({ side: side(), won: false, tier: "STAKED" }), DUEL_XP.LOSS);
check("đầu hàng", duelExperience({ side: side({ surrendered: true }), won: false, tier: "STAKED" }), DUEL_XP.SURRENDER);
check("bỏ mặc", duelExperience({ side: side({ abandoned: true }), won: false, tier: "STAKED" }), DUEL_XP.ABANDON);
check(
  "ĐẦU HÀNG RẺ HƠN BỎ MẶC. Ngược lại thì không ai đầu hàng nữa, tất cả rút dây mạng",
  DUEL_XP.SURRENDER > DUEL_XP.ABANDON,
  true,
);
check(
  "hạng không cược nhận ít hơn nhưng vẫn dương",
  duelExperience({ side: side(), won: true, tier: "FREE" }),
  Math.round(DUEL_XP.WIN * FREE_TIER_XP_RATIO),
);
check("giảng hoà không sinh kinh nghiệm, đây là luật chứ không phải số", truceExperience(), 0);

/* ===================== Báo chiến thư sang thanh lối tắt ===================== */

// Chiến thư chỉ sống 90 giây, ngắn hơn nhịp hỏi của thanh lối tắt, nên tín hiệu
// realtime là đường chính chứ không phải đường dự phòng. Ba điều phải đúng:
// đúng kênh riêng của người BỊ thách, đúng hình dạng payload, và mọi thứ khác
// hình dạng đó đều bị từ chối.
check(
  "chiến thư đi trên kênh riêng của người bị thách",
  arenaUserChannel("nguoi-bi-thach"),
  "chat:user:nguoi-bi-thach",
);
check(
  "payload chỉ mang mã chiến thư",
  buildArenaInviteCreatedPayload("invite-1"),
  { inviteId: "invite-1" },
);
check(
  "payload đúng hình dạng thì nhận",
  isArenaInviteCreatedPayload(buildArenaInviteCreatedPayload("invite-1")),
  true,
);
for (const bad of [null, undefined, "invite-1", 7, {}, { inviteId: 7 }, { id: "invite-1" }]) {
  check(
    `payload lạ bị từ chối: ${JSON.stringify(bad) ?? "undefined"}`,
    isArenaInviteCreatedPayload(bad),
    false,
  );
}
// Tên sự kiện phải KHÁC sự kiện chat, nếu không hai chấm báo sẽ cùng sáng cho
// một việc. TypeScript đã chốt được điều này ở mức kiểu (hai literal khác nhau),
// nên ở đây chỉ neo lại đúng chuỗi để không ai đổi nhầm sang tên của chat.
check("tên sự kiện chiến thư được neo cố định", ARENA_INVITE_EVENT, "arena.invite.created");

console.log(
  failures === 0
    ? "\n✅ TẤT CẢ KIỂM THỬ LUẬT TRẬN ĐỀU ĐẠT\n"
    : `\n❌ CÓ ${failures} KIỂM THỬ THẤT BẠI\n`,
);
process.exit(failures === 0 ? 0 : 1);
