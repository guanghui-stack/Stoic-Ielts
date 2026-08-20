# HỔ PHÙ · IELTS · Brand Guideline

> Bản 1, ngày 2026-08-20. Dựng trên `main` tại `941d2b5`.
>
> Đây là nguồn sự thật về giao diện. Khi tài liệu này và một file khác nói khác
> nhau, tài liệu này thắng, trừ đúng một trường hợp: mã màu trong
> `src/app/globals.css` là bản gốc, tài liệu này chỉ chép lại. Sửa màu thì sửa
> ở đó trước.
>
> **Quy ước chữ nghĩa:** không chữ Hán, không dấu gạch ngang dài. Xem
> `DAC-TA-DAU-TRUONG` mục 13.

## Quan hệ với các tài liệu khác

| File | Vai trò | Ai thắng khi mâu thuẫn |
|---|---|---|
| `src/app/globals.css` | Mã màu, font, bóng đổ thật | globals.css |
| `docs/ART-BRIEF-HO-PHU.md` | Đặt hàng tranh | Tài liệu này |
| `docs/ART-ASSET-REGISTER.md` | Sổ tranh đã có | Sổ tranh |
| `src/lib/brand/art-manifest.ts` | Ánh xạ tranh sang accent | art-manifest |
| `DAC-TA-DAU-TRUONG` | Luật chơi, đặt hàng giao diện | Đặc tả, cho phần luật |

---

## 0. Một quyết định thị giác, lặp lại khắp nơi

**Tranh mực trên giấy gạo, và một dải mực tối cho những nơi cần dồn sự chú ý.**

80 tới 90 phần trăm bề mặt là kem, xám và mực. Màu chỉ xuất hiện ở nơi nó
mang nghĩa. Dải mực tối là mô-típ chữ ký duy nhất được phép phá nền kem, và
nó chỉ dùng ở ba chỗ nêu tại mục 8.1.

Ngoại lệ tuyệt đối: phòng thi Reading CBT giữ giao diện trung tính mô phỏng
đề thi thật. Không giấy gạo, không mực, không nhân vật. Xem `.font-exam`.

---

## 1. Màu

### 1.1 Ba tầng luật màu

Đây là phần hay bị hiểu sai nhất, nên nói rõ trước mọi bảng màu.

| Tầng | Gồm những gì | Luật |
|---|---|---|
| **Accent trang trí** | 8 accent Tam Quốc, gắn với module và danh tướng | Mỗi màn hình đúng **một** accent |
| **Màu ngữ nghĩa** | success, danger, 5 nghĩa diễn đàn, 6 trạng thái trận, 4 chỉ số | **Không tính** vào luật một accent, nhưng **bắt buộc kèm chữ hoặc biểu tượng** |
| **Ngoại lệ có tên** | 3 màu phe | Chỉ được dùng ở **đúng hai nơi** liệt kê ở mục 1.5 |

Vì sao tách tầng hai: một biểu mẫu có ô báo lỗi đỏ và ô xác nhận xanh vốn đã
là hai màu trên một màn hình, và không ai gọi đó là lỗi thiết kế. Luật một
accent nói về **giọng thương hiệu**, không nói về **tín hiệu chức năng**. Trộn
hai thứ đó vào một luật là lý do luật cũ hay bị vi phạm rồi bỏ qua.

Ràng buộc đi kèm tầng hai, chép nguyên từ `docs/superpowers/specs/2026-08-16-faction-territory-map-design.md`:

> Màu hoặc opacity không phải tín hiệu duy nhất; tên, biểu tượng và câu trạng
> thái luôn hiện bằng chữ.

### 1.2 Cơ chế hậu tố `-ink`, luật quan trọng nhất của cả bảng màu

Mỗi màu có tối đa ba biến thể, và **chúng không thay thế nhau được**:

| Hậu tố | Ngưỡng tương phản | Được dùng cho |
|---|---|---|
| (không) | 3:1 | Viền, nền, biểu tượng, mảng đồ họa |
| `-ink` | 4.5:1 | **Chữ**, mọi cỡ |
| `-pale` | 1.2 tới 1.4 | Nền mảng, chữ đặt lên phải dùng bản `-ink` |

Ví dụ đã trả giá: vàng gốc `#b8862b` chỉ đạt 3.01:1 trên nền kem, không đủ cho
chữ. Bản `--color-gold-ink` `#8a6318` đạt 5.03:1. Nhãn `.label-caps` là chữ
12px in hoa giãn cách, cỡ chữ khó đọc nhất trong cả hệ, nên nó dùng bản `-ink`.

**Mọi màu mới thêm vào hệ đều phải khai đủ ba biến thể và ghi kèm số tương
phản đã đo.** Không ghi số thì coi như chưa khai.

### 1.3 Nền, mực, thương hiệu

| Token | Mã màu | Dùng cho |
|---|---|---|
| `--color-cream` | `#faf6ef` | Nền trang |
| `--color-cream-deep` | `#f3ecdd` | Mảng nền trầm hơn, dải số liệu |
| `--color-paper` | `#fffdf9` | Mặt thẻ, thanh điều hướng |
| `--color-ink` | `#22303e` | Chữ chính (16.55:1 trên kem) |
| `--color-ink-soft` | `#4c5a68` | Chữ phụ (6.03:1) |
| `--color-muted` | `#77808b` | Chữ mờ, **3.72:1 nên chỉ dùng cho biểu tượng** |
| `--color-navy` | `#1e3a5c` | Nút chính, viền nhấn |
| `--color-navy-deep` | `#16293f` | Dải mực tối, tiêu đề |
| `--color-gold` | `#b8862b` | Gạch nhấn, viền, biểu tượng |
| `--color-gold-ink` | `#8a6318` | Nhãn in hoa, chữ vàng |
| `--color-line` | `#e6ddcb` | Viền 1px |
| `--color-line-strong` | `#cfc3a9` | Viền ô nhập |

### 1.4 Tám accent Tam Quốc

Không đổi. Đối chiếu với `src/lib/brand/art-manifest.ts`, đó mới là bản gốc.

| Tên Việt | Base | `-ink` | Module và danh tướng |
|---|---|---|---|
| Lam điện | `#3a7fc4` | `#2c6099` | Chiến trận. Triệu Vân |
| Chu sa | `#a33a2b` | `#8e3125` | Phục bàn, con dấu, khải hoàn. Trương Phi |
| Lục ngọc | `#2e6b4f` | `#275c44` | Liêm chính. Quan Vũ |
| Kim đồng | `#b8862b` | `#8a6318` | Luyện binh, lương thảo. Hoàng Trung |
| Bạc lam | `#7d97ac` | `#4e6e8c` | Biến hóa, thích nghi. Mã Siêu |
| Hỏa cam | `#c2591f` | `#a94d1b` | Đối thủ phản chiếu. Lữ Bố |
| Tro | `#77736c` | `#5f5b54` | Huy hiệu tướng quân, sức bền |
| Chàm | `#273a63` | dùng nguyên | Nguyệt Thí và các tầng đại thí |

### 1.5 Ba màu phe, ngoại lệ có tên

**Phạm vi được phép, không nơi nào khác:**

1. Bảng xếp hạng phe và tổng kết mùa giải
2. Chú giải và nhãn của bản đồ lãnh địa

Ngoài hai nơi đó, màu phe chỉ được xuất hiện **đơn lẻ**, ví dụ một chip nhỏ
cạnh tên người dùng, và khi đó nó là accent duy nhất của màn hình.

| Phe | Base | `-ink` (chữ) | `-pale` (nền) |
|---|---|---|---|
| Ngụy, lãnh địa phía bắc | `#705a86` | `#705a86` | `#e7e0e0` |
| Thục, lãnh địa phía tây | `#6a7f3a` | `#586b2e` | `#e6e5d6` |
| Ngô, lãnh địa phía đông nam | `#9c5b52` | `#8f5149` | `#ede0d9` |

Số đã đo, mọi bản `-ink` đều vượt 4.5:1 trên cả ba nền:

| Token | trên kem | trên giấy | trên `-pale` của chính nó |
|---|---:|---:|---:|
| `faction-wei-ink` | 5.58 | 5.91 | 4.62 |
| `faction-shu-ink` | 5.48 | 5.81 | 4.65 |
| `faction-wu-ink` | 5.66 | 6.01 | 4.73 |

Tách biệt giữa ba màu, tính bằng deltaE trong không gian Lab: Ngụy với Thục
67.7, Ngụy với Ngô 38.8, Thục với Ngô 48.5. Ngưỡng tối thiểu đặt ra là 25.

**Vì sao Ngụy không phải màu lam.** Quy ước quen thuộc gán lam cho Ngụy, và
tôi đã thử. Bảng màu hiện tại đã có **năm** token thuộc họ lam: navy, azure,
silver-blue, indigo, ink. Mọi ứng viên lam cho Ngụy đều rơi vào khoảng deltaE
14 tới 19 so với `ink-soft` hoặc `azure-ink`, tức là ở cạnh nhau trên bảng
xếp hạng thì người đọc phải dừng lại mà đoán. Tía đá `#705a86` nằm ở vùng
màu chưa ai dùng, deltaE 21.5 so với token gần nhất trong toàn bảng, nên nó
đọc ra ngay mà không cần chú giải.

**Bản đồ lãnh địa không dùng ba màu này để phân biệt phe.** Nó đã giải xong
bằng lớp tranh chồng lên nhau cộng thang opacity, và cách đó tốt hơn:

```
TERRITORY_LAYER_OPACITY = { idle: 0.68, active: 1, dimmed: 0.18 }
```

Màu phe trên bản đồ chỉ xuất hiện ở chú giải và nhãn. Đừng tô lãnh địa bằng
màu phẳng, sẽ mất chất tranh mực.

### 1.6 Năm màu nghĩa cho diễn đàn

Người viết chọn **nghĩa**, hệ thống chọn **giá trị**. Không nhận mã màu tự do:
mở cửa cho mã màu tự do là mở cửa cho chữ trắng trên nền trắng.

**Không một mã màu mới nào.** Cả năm đều là token `-ink` đã có và đã đạt chuẩn.

| Cú pháp | Nhãn trên thanh công cụ | Token sáng | Mã | Bản tối | Trên nền tối |
|---|---|---|---|---:|---|
| `{dung:...}` | Đáp án đúng | `jade-ink` | `#275c44` (7.22) | `#569e7d` | 4.63 |
| `{bay:...}` | Bẫy thường gặp | `fire-ink` | `#a94d1b` (5.18) | `#e1753a` | 4.78 |
| `{nhan:...}` | Nhấn mạnh | `navy-deep` | `#16293f` (13.70) | `#6d93bf` | 4.62 |
| `{de:...}` | Trích từ đề | `azure-ink` | `#2c6099` (6.02) | `#5997db` | 4.83 |
| `{chu:...}` | Ghi chú thêm | `ash-ink` | `#5f5b54` (6.27) | `#92918e` | 4.68 |

Số trong ngoặc là tương phản trên nền kem. Cột cuối là tương phản trên nền
`navy-deep`.

Website hiện chỉ có chế độ sáng. Cột bản tối khai sẵn để khi thêm chế độ tối
thì không phải mở lại cuộc thảo luận này, và để `markup.ts` lưu **tên nghĩa**
chứ không bao giờ lưu mã màu.

### 1.7 Sáu trạng thái kết trận

| Trạng thái | Nghĩa | Token | Mã | Cách dùng |
|---|---|---|---|---|
| `DECLINED` | Từ chối chiến thư | `ink-soft` | `#4c5a68` | Chữ. Biểu tượng dùng `muted` |
| `EXPIRED` | Chiến thư hết hạn | `ink-soft` | `#4c5a68` | Như trên, thêm biểu tượng đồng hồ |
| `TRUCE` | Giảng hòa | `silver-blue-ink` | `#4e6e8c` | Chữ, 4.96 |
| `ABANDONED` | Bỏ mặc tới hết giờ | `ash-ink` | `#5f5b54` | Chữ, 6.27 |
| `HELD` | Treo chờ người xử | `gold-ink` | `#8a6318` | Chữ, 5.03 |
| `VOIDED` | Hủy trận, hoàn cược | `line-strong` | `#cfc3a9` | **Chỉ viền và gạch ngang.** 1.62, chữ phải dùng `ink-soft` |

Ba điều bắt buộc:

- **Không dùng chu sa cho bất kỳ trạng thái nào.** Chu sa là màu con dấu và
  màu khải hoàn. Một trận bị hủy không phải một thất bại đạo đức.
- **Không dùng `--color-danger`.** Đỏ danger dành cho lỗi hệ thống và hành
  động phá hủy, không dành cho kết quả trận đấu.
- Mỗi trạng thái phải có **một biểu tượng riêng**, vì bốn trong sáu màu trên
  đều là xám lam và người mù màu sẽ không tách được.

### 1.8 Tông màu danh hiệu chất vấn

Nguyên tắc: **chất vấn thì im lặng mà ai cũng thấy, không hét lên.**

- Nền `--color-cream-deep` `#f3ecdd`, viền `--color-ash` `#77736c` 1px
- Chữ tiêu đề `--color-ash-ink` `#5f5b54`, mô tả `--color-ink-soft`
- **Không chu sa, không vàng, không đỏ danger**
- **Không hoạt ảnh, không phát sáng.** Vinh danh thì có nghi thức, chất vấn
  thì chỉ hiện ra rồi ở lại
- Không bao giờ đẩy lên Bảng Bố Cáo hay băng chạy. Đẩy lên là bêu riếu

Danh hiệu **Cải Quá Tự Tân** thì ngược lại hoàn toàn: nó là danh hiệu vinh
danh, dùng vàng và có nghi thức trao như mọi danh hiệu vinh danh khác. Chính
sự tương phản đó nói lên rằng nền tảng không đóng đinh ai vĩnh viễn.

---

## 2. Chữ

Ba bộ chữ, cả ba đều hỗ trợ tiếng Việt đầy đủ. Không thêm bộ thứ tư.

| Token | Bộ chữ | Vai trò |
|---|---|---|
| `--font-display` | Playfair Display | Tiêu đề, số liệu lớn |
| `--font-body` | Source Serif 4 | Văn bản chạy |
| `--font-ui` | Be Vietnam Pro | Nhãn, nút, giao diện, số |

**Không bao giờ dùng `system-ui` cho chữ hiển thị.** Trên Windows nó ra Segoe
UI, macOS ra SF, Android ra Roboto, và ba bộ đó vẽ dấu chồng của tiếng Việt
khác nhau. Ở cỡ nhỏ in hoa giãn cách thì dấu bị đẩy lệch khỏi thân chữ.
`system-ui` chỉ nằm ở cuối chuỗi dự phòng của `--font-ui`.

### 2.1 Thang chữ

| Token | Cỡ | Đậm | Giãn dòng | Giãn chữ | Bộ | Dùng cho |
|---|---:|---:|---:|---:|---|---|
| `display-hero` | 46px | 700 | 1.06 | -0.02em | display | Tiêu đề trang chủ |
| `display-lg` | 38px | 700 | 1.10 | -0.02em | display | Mở đầu mục lớn |
| `heading-1` | 30px | 700 | 1.15 | -0.01em | display | Tiêu đề trang |
| `heading-2` | 24px | 700 | 1.20 | -0.01em | display | Tiêu đề mục |
| `heading-3` | 20px | 600 | 1.30 | 0 | display | Tiêu đề thẻ |
| `heading-4` | 17px | 600 | 1.40 | 0 | ui | Tiêu đề nhỏ, câu hỏi FAQ |
| `body-lg` | 17px | 400 | 1.70 | 0 | body | Văn bản chính. **Cỡ mặc định của `body`** |
| `body` | 15.2px | 400 | 1.60 | 0 | body | Văn bản trong thẻ |
| `body-sm` | 13.5px | 400 | 1.55 | 0 | body | Chú thích |
| `ui-md` | 14px | 500 | 1.30 | 0 | ui | Nhãn nút |
| `ui-sm` | 12.5px | 500 | 1.40 | 0 | ui | Nhãn phụ, nhãn kép |
| `label-caps` | 12px | 600 | 1.40 | 0.14em | ui | Nhãn in hoa. **Bắt buộc `gold-ink`** |
| `numeric` | theo ngữ cảnh | 700 | 1.10 | 0 | display | Số liệu. **Bắt buộc `tabular-nums`** |

**Giãn chữ âm chỉ được dùng từ `heading-2` trở lên.** Dưới cỡ đó, giãn chữ âm
làm dấu ngã và dấu mũ dính vào nhau.

Với chữ tiếng Việt viết hoa nhiều dòng, giãn dòng tối thiểu là **1.25** để dấu
dòng dưới không chạm chân chữ dòng trên.

Độ dài dòng: 60 tới 75 ký tự trên máy tính, 35 tới 60 trên điện thoại.

---

## 3. Khoảng cách và lưới

Đơn vị gốc 4px, bước chính 8px.

| Token | Giá trị | | Token | Giá trị |
|---|---:|---|---|---:|
| `space-xxs` | 4px | | `space-xxl` | 32px |
| `space-xs` | 8px | | `space-xxxl` | 40px |
| `space-sm` | 12px | | `section-sm` | 48px |
| `space-md` | 16px | | `section` | 64px |
| `space-lg` | 20px | | `section-lg` | 96px |
| `space-xl` | 24px | | `hero` | 120px |

- Bề rộng nội dung tối đa **1152px** (`max-w-6xl`), lề ngang 24px
- Trang marketing dùng nhịp `section-lg`, khu học viên và quản trị dùng `section`
- Ba tầng nhịp dọc trong một mục: 8px giữa các dòng cùng nhóm, 24px giữa các
  nhóm, 64px giữa các mục

---

## 4. Hình khối, và luật bo góc

**Mặc định bo góc bằng 0.** Đây là hình học sổ sách và giấy in, không phải
hình học ứng dụng di động. Thẻ, nút, ô nhập, bảng đều vuông góc.

Đúng **một** token bo góc tồn tại:

```
--radius-lift: 10px
```

Khai trong `globals.css` ngay dưới `--shadow-lift`. Trùng tên là có chủ ý: hai
token này đi thành cặp.

Và nó có một luật duy nhất: **bo góc là tín hiệu của độ cao, không phải trang
trí.** Chỉ những thứ **nổi lên khỏi mặt trang** mới được bo góc:

| Được bo góc | Không được bo góc |
|---|---|
| Thẻ mô phỏng giao diện trên dải mực tối | Thẻ nội dung thường |
| Hộp thoại `.motion-dialog` | Nút bấm |
| Băng bố cáo và thông báo nổi | Ô nhập, bảng, tab |
| Chip trạng thái tròn hoàn toàn (`9999px`) | Ảnh trong thẻ |

Nếu một thứ có `--radius-lift` mà không có bóng đổ từ bậc 3 trở lên, thì một
trong hai chỗ đã sai.

`.seal` giữ nguyên `3px` như đang có. Nó là con dấu khắc, không phải giao diện.

---

## 5. Độ cao

| Bậc | Giá trị | Dùng cho |
|---|---|---|
| 0 | Không bóng, viền `--color-line` 1px | Thẻ mặc định, hàng bảng |
| 1 | `0 1px 2px rgb(34 48 62 / .06)` | Thẻ nhấc nhẹ khi trỏ vào |
| 2 | `--shadow-card` | Thẻ nội dung, hộp ghi chú |
| 3 | `--shadow-lift` | Thẻ mô phỏng trên dải mực tối, băng bố cáo |
| 4 | `0 16px 48px -8px rgb(34 48 62 / .28)` | Hộp thoại, trình đơn thả xuống |

Bậc 4 chưa có trong `globals.css`, cần thêm khi dựng hộp thoại đấu trường.

**Không đặt bóng đổ nặng lên thẻ phẳng.** Trên nền giấy gạo, bóng đổ nặng
trông như ảnh dán chứ không như mực thấm.

---

## 6. Chuyển động

Bốn thang thời lượng đã có trong `.world-shell`, dùng lại, không đẻ thêm:

| Token | Giá trị | Dùng cho |
|---|---|---|
| `--world-duration-press` | 120ms | Phản hồi khi nhấn |
| `--world-duration-utility` | 180ms | Đổi trạng thái, đổi màu |
| `--world-duration-scene` | 520ms | Chuyển cảnh giữa trang |
| `--world-duration-map` | 680ms | Chuyển động bản đồ |

Đường cong: `--ease-out` khi đi vào, `--ease-in-out` khi hai chiều. Đi ra
ngắn hơn đi vào khoảng 60 tới 70 phần trăm.

Ba luật giữ nguyên từ hệ hiện tại:

- Mọi chuyển động phải diễn đạt một quan hệ nhân quả, không trang trí
- `prefers-reduced-motion` giảm về `wb-fade-only`, và video nền phải tắt riêng
  vì nó không phải animation nên không dính luật chung
- **Khu vực học tập không có chuyển động.** Phòng thi và màn phục bàn giữ
  hoàn toàn tĩnh

---

## 7. Thành phần đã có

Giữ nguyên, chép lại để tra cứu.

| Thành phần | Đặc tả |
|---|---|
| `ButtonLink` biến thể `primary` | Viền và nền `navy`, chữ `paper`, vuông góc |
| `ButtonLink` biến thể `outline` | Viền `navy`, chữ `navy`, nền trong suốt |
| `ButtonLink` biến thể `gold` | Viền và nền `gold`, chữ **`navy-deep`**, nhấn thì sáng lên `gold-soft` |
| `SectionHeading` | Nhãn `.label-caps`, tiêu đề display, gạch `.rule-gold` |
| `NoteBox` | Viền trái `gold` 4px, nền `cream-deep` |
| `.seal` | Vuông 28px, viền `vermilion` 2px, rỗng ruột, bo `3px` |
| `.label-caps` | 12px, 600, giãn `0.14em`, in hoa, `gold-ink` |
| `.rule-gold` / `.rule-ink` | Gạch 56px cao 3px |
| `.paper-grain` | Vân giấy dệt bằng gradient, không dùng ảnh |
| `.ink-wash-fallback` | Nền mực CSS khi chưa có tranh |
| `.dual-label__function` | Dòng chức năng dưới tên cổ phong |
| `.font-exam` | Arial. **Ngoại lệ tuyệt đối của phòng thi** |

**Nút vàng: đã sửa một lỗi tiếp cận có thật.** Trước ngày 2026-08-20, nút vàng
dùng `bg-gold text-paper`, chỉ đạt **3.19:1**, trượt chuẩn AA cho nhãn nút. Mẫu
này bị chép ra **13 chỗ trong 12 file**, không chỉ ở `ui.tsx`.

Bản đúng: chữ `navy-deep` trên nền `gold` đạt **4.56:1**. Trạng thái nhấn phải
làm **sáng lên** `gold-soft` (7.25:1), không được làm trầm đi: `gold-deep` kéo
tương phản xuống 3.42:1 và lại trượt chuẩn.

`--color-gold-deep` và `--color-danger-deep` đã thay cho mã màu cứng
`hover:bg-[#9d7223]` và `hover:bg-[#8f1c22]`. Mã màu cứng duy nhất còn được phép
trong `src/` là của phòng thi CBT (`reading-cbt.tsx`), đúng theo ngoại lệ ở mục 0.

---

## 8. Thành phần mới

### 8.1 Dải mực tối, mô-típ chữ ký

```
nền:        --color-navy-deep #16293f
chữ:        --color-paper
nhãn:       --color-gold-soft #d3b264
đệm dọc:    96px trên máy tính, 40px trên điện thoại
trang trí:  hai quầng gradient rất nhạt, vàng ở trên trái và lam ở dưới phải,
            opacity tối đa 0.16, KHÔNG phải hoa văn lặp
```

**Chỉ dùng ở ba nơi:**

1. Hero trang chủ
2. Màn đấu trường trực tiếp
3. Dải kêu gọi hành động cuối trang marketing

Dùng ở nơi thứ tư là làm mòn nó. Nếu một trang cần dải tối mà không nằm trong
ba nơi trên, hãy hỏi lại vì sao trang đó cần dồn sự chú ý đến thế.

**Nút trên dải tối:**

| Vai trò | Nền | Chữ | Viền |
|---|---|---|---|
| Chính | `gold` `#b8862b` | `navy-deep` | `gold` |
| Phụ | trong suốt | `paper` | `silver-blue` `#7d97ac` |

Nút chính trên dải tối dùng vàng chứ không dùng navy, vì navy trên navy thì
biến mất. Đây là **ngoại lệ duy nhất** cho quy tắc nút chính là navy.

### 8.2 Thẻ mô phỏng giao diện

Thẻ trắng đè lên mép dưới dải mực tối, nhô lên khoảng 96px.

```
nền:      --color-paper
viền:     --color-line 1px
bo góc:   --radius-lift 10px
bóng:     bậc 3
```

Trên điện thoại, thẻ tụt xuống hẳn dưới dải, không đè nữa.

Nội dung thẻ phải là **ảnh chụp giao diện thật của phòng luyện**, không phải
hình vẽ minh họa. Chưa có ảnh thì dùng khung xám bậc 0, đừng dùng ảnh giả.

### 8.3 Bốn chỉ số, phải phân biệt được trong nháy mắt

Bốn con số này sẽ nằm cạnh nhau trên hồ sơ. Màu thôi thì không đủ, nên mỗi
cái có **một hình dạng riêng**.

| Chỉ số | Hình | Màu | Vì sao hình đó |
|---|---|---|---|
| **Kinh nghiệm** | Thanh ngang có vạch mốc | `navy` | Chỉ tăng, nên là một đường tiến |
| **Quân Công** | Số, kèm con dấu nhỏ | `gold-ink` | Tiêu được, nên là của cải |
| **Chiến Lực** | Số, kèm mũi tên lên hoặc xuống | `azure-ink` | Lên xuống được |
| **Uy vọng** | Hai số cắm cờ và hạ cờ, tách riêng | `ash-ink` | Do người khác định, không do mình |

Uy vọng hiện **hai số riêng biệt**, không hiện một số ròng. Lý do đã ghi
trong `schema.prisma`: một cú bấm chỉ đổi đúng một trong hai số, hiện số ròng
thì đổi từ cắm cờ sang hạ cờ nhảy 2 điểm, đúng về toán nhưng người dùng đọc
thành mất 2 cờ.

### 8.4 Hai hạng trận

| Hạng | Dấu hiệu |
|---|---|
| Có cược | Viền `gold` 2px, kèm số Quân Công đặt cược và con dấu nhỏ |
| Không cược | Viền `line` 1px, kèm chữ "Không cược" |

Phân biệt bằng **độ dày viền cộng chữ**, không bằng màu nền. Hạng không cược
phải trông bình thường chứ không trông như bị giảm cấp: nó là cửa luôn mở, và
là nơi người mới bắt đầu.

### 8.5 Ấn vỡ

Biến thể của `.seal` cho danh hiệu chất vấn. Cùng con dấu ấy nhưng nứt một
đường.

```
.seal--broken
  viền:   --color-ash #77736c   (KHÔNG dùng chu sa)
  opacity: 0.6
  thêm:   một đường chéo 1px cắt ngang, cùng màu viền
```

Đây không phải ngôn ngữ hình mới, chỉ là bẻ ngôn ngữ đang có. Và nó là hình
ảnh trực tiếp của hai nửa binh phù không khớp, tức là đúng luận điểm mà cả hệ
danh hiệu chất vấn dựa vào.

### 8.6 Trạng thái Quy Điền

Sự vắng mặt tự nguyện, không phải sự trừng phạt. Thể hiện bằng **giảm sự hiện
diện**, không bằng màu cảnh báo.

```
opacity người dùng trong danh sách: 0.55
tên phe và chỉ số:                  giữ nguyên, không làm mờ
nhãn:                               "Quy Điền" bằng .label-caps mau ash-ink
nút thách đấu:                      ẩn hẳn, không phải làm mờ
```

Ẩn hẳn nút thách đấu chứ không làm mờ, vì nút mờ mà bấm được thì người ta sẽ
bấm, còn nút mờ mà không bấm được thì người ta tưởng hỏng.

### 8.7 Băng bố cáo

```
nền:      --color-navy-deep
chữ:      --color-paper, nhãn --color-gold-soft
bo góc:   --radius-lift
bóng:     bậc 3
vị trí:   nổi ở mép trên, dưới thanh điều hướng
```

Tham số lấy nguyên từ đặc tả: hiện 8 giây cộng 1 giây tan, hàng đợi tối đa 3
tin, nhịp tối đa 1 tin mỗi 20 giây, tin tràn rơi vào Bảng Bố Cáo.

Băng bố cáo **không được chặn thao tác**, và phải tắt được qua `PublicProfile`.
Với `prefers-reduced-motion`, băng hiện và ẩn bằng opacity, không trượt.

### 8.8 Thang chín bậc nhãn phòng diễn đàn

Một màu, chín mức đậm nhạt. Phòng càng cao thì nhãn càng đậm.

| Bậc | Nền | Chữ |
|---:|---|---|
| 1 tới 3 | `--color-cream-deep` | `--color-ink-soft` |
| 4 tới 6 | `--color-line` | `--color-ink` |
| 7 tới 9 | `--color-navy` | `--color-paper` |

Nhãn dùng đúng tên bậc trong `src/lib/ranks/catalog.ts`, không dùng số trần.

Ô soạn bài phải ghi rõ phạm vi người đọc trước khi người ta gõ, ví dụ:
*"Bài này chỉ hiện với bậc 7 trở lên."*

### 8.9 Màn Thí Bút

Hộp thoại bấm giờ, 3 tới 5 câu.

- Nền `paper`, không dùng dải mực tối. Đây là khảo hạch, không phải trận đấu
- Đồng hồ dùng `numeric` với `tabular-nums`, màu `ink`, **không chuyển sang
  đỏ khi sắp hết giờ**. Đổi màu chỉ làm người ta cuống
- Câu ghi trên màn hình, cỡ `heading-3`, màu `navy-deep`:
  *"Không mua được binh thư, phải đánh mà đoạt lấy."*
- Khi trượt: chỉ rõ sai ở đâu bằng `{bay:}` và `{dung:}`, không dùng đỏ danger

### 8.10 Màn đấu trường trực tiếp

Nơi thứ hai dùng dải mực tối. Dùng ở đây vì nó có lý do chức năng: phòng đấu
cần dồn sự chú ý, nền tối làm đúng việc đó.

- Hai bên hiện đối xứng, cùng cỡ, cùng vị trí. **Không làm bên mình to hơn**
- Đồng hồ ở giữa, `numeric`, `tabular-nums`, màu `paper`
- Tiến độ mỗi bên hiện **số câu đã nộp**, không hiện số câu đúng. Hiện số câu
  đúng khi trận chưa xong là phát tín hiệu cho đối thủ
- Nút Giảng hòa và Đầu hàng đặt tách khỏi nhau và tách khỏi vùng thao tác làm
  bài, theo đúng luật tách hành động phá hủy

---

## 9. Nên và không nên

### Nên

- Giữ 80 tới 90 phần trăm bề mặt là kem, xám và mực
- Mỗi màn hình đúng một accent trang trí
- Dùng bản `-ink` cho mọi chữ có màu, và ghi số tương phản khi thêm màu mới
- Kèm chữ hoặc biểu tượng cho mọi màu ngữ nghĩa
- Giữ vuông góc, trừ những thứ thật sự nổi lên khỏi mặt trang
- Dùng `tabular-nums` cho mọi cột số, giá tiền và đồng hồ

### Không nên

- Không dùng `system-ui` cho chữ hiển thị
- Không dùng chu sa cho trạng thái tiêu cực hay danh hiệu chất vấn
- Không dùng màu phe ngoài hai nơi ở mục 1.5
- Không dùng dải mực tối ngoài ba nơi ở mục 8.1
- Không bo góc thứ gì không có bóng đổ từ bậc 3
- Không đặt hoạt ảnh vào khu vực học tập
- Không để mã màu cứng trong component, kể cả ở trạng thái trỏ vào
- Không dùng biểu tượng cảm xúc thay biểu tượng vector

---

## 10. Đáp ứng màn hình

| Tên | Bề rộng | Thay đổi chính |
|---|---|---|
| Điện thoại nhỏ | dưới 480px | Một cột. Tiêu đề hero 27px |
| Điện thoại lớn | 480 tới 767px | Thẻ 2 cột. Hero 30px |
| Máy tính bảng | 768 tới 1023px | Lưới 2 cột. Hero 34px |
| Máy tính | 1024 tới 1279px | Lưới đủ. Hero 38px |
| Rộng | từ 1280px | Hero 46px |

- Dải mực tối: thẻ mô phỏng tụt hẳn xuống dưới, không đè nữa
- Bảng xếp hạng và bảng so sánh: cuộn ngang **trong khung của chính nó**,
  thân trang không bao giờ cuộn ngang
- Vùng chạm tối thiểu 44px, ô nhập cao 44px
- Thanh công cụ soạn bài trên điện thoại phải nổi **trên** bàn phím
- Dùng `min-h-dvh`, không dùng `100vh`

---

## 11. Trạng thái thực thi

### Đã vào code ngày 2026-08-20

- Chín token màu phe, `--color-gold-deep`, `--color-danger-deep`,
  `--shadow-modal` (bậc 4) và `--radius-lift` đã có trong `globals.css`
- Khối token đổi từ `@theme` sang **`@theme static`**. Bắt buộc: Tailwind 4 mặc
  định lược bỏ mọi biến chưa có utility nào dùng tới, nên token màu phe và
  `--shadow-modal` biến mất khỏi `:root` và `var(--color-faction-wei)` trong CSS
  thuần trả về rỗng mà không báo lỗi. Cái giá đo được là **532 byte**
- Lỗi tương phản nút vàng đã sửa ở 13 chỗ trong 12 file

### Còn thiếu, cần quyết sau

- **Chế độ tối toàn trang.** Đã khai sẵn cặp sáng và tối cho năm màu nghĩa
  diễn đàn, chưa khai cho phần còn lại
- **Ký hiệu, huy hiệu và ảnh.** Chủ dự án tự thiết kế bên ngoài. Danh sách đặt
  hàng đầy đủ kèm yêu cầu kỹ thuật ở **`docs/DAT-HANG-KY-HIEU.md`**
- **Đặt hàng tranh mới**: art bible cần siết lại, xem mục 12

---

## 12. Ghi chú về tranh

Hai bức đang dùng vi phạm chính art bible đã viết:

| Bức | Vi phạm |
|---|---|
| `home/trieu-van-hero.webp` | Hai accent trên một bức: áo choàng ngả teal cộng hào quang giáo xanh điện. Hào quang vũ khí kiểu game, đúng thứ negative prompt cấm |
| `generals/quan-vu.webp` | Bốn màu cùng lúc. Lục dùng là bạc hà sáng, không phải lục ngọc `#2e6b4f` trong code. Nét viền khép kín và tô phẳng, đây là splash art game chứ không phải thủy mặc |

Ký tự chữ Hán đã được xử lý ở commit `505d58b`, không còn là vấn đề.

Ba điều cần bổ sung vào `ART-BRIEF-HO-PHU.md` trước khi đặt tranh tiếp:

1. **Cấm mọi hào quang, phát sáng, tia lửa quanh vũ khí.** Đây là chỗ model
   sinh ảnh trượt về ngôn ngữ game nhanh nhất
2. **Nêu rõ số màu tối đa trong bức là hai**: mực đen xám, cộng đúng một
   accent. Ngựa, tua, cờ đều tính là màu
3. **Ưu tiên phong cảnh và tĩnh vật hơn chân dung nhân vật.** Chân dung là
   nơi model bịa ra nhiều nhất và cũng là nơi tranh át chữ mạnh nhất

---

## Nhật ký quyết định

Ghi lại phương án đã bác bỏ, để sau này không ai gỡ nhầm chốt.

**Đã bác bỏ: đổi toàn bộ sang hệ Subtle Gradient.** Bảy cặp màu trong bảng đó
không đạt chuẩn tương phản AA, gồm cả ba màu semantic. `system-ui` gây lệch
dấu tiếng Việt. Hệ đó không có đặc tả cho phòng thi, bảng xếp hạng, cấp bậc
hay diễn đàn, tức là thiếu đúng những màn hình học viên ở lâu nhất.

**Đã bác bỏ: màu lam cho phe Ngụy.** Bảng màu đã có năm token họ lam. Mọi ứng
viên lam đều rơi vào deltaE 14 tới 19 so với `ink-soft` hoặc `azure-ink`.

**Đã bác bỏ: tô lãnh địa bằng màu phẳng trên bản đồ.** Bản đồ đã giải xong
bằng lớp tranh cộng thang opacity, và cách đó giữ được chất mực. Màu phẳng sẽ
biến bản đồ thành đồ họa thông tin.

**Đã bác bỏ: bo góc 8px cho toàn bộ nút và thẻ.** Đó là hình học ứng dụng di
động. Hình học của hệ này là sổ sách và giấy in. Bo góc được giữ lại làm tín
hiệu của độ cao, một nghĩa duy nhất.

**Đã bác bỏ: gộp luật một accent với màu ngữ nghĩa.** Trộn hai thứ vào một
luật là lý do luật cũ hay bị vi phạm rồi bỏ qua: không ai coi ô báo lỗi đỏ
cạnh ô xác nhận xanh là lỗi thiết kế.

**Đã bác bỏ: đổi màu đồng hồ Thí Bút khi sắp hết giờ.** Làm người ta cuống mà
không thêm thông tin nào, vì con số đã ở ngay đó.
