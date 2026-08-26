> **Ghi chú rebrand:** Đây là tài liệu lịch sử của giai đoạn trước STOIC · IELTS. Đặc tả hiện hành nằm tại [STOIC-REBRAND-SPEC.md](./STOIC-REBRAND-SPEC.md), [BRAND-GUIDELINE.md](./BRAND-GUIDELINE.md) và [ART-ASSET-REGISTER.md](./ART-ASSET-REGISTER.md).

# HO PHU · IELTS — Bản đặt hàng ảnh cho Gemini / Midjourney

Nguồn quy tắc: Master System Specification v1.1, muc 8 (Brand Art Bible).
Tong so anh can tao: **29**. Chia 4 nhom theo do uu tien.

> **Quy tac song con:** anh KHONG duoc chua bat ky ky tu chu Han nao.
> Model sinh anh gan nhu luon tu ve them chu Han gia khi ve tranh thuy mac.
> Bat buoc kiem tra tung anh va loai bo ngay neu thay ky tu la.

---

## 0. Cach dung tai lieu nay

1. Copy **Negative prompt chuan** (muc 1) mot lan, dan vao moi lan tao anh.
2. Copy prompt cua tung anh o muc 2-5.
3. Tao **4 phuong an** cho moi anh. Khong chon anh chi vi "dep" — phai dung art bible.
4. Loai ngay anh co: ky tu chu Han, chu AI nguech ngoac, giap sai van hoa (samurai Nhat,
   giap chau Au), loi giai phau (tay thua ngon, ngua thua chan), giong dien vien phim,
   hoac nhieu hon mot mau accent.
5. Dat ten file **dung y het** cot "Ten file" — code se doc theo ten nay.

### Ky thuat

| Cong cu | Cach dat ty le |
|---|---|
| Midjourney | Them `--ar 16:9` (hoac `--ar 4:5`, `--ar 21:9`, `--ar 1:1`) vao cuoi prompt |
| Gemini | Khong co tham so ty le — mo ta trong cau, roi crop lai khi hau ky |

Anh goc xuat kich thuoc lon nhat co the. Viec nen xuong WebP dung dung luong
la viec cua toi, ban khong can lo.

---

## 1. Negative prompt chuan — dan vao MOI anh

```
photorealistic, 3D render, anime, modern clothing, firearms, gore, horror,
cyberpunk neon, multiple accent colors, busy background, extra limbs,
malformed hands, cloned horses, actor likeness, movie costume likeness,
game UI, watermark, logo, gibberish text, Chinese characters, Hanzi, Kanji,
calligraphy glyphs, character seal text
```

## 1b. Bang mau accent — dung dung ma mau

Doi chieu voi `src/lib/brand/art-manifest.ts` — day la ma mau **that** trong code,
khong phai ma mau uoc luong.

| Ten Viet | Ma mau | Ma accent trong code | Mo ta tieng Anh dung trong prompt |
|---|---|---|---|
| Lam dien | `#3A7FC4` | `BLUE` | vivid electric blue |
| Chu sa | `#A33A2B` | `VERMILION` | deep vermilion red |
| Kim dong | `#B8862B` | `GOLD` | warm antique gold |
| Luc ngoc | `#2E6B4F` | `JADE` | deep jade green |
| Bac lam | `#7D97AC` | `SILVER_BLUE` | muted silver-blue |
| Hoa cam | `#C2591F` | `FIRE` | burnt orange |
| Muc navy | `#1E3A5C` | `INK` | deep ink navy |
| Tro | `#77736C` | `ASH` | muted ash grey |

> **Chi co dung TAM accent nay.** Code khong ho tro mau nao khac
> (`ACCENT_WASH_CLASS` trong art-manifest.ts). Dac ta muc 8.9 co nhac "do dao" va
> "vang ochre" cho cua ai 1 va 2, nhung manifest da chot lai thanh **chu sa** va
> **kim dong**. Lam theo manifest.

---

## 2. NHOM A — Bat buoc, lam truoc (7 anh)

Day la nhom toi can de dung PR-02. Khong co nhom nay thi khong rap duoc giao dien.

| # | Ten file | Thu muc | Ty le | Kich thuoc goc |
|---|---|---|---|---|
| A1 | `trieu-van-hero.webp` | `public/art/home/` | 16:9 | 2048x1152 |
| A2 | `truong-phi.webp` | `public/art/generals/` | 4:5 | 1200x1500 |
| A3 | `quan-vu.webp` | `public/art/generals/` | 4:5 | 1200x1500 |
| A4 | `trieu-van.webp` | `public/art/generals/` | 4:5 | 1200x1500 |
| A5 | `hoang-trung.webp` | `public/art/generals/` | 4:5 | 1200x1500 |
| A6 | `ma-sieu.webp` | `public/art/generals/` | 4:5 | 1200x1500 |
| A7 | `lu-bo.webp` | `public/art/generals/` | 4:5 | 1200x1500 |

### A1 — Hero trang chu (Trieu Van)

Anh quan trong nhat cua ca website. Phai chua khoang trong ben trai de dat chu.

```
A traditional Chinese ink wash painting on textured rice paper, depicting Zhao Yun
riding a white warhorse at full charge across a battlefield. Detailed historically
inspired Chinese lamellar scale armor, a long flowing cape and horse mane create
strong diagonal movement. The scene is rendered primarily in black ink and soft gray
washes on warm ivory paper. A single vivid electric blue energy effect is concentrated
along the tip and shaft of his spear only. Strong black ink splashes follow the
direction of motion at the horse hooves. The background shows misty mountains and
distant soldiers with banners in minimal washed-out strokes. The subject is positioned
in the RIGHT THIRD of the frame, leaving the entire left half as clean empty rice paper
negative space for Vietnamese text to be added later in Latin script. Include a small
abstract vermilion seal shape with no characters in a bottom corner. Heroic, restrained,
ancient-master feeling, cinematic diagonal composition, visible paper texture,
no generated text and no Chinese characters. --ar 16:9
```

### A2 — Truong Phi (chan dung)

Vai tro: Nguoi mo tran. Nang luc: dam bat dau, quyet doan, quan ly ap luc thoi gian.

```
A traditional Chinese ink wash painting on textured rice paper, a waist-up portrait of
Zhang Fei standing with a serpent spear planted in the ground, fierce and resolute
expression, thick beard, broad shoulders. Detailed historically inspired Chinese scale
armor with a heavy shoulder guard; fabric and beard show wind movement. Rendered
primarily in black ink and soft gray washes on warm ivory paper. A single deep vermilion
red energy accent glows faintly along the spear blade only. Black ink splashes behind
the figure suggest force. Background is minimal washed-out mist with a faint war banner
silhouette. Leave clean negative space at the bottom for Vietnamese text in Latin script.
Include a small abstract vermilion seal shape with no characters. Heroic, restrained,
ancient-master feeling, visible paper texture, no generated text and no Chinese
characters. --ar 4:5
```

### A3 — Quan Vu (chan dung)

Vai tro: Nguoi giu chinh dao. Nang luc: bam bang chung, nhat quan, liem chinh.

```
A traditional Chinese ink wash painting on textured rice paper, a waist-up portrait of
Guan Yu standing calm and upright, holding a long-handled crescent blade at rest, long
flowing beard, dignified and composed expression. Detailed historically inspired Chinese
scale armor beneath a long robe. Rendered primarily in black ink and soft gray washes on
warm ivory paper. A single jade green energy accent glows softly along the blade edge
only. Restrained ink splashes, minimal motion. Background is quiet washed-out mist with
a distant gate silhouette. Leave clean negative space at the bottom for Vietnamese text
in Latin script. Include a small abstract vermilion seal shape with no characters.
Solemn, upright, ancient-master feeling, visible paper texture, no generated text and
no Chinese characters. --ar 4:5
```

### A4 — Trieu Van (chan dung)

Vai tro: Nguoi giu binh tinh giua tran. Nang luc: chinh xac duoi ap luc.

```
A traditional Chinese ink wash painting on textured rice paper, a waist-up portrait of
Zhao Yun in silver-toned lamellar armor, young and composed, holding a straight spear
upright, cape lifted by wind, steady focused gaze. Rendered primarily in black ink and
soft gray washes on warm ivory paper. A single vivid electric blue energy accent traces
the spear tip only. Light ink splashes suggest contained speed. Background is misty
mountains in minimal washed-out strokes. Leave clean negative space at the bottom for
Vietnamese text in Latin script. Include a small abstract vermilion seal shape with no
characters. Calm, heroic, ancient-master feeling, visible paper texture, no generated
text and no Chinese characters. --ar 4:5
```

### A5 — Hoang Trung (chan dung)

Vai tro: Nguoi chung minh suc ben. Nang luc: luyen tap dai han, tien bo muon nhung chac.

```
A traditional Chinese ink wash painting on textured rice paper, a waist-up portrait of
Huang Zhong as a veteran elder archer, white beard and weathered face, drawing a large
bow with steady disciplined form. Detailed historically inspired Chinese scale armor,
worn and practical rather than ornate. Rendered primarily in black ink and soft gray
washes on warm ivory paper. A single warm antique gold energy accent glows along the
bowstring and arrow only. Minimal ink splashes. Background is a washed-out mountain
ridge at dawn. Leave clean negative space at the bottom for Vietnamese text in Latin
script. Include a small abstract vermilion seal shape with no characters. Patient,
enduring, ancient-master feeling, visible paper texture, no generated text and no
Chinese characters. --ar 4:5
```

### A6 — Ma Sieu (chan dung)

Vai tro: Nguoi pha the bang bien hoa. Nang luc: thich nghi, chuyen chien thuat.

```
A traditional Chinese ink wash painting on textured rice paper, a waist-up portrait of
Ma Chao in light cavalry armor with a fur-trimmed collar, sharp alert expression, spear
held across the body mid-turn as if changing direction. Detailed historically inspired
Chinese armor with northwestern frontier styling. Rendered primarily in black ink and
soft gray washes on warm ivory paper. A single muted silver-blue energy accent arcs along
the spear path only. Sharp angular ink splashes suggest a sudden change of direction.
Background is windswept washed-out plains. Leave clean negative space at the bottom for
Vietnamese text in Latin script. Include a small abstract vermilion seal shape with no
characters. Agile, unpredictable, ancient-master feeling, visible paper texture, no
generated text and no Chinese characters. --ar 4:5
```

### A7 — Lu Bo (chan dung)

Vai tro: Doi thu phan chieu thien phu. **Khong ve nhu chuan muc dao duc** — phai co cam
giac thu thach, nguy hiem, kieu ngao.

```
A traditional Chinese ink wash painting on textured rice paper, a waist-up portrait of
Lu Bu as a formidable opponent, tall and imposing in ornate heavy armor with a tall
plumed headdress, holding a large halberd, proud and dangerous expression. Detailed
historically inspired Chinese armor, more decorated than the other generals. Rendered
primarily in black ink and soft gray washes on warm ivory paper. A single burnt orange
energy accent burns along the halberd blade only. Aggressive ink splashes radiate
outward. Background is dark washed-out storm clouds over a fortress gate. Leave clean
negative space at the bottom for Vietnamese text in Latin script. Include a small
abstract vermilion seal shape with no characters. Intimidating, magnificent but
undisciplined, ancient-master feeling, visible paper texture, no generated text and no
Chinese characters. --ar 4:5
```

---

## 3. NHOM B — Tam cua ai (8 anh)

Tat ca 16:9, kich thuoc goc 1600x900, thu muc `public/art/trials/`.
Noi dung lay tu muc 8.9 cua dac ta.

| # | Ten file | Chu the | Accent |
|---|---|---|---|
| B1 | `trial-01-dao-vien.webp` | Truong Phi va Quan Vu duoi rung dao | Chu sa |
| B2 | `trial-02-hoang-can.webp` | Truong Phi xong qua co vang | Kim dong |
| B3 | `trial-03-hoa-hung.webp` | Quan Vu lao nhanh, dao phat sang | Luc ngoc |
| B4 | `trial-04-ngu-quan.webp` | Quan Vu di xuyen nhieu lop cong thanh | Chu sa |
| B5 | `trial-05-truong-ban.webp` | Trieu Van tren ngua trang | Lam dien |
| B6 | `trial-06-hoang-trung.webp` | Hoang Trung giuong cung tren ngua | Vang kim |
| B7 | `trial-07-ma-sieu.webp` | Ma Sieu dot kich | Bac lam |
| B8 | `trial-08-lu-bo.webp` | Lu Bo doi thu cuoi | Hoa cam |

### B1 — Dao vien ket nghia

```
A traditional Chinese ink wash painting on textured rice paper, showing exactly TWO
warriors, Zhang Fei and Guan Yu, standing together beneath blossoming peach trees at
the moment of making a solemn vow. Detailed historically inspired Chinese armor.
Rendered primarily in black ink and soft gray washes on warm ivory paper. A single deep
vermilion red accent appears only in the falling peach petals. Gentle ink splashes.
Only two figures — do not add a third central character. Background is a washed-out
orchard and low hills. Leave a clean negative-space area on one side for Vietnamese text
in Latin script. Include a small abstract vermilion seal shape with no characters.
Quiet, hopeful, a beginning; ancient-master feeling, cinematic composition, visible
paper texture, no generated text and no Chinese characters. --ar 16:9
```

### B2 — Truong Phi pha Hoang Can

```
A traditional Chinese ink wash painting on textured rice paper, depicting Zhang Fei
charging on horseback through a line of tattered yellow war banners in a downpour of
ink. Detailed historically inspired Chinese scale armor, cape and banners torn by wind.
Rendered primarily in black ink and soft gray washes on warm ivory paper. A single warm
antique gold accent appears only on the enemy banners. Heavy black ink splashes fall like rain
along the charge line. Emphasize courage and forward momentum, not direct violence — no
blood, no wounded bodies. Background is a washed-out chaotic camp. Leave a clean
negative-space area on one side for Vietnamese text in Latin script. Include a small
abstract vermilion seal shape with no characters. Ancient-master feeling, cinematic
diagonal composition, visible paper texture, no generated text and no Chinese
characters. --ar 16:9
```

### B3 — Quan Vu on tuu tram Hoa Hung

```
A traditional Chinese ink wash painting on textured rice paper, depicting Guan Yu
riding forward at extreme speed, his long crescent blade sweeping in a single decisive
arc, long beard streaming behind him. Detailed historically inspired Chinese scale armor
under a flowing robe. Rendered primarily in black ink and soft gray washes on warm ivory
paper. A single warm jade green glow traces the blade arc only. Sharp ink splashes follow
the weapon path. Emphasize speed and precision, not gore — no blood, no severed bodies.
Background is a washed-out army camp with a wine cup left on a table in the foreground
mist. Leave a clean negative-space area on one side for Vietnamese text in Latin script.
Include a small abstract vermilion seal shape with no characters. Ancient-master feeling,
cinematic composition, visible paper texture, no generated text and no Chinese
characters. --ar 16:9
```

### B4 — Quan Vu qua ngu quan

```
A traditional Chinese ink wash painting on textured rice paper, depicting Guan Yu on
horseback riding steadily through a receding series of five ancient fortress gates, each
gate smaller and mistier than the last, creating strong perspective depth. Detailed
historically inspired Chinese scale armor and long robe. Rendered primarily in black ink
and soft gray washes on warm ivory paper. A single deep vermilion red accent marks only
the gate lanterns receding into the distance. Restrained ink splashes. Show perseverance
across distance, not direct combat — no blood, no fighting. Background is washed-out
walls and mist. Leave a clean negative-space area on one side for Vietnamese text in
Latin script. Include a small abstract vermilion seal shape with no characters.
Ancient-master feeling, deep perspective composition, visible paper texture, no
generated text and no Chinese characters. --ar 16:9
```

### B5 — Trieu Van don ky cuu chua

Anh nay lay cam hung tu anh mau chu du an cung cap. **Khong sao chep y het bo cuc.**

```
A traditional Chinese ink wash painting on textured rice paper, depicting Zhao Yun alone
on a white warhorse breaking through a dense enemy formation, one arm shielding a
bundle held close to his chest, spear extended forward. Detailed historically inspired
Chinese lamellar armor, cape and horse mane in violent motion. Rendered primarily in
black ink and soft gray washes on warm ivory paper. A single vivid electric blue energy
crackles along the spear only. Powerful black ink splashes explode at the horse hooves.
Surrounding soldiers are washed-out silhouettes, not detailed. Leave a clean
negative-space area on one side for Vietnamese text in Latin script. Include a small
abstract vermilion seal shape with no characters. Desperate courage under pressure,
ancient-master feeling, cinematic diagonal composition, visible paper texture, no
generated text and no Chinese characters. --ar 16:9
```

### B6 — Hoang Trung lao tuong khai cung

```
A traditional Chinese ink wash painting on textured rice paper, depicting Huang Zhong as
an elder general on horseback drawing a great bow to full draw, white beard and cape
pulled by strong wind, absolutely steady posture. Detailed historically inspired Chinese
scale armor, practical and worn. Rendered primarily in black ink and soft gray washes on
warm ivory paper. A single warm antique gold accent glows along the drawn bowstring and
arrow only. Sparse controlled ink splashes. Background is a washed-out ridge at first
light. Leave a clean negative-space area on one side for Vietnamese text in Latin script.
Include a small abstract vermilion seal shape with no characters. Endurance and precision
earned over time, ancient-master feeling, visible paper texture, no generated text and no
Chinese characters. --ar 16:9
```

### B7 — Ma Sieu thiet ky Tay Luong

```
A traditional Chinese ink wash painting on textured rice paper, depicting Ma Chao leading
a fast cavalry raid across open windswept plains, his spear carving a bright circular arc
as he changes direction mid-charge. Detailed historically inspired Chinese armor with
northwestern frontier styling and fur trim. Rendered primarily in black ink and soft gray
washes on warm ivory paper. A single muted silver-blue accent forms the circular spear
trail only. Sharp angular ink splashes scatter along the turn. Background is washed-out
dust and distant riders. Leave a clean negative-space area on one side for Vietnamese
text in Latin script. Include a small abstract vermilion seal shape with no characters.
Adaptability and sudden change of tactics, ancient-master feeling, cinematic diagonal
composition, visible paper texture, no generated text and no Chinese characters. --ar 16:9
```

### B8 — Lu Bo Ho Lao quyet chien

Phai co cam giac **thu thach cuoi cung**, khong ca tung suc manh thieu ky luat.

```
A traditional Chinese ink wash painting on textured rice paper, depicting Lu Bu mounted
on a powerful red warhorse before the towering Hu Lao pass gate, halberd raised, facing
the viewer as a final opponent. Ornate heavy historically inspired Chinese armor with a
tall plumed headdress. Rendered primarily in black ink and soft gray washes on warm ivory
paper. A single burnt orange energy burns along the halberd blade only. Violent black ink
splashes radiate outward from the figure. Background is a washed-out fortress gate under
storm clouds. The mood is a daunting final test, not a celebration of the character.
Leave a clean negative-space area on one side for Vietnamese text in Latin script.
Include a small abstract vermilion seal shape with no characters. Ancient-master feeling,
imposing frontal composition, visible paper texture, no generated text and no Chinese
characters. --ar 16:9
```

---

## 4. NHOM C — Ban do va the cap bac (10 anh)

> **Doc ky truoc khi tao nhom nay.** Trong `art-manifest.ts` hien chi co **nen ban do
> (C0)**. Chin the cap bac C1-C9 **chua duoc khai bao trong code** — chung se duoc them
> o PR-05 (ban do Chien Dich). Tao truoc cung duoc, nhung neu ban muon tiet kiem cong
> thi **hoan nhom nay lai** cho toi khi PR-05 chot xong bo cuc the cap bac.

Lam sau nhom A va B. Chua can cho PR-02.

### C0 — Nen ban do Chien Dich

`public/art/campaign/map-loan-the-quan-hung-tam-phan.webp` — 21:9, 2520x1080.

Day la **anh nen**, khong co nhan vat. Cac node cua ai se duoc code ve de len tren.
Bo cuc phai di tu **goc duoi trai** len **goc tren phai** theo toa do trong dac ta.

```
A traditional Chinese ink wash landscape painting on textured rice paper, a wide
panoramic ancient war map view. The terrain rises from a low chaotic river plain in the
BOTTOM LEFT, through rolling hills and fortress walls in the middle, up to high solitary
mountain peaks in the TOP RIGHT. Rendered almost entirely in black ink and soft gray
washes on warm ivory paper, 90 percent monochrome. A single faint antique gold accent
appears only in a thin winding road connecting the low plain to the high peaks. Sparse
ink splashes. No people, no central figure, no text, no labels, no map markers. Keep the
whole surface calm and uncluttered so interface elements can be placed on top. Include a
small abstract vermilion seal shape with no characters in one corner. Vast, quiet,
ancient-master feeling, visible paper texture, no generated text and no Chinese
characters. --ar 21:9
```

### C1-C9 — Chin the cap bac

Thu muc `public/art/ranks/`, ty le 4:5, kich thuoc goc 1200x1500.

| # | Ten file | Cap | Thoi dai | Accent |
|---|---|---|---|---|
| C1 | `rank-01-bach-than.webp` | Bach than | Loan the | Muc navy |
| C2 | `rank-02-nghia-binh.webp` | Nghia binh | Loan the | Muc navy |
| C3 | `rank-03-thap-truong.webp` | Thap truong | Loan the | Muc navy |
| C4 | `rank-04-do-ba.webp` | Do ba | Quan hung | Kim dong nhat |
| C5 | `rank-05-nha-tuong.webp` | Nha tuong | Quan hung | Kim dong nhat |
| C6 | `rank-06-hieu-uy.webp` | Hieu uy | Quan hung | Kim dong |
| C7 | `rank-07-trung-lang-tuong.webp` | Trung lang tuong | Tam phan | Chu sa |
| C8 | `rank-08-tu-phuong-tuong-quan.webp` | Tu phuong tuong quan | Tam phan | Chu sa + kim |
| C9 | `rank-09-dai-tuong-quan.webp` | Dai tuong quan | Tam phan | Chu sa + kim |

**Prompt khung** — thay `[TRANG BI]` va `[ACCENT]` theo bang duoi:

```
A traditional Chinese ink wash painting on textured rice paper, a symbolic still-life
composition of [TRANG BI] arranged on a plain surface, with no human figure present.
Rendered primarily in black ink and soft gray washes on warm ivory paper. A single
[ACCENT] accent highlights one small focal detail only. Minimal ink splashes. Background
is empty washed-out paper. Centered, quiet, museum-object feeling. Include a small
abstract vermilion seal shape with no characters. Ancient-master feeling, visible paper
texture, no generated text and no Chinese characters. --ar 4:5
```

| # | `[TRANG BI]` |
|---|---|
| C1 | a plain undyed cloth robe folded beside a simple walking staff |
| C2 | a coarse militia tunic with a single short sword |
| C3 | a leather chest guard with a small squad banner rolled up |
| C4 | a bronze rank tally beside a cavalry whip |
| C5 | a lacquered shoulder guard with an officer sash |
| C6 | a full lamellar cuirass on a wooden stand with a seal box |
| C7 | an ornate helmet with a command tablet and brush |
| C8 | four small directional banners arranged around a general helmet |
| C9 | a great commander helmet, a tiger tally split in two halves, and a war drum |

> Luu y C9: "tiger tally split in two halves" chinh la **ho phu** — bieu tuong trung tam
> cua thuong hieu. Anh nay quan trong, nen tao nhieu phuong an hon.

---

## 5. NHOM D — Huy hieu va texture (4 anh)

> **Chua co trong code.** Ba huy hieu Nguyet Thi va texture giay gao chua duoc khai bao
> trong `art-manifest.ts`. Van giay gao hien dang duoc ve bang CSS gradient
> (`.paper-grain` trong `globals.css`) va chay tot — anh D4 chi can neu ban thay van
> CSS chua du dep. **Uu tien thap nhat.**

### D1-D3 — Ba huy hieu Nguyet Thi

Thu muc `public/art/badges/`, ty le 1:1, 1024x1024, **nen trong suot (PNG)**.

| # | Ten file | Hang | Accent |
|---|---|---|---|
| D1 | `monthly-crown.png` | Hang nhat | Bac trang / indigo |
| D2 | `monthly-chancellor-silver.png` | Hang nhi | Bac |
| D3 | `monthly-general-ash.png` | Hang ba | Tro |

```
A traditional Chinese ink wash emblem on a fully transparent background, a single
centered circular medallion formed by [HINH DANG]. Rendered in black ink and soft gray
washes with a [ACCENT] accent on one detail only. The emblem must be perfectly centered,
symmetrical, and isolated with nothing else in the frame. No background, no paper, no
frame border, no text, no characters of any kind. Clean edges suitable for cutting out.
--ar 1:1
```

| # | `[HINH DANG]` | `[ACCENT]` |
|---|---|---|
| D1 | an ancient crown ringed by stylized ink clouds | moonlit silver over indigo |
| D2 | a scholar official cap ringed by a laurel of ink strokes | pale silver |
| D3 | a war helmet ringed by crossed spears | muted ash grey |

### D4 — Texture giay gao

`public/textures/rice-paper-subtle.webp` — lien mach (seamless), khong nhan vat.

```
A seamless tileable texture of warm ivory handmade rice paper, showing subtle visible
fibers, gentle uneven tone, and very faint natural mottling. Extremely subtle and low
contrast so that dark text remains fully readable on top. Flat even lighting, no
shadows, no objects, no ink, no text, no characters, no border. --ar 1:1
```

---

## 6. Nhung thu KHONG duoc dung AI sinh

| File | Ly do | Cach lam dung |
|---|---|---|
| `public/brand/ho-phu-mark.svg` | Logo phai la vector sac net, 3 khac rang cua phai chinh xac theo muc 2.3 | Thiet ke tay trong Figma/Illustrator, xuat SVG |
| `public/brand/seals/*` | Con dau phai la hoa tiet truu tuong, khong ky tu | Ve vector don gian |
| Moi lop chu tren anh | Dac ta muc 8.4 cam dung chu do AI sinh | Them lop chu tieng Viet trong Figma sau khi anh nen duoc duyet |

---

## 7. Checklist duyet tung anh

Truoc khi giao file cho toi, kiem tra tung muc:

- [ ] Khong co bat ky ky tu chu Han nao — ke ca trong con dau, tren co, tren ao giap
- [ ] Khong co chu AI nguech ngoac o bat cu dau
- [ ] Chi co **mot** mau accent, va dung ma mau trong bang muc 1b
- [ ] Giap tru mang phong cach Trung Hoa co dai, khong phai samurai Nhat hay giap chau Au
- [ ] Tay du 5 ngon, ngua du 4 chan, khong thua chi
- [ ] Khong giong mat dien vien phim Tam Quoc nao
- [ ] Co vung trong de dat chu tieng Viet (tru nhom D)
- [ ] Nen giay gao con thay ro van giay, khong bi phang li nhu anh ky thuat so

## 8. Cach giao file cho toi

Tao thu muc bat ky (vi du `Downloads/ho-phu-art/`), dat file **dung ten** trong tai lieu
nay, roi bao toi duong dan. Toi se lo phan con lai: nen WebP, tao ban 960w/768w, viet
`art-manifest.ts`, alt text tieng Viet, focal point va blur placeholder.

Khong can ban tu nen anh hay doi duoi file.
