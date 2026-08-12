/**
 * Kiểm thử ví xu.
 * Chạy: node --experimental-strip-types scripts/test-coins.ts
 *
 * Đây là tiền thật của học viên. Sai một chút ở đây thì hoặc trung tâm mất
 * tiền, hoặc học viên mất xu mà không được gì — cả hai đều không có thông báo
 * lỗi nào để ai kịp nhận ra.
 */
import { OFFERS } from "../src/lib/payments/catalog.ts";
import {
  COIN_UNIT_VND,
  TOPUP_TIERS,
  bonusCoinsOf,
  coinBalance,
  coinPriceOf,
  decideCoinPurchase,
  formatCoins,
  isTopUpTierCode,
  listTopUpTiers,
  orderCodeLabel,
  suggestTierFor,
  WELCOME_COINS,
} from "../src/lib/payments/coins.ts";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${ok ? "✓" : "✗ THẤT BẠI:"} ${label}`);
  if (!ok) {
    console.log(`      mong đợi ${JSON.stringify(expected)}, nhận ${JSON.stringify(actual)}`);
    failures++;
  }
}

console.log("\n— Bốn mốc nạp đúng như đã chốt với chủ dự án —");

check("mốc 50k = 50 xu", TOPUP_TIERS.COIN_50K.coins, 50);
check("mốc 100k = 100 xu", TOPUP_TIERS.COIN_100K.coins, 100);
check("mốc 200k = 210 xu", TOPUP_TIERS.COIN_200K.coins, 210);
check("mốc 500k = 550 xu", TOPUP_TIERS.COIN_500K.coins, 550);

check("mốc 50k không thưởng — đây là cửa thử", bonusCoinsOf("COIN_50K"), 0);
check("mốc 100k không thưởng", bonusCoinsOf("COIN_100K"), 0);
check("mốc 200k thưởng 10 xu (+5%)", bonusCoinsOf("COIN_200K"), 10);
check("mốc 500k thưởng 50 xu (+10%)", bonusCoinsOf("COIN_500K"), 50);

check("mốc hiển thị từ nhỏ tới lớn", listTopUpTiers(), [
  "COIN_50K",
  "COIN_100K",
  "COIN_200K",
  "COIN_500K",
]);

console.log("\n— Bảng mốc nạp phải nhất quán —");

// Bảng viết tay thì sai chính tả số là chuyện sẽ xảy ra. Ba phép thử dưới đây
// bắt lỗi đó ngay, thay vì để nó thành một dòng tiền lệch trên production.
const tiers = listTopUpTiers();
check(
  "mọi mốc đều là số nguyên dương",
  tiers.every(
    (c) =>
      Number.isInteger(TOPUP_TIERS[c].coins) &&
      Number.isInteger(TOPUP_TIERS[c].amountVnd) &&
      TOPUP_TIERS[c].coins > 0
  ),
  true
);
check(
  "không mốc nào cho ÍT xu hơn tỉ giá gốc",
  tiers.every((c) => bonusCoinsOf(c) >= 0),
  true
);
check(
  "nạp nhiều tiền hơn luôn được nhiều xu hơn",
  tiers.every((c, i) => i === 0 || TOPUP_TIERS[c].coins > TOPUP_TIERS[tiers[i - 1]].coins),
  true
);
check(
  "thưởng không giảm khi mốc tăng — mốc lớn phải luôn đáng chọn hơn",
  tiers.every((c, i) => i === 0 || bonusCoinsOf(c) >= bonusCoinsOf(tiers[i - 1])),
  true
);
check("một xu đúng 1.000đ", COIN_UNIT_VND, 1_000);

check("mã mốc lạ bị từ chối", isTopUpTierCode("COIN_999K"), false);
check("mã mốc thật được nhận", isTopUpTierCode("COIN_200K"), true);

console.log("\n— Giá gói tính bằng xu —");

check("Mở một đề Reading = 9 xu", coinPriceOf("READING_UNLOCK"), 9);
check("Full Test = 39 xu", coinPriceOf("FEYNMAN_ATTEMPT_FULL"), 39);
check("Đề đơn = 19 xu", coinPriceOf("FEYNMAN_ATTEMPT_SINGLE"), 19);
check("Nạp lượt AI = 29 xu", coinPriceOf("FEYNMAN_AI_TOPUP"), 29);

// Gói đã dừng bán phải trả null chứ KHÔNG phải 0: 0 sẽ bị đọc thành "miễn phí"
// và mở toang gói cũ cho tất cả mọi người.
check("gói Reading cũ không mua bằng xu được", coinPriceOf("READING_SINGLE"), null);
check("gói Feynman 30 ngày cũ không mua bằng xu được", coinPriceOf("FEYNMAN_ALL_30D"), null);
check(
  "gói cũ trả null chứ không phải 0",
  coinPriceOf("READING_ALL_30D") === 0,
  false
);

check(
  "giá xu khớp đúng 1/1000 giá VND đối chiếu",
  ([
    "READING_UNLOCK",
    "FEYNMAN_ATTEMPT_FULL",
    "FEYNMAN_ATTEMPT_SINGLE",
    "FEYNMAN_AI_TOPUP",
  ] as const).every((c) => coinPriceOf(c) === OFFERS[c].amount / COIN_UNIT_VND),
  true
);

console.log("\n— Quà chào mừng —");

check("quà chào mừng 150 xu", WELCOME_COINS, 150);
// Con số 150 chỉ có nghĩa khi đặt cạnh giá mở đề: nó PHẢI đủ cho một số nguyên
// lần mở đề, nếu không học viên sẽ mãi còn xu lẻ không tiêu được vào đâu.
check(
  "150 xu mở được đúng 16 đề",
  Math.floor(WELCOME_COINS / (coinPriceOf("READING_UNLOCK") ?? 1)),
  16
);
check(
  "quà chào mừng đủ mở trọn vẹn ít nhất một lượt (9 mở đề + 19 Feynman)",
  WELCOME_COINS >=
    (coinPriceOf("READING_UNLOCK") ?? 0) +
      (coinPriceOf("FEYNMAN_ATTEMPT_SINGLE") ?? 0),
  true
);

console.log("\n— Số dư là hàm dẫn xuất —");

check("ví mới toanh còn 0", coinBalance({ grantedTotal: 0, spentTotal: 0 }), 0);
check("nạp 100 tiêu 39 còn 61", coinBalance({ grantedTotal: 100, spentTotal: 39 }), 61);
check("tiêu hết thì còn 0", coinBalance({ grantedTotal: 50, spentTotal: 50 }), 0);
// Dữ liệu hỏng thì khóa ví lại vẫn an toàn hơn là để số âm trôi vào phép so
// sánh "còn đủ xu không" — số âm nhỏ hơn mọi giá nên nó tự chặn, nhưng một
// phép trừ ở chỗ khác có thể biến nó thành số dương.
check("dữ liệu hỏng không sinh ra số âm", coinBalance({ grantedTotal: 10, spentTotal: 99 }), 0);

console.log("\n— Quyết định tiêu xu —");

check("đủ xu thì mua được", decideCoinPurchase({
  offerCode: "FEYNMAN_ATTEMPT_SINGLE",
  balance: 50,
  alreadyOwned: false,
}), { ok: true, cost: 19, balanceAfter: 31 });

check("vừa đúng đủ xu vẫn mua được", decideCoinPurchase({
  offerCode: "FEYNMAN_ATTEMPT_FULL",
  balance: 39,
  alreadyOwned: false,
}), { ok: true, cost: 39, balanceAfter: 0 });

check("thiếu một xu là không mua được", decideCoinPurchase({
  offerCode: "FEYNMAN_ATTEMPT_FULL",
  balance: 38,
  alreadyOwned: false,
}), { ok: false, reason: "NOT_ENOUGH_COINS", cost: 39, missing: 1 });

check("ví rỗng báo thiếu đúng bằng giá gói", decideCoinPurchase({
  offerCode: "FEYNMAN_ATTEMPT_SINGLE",
  balance: 0,
  alreadyOwned: false,
}), { ok: false, reason: "NOT_ENOUGH_COINS", cost: 19, missing: 19 });

check("đã có quyền thì không bán tiếp", decideCoinPurchase({
  offerCode: "FEYNMAN_ATTEMPT_FULL",
  balance: 500,
  alreadyOwned: true,
}), { ok: false, reason: "ALREADY_OWNED", cost: 39, missing: 0 });

check("gói đã dừng bán thì không tiêu xu được", decideCoinPurchase({
  offerCode: "FEYNMAN_SINGLE",
  balance: 500,
  alreadyOwned: false,
}), { ok: false, reason: "NOT_BUYABLE", cost: null, missing: 0 });

// Ví rỗng + gói đã dừng bán vẫn phải ra "không bán", không phải "thiếu xu" —
// nếu không, học viên bị mời đi nạp cho một gói mà nạp xong vẫn không mua được.
//
// NÓI THẲNG PHẦN PHÉP THỬ NÀY KHÔNG CHỨNG MINH ĐƯỢC: đã thử đảo thứ tự trong
// `decideCoinPurchase` và phép thử VẪN XANH. Lý do là "không bán được" đồng
// nghĩa với `cost === null`, mà null thì không có gì để so với số dư, nên
// nhánh thiếu xu không bao giờ thắng được dù xếp trước. Thứ tự ở đó an toàn
// nhờ kiểu dữ liệu chứ không nhờ phép thử này. Giữ lại vì hành vi vẫn đáng
// ghim, nhưng đừng đọc nó thành một bảo chứng về thứ tự.
check("ví rỗng + gói dừng bán vẫn báo 'không bán' chứ không phải 'thiếu xu'", decideCoinPurchase({
  offerCode: "READING_SINGLE",
  balance: 0,
  alreadyOwned: false,
}), { ok: false, reason: "NOT_BUYABLE", cost: null, missing: 0 });

console.log("\n— Gợi ý mốc nạp khi thiếu xu —");

check("thiếu 19 xu thì gợi ý mốc nhỏ nhất", suggestTierFor(19), "COIN_50K");
check("thiếu đúng 50 xu vẫn đủ ở mốc 50k", suggestTierFor(50), "COIN_50K");
check("thiếu 51 xu phải lên mốc 100k", suggestTierFor(51), "COIN_100K");
check("thiếu 300 xu phải lên mốc 500k", suggestTierFor(300), "COIN_500K");
check("thiếu nhiều hơn mọi mốc thì gợi ý mốc lớn nhất", suggestTierFor(9_999), "COIN_500K");

console.log("\n— Nhãn hiển thị trên đơn hàng —");

check("mã mốc nạp ra nhãn tiếng Việt", orderCodeLabel("COIN_200K"), "Nạp 200.000đ");
check(
  "mã gói ra nhãn của gói",
  orderCodeLabel("FEYNMAN_ATTEMPT_FULL"),
  OFFERS.FEYNMAN_ATTEMPT_FULL.label
);
check("mã lạ trả về chính nó, không ném lỗi", orderCodeLabel("MA_LA_HOAC"), "MA_LA_HOAC");

check("định dạng xu", formatCoins(1_250), "1.250 xu");

console.log(
  failures === 0
    ? "\n✅ TẤT CẢ KIỂM THỬ VÍ XU ĐỀU ĐẠT\n"
    : `\n❌ CÓ ${failures} KIỂM THỬ THẤT BẠI\n`
);
process.exit(failures === 0 ? 0 : 1);
