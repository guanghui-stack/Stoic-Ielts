/**
 * Biến ảnh nhân vật nền trắng thành PNG nền trong suốt, cắt sát viền.
 *
 * VÌ SAO KHÔNG XOÁ MỌI PIXEL TRẮNG: giáp trụ có mảng sáng gần trắng, ngọn lửa
 * có lõi trắng, và mắt ngựa có đốm sáng. Xoá theo màu sẽ đục thủng nhân vật.
 * Script này lan từ MÉP ảnh vào (flood fill), nên chỉ nền liền mạch với viền
 * mới bị xoá — mảng trắng nằm lọt trong hình vẫn còn nguyên.
 *
 * Sau khi xoá nền, cắt bỏ viền trong suốt thừa để phần thấp nhất của tranh
 * chạm đúng cạnh dưới. Đó là điểm neo khi đặt lên bản đồ 2.5D; thừa khoảng
 * trống bên dưới thì nhân vật sẽ lơ lửng trên mặt đất.
 *
 * Chạy: node scripts/cutout-hero.mjs <ảnh vào> <ảnh ra> [ngưỡng]
 */

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const [, , input, output, thresholdArg] = process.argv;
if (!input || !output) {
  console.error("Dùng: node scripts/cutout-hero.mjs <vào> <ra> [ngưỡng 0-255]");
  process.exit(1);
}

/** Pixel sáng hơn ngưỡng này ở CẢ ba kênh mới được coi là nền. */
const THRESHOLD = Number(thresholdArg ?? 238);

const image = sharp(input).ensureAlpha();
const { width, height } = await image.metadata();
const raw = await image.raw().toBuffer();

const isBackgroundCandidate = (i) =>
  raw[i] >= THRESHOLD && raw[i + 1] >= THRESHOLD && raw[i + 2] >= THRESHOLD;

// Lan từ mép vào. Dùng ngăn xếp thay vì đệ quy: ảnh 1.4 triệu pixel sẽ tràn
// ngăn xếp lời gọi nếu đệ quy.
const visited = new Uint8Array(width * height);
const stack = [];

for (let x = 0; x < width; x += 1) {
  stack.push([x, 0], [x, height - 1]);
}
for (let y = 0; y < height; y += 1) {
  stack.push([0, y], [width - 1, y]);
}

let cleared = 0;
while (stack.length > 0) {
  const [x, y] = stack.pop();
  if (x < 0 || y < 0 || x >= width || y >= height) continue;
  const p = y * width + x;
  if (visited[p]) continue;
  const i = p * 4;
  if (!isBackgroundCandidate(i)) continue;

  visited[p] = 1;
  raw[i + 3] = 0;
  cleared += 1;

  stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
}

/*
 * Làm mềm viền: pixel còn đục nhưng có hàng xóm đã trong suốt thì hạ alpha
 * một phần. Không có bước này thì viền răng cưa lộ rõ trên nền kem của site.
 */
const alphaCopy = new Uint8Array(width * height);
for (let p = 0; p < width * height; p += 1) alphaCopy[p] = raw[p * 4 + 3];

for (let y = 1; y < height - 1; y += 1) {
  for (let x = 1; x < width - 1; x += 1) {
    const p = y * width + x;
    if (alphaCopy[p] === 0) continue;
    let transparentNeighbours = 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (alphaCopy[(y + dy) * width + (x + dx)] === 0) transparentNeighbours += 1;
    }
    if (transparentNeighbours > 0) {
      raw[p * 4 + 3] = Math.round(255 * (1 - transparentNeighbours / 5));
    }
  }
}

fs.mkdirSync(path.dirname(output), { recursive: true });

await sharp(raw, { raw: { width, height, channels: 4 } })
  .png()
  .toFile(output);

// Cắt viền trong suốt thừa. `trim` của sharp bám theo alpha khi ảnh có kênh alpha.
const trimmed = await sharp(output).trim({ threshold: 1 }).toBuffer();
await sharp(trimmed).png({ compressionLevel: 9 }).toFile(output);

const after = await sharp(output).metadata();
const percent = Math.round((cleared / (width * height)) * 100);
console.log(`Đã xoá ${percent}% diện tích làm nền trong suốt.`);
console.log(`Kích thước: ${width}x${height} → ${after.width}x${after.height}`);
console.log(`Ghi ra: ${output}`);
