# Bản ghi bàn giao — hệ HỔ PHÙ · IELTS

Nhánh: `feature/campaign-map-home` (đã push). PR-01→09a đã ở `main`.
Nguồn: Master System Specification v1.1 (`Ho_Phu_IELTS_Tam_Quoc_Master_System_Spec_v1_1.docx`)
Cập nhật: 06/08/2026

Đọc mục 1 và mục 3 trước, đó là hai mục quyết định bạn nên làm gì tiếp.

---

## 1. Trạng thái theo chuỗi chín PR

| PR | Nội dung | Trạng thái |
|---|---|---|
| PR-01 | Brand core, quy tắc không chữ Hán | Xong, đã ở `main` |
| PR-02 | Hệ thiết kế thủy mặc, art manifest, 16 ảnh | Xong, đã ở `main` |
| PR-03 | Rank data model | Xong, đã ở `main` |
| PR-04 | Rank engine + giao diện cấp bậc | Xong, đã ở `main` |
| PR-05 | Bản đồ Chiến Dịch | Xong, đã ở `main` |
| PR-06 | Nhãn Tam Quốc, điều hướng học viên | Xong, đã ở `main` |
| PR-07 | Tam tầng đại thí | **Xong**, trên nhánh này |
| PR-08 | Tài liệu QA | Một phần — chính là tài liệu này |
| PR-09 | Liêm chính và consent | **Chặn** — xem mục 5 |

## 2. Bản đồ Chiến Dịch trên trang chủ

`components/campaign/campaign-home-block.tsx` đưa bản đồ ra trang chủ. Khách
chưa đăng nhập thấy bản giới thiệu với cửa đầu mở sẵn — cố ý KHÔNG bịa ra cửa
nào "đã vượt" cho đẹp, vì người mới sẽ hụt hẫng khi đăng ký xong thấy khác.
Người đã đăng nhập thấy tiến độ thật.

### Đã thử 2.5D rồi bỏ (06/08/2026)

Có một nhánh thử dựng bản đồ theo phong cách 2.5D: mặt đất nghiêng 52 độ bằng
CSS perspective, nhân vật là ảnh cắt rời xoay ngược để đứng dậy, parallax theo
chuột. **Chủ dự án đã quyết định bỏ hướng đó** và quay về 2D phẳng cho hợp
phong cách thủy mặc.

Ghi lại để phiên sau không đề xuất lại: vấn đề không phải kỹ thuật — nó chạy
được và đã kiểm chứng. Vấn đề là 2.5D kéo thiết kế về phía game, trong khi
toàn bộ hệ hình ảnh của dự án là tranh thủy mặc phẳng. Toàn bộ mã 2.5D đã gỡ.

## 3. Việc còn lại

**Chỉ còn PR-09** — liêm chính và consent, đang chặn vì cần quyết định pháp lý
của chủ dự án. Xem mục 5.

Toàn bộ khu quản trị đã xong:

| Trang | Nội dung |
|---|---|
| `/quan-tri/cap-bac` | §11.1 — phân bố cấp bậc, thống kê tám cửa ải, hoạt động gần nhất |
| `/quan-tri/cap-bac/[userId]` | Hành trình đầy đủ một học viên, để trả lời "vì sao em chưa lên cấp" |
| `/quan-tri/hinh-anh` | §11.2 — kiểm kho ảnh, bắt file thiếu và ảnh vượt trần |
| `/quan-tri/tuyen-chon` | §11.4 — nguồn tuyển chọn, không có nút thêm thí sinh tuỳ ý |

Việc nhỏ có thể làm sau: bảng Nguyệt Thí cũ chưa có `seasonKey` đúng định dạng
nên nếu muốn dùng chúng làm kỳ nguồn thật thì phải điền tay ở trang Cuộc thi.

## 3. Phần CHƯA được nhìn tận mắt

Đọc kỹ mục này trước khi tin vào giao diện.

**Đã kiểm chứng thật:**

- Toàn bộ luồng cấp bậc trên MySQL: người mới → khởi thí luyện → phục bàn
  miễn phí → thăng bậc 2. Chín nhóm phép thử ở `npm run test:rank-engine`.
- Chốt chặn tuyển chọn: 16 phép thử ở `npm run test:qualification-db`.
- Raw DDL dựng đủ 47 bảng khớp 47 model (`npm run check:db`).
- Giao diện cấp bậc và bản đồ qua `/xem-thu-cap-bac`, gồm cả 375px và aria-label.
- `/duong-thi`, `/thien-thi`, ba tab Bảng Vàng — render thật, đúng số liệu.
- Tầng dữ liệu trang quản trị tuyển chọn: với dữ liệu mẫu cho ra 9 vé,
  6 ghế bỏ trống, 9 người bị loại kèm lý do theo từng ngưỡng band.

- Sổ Sơ Hở và Nhật Khóa: 15 phép thử ở `npm run test:student-pages`, gồm cả
  việc `loadRankFacts` chấm lại bài để suy ra thống kê theo dạng câu.
- Kho ảnh: 16 ảnh khai báo, 0 thiếu file, 0 vượt trần, tổng 2249 KB.

**Chưa nhìn tận mắt — toàn bộ khu quản trị:**

Bốn trang quản trị đều đòi đăng nhập admin, và tôi không nhập mật khẩu vào
biểu mẫu — kể cả tài khoản demo cục bộ. **Tầng dữ liệu của cả bốn trang đã
kiểm bằng script với dữ liệu thật**, nên rủi ro còn lại chỉ là bố cục và cách
trình bày. Bạn đăng nhập xem là đủ.

Cũng chưa chạy thật: luồng bấm nút "Sinh vé tuyển chọn" từ giao diện, và trang
chi tiết cửa ải với dữ liệu thật.

## 4. Cách xem hệ thống chạy trên máy

```bash
npm run seed:demo
```

Tạo một học viên đã đi được nửa hành trình (tự lên bậc 2 qua engine thật, không
ghi tay), 25 ngày học thật, và một kỳ Dương Thí đã gắn đủ ba kỳ Nguyệt Thí đã
chốt. Chạy lại được nhiều lần, tự dọn dữ liệu demo cũ.

Tài khoản: `hoc-vien-demo-tam-quoc@local.test` · mật khẩu `demo1234`

```bash
npm run dev
```

| Đường dẫn | Xem gì |
|---|---|
| `/xem-thu-cap-bac` | Mọi trạng thái giao diện cấp bậc, KHÔNG cần đăng nhập |
| `/hoc-vien` | Thẻ cấp bậc, cửa ải kế tiếp, bản đồ thu nhỏ |
| `/hoc-vien/chien-dich` | Bản đồ tám cửa ải |
| `/hoc-vien/so-so-ho` · `/hoc-vien/nhat-khoa` | Dạng câu yếu · ngày học thật |
| `/duong-thi` · `/thien-thi` | Hai tầng thi trên |
| `/bang-vang?tang=duong` | Tab ba tầng |
| `/quan-tri/tuyen-chon` | Nguồn tuyển chọn (cần đăng nhập admin) |

`.env.local` đã bật sẵn ba cờ để xem được hết.

## 5. Ba việc cần chủ dự án quyết

**Mâu thuẫn consent (PR-09).** `DU-THAO-PHAP-LY-NGUYET-THI.md` ghi hệ thống
không dùng webcam và không ghi màn hình, trong khi quyết định trước đó là hỗ
trợ người dưới 18 tuổi kèm guardian consent, webcam và chia sẻ màn hình. Mã
nguồn hiện chặn dưới 16 tuổi. Đây là quyết định **pháp lý**, không phải kỹ
thuật — các phiên vừa qua cố ý không đụng tới.

**Dương Thí và Thiên Thí có thể trống người.** Ngưỡng `lowestBand ≥ 7.5` và
`≥ 8.0` rất cao so với quy mô trung tâm. Hệ thống xử lý đúng (báo ghế trống,
không hạ chuẩn) nhưng hai tầng này có thể im lặng cả năm.

**Tiền thưởng Dương/Thiên.** `prizeAmount` để `null` cho tới khi bạn duyệt mức
cụ thể. Hệ thống không tự suy ra từ Nguyệt Thí.

## 6. Bật tính năng trên production

Vào **hPanel → ứng dụng Node.js → Biến môi trường**, thêm rồi bấm **Tái triển
khai**. Thứ tự khuyến nghị theo §14.1:

| Bước | Biến | Hệ quả |
|---|---|---|
| 1 | `ENABLE_RANK_ENGINE=true` | Khối cấp bậc hiện trên hồ sơ, engine bắt đầu xét |
| 2 | `ENABLE_CAMPAIGN_MAP=true` | `/hoc-vien/chien-dich` và trang thí luyện mở |
| 3 | `ENABLE_COMPETITION_TIERS=true` | `/duong-thi`, `/thien-thi`, tab Bảng Vàng, khu quản trị tuyển chọn |
| 4 | `ENABLE_TAM_QUOC_UI_LABELS=true` | Đổi từ vựng toàn site — **bật cuối cùng**, sau khi đã cập nhật hướng dẫn cho học viên |

Bảng mới của Tam tầng đại thí do `initDatabase()` tự tạo lúc khởi động. Không
cần thao tác gì trong hPanel ngoài việc thêm biến.

Muốn chắc bản mới đã lên: đổi hằng `BUILD_MARKER` trong
`src/app/api/health/route.ts` rồi kiểm `https://stoic-ielts.online/api/health`.

## 7. Lệnh kiểm thử

```bash
npm test          # 18 bước, chạy được trên máy KHÔNG có MySQL
npm run build
```

Cần MySQL cục bộ, chạy riêng:

```bash
npm run check:db               # đối chiếu database sống với schema.prisma
npm run test:rank-engine       # tích hợp: luồng cấp bậc
npm run test:qualification-db  # tích hợp: chốt chặn tuyển chọn
npm run test:student-pages     # tích hợp: Sổ Sơ Hở và Nhật Khóa
npm run seed:demo              # dựng dữ liệu mẫu để xem giao diện
```

Muốn kiểm raw DDL đúng đường production: `npm run build` rồi `npx next start`,
vì `initDatabase()` **chỉ chạy khi `NODE_ENV=production`** — dev server bỏ qua.

## 8. Bẫy đã trả giá

**OneDrive khoá `.next`.** Build trả `EPERM: unlink`. Phải **dừng dev server
TRƯỚC** rồi mới `rm -rf .next`. Xoá khi server đang chạy làm mất
`pages-manifest.json` và gây lỗi 500 trông y hệt bug mã.

**Nối dòng vào file `.env*` phải kiểm tra newline cuối.** File không có newline
thì lệnh append dán thẳng vào dòng cũ — đã làm hỏng khoá Gemini API một lần.

**Alias `@/` không tồn tại khi chạy `node --experimental-strip-types`.** Dùng
`scripts/alias-loader.mjs`. **KHÔNG đặt `format:"module"` trong hook** — node sẽ
bỏ qua bước lược kiểu và vỡ ngay ở `import type`.

**MySQL trên Windows đặt `lower_case_table_names=1`.** Tên bảng bị hạ thấp hết,
so sánh phải không phân biệt hoa thường.

**`react-hooks/purity` chặn `Date.now()` trong thân component.** Dùng mốc thời
gian đã có sẵn (`facts.now`).

**`imagen-4.0` bị Google khoá với tài khoản mới** (HTTP 404). Dùng
`gemini-3.1-flash-image`, model này nhận cả ảnh đầu vào nên sửa được ảnh cũ.

**Model sinh ảnh hay tự vẽ chữ Hán giả và cổng torii Nhật Bản.** Hai trong chín
ảnh cửa ải bị loại vòng đầu vì đúng hai lỗi này. Phải mở từng ảnh ra nhìn.

## 9. Quyết định thiết kế đã chốt, đừng đảo ngược

- **Gate đọc toàn bộ lịch sử; Success chỉ đọc sự kiện sau `startedAt`.** Bất
  biến số một. Vỡ là học viên thăng cấp ngay lúc bấm nút.
- Phòng thi Reading CBT giữ giao diện trung tính, không giấy gạo, không nhân vật.
- Mỗi màn hình một màu accent. Làm chữ trên nền kem phải lấy bản `-ink`.
- Backfill không suy cấp bậc từ lịch sử. Mọi người bắt đầu ở Bạch thân.
- Không cửa ải nào khóa cứng vào Feynman trả phí.
- Cửa 8 cài **nghiêm hơn** luật gốc: một lượt phải đúng trọn dạng mới được cộng.
- Thống kê theo dạng câu chỉ chấm lại bài trong **180 ngày** gần nhất.
- Sổ Sơ Hở chỉ kết luận khi có ≥20 câu của một dạng, chỉ nhìn 90 ngày.
- **Khu quản trị tuyển chọn KHÔNG có nút thêm thí sinh tùy ý.** Mọi ghế truy
  ngược được về một kết quả có thật ở kỳ nguồn đã chốt.
- **Không hạ ngưỡng để lấp đủ ghế.** Thiếu người đạt chuẩn thì kỳ thi ít người
  hơn — tấm vé giữ nguyên giá trị.
- Repo là **PUBLIC**. `npm run test:no-secrets` chặn khoá lọt vào commit.

---

# 10. Feynman AI Tutor — bàn giao phiên 11/08/2026

## 10.1. Trạng thái: giai đoạn 1 XONG, giai đoạn 2–3 chờ chủ dự án

Toàn bộ mã Feynman AI đã nằm trên `main` và đã đẩy lên GitHub.
**Tính năng đang TẮT hoàn toàn** và sẽ tự tắt cho tới khi có đủ hai biến môi
trường. Không cần làm gì để giữ nó tắt.

```
enabled = OPENAI_FEYNMAN_ENABLED === "true"  VÀ  có OPENAI_API_KEY
```

Thiếu một trong hai là tắt. Đây là lý do merge được mà không sợ ảnh hưởng
học viên đang dùng.

## 10.2. Việc CHỈ chủ dự án làm được (giai đoạn 2)

Claude không đụng vào khóa API. Vào hPanel → Biến môi trường, thêm ba biến.
Ô **Khóa** và ô **Giá trị** điền tách nhau, giá trị **không có dấu `=`**, chữ
thường:

| Khóa | Giá trị |
|---|---|
| `OPENAI_API_KEY` | khóa lấy từ platform.openai.com |
| `OPENAI_FEYNMAN_ENABLED` | `true` |
| `ENABLE_FEYNMAN_AI_ADMIN` | `true` |

Rồi bấm **Tải triển khai**. Sau đó tab **AI Feynman** sẽ hiện trong khu quản
trị — đó là nơi duy nhất xem được tiền đã tiêu cho OpenAI.

**Giai đoạn 2 là tự mình chấm thử vài bài rồi nhìn con số chi phí thật.**
Chỉ khi thấy con số đó ổn mới mở cho học viên (giai đoạn 3).

## 10.3. Tiền bị chặn ở đâu

Không có trần chi tiêu toàn hệ thống. Nhưng chi phí bị chặn tự nhiên: mỗi lần
chấm tiêu một lượt trong ví, mà ví chỉ được nạp khi có thanh toán thành công.
Học viên không thể tiêu nếu chưa trả tiền.

Chỗ cần canh là **quản trị viên tự cộng lượt**. Nếu sau này thấy lo, thêm trần
chi tiêu theo ngày là việc nhỏ — nhưng đó là quyết định của chủ dự án, chưa làm.

## 10.4. Hai lỗi đã sửa trong phiên này

Cả hai đều thuộc loại **hỏng âm thầm**: không có thông báo lỗi, chỉ âm thầm
chạy sai.

**Một lần chấm hỏng khóa vĩnh viễn cả phiên.** `FeynmanAiEvaluation.reviewId`
là `@unique`, và luồng cũ chỉ dựa vào ràng buộc đó để chặn trùng. Khi OpenAI
trục trặc, hàng `FAILED` vẫn nằm lại; lần chấm sau đụng P2002 và bị báo *"đã
chấm rồi"* — trong khi học viên chưa từng nhận được kết quả nào. Thông điệp lỗi
còn nói *"lượt của bạn chưa bị trừ, mời bạn thử lại"*, nhưng thử lại là bất khả.
Đây là đường **phổ biến** chứ không hiếm: mọi mã lỗi hệ thống đều hoàn lượt.

**Tiến trình chết giữa lúc gọi API thì lượt bốc hơi.** Nhánh hoàn lượt không
bao giờ chạy, hàng kẹt `PENDING` vĩnh viễn, ví đã bị trừ và không ai hoàn.
Hostinger khởi động lại mỗi lần triển khai nên chuyện này chắc chắn sẽ xảy ra.

Cách sửa: `planReservation()` trong `src/lib/feynman-ai/rules.ts` — hàm thuần,
có 7 phép thử trong `scripts/test-feynman-ai.ts`. Hai nguyên tắc:

- Ví **không bao giờ** bị trừ hai lần cho cùng một kết quả.
- Học viên **không bao giờ** bị kẹt cứng không chấm lại được.

`PENDING` mồ côi được dọn **lười** — lúc người dùng bấm chấm lại, không cần
cron. Quá 10 phút (`STALE_PENDING_MS`) thì coi như chết.

## 10.5. Đã kiểm chứng những gì

- 6 patch áp sạch lên `main` mới, không xung đột với PR #11/#12
- `prisma validate` hợp lệ · 53 model = 53 bảng DDL
- 167 chỉ mục, không cái nào vượt trần 3072 byte của InnoDB
- `test:no-secrets` sạch — không có khóa OpenAI trong mã
- `tsc --noEmit` · `lint` · `npm test` (21 bước) · `npm run build` đều sạch
- **Migration phá huỷ đã chạy thật trên MySQL:** chỉ mục cũ
  `FeynmanReview_attemptId_key` biến mất, `..._attemptId_runNumber_key` xuất
  hiện. Chỉ đổi chỉ mục, không đụng dữ liệu hàng.

**Chưa kiểm chứng:** giao diện trên production. Xem 10.6.

## 10.6. Claude KHÔNG tự xem được website nữa

Mọi công cụ mạng của Claude đều không vào được `stoic-ielts.online` — gói tin bị
nuốt im lặng, treo ~21 giây rồi hết giờ, kể cả khi ép IPv4. Nguyên nhân gần như
chắc chắn là lớp **CDN + chống phần mềm độc hại** của Hostinger chặn dải IP
trung tâm dữ liệu.

**`curl` thất bại KHÔNG có nghĩa là website sập.** Ngày 10/08 tôi đã kết luận
nhầm đúng như vậy và đưa ra cả một danh sách việc sai hướng. Bằng chứng ngược
lại nằm ở hPanel: Đang chạy, 0 lỗi, bài quét tốc độ của chính Hostinger chấm 94
điểm.

Muốn biết site sống hay chết: xem ảnh chụp hPanel, hoặc nhờ chủ dự án mở bằng
4G. So sánh với `wobridgeacademy.com` là vô nghĩa — hệ thống khác, trên VPS
khác, không bật lớp bảo vệ này.

## 10.7. Việc còn nợ

1. **Chủ dự án đặt ba biến ở 10.2** rồi báo lại — đây là thứ chặn giai đoạn 2.
2. Xác nhận triển khai sau merge chạy ổn (cần ảnh chụp hPanel hoặc lời xác nhận).
3. Xóa nhánh `feature/feynman-ai` sau khi chắc chắn `main` ổn định.
4. PR-09: nhờ luật sư rà `DU-THAO-PHAP-LY-NGUYET-THI.md`.
5. Ba biến cũ `ENABLE_*` từng bị điền sai thành `=TRUE`; kiểm lại phải là
   `true` chữ thường, không dấu `=`.

## 10.8. Phiên 11/08/2026 (tiếp) — mạng đã thông, và một lỗi lối vào

**Claude đã tự xem được website trở lại.** Mục 10.6 không còn đúng: trang chủ
trả 200 qua IPv6, đọc được nội dung, không lỗi console. Cách kiểm tra nhanh:

```
curl -s -o /dev/null -w "%{http_code}\n" https://stoic-ielts.online
```

Vẫn giữ nguyên cảnh báo cũ ở một điểm: nếu sau này lại không vào được, **đừng
kết luận site sập** — đối chiếu hPanel trước.

### Dương Thí và Thiên Thí: không phải thiếu biến, mà là thiếu lối vào

Chủ dự án nhiều lần báo không thấy hai tầng này trên website. Nguyên nhân thật
không phải biến môi trường:

- `/duong-thi` và `/thien-thi` trả **200** — trang có thật, cờ đã bật
- `ui-labels.ts` đã có nhãn và đường dẫn cho cả hai
- Khu quản trị tuyển chọn đã chạy
- Nhưng `MAIN_NAV` trong `src/lib/nav.ts` **không hề chứa chúng**, và không có
  chỗ nào khác trong giao diện trỏ tới

Nghĩa là học viên chỉ tới được bằng cách tự gõ URL. Đã sửa: `mainNavItems()`
chèn hai tầng ngay sau Nguyệt Thí, ẩn/hiện theo `ENABLE_COMPETITION_TIERS`.

**Bài học để không lặp lại:** cờ tính năng bật không có nghĩa là người dùng
thấy được. Mỗi lần bật một cờ, phải hỏi thêm "có lối vào nào dẫn tới nó chưa?".
Cùng lỗi này đã xảy ra hai lần trong dự án — lần trước là trang
`/quan-tri/ai-feynman` không có tab (mục 10.4).

### Còn nợ: chưa xác minh được ba biến Feynman AI

Chủ dự án báo đã thêm `OPENAI_API_KEY`, `OPENAI_FEYNMAN_ENABLED`,
`ENABLE_FEYNMAN_AI_ADMIN`. Claude **không kiểm chứng được** vì mọi dấu hiệu đều
nằm sau đăng nhập, và Claude không được phép nhập mật khẩu để đăng nhập.

Cách chủ dự án tự kiểm trong một phút: đăng nhập quản trị, xem thanh tab có
chữ **AI Feynman** không. Có tức là `ENABLE_FEYNMAN_AI_ADMIN` đã ăn. Vào trang
đó xem được số tiền đã tiêu tức là cả ba biến đều ổn.

## 10.9. Phiên 11/08/2026 (03:27) — bản vá trước là mã chết

### Điều quan trọng nhất: tôi đã báo "đã sửa" khi chưa sửa

Mục 10.4 nói `planReservation()` đã khắc phục việc một lần chấm hỏng khóa vĩnh
viễn phiên Feynman. **Sai.** Hàm viết đúng, kiểm thử xanh, và không ai gọi tới
nó — chốt chặn phía trên chặn trước.

Ba ngõ cụt xếp chồng nhau, phải gỡ cả ba thì đường chấm lại mới thông:

1. `alreadyGraded: Boolean(review.aiEvaluation)` chỉ hỏi *"có hàng nào không"*.
   Hàng `FAILED` cũng tính là đã chấm, nên bị từ chối ngay ở `decideCanGrade` —
   `reserveGradingSlot` không bao giờ chạy tới.
2. Tiến trình chết giữa chừng để lại `lastGradedOn` của hôm nay. Nhịp *một lần
   mỗi ngày* khóa học viên tới tận hôm sau, mà lượt thì đã bị trừ mất.
3. Lượt đã bị trừ bởi bản ghi mồ côi nên ví về 0. Xét ví lúc lấy lại là chặn
   nhầm chính lần chấm mà học viên đã trả tiền.

Cách sửa: tính `planReservation` **trước** khi xét quyền, rồi truyền kết quả vào
`decideCanGrade` qua `alreadyGraded`, `lastGradedAt` và tham số mới
`requiresCredit`. Thêm 5 phép thử, tổng 12 phép thử cho nhánh này.

**Bài học, áp dụng cho mọi lần sau:** sửa một hàm thuần rồi chấm điểm "đã xong"
mà không lần lại đường gọi thì rất dễ tự lừa mình. Hàm đúng, kiểm thử xanh, và
không ai gọi tới. Kiểm thử hàm thuần **không** chứng minh được đường đi thật đã
thông — phải đọc ngược từ chỗ gọi lên.

### Phép thử tìm trang mồ côi: đã viết rồi xóa

Định biến việc "cờ bật nhưng không có lối vào" thành phép thử tự động. Viết
xong, chạy, báo sạch — rồi thử ngược lại trên mã **chưa vá** thì nó **vẫn báo
sạch**. Vô dụng.

Nguyên nhân: `ui-labels.ts` có sẵn chuỗi `href: "/duong-thi"` trong một bảng dữ
liệu mà không ai kết xuất. *"Có chuỗi href đâu đó trong mã"* không đồng nghĩa
*"người dùng tới được"*. Đã xóa file thay vì để lại một phép thử luôn xanh —
phép thử rỗng còn tệ hơn không có, vì nó tạo cảm giác an toàn giả.

Ai muốn làm lại: phải phân tích khả năng tới được thật (bò trên HTML site trả
về), không so chuỗi tĩnh.

### Rà lối vào bằng tay: sạch

Bò từ trang chủ được 11 route công khai, gồm cả Dương Thí và Thiên Thí. Đối
chiếu 34 route tĩnh: mọi trang còn lại đều nằm sau đăng nhập và **đều có lối
vào** từ trong khu của nó — `StudentNav` kết xuất đủ Sổ Sơ Hở, Nhật Khóa, Hồ Sơ
Riêng; khu quản trị có tab cho từng trang; trang ghép đề được dẫn qua chuỗi mẫu
có tham số. Không còn trang mồ côi.

### Đã dọn

Nhánh `feature/feynman-ai` đã xóa cả cục bộ lẫn trên GitHub; `git log
main..feature/feynman-ai` trả 0 commit trước khi xóa nên không mất gì.

Còn bốn nhánh cũ chưa dọn, **chưa kiểm tra đã gộp hết chưa**:
`feature/campaign-map-home`, `feature/competition-tiers`, `feature/rank-engine`,
`feature/integrity-consent-alignment`.

### Việc còn nợ (thay cho 10.7)

1. **Ba biến Feynman AI vẫn chưa xác minh được.** Chủ dự án đăng nhập quản trị,
   nhìn thanh tab có chữ **AI Feynman** không. Đây vẫn là thứ chặn giai đoạn 2.
2. Rà nốt các phần chưa soi của Feynman AI: `openai-client.ts` (hủy và hết giờ),
   `admin-stats.ts`, luồng `feedback`.
3. PR-09: nhờ luật sư rà `DU-THAO-PHAP-LY-NGUYET-THI.md`.
4. Cân nhắc dọn bốn nhánh cũ ở trên.

## 10.10. Phiên 11/08/2026 (06:38) — rà nốt Feynman AI, dọn nhánh

### Ba lỗi dán nhãn sai và một đua tranh

Không lỗi nào làm mất tiền hay mất dữ liệu. Cả bốn đều thuộc loại **dẫn người
sửa đi sai hướng** — thứ chỉ lộ ra lúc đang cuống vì sự cố.

**`openai-client.ts` — "chưa cấu hình khóa API" hiện thành "OpenAI hỏng".**
`apiKey()` được gọi lúc dựng tham số cho `fetch`, tức là **nằm trong khối
`try`**. `FeynmanAiError` bị bắt lại rồi dán nhãn thành `UPSTREAM_ERROR`. Đã
cho `FeynmanAiError` đi qua nguyên vẹn.

**`openai-client.ts` — hết giờ bị xếp thành "model trả sai cấu trúc".** Hạn giờ
của `AbortSignal.timeout()` vẫn còn hiệu lực khi đang đọc thân phản hồi, nên
`response.json()` có thể ném lỗi **hủy** chứ không phải lỗi cú pháp. Gộp hết
vào `MALFORMED_OUTPUT` thì trang quản trị chỉ sang model, trong khi việc cần
làm là nới `OPENAI_FEYNMAN_TIMEOUT_MS`.

Quyết định này đã tách thành `classifyBodyReadError()` trong `errors.ts` để kiểm
thử được — `openai-client.ts` nhập `server-only` nên không chạy dưới node.

**Luồng feedback — hai cú bấm nhanh tạo hai cảnh báo trùng.** `findFirst` rồi
`create` ở hai lệnh tách rời, mà `FeynmanAiAlert` **không có ràng buộc unique
nào** đỡ cho. Đã bọc vào transaction Serializable, cùng khuôn với
`reserveGradingSlot`.

### Đã theo đúng kỷ luật kiểm chứng

4 phép thử mới. Trước khi tin chúng, tôi **làm hỏng lại hàm** và chạy: 2 phép
thử BÁO LỖI đúng như phải thế, rồi xanh lại sau khi khôi phục. Đây là bước mà
phiên trước tôi bỏ qua và trả giá.

Phần chưa kiểm chứng được bằng phép thử, nói thẳng: nhánh cho `FeynmanAiError`
đi qua nguyên vẹn chỉ được xác nhận **bằng cách đọc mã**, vì nó nằm trong
`openai-client.ts` không chạy được dưới node.

### `admin-stats.ts` sạch

Mọi truy vấn đều có `take` hoặc `aggregate`, không có truy vấn vô hạn. Không
sửa gì.

### Dọn nhánh

Đã xóa: `feature/campaign-map-home`, `feature/competition-tiers`,
`feature/rank-engine` — cả ba trả 0 commit ngoài `main`.

**Còn `feature/integrity-consent-alignment`, CHƯA xóa.** Nó có đúng một commit
chưa vào `main`: `6503b18 docs: bộ đặt hàng ảnh cho bản đồ Chiến Dịch 2.5D`.
Hướng 2.5D đã bị chủ dự án bỏ, nên tài liệu này gần như chắc chắn là rác — 
nhưng xóa nhánh sẽ mất hẳn commit đó, nên để chủ dự án quyết.

### Việc còn nợ (thay cho 10.9)

1. **Ba biến Feynman AI vẫn chưa xác minh được** — vẫn là thứ chặn giai đoạn 2.
   Chủ dự án đăng nhập quản trị, nhìn thanh tab có chữ **AI Feynman** không.
2. Quyết định số phận nhánh `feature/integrity-consent-alignment`.
3. PR-09: nhờ luật sư rà `DU-THAO-PHAP-LY-NGUYET-THI.md`.
4. Chưa soi: `context.ts`, `cost.ts`, `prompts.ts`, và ba route API ở mức chi
   tiết. Bảng giá token trong `cost.ts` đáng soi trước — sai ở đó thì mọi con
   số chi phí trên trang quản trị đều lệch mà không có gì báo.
