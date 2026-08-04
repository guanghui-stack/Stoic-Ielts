# Sổ đăng ký asset hình ảnh

Mỗi ảnh production phải có một dòng trong bảng dưới đây trước khi được merge.
Không có dòng đăng ký thì ảnh không được coi là đã duyệt, kể cả khi file đã
nằm trong `public/`.

Nguồn sự thật về đường dẫn, tỷ lệ, điểm lấy nét và accent là
`src/lib/brand/art-manifest.ts`. Bảng này ghi thêm phần mà mã nguồn không giữ
được: ai duyệt, duyệt ngày nào, và prompt đã dùng.

## Trạng thái hiện tại

**Chưa có ảnh nào được duyệt.** Toàn bộ mục trong art manifest đang là hợp
đồng đã chốt trước, chờ art đi qua pipeline duyệt. Giao diện chạy bình thường
khi thiếu ảnh: `InkWashHero` tự thay bằng lớp mực CSS và mọi chữ vẫn nằm
trong DOM.

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
| _(chưa có mục nào)_ | | | | | | |

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
