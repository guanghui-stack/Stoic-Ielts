> **Ghi chú rebrand:** Đây là tài liệu lịch sử của giai đoạn trước STOIC · IELTS. Đặc tả hiện hành nằm tại [STOIC-REBRAND-SPEC.md](./STOIC-REBRAND-SPEC.md), [BRAND-GUIDELINE.md](./BRAND-GUIDELINE.md) và [ART-ASSET-REGISTER.md](./ART-ASSET-REGISTER.md).

# Đặt hàng ký hiệu và ảnh

> Bản 1, ngày 2026-08-20. Đi kèm `docs/BRAND-GUIDELINE.md`.
>
> Danh sách mọi chỗ cần ký hiệu hoặc ảnh do người thiết kế làm bên ngoài. Mỗi
> mục có sẵn khổ, ràng buộc và tiêu chí nghiệm thu, để làm xong là dán thẳng vào
> code được, không phải sửa lại.
>
> **Quy ước chữ nghĩa:** không chữ Hán, không dấu gạch ngang dài.

---

## Đọc trước: hai phần ba danh sách này không cần làm

Dự án đã cài `lucide-react` bản 1.23.0, gồm 1994 ký hiệu. Tôi đã đối chiếu từng
nhu cầu với bộ đó. **Chỉ sáu ký hiệu thật sự cần tự thiết kế**, phần còn lại lấy
sẵn.

Lý do phân chia như vậy: ký hiệu mang **bản sắc** thì phải tự làm, vì lấy đồ có
sẵn nghĩa là trông giống mọi sản phẩm khác dùng cùng bộ icon. Ký hiệu mang
**chức năng** thì ngược lại, càng quen thuộc càng dễ hiểu, tự vẽ chỉ làm người
dùng phải học lại.

**Đừng dùng AI sinh ảnh cho ký hiệu giao diện.** Model sinh ảnh cho ra ảnh
raster với độ dày nét không đều, không canh được lưới, không đổi màu theo
`currentColor`. Sáu ký hiệu dưới đây phải vẽ bằng Figma, Illustrator hoặc
Inkscape. AI chỉ dùng cho tranh thủy mặc ở mục 3.

---

## 0. Yêu cầu kỹ thuật, áp cho cả sáu ký hiệu

| Hạng mục | Yêu cầu |
|---|---|
| Định dạng | SVG, không nhúng ảnh raster, không nhúng font |
| Lưới | 24 x 24, `viewBox="0 0 24 24"` |
| Vùng an toàn | Nét nằm trong ô 20 x 20 ở giữa, chừa 2px mỗi phía |
| Nét | 1.5px, `stroke-linecap="round"`, `stroke-linejoin="round"` |
| Màu | `stroke="currentColor"` và `fill="none"`. **Không mã màu cứng trong file** |
| Chữ | Không thẻ `<text>`, không chữ Hán, không ký tự nào |
| Kích thước hiển thị | Đọc được ở 16px. Vẽ xong thu về 16px kiểm tra lại |

Màu do code quyết định qua `currentColor`, nên cùng một file dùng được cả trên
nền kem lẫn nền mực tối. Nếu file có mã màu cứng thì nó hỏng ở một trong hai
nền, và đó là lý do quy tắc này không có ngoại lệ.

**Kiểm tra bắt buộc trước khi bàn giao:** mở SVG bằng trình soạn văn bản, tìm
chuỗi `#`. Nếu có kết quả nào ngoài phần chú thích thì file chưa đạt.

---

## 1. Sáu ký hiệu cần tự thiết kế

### 1.1 Quân Công

`public/brand/glyphs/quan-cong.svg`

**Dùng ở:** ô chỉ số trên hồ sơ, số Quân Công đặt cược trong thẻ trận, màn Thí
Bút, sổ cái. Đây là ký hiệu xuất hiện nhiều nhất trong cả hệ mới.

**Prompt cho người vẽ:**

> Vẽ một nửa binh phù nhìn nghiêng: một khối hình thang đứng, cạnh phải là
> đường thẳng, cạnh trái có ba khấc răng cưa vuông vức nhô ra, như chỗ ghép của
> hai mảnh phù. Bên trong để trống. Không vẽ hình hổ, không vẽ mặt, không vẽ
> hoa văn.

**Vì sao là hình này.** Ba khấc răng cưa chính là ba trụ Chiến trận, Phục bàn,
Luyện binh. Và cả hệ thống dựa trên câu "binh phù chỉ hiệu lực khi hai nửa khớp
nhau", nên đồng tiền kiếm bằng công sức phải mang đúng nửa phù đó. Quân Công là
thứ chỉ có một nửa: phải đem đi khảo hạch mới thành đề.

**Tiêu chí nghiệm thu:**
- Ở 16px vẫn đếm được ba khấc, không dính thành một khối
- Đặt cạnh ký hiệu Xu ở mục 1.2, phân biệt được ngay trong nháy mắt
- Không đối xứng trái phải. Một nửa phù thì không được trông như một vật hoàn chỉnh

### 1.2 Xu

`public/brand/glyphs/xu.svg`

**Dùng ở:** ví xu, bảng giá, hóa đơn, mọi chỗ hiện số dư tiền thật.

**Prompt cho người vẽ:**

> Vẽ một đồng tiền cổ Việt Nam: vòng tròn ngoài, lỗ vuông ở chính giữa, khoảng
> trống giữa lỗ và vành. Không khắc chữ, không hoa văn, không vẽ chồng nhiều
> đồng.

**Ràng buộc riêng:** lỗ vuông ở giữa là chi tiết bắt buộc, vì đó là thứ tách nó
khỏi mọi ký hiệu đồng xu tròn thông thường, và nó cũng là thứ khiến nó không thể
nhầm với nửa binh phù của Quân Công.

**Tiêu chí nghiệm thu:**
- Ở 16px lỗ vuông vẫn ra hình vuông, không bị tròn lại
- Đối xứng hoàn toàn. Xu là vật hoàn chỉnh, cố ý ngược với Quân Công

### 1.3, 1.4, 1.5 Ba huy hiệu phe

`public/brand/factions/wei.svg`, `shu.svg`, `wu.svg`

**Dùng ở:** bảng xếp hạng phe, chú giải bản đồ lãnh địa, chip nhỏ cạnh tên người
dùng.

**Ràng buộc chung, quan trọng nhất trong cả tài liệu này:** ba huy hiệu phải
phân biệt được **khi in trắng đen**. Màu phe đã có rồi, nên nếu ba huy hiệu chỉ
khác nhau ở màu thì người mù màu không đọc được bảng xếp hạng, và cả hệ vi phạm
quy tắc "màu không bao giờ là tín hiệu duy nhất" ở brand guideline mục 1.1.

Ba hình phải khác nhau về **bóng dáng tổng thể**, không phải về chi tiết bên
trong. Nheo mắt lại vẫn phải tách được ba hình.

| Phe | Vùng | Màu đi kèm | Prompt |
|---|---|---|---|
| **Ngụy** | Phía bắc | Tía đá `#705a86` | Một ngọn tháp canh vuông vức, chân rộng đỉnh hẹp, có lỗ châu mai. Bóng dáng: **tam giác đứng** |
| **Thục** | Phía tây | Trúc lục `#6a7f3a` | Ba đỉnh núi nhọn xếp cạnh nhau, đỉnh giữa cao hơn. Bóng dáng: **răng cưa ngang** |
| **Ngô** | Phía đông nam | Thổ hồng `#9c5b52` | Ba lớp sóng nước xếp chồng, đường cong mềm. Bóng dáng: **khối tròn nằm ngang** |

Chọn tháp, núi và sóng vì đó là địa hình thật của ba vùng, nên người mới nhìn
một lần là nhớ được phe nào ở đâu, không phải học thuộc.

**Tiêu chí nghiệm thu:**
- In trắng đen ở 16px, đưa cho người chưa từng thấy, họ phải tách được ba hình
- Cả ba cùng một độ dày nét và cùng một mức chi tiết. Một hình rườm rà hơn hai
  hình kia sẽ trông như phe đó quan trọng hơn
- Không phe nào dùng hình vũ khí. Đây là lãnh địa, không phải quân đội

### 1.6 Ấn vỡ

`public/brand/glyphs/an-vo.svg`

**Dùng ở:** danh hiệu chất vấn, đúng năm danh hiệu Danh Bất Phù Thực, Ẩn Tài Đãi
Giá, Án Binh Bất Động, Lâm Trận Thoát Đào, Ỷ Cường Lăng Nhược.

**Prompt cho người vẽ:**

> Lấy đúng con dấu hiện có trong `globals.css` lớp `.seal`: hình vuông bo nhẹ,
> bên trong có một khung vuông thứ hai nhỏ hơn, ruột để trống. Thêm **một đường
> nứt duy nhất** chạy chéo qua cả hai khung, hơi gãy khúc như vết nứt thật chứ
> không phải một đường thẳng kẻ bằng thước.

**Ràng buộc:**
- **Đúng một vết nứt.** Nhiều vết thành hình vỡ nát, mà chất vấn không phải hủy diệt
- Vết nứt không được tách con dấu thành hai mảnh rời hẳn. Người bị chất vấn vẫn
  còn con dấu, chỉ là nó không còn lành lặn
- **Không dùng màu chu sa.** Chu sa dành cho con dấu lành và khoảnh khắc khải
  hoàn. Ấn vỡ dùng tro `#77736c`

**Tiêu chí nghiệm thu:** đặt cạnh `.seal` gốc, hai hình phải nhận ra ngay là
cùng một con dấu, một cái lành một cái nứt. Nếu trông như hai vật khác nhau thì
chưa đạt.

---

## 2. Lấy sẵn từ Lucide, không cần thiết kế

Đã đối chiếu với `lucide-react` 1.23.0, tất cả đều có.

### 2.1 Hai chỉ số còn lại

| Chỗ dùng | Ký hiệu Lucide | Ghi chú |
|---|---|---|
| Kinh nghiệm | không cần ký hiệu | Đã là thanh ngang có vạch mốc, xem brand guideline mục 8.3 |
| Chiến Lực, đang lên | `trending-up` | Màu `azure-ink` |
| Chiến Lực, đang xuống | `trending-down` | Màu `azure-ink` |
| Uy vọng, cắm cờ | `flag` | Màu `ash-ink` |
| Uy vọng, hạ cờ | `flag-off` | Màu `ash-ink` |

### 2.2 Sáu trạng thái kết trận

Brand guideline mục 1.7 bắt buộc mỗi trạng thái có ký hiệu riêng, vì bốn trong
sáu màu đều là xám lam.

| Trạng thái | Ký hiệu Lucide | Màu |
|---|---|---|
| `DECLINED` | `circle-x` | `ink-soft`, ký hiệu dùng `muted` |
| `EXPIRED` | `clock` | `ink-soft` |
| `TRUCE` | `handshake` | `silver-blue-ink` |
| `ABANDONED` | `flag-triangle-right` | `ash-ink` |
| `HELD` | `lock` | `gold-ink` |
| `VOIDED` | `ban` | `line-strong`, chữ dùng `ink-soft` gạch ngang |

### 2.3 Các chỗ khác

| Chỗ dùng | Ký hiệu Lucide |
|---|---|
| Thí Bút | `feather` |
| Quy Điền | `tent` |
| Băng bố cáo, Bảng Bố Cáo | `megaphone` |
| Trận có cược | `hand-coins` |
| Hồ sơ liêm chính chờ người xử | `gavel` |
| Danh hiệu vinh danh | `medal` |
| Mùa giải | `trophy` |

---

## 3. Ảnh

### 3.1 Ảnh chụp giao diện phòng luyện

`public/art/mockups/phong-luyen.webp`

**Dùng ở:** thẻ mô phỏng nổi trên dải mực tối, brand guideline mục 8.2. Đây là
thứ người lạ nhìn thấy đầu tiên khi vào trang chủ.

**Đây là ảnh chụp màn hình, không phải hình vẽ.** Guideline ghi rõ: chưa có ảnh
thật thì dùng khung xám, đừng dùng hình minh họa. Hình vẽ giao diện giả là thứ
người xem nhận ra ngay, và nó nói rằng sản phẩm chưa có gì để khoe.

| Hạng mục | Yêu cầu |
|---|---|
| Nguồn | Chụp thật màn hình phòng luyện Reading đang chạy |
| Tỷ lệ | 16 : 10, cắt đúng tỷ lệ, không co giãn méo |
| Bề rộng | Tối thiểu 1600px, xuất WebP chất lượng 82 |
| Nội dung | Một đoạn văn thật và vài câu hỏi thật. Không dùng chữ giả |
| Riêng tư | **Không để lọt tên thật, email, hay điểm số của học viên nào.** Dùng tài khoản thử |
| Dung lượng | Dưới 250KB |

### 3.2 Tranh thủy mặc

Đây là phần duy nhất dùng AI sinh ảnh. Quy trình và negative prompt giữ nguyên ở
`docs/ART-BRIEF-HO-PHU.md`, nhưng **phải bổ sung ba điều trước khi đặt tranh
tiếp**, vì hai bức đang dùng vi phạm chính art bible:

1. **Cấm mọi hào quang, phát sáng, tia lửa quanh vũ khí.** Thêm vào negative
   prompt: `glowing weapon, energy aura, magical glow, light trails, sparks`.
   Đây là chỗ model trượt về ngôn ngữ game nhanh nhất, và cả hai bức hiện tại
   đều mắc
2. **Tối đa hai màu trong một bức**: mực đen xám, cộng đúng một accent. Ngựa,
   tua, cờ, áo choàng đều tính là màu. Bức Quan Vũ hiện có bốn màu
3. **Ưu tiên phong cảnh và tĩnh vật hơn chân dung nhân vật.** Chân dung là nơi
   model bịa nhiều nhất, và cũng là nơi tranh át chữ mạnh nhất

**Tiêu chí nghiệm thu cho mỗi bức:** đặt bức tranh làm nền, viết một dòng tiêu
đề Playfair 46px đè lên. Nếu mắt đi vào tranh trước khi đọc chữ thì bức đó chưa
đạt, dù đẹp tới đâu.

---

## 4. Cách bàn giao

Đặt file đúng đường dẫn ghi ở từng mục, rồi báo tôi. Tên file phải khớp đúng
từng ký tự, vì code đọc theo tên.

Với ký hiệu SVG, nếu tiện thì gửi kèm cả bản 16px chụp màn hình, để tôi đối
chiếu xem lúc thu nhỏ có bị dính nét không.

**Thứ tự ưu tiên nếu làm dần:**

1. Quân Công và Xu. Hai cái này chặn phần lớn màn hình mới
2. Ấn vỡ. Chặn toàn bộ hệ danh hiệu chất vấn
3. Ba huy hiệu phe. Chỉ cần khi làm tới mùa giải, tức giai đoạn P6
4. Ảnh chụp phòng luyện. Làm được ngay khi phòng luyện có giao diện ổn định
5. Tranh mới. Không chặn gì cả, làm khi rảnh
