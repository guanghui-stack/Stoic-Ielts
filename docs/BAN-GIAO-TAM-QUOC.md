# Bản ghi bàn giao — hệ HỔ PHÙ · IELTS

Nhánh: `feature/rank-engine` (đã push lên origin)
Nguồn: Master System Specification v1.1 (`Ho_Phu_IELTS_Tam_Quoc_Master_System_Spec_v1_1.docx`)
Cập nhật: phiên đêm 04–05/08/2026

Tài liệu này để phiên sau đọc là làm tiếp được ngay, không phải đọc lại toàn
bộ đặc tả 1155 dòng.

---

## 1. Trạng thái theo chuỗi chín PR

| PR | Nội dung | Trạng thái |
|---|---|---|
| PR-01 | Brand core, quy tắc không chữ Hán | Xong, đã merge `main` |
| PR-02 | Hệ thiết kế thủy mặc, art manifest | Xong, đã merge `main` |
| PR-03 | Rank data model, 8 bảng mới | Xong, đã merge `main` |
| PR-04 | Rank engine | Xong, trên nhánh |
| PR-05 | Bản đồ Chiến Dịch | Xong, trên nhánh |
| PR-06 | Nhãn Tam Quốc, điều hướng học viên | Xong, trên nhánh |
| PR-07 | Tam tầng đại thí | **Xong một nửa** — xem mục 4 |
| PR-08 | Tài liệu QA | Chưa làm |
| PR-09 | Liêm chính và consent | **Chặn** — xem mục 5 |

Toàn bộ 16 ảnh trong art manifest đã có file và đúng accent.

## 2. Đã làm trong phiên này

**Ảnh.** Sáu ảnh Lục tướng do chủ dự án cung cấp (nhúng trong file Word đặc
tả) đều có chữ nung sẵn, bốn ảnh có ký tự chữ Hán. Đã xoá bằng
`scripts/clean-art-text.mjs`. Tám ảnh cửa ải và nền bản đồ sinh mới bằng
`scripts/generate-art.mjs`. Trương Phi và Mã Siêu phải sinh lại vì ảnh gốc
dùng vàng kim trong khi manifest chốt chu sa và bạc lam.

**Giao diện cấp bậc.** `current-rank-card`, `trial-gate-card`,
`trial-progress`, `cardinal-title-picker`, `trial-reflection-form`, và route
`/hoc-vien/thi-luyen/[trialCode]`.

**Ba trang mới.** Khối cấp bậc trên Trung Quân Trướng, Sổ Sơ Hở
(`/hoc-vien/so-so-ho`), Nhật Khóa (`/hoc-vien/nhat-khoa`).

**Điều hướng.** `StudentNav` — trước đó ba trang mới không có lối vào nào cả.

**Tam tầng đại thí, tầng logic.** `competition/tiers.ts` và
`competition/qualification.ts`, có kiểm thử đầy đủ.

Cổng chất lượng cuối phiên: **17 bộ kiểm thử đều đạt**, `tsc` sạch, `lint`
sạch, `build` exit 0, `test:no-han` sạch.

## 3. Phần CHƯA được nhìn tận mắt

Đây là giới hạn quan trọng nhất của phiên này, đọc kỹ trước khi tin vào giao
diện.

Máy phát triển **không có MySQL** — `.env` cục bộ vẫn trỏ SQLite cũ. Mọi
trang đòi đăng nhập đều không chạy được local. Vì vậy đã dựng
`/xem-thu-cap-bac` (chặn bằng `NODE_ENV === "production"`, dữ liệu giả,
không đụng database) và kiểm chứng qua trang đó.

**Đã kiểm chứng thật trên trình duyệt:**

- 16 node bản đồ có `aria-label` đúng dạng "tên — chức năng. trạng thái"
- Node khóa có `aria-disabled=true` và `tabIndex=-1`, không nằm trong thứ tự tab
- 4 phần tử `<progress>` đều có `aria-label`
- Ở 375px: bản đồ ngang ẩn, dòng thời gian dọc hiện, **không tràn ngang**,
  vùng chạm cao 75–94px
- Ảnh hero, cửa ải và bản đồ đều phục vụ HTTP 200
- Cờ tắt thì `/hoc-vien/chien-dich` trả 404 đúng thiết kế

**Chưa kiểm chứng được:**

- Luồng thật: nộp bài → `AchievementEvent` → engine xét → thăng cấp trong DB
- Trang chi tiết cửa ải với dữ liệu thật
- Sổ Sơ Hở và Nhật Khóa với dữ liệu thật
- Server Action `startTrialAction` và `submitTrialReflectionAction` chạy thật

Muốn kiểm những thứ này phải có MySQL. Chủ dự án đã được khuyến nghị **cài
MySQL lên máy** thay vì tạo database thử trên Hostinger — vì database thử
trên Hostinger nằm chung máy chủ với production, và một chữ sai trong tên
database là ghi đè dữ liệu học viên thật.

## 4. PR-07 còn lại gì

Đã xong tầng logic thuần và kiểm thử. **Cố ý chưa đụng schema.**

Còn phải làm:

1. Thêm vào `prisma/schema.prisma`: `CompetitionSource`,
   `CompetitionQualification`; thêm cột `tier`, `seasonKey`,
   `featuredGeneralCode`, `badgeDurationDays` vào `Competition`; thêm
   `entrySource` và `qualificationId` vào `CompetitionEntry`.
2. **Thêm raw DDL tương ứng vào `src/lib/init-db.ts`** — production không chạy
   `prisma db push`, quên bước này là bảng không bao giờ tồn tại.
3. **Tự cộng byte index trước khi thêm index tổng hợp.** Giới hạn MySQL là
   3072 byte, mỗi cột `VARCHAR(191)` utf8mb4 chiếm 764 byte nên tối đa 4 cột.
   Lỗi này đã làm sập production một lần.
4. Service đọc/ghi nối vào `qualification.ts`.
5. Routes `/duong-thi` và `/thien-thi`, tab Nguyệt–Dương–Thiên ở `/bang-vang`.
6. Trang quản trị nguồn tuyển chọn, có audit, **không có nút thêm thí sinh tùy ý**.
7. `prizeAmount` để `null` cho Dương/Thiên tới khi chủ dự án duyệt.

## 5. Ba việc cần chủ dự án quyết

**Mâu thuẫn consent chưa giải quyết (PR-09).** `DU-THAO-PHAP-LY-NGUYET-THI.md`
ghi hệ thống không dùng webcam và không ghi màn hình, trong khi quyết định
trước đó là hỗ trợ cả người dưới 18 tuổi kèm guardian consent, webcam và chia
sẻ màn hình. Mã nguồn hiện chặn dưới 16 tuổi. Đây là quyết định **pháp lý**,
không phải kỹ thuật — phiên đêm đã cố ý không đụng tới.

**Dương Thí và Thiên Thí có thể trống người.** Ngưỡng `lowestBand ≥ 7.5` và
`≥ 8.0` rất cao so với quy mô trung tâm hiện tại. Logic đã xử lý đúng trường
hợp này (báo `unfilledSeats`, không hạ ngưỡng), nhưng chủ dự án nên biết trước
là hai tầng này có thể im lặng cả năm.

**Cài MySQL để kiểm chứng luồng thật.** Xem mục 3.

## 6. Bẫy đã gặp trong phiên này

**OneDrive khóa `.next`.** Build trả `EPERM: unlink .next/server/...`. Phải
**dừng dev server TRƯỚC** rồi mới `rm -rf .next`. Xoá khi server đang chạy làm
mất `pages-manifest.json` và gây lỗi 500 trông y như bug mã — đã mắc một lần
và mất thời gian truy nhầm hướng.

**`imagen-4.0` đã bị Google khóa với tài khoản mới**, trả HTTP 404. Dùng
`gemini-3.1-flash-image` thay thế; model này nhận cả ảnh đầu vào nên vừa sinh
mới vừa sửa ảnh cũ được.

**Model sinh ảnh rất hay tự vẽ chữ Hán giả và vẽ nhầm cổng torii Nhật Bản.**
Hai trong chín ảnh cửa ải bị loại ở vòng duyệt đầu vì đúng hai lỗi này. **Phải
mở từng ảnh ra nhìn**, không được tin script.

**`react-hooks/purity` chặn `Date.now()` trong thân component.** Dùng mốc thời
gian đã có sẵn (`facts.now`) thay vì gọi lại — vừa qua lint vừa đảm bảo thẻ và
engine nói cùng một mốc.

**Alias `@/` không tồn tại khi chạy `node --experimental-strip-types`.** Module
nào bị script kiểm thử nạp thẳng phải dùng import tương đối kèm đuôi `.ts`.
Import chỉ có `import type` thì không sao vì bị strip.

## 7. Quyết định thiết kế đã chốt, đừng đảo ngược

- Phòng thi Reading CBT giữ giao diện trung tính. Không giấy gạo, không mực,
  không nhân vật trong vùng passage và câu hỏi.
- Mỗi màn hình một màu accent. Làm chữ trên nền kem phải lấy bản `-ink`.
- Backfill không suy cấp bậc từ lịch sử. Mọi người bắt đầu ở Bạch thân.
- Không cửa ải nào khóa cứng vào Feynman trả phí. Có kiểm thử canh.
- Cốt truyện đóng ở đúng sáu nhân vật.
- **Gate đọc toàn bộ lịch sử, Success chỉ đọc sự kiện sau `startedAt`.** Đây là
  bất biến số một của hệ cấp bậc. Nếu vỡ, học viên thăng cấp ngay lúc bấm nút.
- Cửa 8 cài **nghiêm hơn** luật gốc: dữ liệu không lưu thứ tự từng câu nên một
  lượt phải làm đúng trọn dạng mới được cộng vào chuỗi.
- Thống kê theo dạng câu chỉ chấm lại bài trong **180 ngày** gần nhất; chấm lại
  toàn bộ lịch sử quá đắt cho mỗi lần xét.
- Sổ Sơ Hở chỉ kết luận khi có ≥20 câu của một dạng, và chỉ nhìn 90 ngày.

## 8. Cờ tính năng

Tất cả ở `src/lib/features.ts`, mặc định **TẮT** trừ brand:

```
ENABLE_HO_PHU_BRAND=true      (mặc định bật)
ENABLE_RANK_ENGINE=false
ENABLE_CAMPAIGN_MAP=false
ENABLE_TAM_QUOC_UI_LABELS=false
ENABLE_COMPETITION_TIERS=false
```

Thứ tự bật khuyến nghị theo §14.1: staging bật brand → internal beta bật ranks
cho admin → 5% học viên → 25% bật map → 100% bật themed labels.

## 9. Lệnh kiểm thử

```bash
npm run test:no-han     # chặn ký tự chữ Hán, chạy trong npm test
npx tsc --noEmit
npm run lint
npm test                # 17 bộ
npm run build
```

Bộ liên quan hệ Tam Quốc: `test:ranks`, `test:rank-rules`, `test:campaign`,
`test:weakness`, `test:qualification`.
