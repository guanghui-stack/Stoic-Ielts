/**
 * Gác ba bất biến của hai đồng tiền.
 * Chạy: node --experimental-strip-types scripts/test-economy-invariants.ts
 *
 * Đây KHÔNG phải kiểm thử hành vi. Đây là kiểm thử KIẾN TRÚC: nó đọc mã nguồn
 * và khẳng định những đường nối không được phép tồn tại thì không tồn tại.
 *
 * Vì sao phải làm kiểu này. Ba bất biến ở `docs/DAC-TA-DAU-TRUONG.md` mục 01
 * không hỏng bằng một hàm sai, chúng hỏng bằng một dòng `import` mà người viết
 * thấy rất hợp lý vào lúc đó. Kiểm thử hành vi không bao giờ bắt được điều đó,
 * vì mỗi hàm vẫn chạy đúng như đã viết.
 *
 * Xem thêm mục 15, ba mục "Đã bác bỏ" liên quan.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { OFFERS } from "../src/lib/payments/catalog.ts";
import { decideThiButPurchase } from "../src/lib/merit/merit.ts";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${ok ? "✓" : "✗ THẤT BẠI:"} ${label}`);
  if (!ok) {
    console.log(`      mong đợi ${JSON.stringify(expected)}, nhận ${JSON.stringify(actual)}`);
    failures++;
  }
}

function filesUnder(dir: string): string[] {
  let out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out = out.concat(filesUnder(p));
    else if (p.endsWith(".ts") || p.endsWith(".tsx")) out.push(p);
  }
  return out;
}

function importsOf(file: string): string[] {
  const src = readFileSync(file, "utf8");
  return [...src.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]);
}

/**
 * Bóc chú thích trước khi soi mã.
 *
 * Bài kiểm tra này soi CODE, không soi văn xuôi. Chính các file luật lại là nơi
 * ghi rõ nhất "không được nhét `offerCode` vào đây", nên nếu soi cả chú thích
 * thì một tài liệu viết tốt sẽ tự làm hỏng bài kiểm tra của chính nó.
 */
function codeOnly(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
}

/* ================================================================
   BẤT BIẾN 2: hai đồng tiền không gặp nhau
   ================================================================ */

console.log("\n— Bất biến 2: không đường nào đổi Xu ra Quân Công hoặc ngược lại —");

const meritFiles = filesUnder("src/lib/merit");
const experienceFiles = filesUnder("src/lib/experience");
const paymentFiles = filesUnder("src/lib/payments");

const meritImportsPayments = meritFiles.flatMap((f) =>
  importsOf(f)
    .filter((i) => i.includes("payments") || i.includes("coin"))
    .map((i) => `${f} -> ${i}`)
);
check("thư mục merit KHÔNG import gì từ payments", meritImportsPayments, []);

const paymentsImportMerit = paymentFiles.flatMap((f) =>
  importsOf(f)
    .filter((i) => i.includes("/merit") || i.includes("quanCong"))
    .map((i) => `${f} -> ${i}`)
);
check("thư mục payments KHÔNG import gì từ merit", paymentsImportMerit, []);

const experienceImportsMoney = experienceFiles.flatMap((f) =>
  importsOf(f)
    .filter((i) => i.includes("payments") || i.includes("/merit"))
    .map((i) => `${f} -> ${i}`)
);
check(
  "kinh nghiệm không dính tới đồng tiền nào: nó chỉ định nhịp",
  experienceImportsMoney,
  []
);

// Không món hàng nào có cả hai giá.
const offersWithMeritPrice = Object.entries(OFFERS).filter(([, o]) =>
  Object.keys(o).some((k) => /merit|quanCong|quan_cong/i.test(k))
);
check("không món hàng nào mang giá Quân Công", offersWithMeritPrice.map(([c]) => c), []);

console.log("\n— Bất biến 3: không hai cửa khác tên dẫn về một kết quả —");

/*
 * Lỗ rò đã bịt: Xu bán "quyền bỏ qua Thí Bút". Nó không trông giống chung giỏ
 * hàng, nhưng Quân Công mua lượt Thí Bút để mở đề, còn quyền bỏ qua cũng mở
 * đúng đề đó, nên tỷ giá tự sinh. Xem đặc tả mục 15.
 */
const skipOffers = Object.entries(OFFERS).filter(
  ([code, o]) =>
    /skip|bypass|bo_qua|boqua/i.test(code) ||
    /bỏ qua|miễn|skip/i.test(`${o.label} ${o.blurb}`)
);
check("không món hàng nào bán quyền bỏ qua khảo hạch", skipOffers.map(([c]) => c), []);

// Chữ ký hàm là chốt chặn cuối: không có chỗ nhét mã món hàng vào.
check(
  "decideThiButPurchase nhận đúng một tham số, không nhận mã món hàng",
  decideThiButPurchase.length,
  1
);

const meritSource = codeOnly(meritFiles.map((f) => readFileSync(f, "utf8")).join("\n"));
check(
  "mã nguồn merit không nhắc tới exerciseId hay offerCode",
  /exerciseId|offerCode/.test(meritSource),
  false
);

/* ================================================================
   BẤT BIẾN 1: không lối ra
   ================================================================ */

console.log("\n— Bất biến 1: luôn có đường kiếm Quân Công không cần đồng nào —");

/*
 * Đặc tả mục 01 đòi khẳng định HAI điều:
 *
 *   1. Số đề accessLevel = PUBLIC lớn hơn không
 *   2. Vào hạng không cược không đòi Xu lẫn Quân Công
 *
 * Cả hai đều cần dữ liệu thật hoặc cần P3, nên ở P1 gác được phần thứ ba, là
 * phần độc lập với cả hai: đường "ngày học đạt chuẩn" phải không có bất kỳ
 * điều kiện chi trả nào.
 *
 * Bài kiểm tra này CỐ Ý chưa đầy đủ, và nói rõ ra chứ không giả vờ là đã xong.
 */
const meritRules = codeOnly(readFileSync("src/lib/merit/merit.ts", "utf8"));
check("đường ngày học đạt chuẩn tồn tại", /qualifiedStudyDayKeys/.test(meritRules), true);
check(
  "đường đó không đòi trả gì: không nhắc tới ví Xu, giá, hay quyền truy cập",
  /coinBalance|priceCoins|AccessGrant|accessLevel/.test(meritRules),
  false
);
check("ngưỡng ngày học đạt chuẩn không phụ thuộc số đề đã mua", /exerciseCount|purchasedExercises/.test(meritRules), false);

console.log(
  "\n  ⚠ CHƯA GÁC ĐƯỢC ở P1, phải bổ sung khi tới giai đoạn tương ứng:"
);
console.log("      - Số đề PUBLIC lớn hơn không: cần truy vấn database, thêm ở P2");
console.log("      - Hạng không cược không đòi đồng nào: cần hạng trận, thêm ở P3");

console.log(
  failures === 0
    ? "\n✅ BA BẤT BIẾN KINH TẾ ĐỀU ĐƯỢC GÁC (phần gác được ở P1)\n"
    : `\n❌ CÓ ${failures} BẤT BIẾN BỊ PHÁ\n`
);
process.exit(failures === 0 ? 0 : 1);
