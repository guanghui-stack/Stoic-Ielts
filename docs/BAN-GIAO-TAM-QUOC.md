# Bản ghi bàn giao — chuyển hệ HỔ PHÙ · IELTS sang Tam Quốc

Nhánh: `claude/design-system-tam-quoc-64djga`
Nguồn: Master System Specification v1.1 (Ho_Phu_IELTS_Tam_Quoc_Master_System_Spec_v1_1.docx)
Cập nhật: phiên làm việc ngày 04/08/2026

Tài liệu này để phiên sau đọc là làm tiếp được ngay, không phải đọc lại toàn
bộ đặc tả 1155 dòng.

## Đã xong trong phiên này

Tương ứng PR-01, PR-02 và PR-03 của chuỗi chín PR trong đặc tả §12.2.

**PR-01 — Brand core.** Đổi STOIC-IELTS sang HỔ PHÙ · IELTS ở giao diện,
metadata và tài liệu. Logomark mới là binh phù xẻ đôi (`src/components/brand.tsx`):
nửa trái tô đặc là kết quả đo được, nửa phải để rỗng viền là quá trình, ba khấc
răng cưa ăn khớp là ba trụ. Pháp nhân Công ty TNHH Kết Nối Toàn Cầu giữ nguyên
ở chân trang. Mô tả đơn hàng SePay dùng bản không dấu vì đi qua hệ thống ngân
hàng.

**Bộ chặn ký tự chữ Hán.** `scripts/check-no-han-characters.mjs`, chạy bằng
`npm run test:no-han`, đã nối vào `npm test`. Đã kiểm chứng cả hai chiều: chặn
đúng file vi phạm kèm số dòng, và cho qua khi mã nguồn sạch.

**PR-02 — Hệ thiết kế thủy mặc.** `src/app/globals.css` có đủ bảng màu chức
năng §8.2, mỗi màu hai bản: bản gốc cho đồ họa, bản `-ink` cho chữ. Ba mô-típ
thị giác dùng lại nhất quán: `.paper-grain` (vân giấy gạo dệt bằng gradient),
`.ink-wash-fallback` (nền mực khi chưa có ảnh), `.seal` (con dấu chu sa rỗng
ruột, không ký tự).

**PR-02 — Hệ hình ảnh.** `src/lib/story/generals.ts` (catalog Lục tướng),
`src/lib/brand/art-manifest.ts` (mọi ảnh về một chỗ, `containsText` ép cứng
`false`), `src/components/brand/ink-wash-hero.tsx` và `ink-wash-art.tsx` (hero
chạy đúng khi KHÔNG có ảnh nào). `src/lib/ui-labels.ts` cho nhãn kép §3.

**PR-03 — Rank data model.** `src/lib/ranks/catalog.ts` (9 cấp bậc, 8 thí
luyện, Hoa Dung đạo, bốn hiệu bậc 8), `src/lib/ranks/seeds.ts` (seed idempotent
và backfill), tám bảng mới trong `prisma/schema.prisma` VÀ raw DDL tương ứng
trong `src/lib/init-db.ts`, `src/lib/features.ts` (cờ tính năng, mặc định TẮT).

## Trạng thái kiểm thử

Đã chạy đầy đủ trước khi commit:

| Cổng chất lượng | Kết quả |
|---|---|
| `npm ci` | đạt |
| `npx prisma generate` | đạt, Prisma Client v6.19.3 |
| `npm test` | 495 kiểm thử đạt, 0 thất bại |
| `npm run test:no-han` | đạt |
| `npm run test:ranks` | 45 kiểm thử đạt |
| `npm run lint` | sạch |
| `npx tsc --noEmit` | sạch |
| `npm run build` | biên dịch thành công, 17 trang |
| `git diff --check` | sạch |

Hai cảnh báo CSS về `::highlight()` khi build là **có sẵn từ trước**, thuộc
tính năng bôi vàng của phòng thi, không liên quan tới thay đổi này.

## Đã xong trong phiên 04/08/2026 (phiên thứ hai)

**Toàn bộ 16 ảnh art manifest đã có file.** Sáu ảnh Lục tướng do chủ dự án
cung cấp (nhúng trong file Word đặc tả) đã xoá chữ và ký tự Hán bằng
`scripts/clean-art-text.mjs`; tám ảnh cửa ải và nền bản đồ sinh mới bằng
`scripts/generate-art.mjs`. Nén bằng `scripts/optimize-art.mjs`, tất cả dưới
trần dung lượng §8.5. Khóa Gemini đọc từ `.env.local` (đã gitignore).

**PR-04 rank engine.** `ranks/rules.ts` (8 luật gate + 8 luật success, hàm
thuần), `facts.ts`, `engine.ts`, `actions/ranks.ts`. Nối vào
`processAchievementEvent` chứ không tạo hàng đợi mới. 24 phép thử ở
`npm run test:rank-rules`.

**PR-05 bản đồ Chiến Dịch.** `campaign/catalog.ts` + `view.ts` (hàm thuần),
hai component desktop/mobile, trang `/hoc-vien/chien-dich`. 22 phép thử ở
`npm run test:campaign`.

Cổng chất lượng sau hai PR: tsc sạch, lint sạch, 15 bộ kiểm thử đạt, build
exit 0, `test:no-han` sạch.

## Việc còn lại, theo thứ tự nên làm

1. **PR-06 nhãn Tam Quốc toàn site** — dùng `src/lib/ui-labels.ts` đã có. Giữ
   nguyên URL.
2. **PR-07 ba tầng đại thí** — `competition/tiers.ts`, `qualification.ts`,
   routes `/duong-thi` và `/thien-thi`. Đặc tả §9.3.
3. **PR-08 tài liệu QA**, **PR-09 liêm chính và consent**.

Còn thiếu ở phần cấp bậc: trang chi tiết một cửa ải
`/hoc-vien/thi-luyen/[trialCode]` (bản đồ đã trỏ link tới đó), component
`current-rank-card` và `cardinal-title-picker`, và luồng nhập
TrialReflection miễn phí. Đây là phần giao diện của PR-04/05, cố ý để lại vì
đặc tả xếp PR-04 là "không UI lớn".

Một ảnh còn nợ: Mã Siêu dùng vàng kim, manifest chốt bạc lam.

## Ba việc đang chặn, cần chủ dự án xử lý

**1. Không push được — session chỉ có quyền đọc.**
`git fetch` chạy bình thường, `git push` trả về `403 Forbidden` từ origin
(header `application/x-git-receive-pack-advertisement`). Năm commit đang nằm
ở local trên nhánh `claude/design-system-tam-quoc-64djga`. Cần cấp quyền ghi
cho GitHub App của Claude trên repository này, rồi push lại.

**2. Chưa sinh được ảnh thủy mặc.**
Tài khoản Higgsfield hết credit ở gói free; model Recraft V4.1 đòi gói Basic
trả phí. Art manifest và pipeline đã dựng sẵn nên chỉ cần bỏ file ảnh vào
`public/art/` đúng đường dẫn trong manifest là chạy. Giao diện hiện chạy tốt
khi thiếu ảnh. Prompt khung và negative prompt đã ghi trong
`docs/ART-ASSET-REGISTER.md`.

**3. Mâu thuẫn consent chưa giải quyết — nguyên văn từ đặc tả §1.1 và §9.4.**
`DU-THAO-PHAP-LY-NGUYET-THI.md` ghi hệ thống *không dùng webcam, không ghi màn
hình*, trong khi quyết định trước đó của chủ dự án là hỗ trợ cả người dưới 18
tuổi kèm guardian consent, webcam và chia sẻ màn hình. Mã nguồn hiện chặn dưới
16 tuổi. Trong phiên này CHỈ đổi tên thương hiệu trong hai điều khoản đồng ý,
không đụng bất kỳ nội dung chính sách nào. Cần quyết định riêng và có rà soát
pháp lý trước khi mở thi cho người chưa đủ 18 tuổi.

## Quyết định thiết kế đã chốt, đừng đảo ngược

- Phòng thi Reading CBT giữ giao diện trung tính. Không giấy gạo, không mực,
  không nhân vật trong vùng passage và câu hỏi. Vân giấy gạo chỉ phủ nhóm
  route `(site)`, nhóm `(exam)` cố ý không nhận.
- Mỗi màn hình chỉ một màu accent. Màu gốc dùng cho đồ họa; làm chữ trên nền
  kem phải lấy bản `-ink`, vì lam điện, kim đồng, bạc lam, hỏa cam và tro đều
  không đạt ngưỡng tương phản 4.5:1.
- Backfill không suy cấp bậc từ lịch sử. Mọi người bắt đầu ở Bạch thân.
- Không cửa ải nào được khóa cứng vào Feynman trả phí. Đã có kiểm thử canh
  điều này trong `scripts/test-rank-catalog.ts`.
- Cốt truyện đóng ở đúng sáu nhân vật. Không thêm nhân vật trung tâm thứ bảy.
