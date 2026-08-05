# Bản ghi bàn giao — hệ HỔ PHÙ · IELTS

Nhánh: `feature/competition-tiers` (đã push lên origin)
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

## 2. Việc còn lại, theo thứ tự nên làm

1. **Trang quản trị cấp bậc** theo §11.1 — chỉ đọc catalog đã seed, xem timeline
   một `UserTrial`, nút reset một `TrialRun` lỗi kỹ thuật (không đổi rank).
   KHÔNG cho sửa `ruleConfig` bằng form production.
2. **Trang preview asset** theo §11.2 — lưới toàn bộ `ART_ASSETS`, kiểm crop
   desktop/mobile, alt text, dung lượng.
3. **Kiểm thử tích hợp** cho Sổ Sơ Hở và Nhật Khóa với dữ liệu thật.
4. **PR-09** khi chủ dự án đã quyết định về consent.

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

**Chưa nhìn tận mắt:**

- **Giao diện trang quản trị tuyển chọn.** Nó đòi đăng nhập admin, và tôi
  không nhập mật khẩu vào biểu mẫu — kể cả tài khoản demo cục bộ. Bạn tự đăng
  nhập xem. Tầng dữ liệu đã kiểm bằng script nên rủi ro còn lại là bố cục.
- Luồng bấm nút "Sinh vé tuyển chọn" từ giao diện thật.
- Trang chi tiết cửa ải với dữ liệu thật.

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
npm run check:db              # đối chiếu database sống với schema.prisma
npm run test:rank-engine      # tích hợp: luồng cấp bậc
npm run test:qualification-db # tích hợp: chốt chặn tuyển chọn
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
