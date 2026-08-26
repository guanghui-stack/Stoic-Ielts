# Sổ đăng ký asset STOIC · IELTS

Mỗi tài sản production phải có một dòng trong bảng dưới đây trước khi được merge. Nguồn sự thật về đường dẫn, tỷ lệ, điểm lấy nét và accent là `src/lib/brand/art-manifest.ts`.

## Trạng thái hiện tại

Bộ asset rebrand hiện hành dùng SVG deterministic, tự tạo trong repo và không phụ thuộc API tạo ảnh/video bên ngoài. Asset không chứa chữ, không chứa ký tự chữ Hán, không có watermark và có safe area để nội dung HTML nằm riêng trong DOM.

Cơ chế dự phòng khi asset không tải được vẫn giữ nguyên: component hiển thị lớp wash theo accent, mọi nội dung chữ vẫn nằm trong DOM và route không bị trắng hoặc mất ngữ nghĩa.

## Bảng đăng ký

| Khóa manifest | File | Vai trò | Accent | Tỷ lệ | Alt | Phiên bản |
|---|---|---|---|---|---|---|
| `homeTrieuVan` | `art/stoic/control-circle-hero.svg` | Hero vòng tròn kiểm soát | Violet | 16:9 | Các vòng tròn mở tượng trưng cho sự tập trung và lựa chọn trong hành trình học | 1 |
| `generalTrieuVan` | `art/stoic/quiet-orbit.svg` | Quỹ đạo phản tư | Violet | 16:9 | Quỹ đạo yên tĩnh quanh một điểm tập trung | 1 |
| `generalTruongPhi` | `art/stoic/quiet-orbit.svg` | Quỹ đạo phản tư | Ruby | 16:9 | Quỹ đạo yên tĩnh quanh một điểm tập trung | 1 |
| `generalQuanVu` | `art/stoic/quiet-orbit.svg` | Quỹ đạo phản tư | Sage | 16:9 | Quỹ đạo yên tĩnh quanh một điểm tập trung | 1 |
| `generalHoangTrung` | `art/stoic/quiet-orbit.svg` | Quỹ đạo phản tư | Violet | 16:9 | Quỹ đạo yên tĩnh quanh một điểm tập trung | 1 |
| `generalMaSieu` | `art/stoic/quiet-orbit.svg` | Quỹ đạo phản tư | Slate blue | 16:9 | Quỹ đạo yên tĩnh quanh một điểm tập trung | 1 |
| `generalLuBo` | `art/stoic/quiet-orbit.svg` | Quỹ đạo phản tư | Sherbet | 16:9 | Quỹ đạo yên tĩnh quanh một điểm tập trung | 1 |
| `territoryBase`, `territoryWei`, `territoryShu`, `territoryWu` | `art/stoic/three-virtues.svg` | Ba trụ và vùng giao nhau | Ink / Sage / Ruby | 16:9 | — | 1 |
| `campaignMap` | `art/stoic/three-virtues.svg` | Minh họa hành trình ba trụ | Ink | 21:9 | — | 1 |
| `trialDaoVien` … `trialHoLao` | `art/stoic/three-virtues.svg` | Minh họa các chặng thử thách | Theo module | 16:9 | Ba quỹ đạo gặp nhau tạo thành một hệ cân bằng | 1 |
| — | `src/app/icon.svg` | Favicon vòng tròn kiểm soát | Violet / Ruby | 1:1 | — | 1 |

## Prompt khung cho asset Stoic

> Editorial geometric illustration for a Vietnamese IELTS learning platform, centered on a control-circle metaphor: one calm focal point with two or three open orbital rings around it, soft organic gradient mesh, generous negative space for HTML copy, restrained premium product-design feeling, pale warm canvas, deep ink navy, one primary violet accent with optional ruby or sage secondary point, clean vector geometry, accessible contrast, no words, no letters, no symbols that resemble writing, no watermark, no logo, no UI screenshot, no photorealism, no 3D character.

### Prompt hero

> Wide 16:9 hero illustration, open concentric control circles placed on the right two-thirds, quiet center point, soft lavender and warm sherbet mesh, clear calm negative space on the left for Vietnamese headline, modern editorial learning product, subtle depth without visual noise, no text.

### Prompt quỹ đạo

> 4:3 or 16:9 quiet orbit illustration, dark ink canvas or pale canvas variant, three thin elliptical rings around a luminous focus point, one small accent node per orbit, generous breathing room, reflective and precise rather than mystical, no text.

### Prompt ba trụ

> Wide editorial diagram-like illustration with three overlapping circular fields meeting around a shared center, violet, ruby and sage accents, clean grid hints, gentle shadows, balanced composition, suitable for a learning platform section, no text and no labels.

## Prompt âm bản

> text, letters, typography, glyphs, Chinese characters, Hanzi, Kanji, calligraphy, watermark, logo, UI, dashboard screenshot, photorealistic, 3D render, anime, fantasy armor, weapon, gore, horror, neon cyberpunk, noisy background, excessive colors, malformed geometry, broken circles, illegible symbols.

## Quy tắc kiểm duyệt

1. Asset phải có một điểm tập trung rõ ràng, không tranh chấp sự chú ý với nội dung HTML.
2. Mọi chữ phải nằm trong DOM; tuyệt đối không dùng chữ được sinh bên trong hình.
3. Mỗi asset phải có alt tiếng Việt nếu mang thông tin; ảnh trang trí dùng alt rỗng.
4. Asset phải có fallback bằng CSS và không được làm hỏng layout khi tải thất bại.
5. Animation của asset chỉ được bật ở route tier 1–2; route tier 0 protected không nhận animation mới.
6. SVG không được chứa external reference hoặc script; chỉ dùng shape, gradient và filter cục bộ.

## Ngân sách

| Loại asset | Đầu ra | Dung lượng mục tiêu |
|---|---|---|
| Hero SVG | 1600×900, vector responsive | Dưới 30 KB |
| Orbit SVG | 1200×900, vector responsive | Dưới 20 KB |
| Ba trụ SVG | 1200×760, vector responsive | Dưới 20 KB |
| Favicon SVG | 64×64 viewBox | Dưới 5 KB |
