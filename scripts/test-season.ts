/**
 * Kiểm thử luật phe phái và mùa giải. Hàm thuần, không chạm database.
 * Chạy: node --experimental-strip-types scripts/test-season.ts
 *
 * Bài quan trọng nhất trong file này là bài "phe đông người KHÔNG thắng chỉ vì
 * đông". Đặc tả gọi nó là vấn đề kinh điển của ba phe và nói thẳng rằng không
 * có bước này thì hệ phe phái chết ngay mùa đầu tiên.
 *
 * Bài quan trọng thứ hai là "người yếu KHÔNG BAO GIỜ làm hại phe mình". Hai bài
 * đó kéo ngược nhau, và cách xếp hạng phải thoả mãn cả hai cùng lúc.
 */
import {
  BULLETIN_MIN_RANK_LEVEL,
  FACTION_POINTS,
  SEASON_LENGTH_DAYS,
  TOP_CONTRIBUTORS,
  canAnnounce,
  daysLeftInSeason,
  factionPointsFor,
  factionStandings,
  seasonCode,
  seasonResetRating,
  seasonStatusAt,
  seasonWindowFrom,
  seasonWinner,
  territoryOwnerNow,
  type Contribution,
} from "../src/lib/arena/season.ts";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${ok ? "✓" : "✗ THẤT BẠI:"} ${label}`);
  if (!ok) {
    console.log(`      mong đợi ${JSON.stringify(expected)}, nhận ${JSON.stringify(actual)}`);
    failures++;
  }
}

function base(over: Partial<Parameters<typeof factionPointsFor>[0]> = {}) {
  return {
    won: true,
    truce: false,
    opponentIsBot: false,
    opponentRating: 1000,
    nthMeetingToday: 1,
    ...over,
  };
}

/* ============ Điểm phe của một trận ============ */
console.log("\n— Điểm phe của một trận —");

check("thắng đối thủ đúng mốc chuẩn", factionPointsFor(base()), FACTION_POINTS.winBase);
check(
  "thắng đối thủ mạnh hơn thì được nhiều hơn",
  factionPointsFor(base({ opponentRating: 1500 })),
  15,
);
check(
  "thắng đối thủ yếu hơn thì được ít hơn",
  factionPointsFor(base({ opponentRating: 700 })),
  7,
);

// Chặn hai đầu: một trận không bao giờ đáng bằng năm trận.
check(
  "đối thủ cực mạnh vẫn bị chặn trần",
  factionPointsFor(base({ opponentRating: 9000 })),
  FACTION_POINTS.winBase * FACTION_POINTS.maxFactor,
);
check(
  "đối thủ cực yếu vẫn có sàn",
  factionPointsFor(base({ opponentRating: 100 })),
  FACTION_POINTS.winBase * FACTION_POINTS.minFactor,
);

check("thua vẫn được cộng", factionPointsFor(base({ won: false })), FACTION_POINTS.lossFlat);
check(
  "và điểm khi thua KHÔNG bao giờ âm",
  factionPointsFor(base({ won: false, opponentRating: 100 })) >= 0,
  true,
);

// Nếu thua mà cộng theo Chiến Lực đối thủ thì đường tối ưu là đi thách người
// mạnh nhất rồi thua cho nhanh. Điểm khi thua phải PHẲNG.
check(
  "thua người mạnh và thua người yếu được như nhau",
  factionPointsFor(base({ won: false, opponentRating: 1800 })),
  factionPointsFor(base({ won: false, opponentRating: 600 })),
);
check(
  "và thua luôn ít hơn thắng",
  factionPointsFor(base({ won: false, opponentRating: 1800 })) <
    factionPointsFor(base({ won: true, opponentRating: 600 })),
  true,
);

check("trận với bot không sinh điểm phe", factionPointsFor(base({ opponentIsBot: true })), 0);
check(
  "thua bot cũng không sinh điểm phe",
  factionPointsFor(base({ won: false, opponentIsBot: true })),
  0,
);
check("giảng hoà không sinh điểm phe", factionPointsFor(base({ truce: true })), 0);

/* ============ Cày cùng một đối thủ ============ */
console.log("\n— Đánh mãi một người —");

check("lần hai giảm còn 60 phần trăm", factionPointsFor(base({ nthMeetingToday: 2 })), 6);
check("lần ba còn 30 phần trăm", factionPointsFor(base({ nthMeetingToday: 3 })), 3);
check("từ lần tư còn 10 phần trăm", factionPointsFor(base({ nthMeetingToday: 4 })), 1);
check(
  "và lần thứ mười vẫn là 10 phần trăm, không xuống nữa",
  factionPointsFor(base({ nthMeetingToday: 10 })),
  1,
);
// Hai tài khoản cày cho nhau: mười trận liên tiếp không hơn được ba trận đầu là
// bao. Đây là cùng một luật đang gác thang kinh nghiệm, cố ý dùng lại.
const farm = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].reduce(
  (sum, n) => sum + factionPointsFor(base({ nthMeetingToday: n })),
  0,
);
const honest = 3 * factionPointsFor(base());
check("cày mười trận một người thua xa ba trận ba người", farm < honest, true);

/* ============ Vấn đề kinh điển của ba phe ============ */
console.log("\n— Phe đông người không được thắng chỉ vì đông —");

// Ngụy: ba mươi người, mỗi người đóng góp ít.
const wei: Contribution[] = Array.from({ length: 30 }, (_, i) => ({
  userId: `wei-${String(i).padStart(2, "0")}`,
  faction: "WEI" as const,
  points: 10,
}));
// Thục: năm người, mỗi người đóng góp nhiều.
const shu: Contribution[] = Array.from({ length: 5 }, (_, i) => ({
  userId: `shu-${i}`,
  faction: "SHU" as const,
  points: 40,
}));

const standings = factionStandings([...wei, ...shu]);
check("Ngụy có tổng điểm cao hơn hẳn", standings.find((s) => s.faction === "WEI")?.totalPoints, 300);
check("Thục có tổng điểm thấp hơn", standings.find((s) => s.faction === "SHU")?.totalPoints, 200);
// Chính là điều đặc tả đòi: bảng xếp hạng KHÔNG chạy theo tổng điểm.
check("nhưng Thục đứng đầu bảng", standings[0].faction, "SHU");
check("vì chỉ đếm nhóm đóng góp nhiều nhất", standings[0].score, 200);
check("Ngụy chỉ được tính năm người đầu", standings.find((s) => s.faction === "WEI")?.score, 50);

check("luôn trả về đủ ba phe", standings.length, 3);
check(
  "kể cả phe chưa ai đóng góp",
  standings.find((s) => s.faction === "WU"),
  { faction: "WU", score: 0, totalPoints: 0, activeMembers: 0, countedMembers: 0 },
);

/* ============ Người yếu không bao giờ là gánh nặng ============ */
console.log("\n— Người yếu vào đấu thì phe không thiệt —");

const before = factionStandings([...shu]);
const weakling: Contribution = { userId: "shu-yeu", faction: "SHU", points: 3 };
const after = factionStandings([...shu, weakling]);
check(
  "thêm một người điểm thấp KHÔNG làm giảm điểm phe",
  after.find((s) => s.faction === "SHU")!.score >=
    before.find((s) => s.faction === "SHU")!.score,
  true,
);
check(
  "và số người hoạt động vẫn được đếm để hiển thị",
  after.find((s) => s.faction === "SHU")?.activeMembers,
  6,
);

// Với phe chưa đủ nhóm đầu thì người yếu còn giúp được thật.
const thin = factionStandings([
  { userId: "wu-1", faction: "WU", points: 20 },
  { userId: "wu-2", faction: "WU", points: 3 },
]);
check("phe mỏng người thì mọi đóng góp đều được tính", thin.find((s) => s.faction === "WU")?.score, 23);
check("và số người được tính không vượt quá nhóm đầu", TOP_CONTRIBUTORS, 5);

/* ============ Ai thắng mùa ============ */
console.log("\n— Tuyên bố phe thắng mùa —");

check("phe đứng đầu thắng", seasonWinner(standings), "SHU");
check("cả ba phe đều trắng thì không tuyên bố ai", seasonWinner(factionStandings([])), null);
// Tuyên bố người thắng bằng thứ tự bảng chữ cái sau tám tuần là điều tệ nhất
// có thể làm.
const tied = factionStandings([
  { userId: "a", faction: "WEI", points: 50 },
  { userId: "b", faction: "SHU", points: 50 },
]);
check("hoà tuyệt đối thì không tuyên bố ai", seasonWinner(tied), null);
const nearlyTied = factionStandings([
  { userId: "a", faction: "WEI", points: 50 },
  { userId: "a2", faction: "WEI", points: 1 },
  { userId: "b", faction: "SHU", points: 50 },
]);
check("hơn nhau ở tổng điểm toàn phe thì có người thắng", seasonWinner(nearlyTied), "WEI");

/* ============ Mùa giải ============ */
console.log("\n— Mùa giải —");

const start = new Date("2026-09-01T00:00:00Z");
const window = seasonWindowFrom(start);
check("mùa dài tám tuần", SEASON_LENGTH_DAYS, 56);
check(
  "ngày kết thúc tính đúng",
  window.endAt.toISOString(),
  new Date("2026-10-27T00:00:00Z").toISOString(),
);
check(
  "trước ngày mở là chưa tới",
  seasonStatusAt(window, new Date("2026-08-30T00:00:00Z")),
  "UPCOMING",
);
check(
  "trong khoảng là đang chạy",
  seasonStatusAt(window, new Date("2026-10-01T00:00:00Z")),
  "ACTIVE",
);
check("đúng phút kết thúc là đã hết", seasonStatusAt(window, window.endAt), "ENDED");
check(
  "đếm ngược đúng",
  daysLeftInSeason(window, new Date("2026-10-20T00:00:00Z")),
  7,
);
check("hết mùa thì đếm ngược về 0", daysLeftInSeason(window, window.endAt), 0);
check("mã mùa đọc được và xếp được", [seasonCode(1), seasonCode(12)], ["S001", "S012"]);

/* ============ Kéo Chiến Lực về giữa ============ */
console.log("\n— Kéo Chiến Lực về giữa —");

check("người mạnh bị kéo xuống", seasonResetRating(1400), 1200);
check("người yếu được kéo lên", seasonResetRating(800), 900);
check("đúng mốc chuẩn thì không đổi", seasonResetRating(1000), 1000);
// Đơn điệu: không ai bị lật ngược công sức của cả mùa.
const order = [700, 900, 1000, 1100, 1600].map(seasonResetRating);
check(
  "thứ tự mạnh yếu giữ nguyên",
  order.every((v, i) => i === 0 || order[i - 1] < v),
  true,
);
check(
  "và khoảng cách thu hẹp lại",
  seasonResetRating(1600) - seasonResetRating(700) < 1600 - 700,
  true,
);

/* ============ Lãnh địa ============ */
console.log("\n— Lãnh địa —");

check("chủ lãnh địa mùa này là phe thắng mùa trước", territoryOwnerNow("SHU"), "SHU");
check("mùa đầu tiên thì chưa ai sở hữu", territoryOwnerNow(null), null);

/* ============ Bảng Bố Cáo ============ */
console.log("\n— Bảng Bố Cáo —");

check(
  "cấp cao lên cấp thì được bố cáo",
  canAnnounce({ kind: "RANK_UP", rankLevel: 8, allowsPublicName: true }).allowed,
  true,
);
check(
  "cấp thấp lên cấp thì không",
  canAnnounce({ kind: "RANK_UP", rankLevel: 3, allowsPublicName: true }).allowed,
  false,
);
check("ngưỡng đúng bằng đầu thời Tam phân", BULLETIN_MIN_RANK_LEVEL, 7);

// Quyền riêng tư đứng TRƯỚC mọi bộ lọc chất lượng.
check(
  "đã tắt hiện tên thì không tin nào lên bảng",
  canAnnounce({ kind: "RANK_UP", rankLevel: 9, allowsPublicName: false }).allowed,
  false,
);

check(
  "danh hiệu vinh danh thì được",
  canAnnounce({
    kind: "TITLE_EARNED",
    rankLevel: 9,
    titleCategory: "PRACTICE",
    allowsPublicName: true,
  }).allowed,
  true,
);
check(
  "danh hiệu chất vấn thì KHÔNG BAO GIỜ",
  canAnnounce({
    kind: "TITLE_EARNED",
    rankLevel: 9,
    titleCategory: "ARENA_QUESTION",
    allowsPublicName: true,
  }).allowed,
  false,
);
check(
  "danh hiệu người xử cũng không",
  canAnnounce({
    kind: "TITLE_EARNED",
    rankLevel: 9,
    titleCategory: "ARENA_MANUAL",
    allowsPublicName: true,
  }).allowed,
  false,
);
// Cái bẫy: Cải Quá Tự Tân là danh hiệu CÔNG KHAI, nên luật "chỉ bố cáo tin vinh
// danh" thoạt nhìn cho phép nó lên bảng. Nhưng chỉ người từng bị chất vấn mới
// có được nó, nên bố cáo nó là công bố ngược lại điều đó.
check(
  "và danh hiệu chuộc lỗi cũng KHÔNG, dù nó công khai",
  canAnnounce({
    kind: "TITLE_EARNED",
    rankLevel: 9,
    titleCategory: "ARENA_REDEMPTION",
    allowsPublicName: true,
  }).allowed,
  false,
);

check(
  "tin tổng kết mùa của hệ thống thì luôn lên được",
  canAnnounce({ kind: "SEASON_RESULT", allowsPublicName: false }).allowed,
  true,
);

console.log(
  failures === 0
    ? "\n✅ LUẬT PHE PHÁI VÀ MÙA GIẢI ĐỀU ĐẠT\n"
    : `\n❌ CÓ ${failures} KIỂM THỬ THẤT BẠI\n`,
);
process.exit(failures === 0 ? 0 : 1);
