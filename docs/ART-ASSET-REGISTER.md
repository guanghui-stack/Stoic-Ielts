# Sổ đăng ký asset hình ảnh

Mỗi ảnh production phải có một dòng trong bảng dưới đây trước khi được merge.
Không có dòng đăng ký thì ảnh không được coi là đã duyệt, kể cả khi file đã
nằm trong `public/`.

Nguồn sự thật về đường dẫn, tỷ lệ, điểm lấy nét và accent là
`src/lib/brand/art-manifest.ts`. Bảng này ghi thêm phần mà mã nguồn không giữ
được: ai duyệt, duyệt ngày nào, và prompt đã dùng.

## Trạng thái hiện tại

**Đã duyệt đủ 16 ảnh của art manifest (04/08/2026).** Hero trang chủ, sáu chân
dung Lục tướng, tám ảnh cửa ải và nền bản đồ Chiến Dịch. Không còn mục nào
thiếu file.

Cơ chế dự phòng khi thiếu ảnh vẫn giữ nguyên và vẫn phải giữ: `InkWashArt` tự
biến mất khi ảnh không tải được, lớp mực CSS lộ ra, mọi chữ vẫn nằm trong DOM.

### Nguồn gốc bảy ảnh này

Chủ dự án cung cấp sáu ảnh gốc, nhúng trong file đặc tả Word. Cả sáu đều có chữ
nung sẵn ở góc trên trái và bốn ảnh có ký tự chữ Hán, nên **không dùng trực tiếp
được**. Chúng đã đi qua `scripts/clean-art-text.mjs` (Gemini image editing) để xoá
chữ, ký tự Hán và con dấu có chữ; phần bị xoá được lấp lại bằng vân giấy. Bố cục,
nhân vật, màu accent và mực bắn tóe giữ nguyên bản gốc.

Từng ảnh sau khi xử lý đã được mở ra kiểm tra bằng mắt, xác nhận không còn ký tự
chữ Hán và con dấu đã thành ô chu sa trừu tượng không chữ, đúng §8.4.

Tám ảnh cửa ải và nền bản đồ do `scripts/generate-art.mjs` sinh mới. Hai ảnh
bị loại ở vòng duyệt đầu và đã sinh lại: cửa 2 có ký tự chữ Hán trên lá cờ,
cửa 4 vẽ nhầm cổng torii Nhật Bản thay vì cổng thành Trung Hoa. Bản thay thế
đã kiểm tra lại bằng mắt.

### Không còn việc nợ

Trương Phi và Mã Siêu đều đã có bản đúng accent. Cả hai ảnh gốc dùng vàng kim
trong khi manifest chốt chu sa và bạc lam; bản thay thế giữ nguyên bố cục,
nhân vật và nét mực, chỉ đổi màu năng lượng.

## Quy tắc bắt buộc

1. Tạo bốn phương án cho cùng một prompt. Không chọn ảnh chỉ vì đẹp — phải
   đối chiếu với art bible.
2. Loại ngay ảnh có: ký tự chữ Hán, chữ do AI sinh, vũ khí sai văn hóa, lỗi
   giải phẫu, giống mặt diễn viên cụ thể, hoặc nhiều hơn một màu accent.
3. Hậu kỳ: xóa toàn bộ chữ AI, cân mực, chừa vùng trống cho chữ. Chỉ thêm
   chữ tiếng Việt hoặc Hán-Việt bằng chữ cái Latin nếu thật sự cần, và phải
   là layer riêng do người làm, không dùng chữ AI sinh.
4. Xuất WebP hoặc AVIF theo đúng kích thước trong bảng ngân sách bên dưới.
5. Ghi một dòng vào bảng đăng ký.
6. Không commit file master 20-50 MB vào repo public. Chỉ commit bản đã tối
   ưu; master giữ ở kho thiết kế riêng.

## Ngân sách kích thước

| Loại asset | Tỷ lệ / master | Đầu ra production | Dung lượng tối đa |
|---|---|---|---|
| Hero trang chủ | 16:9, 2048x1152 | 1600w WebP/AVIF + 960w | 350 KB |
| Nền bản đồ Chiến Dịch | 21:9, 2520x1080 | 1920w WebP + crop mobile | 500 KB |
| Chapter art cửa ải | 16:9, 1600x900 | 1280w/768w WebP | 280 KB |
| Chân dung cấp bậc | 4:5 hoặc 1:1, 1200px | 640w WebP | 160 KB |
| Huy hiệu | 1:1, 1024px nền trong | 512/256 PNG hoặc WebP | 120 KB |
| Họa tiết mực trang trí | SVG hoặc PNG nền trong | ưu tiên SVG | 60 KB |

## Bảng đăng ký

| Khóa manifest | File | Accent | Nhân vật | Người duyệt | Ngày duyệt | Phiên bản |
|---|---|---|---|---|---|---|
| `homeTrieuVan` | `art/home/trieu-van-hero.webp` | Lam điện | Triệu Vân | chủ dự án | 04/08/2026 | 1 |
| `generalTrieuVan` | `art/generals/trieu-van.webp` | Lam điện | Triệu Vân | chủ dự án | 04/08/2026 | 1 |
| `generalTruongPhi` | `art/generals/truong-phi.webp` | Chu sa | Trương Phi | chủ dự án | 04/08/2026 | 2 |
| `generalQuanVu` | `art/generals/quan-vu.webp` | Lục ngọc | Quan Vũ | chủ dự án | 04/08/2026 | 1 |
| `generalHoangTrung` | `art/generals/hoang-trung.webp` | Kim đồng | Hoàng Trung | chủ dự án | 04/08/2026 | 1 |
| `generalMaSieu` | `art/generals/ma-sieu.webp` | Bạc lam | Mã Siêu | chủ dự án | 05/08/2026 | 2 |
| `generalLuBo` | `art/generals/lu-bo.webp` | Hỏa cam | Lữ Bố | chủ dự án | 04/08/2026 | 1 |
| `trialDaoVien` | `art/trials/trial-01-dao-vien.webp` | Chu sa | Trương Phi, Quan Vũ | sinh mới | 04/08/2026 | 1 |
| `trialHoangCan` | `art/trials/trial-02-hoang-can.webp` | Kim đồng | Trương Phi | sinh lại lần 2 | 04/08/2026 | 2 |
| `trialHoaHung` | `art/trials/trial-03-hoa-hung.webp` | Lục ngọc | Quan Vũ | sinh mới | 04/08/2026 | 1 |
| `trialNguQuan` | `art/trials/trial-04-ngu-quan.webp` | Chu sa | Quan Vũ | sinh lại lần 2 | 04/08/2026 | 2 |
| `trialTruongBan` | `art/trials/trial-05-truong-ban.webp` | Lam điện | Triệu Vân | sinh mới | 04/08/2026 | 1 |
| `trialLaoTuong` | `art/trials/trial-06-hoang-trung.webp` | Kim đồng | Hoàng Trung | sinh mới | 04/08/2026 | 1 |
| `trialTayLuong` | `art/trials/trial-07-ma-sieu.webp` | Bạc lam | Mã Siêu | sinh mới | 04/08/2026 | 1 |
| `trialHoLao` | `art/trials/trial-08-lu-bo.webp` | Hỏa cam | Lữ Bố | sinh mới | 04/08/2026 | 1 |
| `campaignMap` | `art/campaign/map-loan-the-quan-hung-tam-phan.webp` | Mực navy | — | sinh mới | 04/08/2026 | 1 |

## Prompt khung

Dùng chung cho mọi ảnh nhân vật. Thay phần trong ngoặc vuông.

> A traditional Chinese ink wash painting on textured rice paper, depicting
> [ONE OF: Lu Bu, Zhao Yun, Guan Yu, Zhang Fei, Huang Zhong, Ma Chao] in a
> dynamic martial action. Detailed historically inspired Chinese scale armor
> and flowing fabric create strong movement. The scene is rendered primarily
> in black ink and soft gray washes on warm ivory paper. A single vivid
> [ACCENT COLOR] energy effect is concentrated around [WEAPON / FOCAL POINT].
> Strong black ink splashes follow the direction of motion. The background
> shows misty mountains, distant soldiers, banners or ancient architecture in
> minimal washed-out strokes. Leave a clean negative-space area for Vietnamese
> text to be added later in Latin script. Include a small abstract vermilion
> seal shape with no characters. Heroic, restrained, ancient-master feeling,
> cinematic diagonal composition, visible paper texture, no generated text and
> no Chinese characters.

Negative prompt chuẩn:

> photorealistic, 3D render, anime, modern clothing, firearms, gore, horror,
> cyberpunk neon, multiple accent colors, busy background, extra limbs,
> malformed hands, cloned horses, actor likeness, movie costume likeness,
> game UI, watermark, logo, gibberish text, Chinese characters, Hanzi, Kanji,
> calligraphy glyphs, character seal text

## Màu accent theo module

| Module | Accent | Mã màu | Nhân vật |
|---|---|---|---|
| Chiến trận | Lam điện | `#3A7FC4` | Triệu Vân |
| Phục bàn | Chu sa | `#A33A2B` | Trương Phi |
| Luyện binh | Kim đồng | `#B8862B` | Hoàng Trung |
| Chính đạo, liêm chính | Lục ngọc | `#2E6B4F` | Quan Vũ |
| Biến hóa | Bạc lam | `#7D97AC` | Mã Siêu |
| Thử thách cuối | Hỏa cam | `#C2591F` | Lữ Bố |
| Cấp bậc thấp | Mực navy | `#1E3A5C` | — |
| Nguyệt Thí | Bạc trăng / indigo | `#C3CBD5` / `#273A63` | — |
| Huy hiệu tướng quân | Tro | `#77736C` | — |

Lưu ý về tương phản: các mã trên là bản dùng cho **đồ họa, viền và mảng màu**.
Khi cần dùng làm **chữ** trên nền kem, phải lấy biến thể `-ink` tương ứng
trong `globals.css` — bản gốc của lam điện, kim đồng, bạc lam, hỏa cam và tro
đều không đạt ngưỡng tương phản 4.5:1 cho chữ thường.
