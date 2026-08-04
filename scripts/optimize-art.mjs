/**
 * Nén ảnh đã duyệt sang WebP theo đúng ngân sách dung lượng của art bible.
 *
 * Vì sao cần script riêng thay vì nén tay: đặc tả §8.5 đặt trần KB khác nhau cho
 * từng loại asset, và trần đó là ràng buộc hiệu năng thật — ảnh nền bản đồ nặng
 * làm hỏng LCP trên 3G, thứ mà học viên ở tỉnh vẫn đang dùng. Script tự hạ chất
 * lượng dần cho tới khi lọt trần, thay vì để người áng chừng.
 *
 * Ảnh nguồn nằm NGOÀI repo (thư mục nháp). Chỉ bản đã nén mới được ghi vào
 * public/, đúng quy tắc §8.10 mục 6: không commit file master 20-50 MB.
 *
 * Chạy: node scripts/optimize-art.mjs
 */

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const PUB = "public";
const DIR = {
  /** Sáu ảnh chủ dự án cung cấp, đã xoá chữ. */
  sach: "C:/Users/LENOVO/Downloads/ho-phu-art/sach",
  /** Tám cửa ải và nền bản đồ, sinh mới. */
  cuaAi: "C:/Users/LENOVO/Downloads/ho-phu-art/cua-ai",
  /** Ảnh sinh lại vì bản gốc sai màu accent. */
  suaMau: process.env.TEMP + "/ho-phu-art-candidates",
};

/** width: bề ngang đầu ra. maxKb: trần dung lượng theo §8.5. */
const JOBS = [
  { dir: "sach", src: "trieu-van-v1.png", out: "art/home/trieu-van-hero.webp", width: 1600, maxKb: 350 },
  { dir: "sach", src: "trieu-van-v1.png", out: "art/generals/trieu-van.webp", width: 1280, maxKb: 220 },
  // Trương Phi dùng bản sinh lại: ảnh gốc dùng vàng kim, manifest chốt chu sa.
  { dir: "suaMau", src: "truong-phi-v2.png", out: "art/generals/truong-phi.webp", width: 1280, maxKb: 220 },
  { dir: "sach", src: "quan-vu-v1.png", out: "art/generals/quan-vu.webp", width: 1280, maxKb: 220 },
  { dir: "sach", src: "hoang-trung-v1.png", out: "art/generals/hoang-trung.webp", width: 1280, maxKb: 220 },
  { dir: "sach", src: "ma-sieu-v1.png", out: "art/generals/ma-sieu.webp", width: 1280, maxKb: 220 },
  { dir: "sach", src: "lu-bo-v1.png", out: "art/generals/lu-bo.webp", width: 1280, maxKb: 220 },

  { dir: "cuaAi", src: "trial-01-dao-vien-v1.png", out: "art/trials/trial-01-dao-vien.webp", width: 1280, maxKb: 280 },
  { dir: "cuaAi", src: "trial-02-hoang-can-v1.png", out: "art/trials/trial-02-hoang-can.webp", width: 1280, maxKb: 280 },
  { dir: "cuaAi", src: "trial-03-hoa-hung-v1.png", out: "art/trials/trial-03-hoa-hung.webp", width: 1280, maxKb: 280 },
  { dir: "cuaAi", src: "trial-04-ngu-quan-v1.png", out: "art/trials/trial-04-ngu-quan.webp", width: 1280, maxKb: 280 },
  { dir: "cuaAi", src: "trial-05-truong-ban-v1.png", out: "art/trials/trial-05-truong-ban.webp", width: 1280, maxKb: 280 },
  { dir: "cuaAi", src: "trial-06-hoang-trung-v1.png", out: "art/trials/trial-06-hoang-trung.webp", width: 1280, maxKb: 280 },
  { dir: "cuaAi", src: "trial-07-ma-sieu-v1.png", out: "art/trials/trial-07-ma-sieu.webp", width: 1280, maxKb: 280 },
  { dir: "cuaAi", src: "trial-08-lu-bo-v1.png", out: "art/trials/trial-08-lu-bo.webp", width: 1280, maxKb: 280 },
  {
    dir: "cuaAi",
    src: "map-loan-the-quan-hung-tam-phan-v1.png",
    out: "art/campaign/map-loan-the-quan-hung-tam-phan.webp",
    width: 1920,
    maxKb: 500,
  },
];

let done = 0;
let skipped = 0;

for (const job of JOBS) {
  const src = path.join(DIR[job.dir], job.src);
  if (!fs.existsSync(src)) {
    console.log(`BỎ QUA ${job.out} — chưa có ${job.src}`);
    skipped += 1;
    continue;
  }

  const dest = path.join(PUB, job.out);
  fs.mkdirSync(path.dirname(dest), { recursive: true });

  // Hạ chất lượng dần thay vì đoán một con số: cùng một mức quality cho ra dung
  // lượng rất khác nhau tuỳ ảnh nhiều nét mực hay nhiều mảng phẳng.
  let buf = null;
  let used = 0;
  for (const q of [88, 82, 76, 70, 64, 58, 50]) {
    buf = await sharp(src).resize({ width: job.width }).webp({ quality: q }).toBuffer();
    used = q;
    if (buf.length <= job.maxKb * 1024) break;
  }

  fs.writeFileSync(dest, buf);
  const kb = Math.round(buf.length / 1024);
  const flag = kb <= job.maxKb ? "đạt" : "VƯỢT TRẦN";
  console.log(`${job.out} — ${kb} KB (trần ${job.maxKb}, quality ${used}) ${flag}`);
  done += 1;
}

console.log(`\nXong ${done} ảnh, bỏ qua ${skipped}.`);
