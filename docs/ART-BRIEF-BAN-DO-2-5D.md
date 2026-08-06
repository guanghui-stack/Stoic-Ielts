# Bộ đặt hàng ảnh — Bản đồ Chiến Dịch 2.5D

Tổng: **11 ảnh**. Ba nhóm, làm theo thứ tự A → B → C.

Kỹ thuật 2.5D dựng bằng CSS: mặt đất nghiêng ra sau 52 độ, còn nhân vật và
cột cờ được xoay ngược lại để "đứng dậy" khỏi mặt đất. Điều đó đặt ra hai yêu
cầu mà bộ ảnh cũ KHÔNG đáp ứng được, nên phải làm mới.

---

## 0. Hai yêu cầu kỹ thuật quyết định mọi thứ

### Yêu cầu 1 — nền bản đồ phải vẽ NHÌN TỪ TRÊN XUỐNG

Ảnh nền bản đồ hiện tại (`map-loan-the-quan-hung-tam-phan.webp`) vẽ theo góc
phong cảnh: có đường chân trời, núi lùi dần về xa. Khi nghiêng 52 độ nó sẽ
trông như một bức tranh nằm bẹp trên sàn, không phải một vùng đất.

Bản đồ 2.5D cần ảnh **bird's eye** — nhìn thẳng xuống, không có đường chân
trời, không có gì "ở xa" cả. Núi vẽ như những nếp gấp nhìn từ trên, sông vẽ
như dải uốn lượn.

### Yêu cầu 2 — nhân vật và mốc phải là ảnh CẮT RỜI, nền trong suốt

Định dạng **PNG nền trong suốt**, không phải WebP nền trắng. Nền trắng sẽ
thành một mảng trắng lơ lửng trên bản đồ.

Ba điều nữa cho ảnh cắt rời:

- **Chân hoặc vó ngựa chạm đúng cạnh dưới** của khung ảnh. Đó là điểm neo khi
  đặt lên bản đồ; thừa khoảng trống bên dưới thì nhân vật sẽ lơ lửng.
- **KHÔNG vẽ bóng đổ.** Bóng do CSS vẽ và phải nằm phẳng trên mặt đất; bóng
  nung sẵn trong ảnh sẽ đứng thẳng theo nhân vật, trông rất sai.
- **KHÔNG vẽ mặt đất, cỏ, hay bệ đỡ** dưới chân.

Ảnh Triệu Vân bạn vừa gửi trong chat **đúng chuẩn này** — cắt rời, nền trắng
sạch, vó ngựa chạm đáy. Chỉ cần xoá nền thành trong suốt là dùng được. Nếu
bạn còn file gốc thì gửi tôi, đỡ phải tạo lại.

---

## 1. Negative prompt chuẩn — dán vào mọi ảnh

```
photorealistic, 3D render, anime, modern clothing, firearms, gore, horror,
cyberpunk neon, multiple accent colors, busy background, extra limbs,
malformed hands, cloned horses, actor likeness, movie costume likeness,
game UI, watermark, logo, gibberish text, Chinese characters, Hanzi, Kanji,
calligraphy glyphs, character seal text, drop shadow, ground shadow,
horizon line, vanishing point
```

Bốn từ cuối là mới so với bộ cũ, và quan trọng nhất ở đây.

---

## 2. NHÓM A — Nền bản đồ nhìn từ trên xuống (1 ảnh)

| Tên file | Thư mục | Tỷ lệ | Kích thước gốc |
|---|---|---|---|
| `map-top-down.webp` | `public/art/campaign/` | 16:10 | 2400x1500 |

Đây là ảnh quan trọng nhất. Toàn bộ cảm giác 2.5D phụ thuộc vào nó.

```
A traditional Chinese ink wash map painted on textured warm ivory rice paper,
viewed strictly from DIRECTLY ABOVE like an ancient cartographer's chart. This
is a flat overhead map, NOT a landscape: there is no horizon, no sky, no
vanishing point, and nothing recedes into the distance.

Mountains are drawn as clusters of ridge strokes seen from above. Rivers are
winding ribbons of pale blue-grey ink flowing from the lower left toward the
upper right. Forests are small clusters of dots and short strokes. Ancient
walled settlements appear as tiny square outlines scattered across the terrain.

Rendered almost entirely in black ink and soft grey washes, ninety percent
monochrome. A single faint antique gold accent appears only on a thin winding
road that links the lower left to the upper right.

Leave the terrain calm and uncluttered across the whole surface so interface
markers can be placed on top anywhere. No text, no labels, no compass rose,
no borders, no cartouche, no legend. Include a small abstract vermilion seal
shape with no characters in one corner only.

Visible paper texture, ancient-master feeling, no generated text and no
Chinese characters. --ar 16:10
```

**Kiểm khi duyệt:** che một nửa ảnh lại, nửa còn lại vẫn phải đọc được là
"nhìn từ trên xuống". Nếu thấy núi có chân đế và đỉnh hướng lên trên như khi
đứng dưới đất nhìn lên, là sai — loại.

---

## 3. NHÓM B — Sáu tướng cắt rời (6 ảnh)

| Tên file | Nhân vật | Accent |
|---|---|---|
| `hero-trieu-van.png` | Triệu Vân | Lam điện `#3A7FC4` |
| `hero-truong-phi.png` | Trương Phi | Chu sa `#A33A2B` |
| `hero-quan-vu.png` | Quan Vũ | Lục ngọc `#2E6B4F` |
| `hero-hoang-trung.png` | Hoàng Trung | Kim đồng `#B8862B` |
| `hero-ma-sieu.png` | Mã Siêu | Bạc lam `#7D97AC` |
| `hero-lu-bo.png` | Lữ Bố | Hỏa cam `#C2591F` |

Thư mục `public/art/heroes/`. **PNG nền trong suốt**, cao khoảng 900px.

**Prompt khung** — thay `[NHÂN VẬT]` và `[ACCENT]`:

```
A traditional Chinese ink wash painting of [NHÂN VẬT] riding a warhorse,
shown in full side profile facing RIGHT, isolated on a completely transparent
background with nothing else in the frame.

The horse's hooves touch the very bottom edge of the image — no empty space
below them, no ground, no grass, no platform, and NO cast shadow of any kind.

Detailed historically inspired Chinese lamellar armour and a flowing cape.
Rendered in black ink and soft grey washes with a single [ACCENT] energy
accent along the weapon only; everything else stays monochrome ink.

The whole figure must fit inside the frame with a small margin at the top and
sides. Clean cut-out edges suitable for compositing.

No background, no scenery, no shadow, no text, no characters of any kind.
```

**Vì sao hướng sang PHẢI:** giao diện tự lật ngang bằng CSS khi nhân vật đi
sang trái. Nếu bạn tạo ảnh hướng trái thì mọi thứ sẽ ngược.

**Xoá nền:** nếu công cụ sinh ảnh không cho nền trong suốt, cứ để nền trắng
trơn rồi gửi tôi — tôi xoá nền được bằng bộ công cụ có sẵn trong phiên.

---

## 4. NHÓM C — Bốn kiểu mốc cửa ải (4 ảnh)

Tám cửa ải dùng lại bốn kiểu này, không cần tám ảnh riêng.

| Tên file | Dùng cho | Hình |
|---|---|---|
| `node-trai.png` | Cửa 1, 2 | Trại lính, lều vải và cọc gỗ |
| `node-cong-thanh.png` | Cửa 3, 4 | Cổng thành đá có lỗ châu mai |
| `node-doanh-luy.png` | Cửa 5, 6 | Doanh lũy có tháp canh |
| `node-quan-ai.png` | Cửa 7, 8 | Quan ải lớn giữa hai vách núi |

Thư mục `public/art/nodes/`. **PNG nền trong suốt**, cao khoảng 400px.

```
A traditional Chinese ink wash drawing of [HÌNH], seen from a slightly
elevated three-quarter angle as if looking down at it from above and to the
side. Isolated on a completely transparent background.

The base of the structure touches the bottom edge of the image — no ground,
no terrain, no cast shadow.

Rendered in black ink and soft grey washes on nothing, with a single small
vermilion accent on a banner or lantern. Simple and readable at small size:
this will be displayed about eighty pixels tall, so avoid fine detail that
will disappear.

No background, no text, no characters of any kind.
```

**Vì sao góc ba phần tư chứ không nhìn thẳng từ trên:** mốc phải trông như
đang ĐỨNG trên mặt đất nghiêng. Vẽ nhìn từ trên xuống thì nó sẽ nằm bẹp,
giống hệt mặt đất, và mất hẳn cảm giác nổi khối.

---

## 5. Checklist duyệt

Cho mọi ảnh:

- [ ] Không có ký tự chữ Hán ở bất cứ đâu, kể cả trên cờ và con dấu
- [ ] Không có chữ AI nguệch ngoạc
- [ ] Chỉ một màu accent
- [ ] Giáp trụ phong cách Trung Hoa cổ, không phải samurai Nhật

Riêng nhóm B và C:

- [ ] **Nền trong suốt thật** — mở bằng trình xem ảnh, nền phải là ô caro
- [ ] **Không có bóng đổ** trong ảnh
- [ ] **Chân hoặc đế chạm cạnh dưới**, không thừa khoảng trống
- [ ] Nhân vật hướng sang PHẢI

Riêng nhóm A:

- [ ] Nhìn từ trên xuống thật, không có đường chân trời
- [ ] Không có nhãn, la bàn, khung viền hay chú giải
- [ ] Mặt bản đồ đủ thoáng để đặt mốc lên trên

## 6. Giao file cho tôi

Bỏ vào `Downloads/ho-phu-art/2-5d/` đúng tên trong tài liệu này rồi báo tôi.
Tôi lo phần còn lại: xoá nền nếu cần, nén, nối vào art manifest, và dựng bản
đồ 2.5D.

Chưa có ảnh thì bản đồ vẫn chạy được bằng lớp mực CSS, giống cơ chế dự phòng
hiện tại — nên bạn không cần vội.
