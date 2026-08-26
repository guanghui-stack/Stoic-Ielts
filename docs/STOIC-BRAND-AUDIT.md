# Báo cáo audit Brand — STOIC · IELTS

## Phạm vi

Audit này kiểm tra asset production, chuỗi hiển thị, token, catalog, component và runtime. Vùng học/làm bài mô phỏng thi thật được bảo vệ bằng checksum và không thuộc phạm vi thay đổi.

## Kết quả runtime

Trang chủ local đã được tải lại sau các bản sửa. Runtime hiện hiển thị logo **STOIC · IELTS**, hero `control-circle-hero.svg`, ba trụ **Nhận thức – Hành động – Ý chí**, các chặng Stoic, CTA **Hành Trình**, **Thành Quả**, **Thông Báo** và **Dấu Mốc Cộng Đồng**. Không còn asset production cũ trên trang chủ.

Các asset production cũ trong `public/art/campaign`, `public/art/generals`, `public/art/home`, `public/art/territories` và `public/art/trials` không còn được manifest/runtime tham chiếu nên đã được gỡ khỏi production. Bộ asset hiện hành chỉ gồm `public/art/stoic/control-circle-hero.svg`, `quiet-orbit.svg` và `three-virtues.svg`.

## Các sửa đổi đã thực hiện

| Khu vực | Thay đổi |
|---|---|
| Brand CSS | Làm sạch mô tả Tam Quốc/thủy mặc trong Brand Design; giữ alias token chỉ để compatibility với vùng protected. |
| Hành trình | Bổ sung mapping tên và nhãn chức năng Stoic cho desktop/mobile/mini campaign, không đổi trialCode, href, trạng thái hoặc điều kiện. |
| Dashboard | Đổi nhãn Hành Trình/Chặng và dùng tên Stoic ở bề mặt ngoài phòng thi. |
| Đấu trường | Đổi tên ba trụ, catalog danh hiệu và mô tả xét duyệt sang ngôn ngữ Stoic trung tính; giữ code, slug, rule, ngưỡng và visibility. |
| Thành tựu | Gỡ mô-típ Tam Quốc/Hổ Phù khỏi danh hiệu ngoài protected; chuyển quote metadata nguyên bản sang `STOIC · IELTS`. |
| Quản trị | Đổi placeholder/thông báo chốt kết quả và tuyển chọn sang Thử Thách/Thành Quả. |
| Asset workflow | Thay script tối ưu ảnh legacy bằng validator SVG Stoic deterministic, không gọi API ngoài. |

## Ngoại lệ cố ý giữ nguyên

Các chuỗi như `Nguyệt Thí`, `Dương Thí`, `Thiên Thí`, tên trial legacy, `Phục bàn` và metadata Reading còn lại nằm trong route/component/logic protected hoặc là mã nghiệp vụ liên kết trực tiếp với bài thi. Không sửa chúng để bảo toàn trải nghiệm mô phỏng thi thật theo yêu cầu.

## Validation

Baseline trước audit: protected checksum đạt với 23 tệp, lint đạt và build đạt. Sau audit: `npm test`, `npm run test:protected-surfaces`, `npm run test:no-han`, asset validator, `npm run lint` và `npm run build` đều đạt. Build vẫn có cảnh báo parser CSS baseline về `::highlight(wb-hl)` và `::highlight(wb-note)`, nhưng không có lỗi build.
