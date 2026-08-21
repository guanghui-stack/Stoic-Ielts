/**
 * Kiểm thử danh hiệu chất vấn và tín hiệu liêm chính.
 * Chạy: node --experimental-strip-types scripts/test-arena-titles.ts
 *
 * BÀI QUAN TRỌNG NHẤT trong cả file không phải bài "gắn đúng người", mà là bài
 * KHÔNG GẮN NHẦM. Danh hiệu chất vấn là một câu nói công khai về một người
 * trước mặt bạn học của họ, nên hai ranh giới phải được gác chặt:
 *
 *   1. Nhắm vào HÀNH XỬ, không bao giờ nhắm vào NĂNG LỰC. Thua nhiều vì học
 *      chưa giỏi thì KHÔNG gắn.
 *   2. Máy KHÔNG BAO GIỜ tự gắn hai danh hiệu cần người xử.
 */
import {
  ARENA_MANUAL_TITLES,
  ARENA_QUESTION_TITLES,
  ARENA_REDEMPTION_TITLE,
  ARENA_TITLE_THRESHOLDS,
  decideWatch,
  evaluateAll,
  evaluateAnBinhBatDong,
  evaluateAnTaiDaiGia,
  evaluateDanhBatPhuThuc,
  evaluateLamTranThoatDao,
  evaluateYCuongLangNhuoc,
  isArenaQuestionTitle,
  isMachineAwardable,
  type DuelRecord,
  type TitleFacts,
} from "../src/lib/arena/titles.ts";
import {
  abilityJump,
  impossiblyFast,
  rankCase,
  repeatedPairing,
  sameWrongAnswers,
  type Signal,
} from "../src/lib/arena/integrity.ts";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${ok ? "✓" : "✗ THẤT BẠI:"} ${label}`);
  if (!ok) {
    console.log(`      mong đợi ${JSON.stringify(expected)}, nhận ${JSON.stringify(actual)}`);
    failures++;
  }
}

const NOW = new Date("2026-08-21T10:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

function duel(over: Partial<DuelRecord> = {}): DuelRecord {
  return {
    duelId: `d-${Math.random().toString(36).slice(2, 8)}`,
    settledAt: daysAgo(1),
    myRating: 1000,
    opponentId: "opp",
    opponentRating: 1000,
    opponentIsBot: false,
    won: false,
    initiatedByMe: false,
    abandonedByMe: false,
    completedByMe: true,
    ...over,
  };
}

function facts(over: Partial<TitleFacts> = {}): TitleFacts {
  return {
    now: NOW,
    rating: 1000,
    peerMedianRating: 1000,
    duels: [],
    countableDeclines: 0,
    openGateIdleDays: null,
    ...over,
  };
}

console.log("\n— Ranh giới cứng: máy không tự gắn danh hiệu cần người xử —");

check("có đúng năm danh hiệu máy tự gắn", ARENA_QUESTION_TITLES.length, 5);
check("có đúng hai danh hiệu người xử", ARENA_MANUAL_TITLES.length, 2);
check(
  "MÁY KHÔNG BAO GIỜ tự gắn được Ngụy Tạo Quân Công",
  isMachineAwardable("ARENA_M01_NGUY_TAO_QUAN_CONG"),
  false,
);
check(
  "MÁY KHÔNG BAO GIỜ tự gắn được Nội Ứng Ngoại Hợp",
  isMachineAwardable("ARENA_M02_NOI_UNG_NGOAI_HOP"),
  false,
);
check("năm danh hiệu kia thì máy gắn được", ARENA_QUESTION_TITLES.every(isMachineAwardable), true);
check(
  "danh hiệu chuộc lỗi không nằm trong nhóm chất vấn",
  isArenaQuestionTitle(ARENA_REDEMPTION_TITLE),
  false,
);
check(
  "evaluateAll trả về đúng năm phán quyết, không lẫn danh hiệu người xử",
  evaluateAll(facts()).map((v) => v.code),
  [...ARENA_QUESTION_TITLES],
);

console.log("\n— Danh Bất Phù Thực: KHÔNG phạt người yếu, chỉ chỉ ra danh lệch thực —");

const t1 = ARENA_TITLE_THRESHOLDS.DANH_BAT_PHU_THUC;
{
  // Chưa đủ mẫu thì KHÔNG kết luận, dù Chiến Lực thấp hẳn.
  const r = evaluateDanhBatPhuThuc(
    facts({ rating: 700, peerMedianRating: 1000, duels: [duel(), duel(), duel()] }),
  );
  check("mới đánh ba trận thì KHÔNG gắn, dù thấp hơn hẳn", r.conditionMet, false);
}
{
  const many = Array.from({ length: t1.recentDuels }, () => duel({ myRating: 700 }));
  const r = evaluateDanhBatPhuThuc(
    facts({ rating: 700, peerMedianRating: 1000, duels: many }),
  );
  check("đủ mẫu và thấp hơn trung vị 300 thì điều kiện đúng", r.conditionMet, true);
}
{
  // Trận với BOT không được tính. Không để máy quyết định một danh hiệu công
  // khai dựa trên kết quả với máy.
  const botDuels = Array.from({ length: t1.recentDuels }, () =>
    duel({ opponentIsBot: true }),
  );
  const r = evaluateDanhBatPhuThuc(
    facts({ rating: 700, peerMedianRating: 1000, duels: botDuels }),
  );
  check("mười trận với BOT thì vẫn coi như chưa đủ mẫu", r.conditionMet, false);
}
{
  const many = Array.from({ length: t1.recentDuels }, () => duel({ myRating: 950 }));
  const r = evaluateDanhBatPhuThuc(
    facts({ rating: 950, peerMedianRating: 1000, duels: many }),
  );
  check("chỉ thấp hơn 50 điểm thì KHÔNG gắn: đó là dao động bình thường", r.conditionMet, false);
}
{
  const wins = Array.from({ length: t1.clearWinsVsStronger }, () =>
    duel({ won: true, myRating: 700, opponentRating: 1100 }),
  );
  const r = evaluateDanhBatPhuThuc(
    facts({ rating: 700, peerMedianRating: 1000, duels: wins }),
  );
  check("thắng đủ số trận trước người mạnh hơn thì được xoá", r.clearMet, true);
}
{
  const r = evaluateDanhBatPhuThuc(facts({ rating: 1000, peerMedianRating: 1000 }));
  check("Chiến Lực trở lại vùng đồng cấp thì cũng được xoá", r.clearMet, true);
}
check(
  "phán quyết luôn kèm câu chỉ đường ra",
  evaluateDanhBatPhuThuc(facts()).explanation.length > 20,
  true,
);

console.log("\n— Bộ lọc bảy ngày: vận rủi thoáng qua, danh lệch thực kéo dài —");

check("ngưỡng là bảy ngày", t1.sustainedDays, 7);
{
  const d = decideWatch({ conditionMet: true, watchingSince: null, now: NOW, sustainedDays: 7 });
  check("lần đầu chạm ngưỡng thì BẮT ĐẦU THEO DÕI, chưa gắn", d.action, "START_WATCH");
}
{
  const d = decideWatch({
    conditionMet: true,
    watchingSince: daysAgo(3),
    now: NOW,
    sustainedDays: 7,
  });
  check("mới ba ngày thì vẫn chờ, KHÔNG gắn", d.action, "HOLD");
}
{
  const d = decideWatch({
    conditionMet: true,
    watchingSince: daysAgo(8),
    now: NOW,
    sustainedDays: 7,
  });
  check("đủ tám ngày thì mới gắn", d.action, "AWARD");
}
{
  const d = decideWatch({
    conditionMet: false,
    watchingSince: daysAgo(6),
    now: NOW,
    sustainedDays: 7,
  });
  check(
    "đang theo dõi mà điều kiện hết đúng thì XOÁ theo dõi: vận rủi đã qua",
    d.action,
    "CLEAR_WATCH",
  );
}

console.log("\n— Ẩn Tài Đãi Giá: cặp đối xứng của Danh Bất Phù Thực —");

{
  const r = evaluateAnTaiDaiGia(facts({ rating: 1300, peerMedianRating: 1000, openGateIdleDays: 20 }));
  check("mạnh hơn hẳn mà cửa mở vẫn không khởi thí thì gắn", r.conditionMet, true);
}
{
  const r = evaluateAnTaiDaiGia(facts({ rating: 1300, peerMedianRating: 1000, openGateIdleDays: null }));
  check("cửa chưa mở thì không gắn", r.conditionMet, false);
  check("và xoá ngay khi khởi thí", r.clearMet, true);
}
{
  const r = evaluateAnTaiDaiGia(facts({ rating: 1050, peerMedianRating: 1000, openGateIdleDays: 30 }));
  check("chỉ hơn 50 điểm thì không phải ẩn tài", r.conditionMet, false);
}

console.log("\n— Án Binh Bất Động: đếm NGƯỜI, không đếm thư —");

const t3 = ARENA_TITLE_THRESHOLDS.AN_BINH_BAT_DONG;
check(
  "chưa đủ số người thách thì không gắn",
  evaluateAnBinhBatDong(facts({ countableDeclines: t3.distinctChallengers - 1 })).conditionMet,
  false,
);
check(
  "đủ số người thách thì gắn",
  evaluateAnBinhBatDong(facts({ countableDeclines: t3.distinctChallengers })).conditionMet,
  true,
);
{
  const full = Array.from({ length: t3.clearFullDuels }, () => duel({ completedByMe: true }));
  check(
    "đánh trọn đủ số trận thì xoá",
    evaluateAnBinhBatDong(facts({ duels: full })).clearMet,
    true,
  );
}

console.log("\n— Lâm Trận Thoát Đào: bỏ mặc, không phải thua —");

const t4 = ARENA_TITLE_THRESHOLDS.LAM_TRAN_THOAT_DAO;
{
  const abandons = Array.from({ length: t4.abandons }, () =>
    duel({ abandonedByMe: true, completedByMe: false, settledAt: daysAgo(5) }),
  );
  check("bỏ mặc đủ số lần trong cửa sổ thì gắn", evaluateLamTranThoatDao(facts({ duels: abandons })).conditionMet, true);
}
{
  // THUA KHÔNG PHẢI TỘI. Đây là ranh giới đạo đức của cả nhóm danh hiệu.
  const losses = Array.from({ length: 20 }, () => duel({ won: false, completedByMe: true }));
  check(
    "thua hai mươi trận mà trận nào cũng đánh trọn thì KHÔNG gắn gì cả",
    evaluateLamTranThoatDao(facts({ duels: losses })).conditionMet,
    false,
  );
}
{
  const old = Array.from({ length: t4.abandons }, () =>
    duel({ abandonedByMe: true, completedByMe: false, settledAt: daysAgo(t4.windowDays + 5) }),
  );
  check("bỏ mặc quá lâu rồi thì rơi khỏi cửa sổ", evaluateLamTranThoatDao(facts({ duels: old })).conditionMet, false);
}
{
  const streak = Array.from({ length: t4.clearConsecutiveFullDuels }, (_, i) =>
    duel({ completedByMe: true, settledAt: daysAgo(i + 1) }),
  );
  check("chuỗi đánh trọn đủ dài thì xoá", evaluateLamTranThoatDao(facts({ duels: streak })).clearMet, true);
}
{
  // Chuỗi phải LIÊN TIẾP: một lần bỏ mặc gần đây làm đứt chuỗi.
  const broken = [
    duel({ completedByMe: false, abandonedByMe: true, settledAt: daysAgo(1) }),
    ...Array.from({ length: 9 }, (_, i) => duel({ completedByMe: true, settledAt: daysAgo(i + 2) })),
  ];
  check("bỏ mặc gần nhất làm đứt chuỗi", evaluateLamTranThoatDao(facts({ duels: broken })).clearMet, false);
}

console.log("\n— Ỷ Cường Lăng Nhược: CHỈ đếm trận mình chủ động thách —");

const t5 = ARENA_TITLE_THRESHOLDS.Y_CUONG_LANG_NHUOC;
{
  const bullying = Array.from({ length: t5.consecutiveWeakerTargets }, (_, i) =>
    duel({ initiatedByMe: true, myRating: 1200, opponentRating: 900, settledAt: daysAgo(i + 1) }),
  );
  check("chủ động thách kẻ yếu đủ số lần thì gắn", evaluateYCuongLangNhuoc(facts({ duels: bullying })).conditionMet, true);
}
{
  // Trận TỰ GHÉP không phải lỗi của ai: máy chọn đối thủ, không phải người chơi.
  const matched = Array.from({ length: 20 }, (_, i) =>
    duel({ initiatedByMe: false, myRating: 1200, opponentRating: 900, settledAt: daysAgo(i + 1) }),
  );
  check(
    "hai mươi trận TỰ GHÉP với người yếu hơn thì KHÔNG gắn",
    evaluateYCuongLangNhuoc(facts({ duels: matched })).conditionMet,
    false,
  );
}
{
  const mixed = [
    duel({ initiatedByMe: true, myRating: 1200, opponentRating: 1250, settledAt: daysAgo(1) }),
    ...Array.from({ length: 15 }, (_, i) =>
      duel({ initiatedByMe: true, myRating: 1200, opponentRating: 900, settledAt: daysAgo(i + 2) }),
    ),
  ];
  check("một lần thách người mạnh hơn làm đứt chuỗi", evaluateYCuongLangNhuoc(facts({ duels: mixed })).conditionMet, false);
}
{
  const wins = Array.from({ length: t5.clearWinsVsEqualOrStronger }, () =>
    duel({ won: true, myRating: 1000, opponentRating: 1000 }),
  );
  check("thắng đủ trận trước người ngang sức thì xoá", evaluateYCuongLangNhuoc(facts({ duels: wins })).clearMet, true);
}

console.log("\n— Tín hiệu liêm chính: XẾP HỒ SƠ, không kết luận —");

{
  const items = Array.from({ length: 6 }, () => ({ a: 2, b: 2, correct: 1 }));
  const s = sameWrongAnswers({ items });
  check("cùng sai cùng một phương án sáu lần thì có tín hiệu", s?.code, "SAME_WRONG_ANSWERS");
  check("và độ tin CAO", s?.strength, "HIGH");
}
{
  const items = Array.from({ length: 6 }, (_, i) => ({ a: 2, b: i % 3, correct: 1 }));
  check("sai khác kiểu nhau thì không có tín hiệu", sameWrongAnswers({ items }), null);
}
{
  const items = Array.from({ length: 6 }, () => ({ a: 1, b: 1, correct: 1 }));
  check("cùng ĐÚNG thì không nói lên gì, vì đáp án đúng chỉ có một", sameWrongAnswers({ items }), null);
}

check(
  "đọc 900 từ trong nửa phút mà đúng gần hết là bất khả thi",
  impossiblyFast({ passageWords: 900, elapsedMs: 30_000, score: 12, total: 13 })?.code,
  "IMPOSSIBLY_FAST",
);
check(
  "nhanh mà làm sai nhiều thì chỉ là BỎ CUỘC, không phải gian lận",
  impossiblyFast({ passageWords: 900, elapsedMs: 30_000, score: 3, total: 13 }),
  null,
);
check(
  "đọc với tốc độ người thường thì không có tín hiệu",
  impossiblyFast({ passageWords: 900, elapsedMs: 600_000, score: 12, total: 13 }),
  null,
);

check(
  "một trận xuất thần thì chưa nói lên gì",
  abilityJump({ practiceAccuracy: 0.4, duelAccuracy: 0.95, duelsCounted: 1 }),
  null,
);
check(
  "nhưng chênh lớn kéo dài nhiều trận thì đáng xem",
  abilityJump({ practiceAccuracy: 0.4, duelAccuracy: 0.95, duelsCounted: 8 })?.strength,
  "MEDIUM",
);
check(
  "giỏi đều thì không phải đột biến",
  abilityJump({ practiceAccuracy: 0.9, duelAccuracy: 0.92, duelsCounted: 8 }),
  null,
);

{
  const alternating = Array.from({ length: 12 }, (_, i) => i % 2 === 0);
  check(
    "gặp nhiều lần kèm thắng luân phiên thì đáng xem",
    repeatedPairing({ meetings: 12, windowDays: 30, outcomes: alternating })?.code,
    "REPEATED_PAIRING",
  );
  const oneSided = Array.from({ length: 12 }, () => true);
  check(
    "gặp nhiều lần mà một bên thắng áp đảo thì bình thường",
    repeatedPairing({ meetings: 12, windowDays: 30, outcomes: oneSided }),
    null,
  );
  check(
    "gặp ít lần thì không xét",
    repeatedPairing({ meetings: 3, windowDays: 30, outcomes: [true, false, true] }),
    null,
  );
}

console.log("\n— Xếp thứ tự hồ sơ —");

const highSignal: Signal = {
  code: "IMPOSSIBLY_FAST",
  strength: "HIGH",
  score: 0.8,
  detail: "x",
};
const mediumSignal: Signal = {
  code: "ABILITY_JUMP",
  strength: "MEDIUM",
  score: 0.6,
  detail: "x",
};

check("không tín hiệu nào thì không vào hàng chờ", rankCase([]).worthReviewing, false);
check("một tín hiệu độ tin CAO là đủ", rankCase([highSignal]).worthReviewing, true);
check(
  "một tín hiệu TRUNG BÌNH đứng một mình thì CHƯA đủ",
  rankCase([mediumSignal]).worthReviewing,
  false,
);
check("hai tín hiệu trung bình thì đủ", rankCase([mediumSignal, mediumSignal]).worthReviewing, true);
check("điểm ưu tiên luôn trong khoảng 0 tới 1", rankCase([highSignal, highSignal, highSignal]).priority <= 1, true);
check(
  "nhiều tín hiệu thì xếp trước ít tín hiệu",
  rankCase([highSignal, mediumSignal]).priority > rankCase([mediumSignal]).priority,
  true,
);

console.log(
  failures === 0
    ? "\n✅ DANH HIỆU CHẤT VẤN VÀ TÍN HIỆU LIÊM CHÍNH ĐỀU ĐẠT\n"
    : `\n❌ CÓ ${failures} KIỂM THỬ THẤT BẠI\n`,
);
process.exit(failures === 0 ? 0 : 1);
