# STOIC · IELTS Design System

> **Phiên bản:** 1.0
>
> **Ngày:** 2026-08-26
>
> **Tác giả:** Manus AI
>
> **Phạm vi:** Tất cả bề mặt ngoài khu học/làm bài mô phỏng thi thật.

STOIC · IELTS là một nền tảng luyện IELTS bằng tiếng Việt. Chủ nghĩa Khắc kỷ không phải lớp trang trí cổ điển phủ lên sản phẩm; nó là cách tổ chức trải nghiệm quanh ba câu hỏi: **Tôi kiểm soát được gì? Tôi cần làm gì tiếp theo? Tôi học được gì từ lần này?**

Nguồn cảm hứng nội dung dùng các chủ đề thực hành như sự rõ ràng, nhận thức, hành động đúng, nghĩa vụ, kiên cường và chấp nhận.[1] Hệ thiết kế chuyển các ý niệm đó thành giao diện hiện đại, dễ đọc, có dữ liệu rõ và chuyển động có nguyên nhân.

## 1. Nguyên tắc bắt buộc

| Nguyên tắc | Cách thể hiện |
|---|---|
| Rõ trước, đẹp sau | Thứ bậc, nhãn, số và hành động phải hiểu được trước khi thêm trang trí. |
| Một hành động chính | Mỗi band/section chỉ có một CTA indigo nổi bật. |
| Bình tĩnh, không lạnh lùng | Deep slate tạo độ tập trung; cream, lavender và sắc ấm giữ cảm giác gần gũi. |
| Dữ liệu là phản hồi | Band, thời gian và streak dùng `tnum`, canh hàng và có ngữ cảnh. |
| Chuyển động có nguyên nhân | Motion chỉ giải thích thay đổi trạng thái, quan hệ hoặc thứ tự. |
| Không thưởng cho nhiễu | Không dùng glow, particle, parallax nặng, marquee hoặc animation lặp vô nghĩa. |
| Tiếng Việt là chuẩn | Nhãn, lỗi, trợ giúp và nội dung chính đều viết tiếng Việt rõ ràng. |

## 2. Ranh giới phòng thi

> **Không chỉnh sửa route, component, logic, dữ liệu, CSS hoặc interaction của khu học/làm bài mô phỏng thi thật.**

Các tệp protected được khóa bằng `docs/PROTECTED-SURFACES.sha256`. Theme Stoic chỉ được kích hoạt dưới `.world-shell[data-route-area]`. `.font-exam`, route tier 0 và mọi màn hình CBT giữ nguyên diện mạo trung tính.

Không dùng AI loader, page reveal, gradient mesh, Inter hoặc component Stoic mới trong vùng protected.

## 3. Mô-típ chữ ký

Mô-típ chính là **Vòng tròn kiểm soát**: một hệ các quỹ đạo đồng tâm mở, không phải vòng tròn khép kín hoàn hảo. Hình này biểu thị hai lớp: phần bên trong là lựa chọn và hành động; phần bên ngoài là kết quả và hoàn cảnh.

Gradient mesh xuất hiện ở hero marketing, auth và một số panel dashboard có chủ đích. Mesh gồm cream, sherbet, lavender, indigo và ruby với biên mềm. Không dùng gradient cầu vồng, neon hoặc background chuyển động nhanh.

## 4. Màu

### 4.1 Token nền và chữ

| Token | Giá trị | Vai trò |
|---|---:|---|
| `--stoic-canvas` | `#ffffff` | Nền chính. |
| `--stoic-canvas-soft` | `#f7f8fc` | Band phụ và bảng. |
| `--stoic-canvas-cream` | `#f6eedf` | Interlude ấm. |
| `--stoic-slate-950` | `#11182c` | App shell/hero đậm. |
| `--stoic-slate-900` | `#202a44` | Surface tối. |
| `--stoic-ink` | `#172033` | Chữ chính. |
| `--stoic-ink-secondary` | `#35425a` | Chữ phụ. |
| `--stoic-ink-muted` | `#66738a` | Caption; không dùng cho chữ quá nhỏ trên nền màu. |
| `--stoic-line` | `#e2e7f0` | Viền tiêu chuẩn. |
| `--stoic-line-strong` | `#aab9cc` | Viền input/focus hỗ trợ. |

### 4.2 Brand và accent

| Token | Giá trị | Vai trò |
|---|---:|---|
| `--stoic-primary` | `#5b5fef` | CTA, link và focus chính. |
| `--stoic-primary-deep` | `#494cc4` | Hover. |
| `--stoic-primary-press` | `#35377f` | Pressed. |
| `--stoic-primary-soft` | `#d9dbff` | Tag/background nhẹ. |
| `--stoic-lavender` | `#b8a8f8` | Mesh và data accent. |
| `--stoic-ruby` | `#d85b78` | Mesh/callout, không dùng làm CTA. |
| `--stoic-sherbet` | `#d78a58` | Mesh/interlude, không dùng làm body text. |
| `--stoic-sage` | `#33745a` | Success có nhãn/icon. |
| `--stoic-danger` | `#b4233b` | Error/destructive có nhãn/icon. |
| `--stoic-warning` | `#8a6318` | Warning/held state có nhãn/icon. |

### 4.3 Ba trụ

Ba trụ chỉ dùng ở component được thiết kế cho so sánh ba chiều. Không tô tràn toàn trang.

| Trụ | Màu | Biểu tượng bắt buộc |
|---|---|---|
| Nhận thức | Indigo | Eye/Focus |
| Hành động | Sage | Arrow/Check |
| Ý chí | Ruby | Repeat/Flame tối giản |

Màu không bao giờ là tín hiệu duy nhất. Nhãn và icon luôn đi kèm.

## 5. Typography

Inter là font của bề mặt rebrand. Display dùng weight 300 để tạo khoảng thở; body và UI dùng 400/500 để dấu tiếng Việt rõ. Phòng thi giữ font hiện tại.

| Vai trò | Cỡ desktop | Cỡ mobile | Weight | Line height | Tracking |
|---|---:|---:|---:|---:|---:|
| Display XXL | 56px | 38px | 300 | 1.04 | -0.025em |
| Display XL | 46px | 34px | 300 | 1.10 | -0.02em |
| Display LG | 34px | 28px | 300 | 1.14 | -0.015em |
| Heading LG | 26px | 23px | 400 | 1.22 | -0.01em |
| Heading MD | 21px | 19px | 500 | 1.35 | -0.005em |
| Body LG | 17px | 16px | 400 | 1.65 | 0 |
| Body | 15px | 15px | 400 | 1.60 | 0 |
| UI | 14px | 14px | 500 | 1.35 | 0 |
| Caption | 12.5px | 12.5px | 500 | 1.45 | 0 |
| Micro cap | 11px | 11px | 600 | 1.3 | 0.09em |

Mọi số band, tiền, ngày, giờ, streak và bảng dùng `font-variant-numeric: tabular-nums`. Độ dài dòng body tối đa khoảng 68 ký tự.

## 6. Khoảng cách, lưới và responsive

Hệ dùng base 4px, nhịp chính 8px.

| Token | Giá trị |
|---|---:|
| `--stoic-space-1` | 4px |
| `--stoic-space-2` | 8px |
| `--stoic-space-3` | 12px |
| `--stoic-space-4` | 16px |
| `--stoic-space-6` | 24px |
| `--stoic-space-8` | 32px |
| `--stoic-space-12` | 48px |
| `--stoic-space-16` | 64px |
| `--stoic-space-24` | 96px |

Container tối đa 1200px, padding ngang 24px trên desktop và 16px trên mobile. Breakpoint chính: 480, 768, 1024, 1280 và 1440px. Body không được cuộn ngang; bảng cuộn trong wrapper của nó.

## 7. Hình khối và độ cao

| Token | Giá trị | Dùng cho |
|---|---:|---|
| `--stoic-radius-sm` | 6px | Input, control nhỏ. |
| `--stoic-radius-md` | 10px | Card thường. |
| `--stoic-radius-lg` | 16px | Hero card/panel nổi. |
| `--stoic-radius-pill` | 9999px | Button, tag, status. |
| `--stoic-shadow-1` | `0 1px 3px rgb(23 32 51 / .08)` | Lift nhẹ. |
| `--stoic-shadow-2` | `0 8px 28px rgb(23 32 51 / .10)` | Floating panel. |
| `--stoic-shadow-3` | `0 20px 60px rgb(17 24 44 / .18)` | Dialog/hero mockup. |

Không dùng shadow để thay cho border. Card dữ liệu mặc định có border và shadow 0 hoặc 1.

## 8. Component foundation

### 8.1 Button

Button chính là pill indigo, cao tối thiểu 44px. Button phụ nền trắng, viền primary. Button ghost chỉ dùng cho thao tác thứ cấp. Hành động destructive phải tách khỏi CTA chính và có xác nhận khi gây mất dữ liệu.

### 8.2 Input

Input nền trắng, border strong, radius 6px, cao tối thiểu 44px. Focus dùng outline 3px `color-mix(in srgb, var(--stoic-primary) 28%, transparent)` cộng border primary. Error phải có message bằng chữ.

### 8.3 Card

Card gồm eyebrow, title, supporting copy, content và action. Không dùng card lồng card quá hai cấp. Dashboard card dùng số lớn có `tnum`, nhãn ngắn và câu giải thích “điều này có nghĩa gì”.

## 9. Tag system cho kênh chat chung

Tag cho phép nhập bằng Enter hoặc dấu phẩy, xóa bằng Backspace/X, chống trùng không phân biệt hoa thường và giới hạn số lượng. Tag hiển thị label, không chỉ màu.

| Variant | Ý nghĩa | Màu nền/chữ |
|---|---|---|
| `focus` | Trọng tâm bài viết | Primary soft / primary deep |
| `evidence` | Bằng chứng từ passage | Sage pale / sage |
| `question` | Cần cộng đồng giải thích | Cream / ink |
| `reflection` | Điều rút ra sau bài | Lavender pale / slate |
| `warning` | Bẫy hoặc lỗi thường gặp | Warning pale / warning |

**Prompt thiết kế component:**

> Thiết kế một TagsInput cho diễn đàn học IELTS bằng tiếng Việt. Tag là pill nhỏ, có icon X, hỗ trợ keyboard, chống trùng, tối đa 5 tag, label luôn hiện rõ. Dùng palette STOIC · IELTS, focus ring indigo và trạng thái lỗi bằng chữ. Không dùng dark mode trong phiên bản đầu.

## 10. Table system

Bảng là thành phần chính để thể hiện tính rõ ràng. Header nền canvas-soft, chữ caption 500, hàng cao tối thiểu 48px. Số canh phải và dùng `tnum`. Action canh phải hoặc gom trong menu/dialog.

| Variant | Yêu cầu |
|---|---|
| Data | Sort label có trạng thái và `aria-sort`. |
| Sticky | Header sticky trong wrapper có chiều cao hữu hạn. |
| Status | Badge luôn có chữ/icon. |
| Numeric | Canh phải; đơn vị nằm trong header. |
| Comparison | Cột tiêu chí sticky trên mobile nếu có thể. |
| Action | Dialog/drawer có title, description và focus trap. |
| Responsive | Wrapper cuộn ngang; không làm body cuộn. |

**Prompt thiết kế component:**

> Tạo một hệ table cho dashboard giáo dục gồm data, sticky, status, numeric, comparison và action table. Ưu tiên đọc nhanh band, thời gian, ngày học và trạng thái. Header nhẹ, row hover rất tinh tế, sticky header/footer, dialog chi tiết và mobile horizontal scroll trong khung. Mọi số dùng tabular figures.

## 11. Calendar

Calendar dùng locale `vi-VN`, tuần bắt đầu theo quy ước hiển thị nhất quán của sản phẩm. Không dùng dữ liệu ngẫu nhiên. Ngày hiện tại, ngày có học, streak và ngày được chọn phải có hình dạng/nhãn khác nhau.

| Trạng thái | Dấu hiệu |
|---|---|
| Hôm nay | Viền primary 2px và `aria-current="date"`. |
| Có học | Chấm sage và title/label hỗ trợ. |
| Streak | Nền primary soft, không chỉ đổi màu chữ. |
| Đã chọn | Nền primary, chữ trắng. |
| Không thuộc tháng | Opacity giảm nhưng vẫn đọc được. |

**Prompt thiết kế component:**

> Thiết kế calendar học tập tiếng Việt cho STOIC · IELTS. Hiển thị tháng/năm, thứ trong tuần, hôm nay, ngày có hoạt động và streak. Không dùng random. Touch target 44px, keyboard navigation, legend rõ, số dùng tabular figures, responsive từ 375px.

## 12. AI waiting interface

AI waiting phải nói rõ hệ thống đang làm gì: “Đang đọc câu trả lời”, “Đang đối chiếu bằng chứng”, “Đang chuẩn bị phản hồi”. Không dùng một câu “Generating” chung chung.

Loader gồm vòng quỹ đạo mảnh quanh wordmark nhỏ hoặc dấu control-circle. Chuyển động 2.4–3.2 giây, opacity/rotation, không flash. Panel loader giữ chỗ theo kích thước kết quả để tránh layout shift. Overlay toàn trang chỉ dùng khi toàn luồng thực sự bị khóa.

**Prompt thiết kế component:**

> Tạo trạng thái chờ AI cho nền tảng IELTS tiếng Việt theo phong cách Stoic hiện đại. Dùng deep slate, indigo, lavender và một vòng quỹ đạo chậm. Hiển thị tiến trình bằng câu rõ ràng, có vùng `aria-live`, fallback tĩnh cho prefers-reduced-motion và không che toàn trang khi chỉ một panel đang xử lý.

## 13. Motion system

| Token | Giá trị | Dùng cho |
|---|---:|---|
| `--stoic-duration-press` | 120ms | Press/focus feedback. |
| `--stoic-duration-utility` | 180ms | Toggle, tab, status. |
| `--stoic-duration-reveal` | 420ms | Section/card enter. |
| `--stoic-duration-scene` | 560ms | Route scene tier 2. |
| `--stoic-ease-out` | `cubic-bezier(.22,1,.36,1)` | Enter. |
| `--stoic-ease-in-out` | `cubic-bezier(.65,0,.35,1)` | Hai chiều. |

### Motion tiers

| Tier | Route | Cho phép |
|---:|---|---|
| 0 | Học/làm bài protected | Không animation mới. |
| 1 | Auth, thanh toán, admin | Press, focus, skeleton, dialog, feedback. |
| 2 | Marketing, community, profile | Scene fade/translate nhẹ, stagger, mesh drift rất chậm. |

Mọi motion phải có fallback `prefers-reduced-motion: reduce`. Không animate width/height khi có thể dùng transform/opacity. Không trì hoãn CTA để chờ animation.

## 14. Tài sản hình ảnh

Logo, icon, mesh và diagram ưu tiên SVG deterministic. Illustration raster phải có safe area cho copy, không chứa chữ, không có watermark và được nén WebP/AVIF. Tránh tượng La Mã, mũ chiến binh, cột đá hoặc cosplay như biểu tượng mặc định; chúng dễ biến Stoicism thành phong cách lịch sử sáo mòn thay vì phương pháp sống hiện đại.

**Prompt hero tổng quát:**

> Tạo một illustration website hiện đại cho STOIC · IELTS. Chủ đề là sự rõ ràng và vòng tròn kiểm soát trong việc học. Dùng kiến trúc trừu tượng, mặt phẳng kính mờ, quỹ đạo đồng tâm mở và ánh sáng bình minh dịu. Palette deep slate, indigo, lavender, cream và ruby rất tiết chế. Bố cục 16:9, chủ thể lệch phải, để safe area rộng bên trái cho tiêu đề. Không chữ, không tượng La Mã, không người nổi tiếng, không logo, không watermark, không neon, không phong cách game.

## 15. Content design

Mỗi trang phải có một câu trả lời rõ cho “hành động tiếp theo”. Eyebrow chỉ định ngữ cảnh; title nói lợi ích hoặc việc cần làm; lede giải thích ngắn; CTA dùng động từ.

| Tránh | Dùng |
|---|---|
| “Chinh phục mọi thử thách” | “Làm một bài trong điều kiện thật” |
| “Trở thành chiến binh IELTS” | “Nhìn đúng lỗi, sửa đúng việc” |
| “Bứt phá band điểm” | “Theo dõi band và điều chỉnh cách học” |
| “Kỷ luật thép” | “Giữ một nhịp học có thể lặp lại” |

## 16. Accessibility

Contrast chữ thường đạt WCAG AA. Touch target tối thiểu 44px. Focus không bị xóa. Icon trang trí có `aria-hidden`; icon chức năng có label. Tag, table, calendar, dialog và loader dùng được bằng keyboard/screen reader. Màu không bao giờ là tín hiệu duy nhất.

## 17. Do và Don’t

| Do | Don’t |
|---|---|
| Dùng gradient mesh ở hero có chủ đích | Phủ mesh lên mọi card. |
| Dùng display 300 cho tiêu đề lớn | Dùng body 300 ở cỡ nhỏ. |
| Giữ một CTA primary mỗi band | Đặt nhiều nút indigo cạnh nhau. |
| Dùng table cho dữ liệu cần so sánh | Biến mọi dữ liệu thành card. |
| Giữ motion có nguyên nhân | Thêm animation chỉ để “trông hiện đại”. |
| Gắn Stoicism với hành động học | Dùng trích dẫn triết gia làm trang trí. |
| Scope theme ngoài vùng thi | Chạm `.font-exam` hoặc route tier 0. |

## 18. References

[1]: https://chunghiakhacky.org/ "Chủ Nghĩa Khắc Kỷ Stoicism — Stoic Hằng Ngày"
[2]: https://chunghiakhacky.org/ngay-13-thang-1-vong-tron-kiem-soat/ "Ngày 13 tháng 1: Vòng tròn kiểm soát"
