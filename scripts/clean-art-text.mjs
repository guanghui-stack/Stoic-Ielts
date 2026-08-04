/**
 * Xoá chữ khỏi sáu ảnh Lục tướng do chủ dự án cung cấp.
 *
 * Sáu ảnh gốc nằm nhúng trong file đặc tả Word và đều có chữ nung sẵn ở góc
 * trên bên trái — bốn ảnh còn có ký tự chữ Hán. Cả hai đều vi phạm quyết định
 * số 4 và 15 của đặc tả, và `containsText` trong art-manifest.ts bị ép cứng
 * kiểu `false` nên ảnh có chữ không khai báo được.
 *
 * Không vẽ lại ảnh mới: bố cục gốc vốn đã đặt nhân vật lệch phải, nên xoá chữ
 * đi là vừa đúng vùng trống bên trái mà đặc tả §8.8 yêu cầu chừa cho chữ tiếng
 * Việt render bằng DOM.
 *
 * Chạy: node scripts/clean-art-text.mjs
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const SRC = "C:/Users/LENOVO/Downloads/ho-phu-art/goc";
const DEST = "C:/Users/LENOVO/Downloads/ho-phu-art/sach";

/** Ánh xạ xác định bằng cách mở từng ảnh ra xem, không đoán theo thứ tự file. */
const IMAGES = [
  { file: "image1.png", out: "trieu-van", ten: "Triệu Vân" },
  { file: "image2.png", out: "truong-phi", ten: "Trương Phi" },
  { file: "image3.png", out: "ma-sieu", ten: "Mã Siêu" },
  { file: "image4.png", out: "hoang-trung", ten: "Hoàng Trung" },
  { file: "image6.png", out: "lu-bo", ten: "Lữ Bố" },
];

const PROMPT =
  "Edit this exact image: erase every piece of text, calligraphy, lettering, " +
  "Chinese character and every red seal stamp from it. Fill the erased areas " +
  "seamlessly with the same clean plain ivory rice paper texture as the " +
  "surrounding background, so the top-left area becomes completely empty paper. " +
  "Preserve absolutely everything else pixel-for-pixel: the same rider, same " +
  "horse, same pose, same energy effect, same accent colour, same ink splashes, " +
  "same background and same composition. Change nothing except removing the " +
  "text, characters and seals.";

for (const img of IMAGES) {
  const src = path.join(SRC, img.file);
  if (!fs.existsSync(src)) {
    console.log(`BỎ QUA ${img.ten}: không thấy ${img.file}`);
    continue;
  }
  console.log(`\n=== ${img.ten} (${img.file}) ===`);
  try {
    execFileSync(
      "node",
      [
        "scripts/generate-art.mjs",
        "--image", src,
        "--out", img.out,
        "--ratio", "16:9",
        "--count", "1",
        "--prompt", PROMPT,
      ],
      { stdio: "inherit", env: { ...process.env, ART_OUT_DIR: DEST } },
    );
  } catch {
    console.log(`  ${img.ten}: hỏng, sẽ phải chạy lại riêng`);
  }
}

console.log("\nXong. Ảnh sạch nằm ở:", DEST);
