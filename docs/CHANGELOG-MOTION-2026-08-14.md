# Hồ sơ triển khai motion có chọn lọc — 14/08/2026

## Mục tiêu

Giảm cảm giác chuyển trang đột ngột và làm rõ quan hệ nhân quả khi người dùng thao tác, theo hướng mềm, nhanh và có tính vật lý kiểu Apple. Chất Tam Quốc chỉ xuất hiện ở khoảnh khắc hiếm có ý nghĩa; giao diện hằng ngày vẫn điềm tĩnh, không phô diễn.

Nhánh triển khai cục bộ: `feat/apple-motion-system`.

Không có thay đổi database, Prisma schema, biến môi trường, API hay dependency. Nhánh chưa được đẩy lên remote và chưa kích hoạt quy trình deploy Hostinger.

## Phạm vi được bảo vệ tuyệt đối

Các khu vực sau không nhận page transition, press feedback hay animation mới:

- Phòng thi thật: route group `(exam)` và `/lam-bai/[attemptId]`.
- Kho/luyện Reading: `/luyen-tap/reading/**`.
- Trang bài làm học viên: `/hoc-vien/bai-lam/**`.
- Feynman Review: `/hoc-vien/bai-lam/[attemptId]/feynman`.
- Thí luyện có tính chất học tập: `/hoc-vien/thi-luyen/**`.
- Khu AI Feynman quản trị: `/quan-tri/ai-feynman`.

Không đặt motion ở `(site)/layout.tsx` hoặc `quan-tri/template.tsx`, vì hai vị trí đó sẽ làm hiệu ứng rò sang các route bị loại trừ. Thanh điều hướng quản trị vẫn xuất hiện tại AI Feynman, nhưng tự tắt press motion khi pathname nằm dưới `/quan-tri/ai-feynman`.

## Hệ motion nền

Nguồn chính: `src/app/globals.css`.

| Mẫu | Mục đích | Giá trị |
| --- | --- | --- |
| `motion-page-entry` | Làm mềm lần mount của trang ngoài học tập | `opacity` + `translateY(4px)`, 160ms |
| `motion-panel-swap` | Nối nút chỉnh sửa/xác nhận với panel mới | `opacity` + `scale(0.97)`, 200ms, origin trên-phải |
| `motion-press` | Phản hồi ngay khi nhấn nút | `scale(0.97)`, 100ms |
| `motion-status-enter` | Báo trạng thái hệ thống vừa đổi | `opacity` + `translateY(4px)`, 160ms |
| `motion-dialog` | Mở/đóng hộp thoại xóa tài khoản | `opacity` + `scale(0.96)`, 250ms, có backdrop |
| `rank-promotion-moment` | Khoảnh khắc thăng cấp hiếm | 300ms, stagger 50ms |

Đường cong dùng thống nhất:

- Enter/exit: `cubic-bezier(0.23, 1, 0.32, 1)`.
- Màu/hover: `ease`.
- Không dùng `transition: all`, `ease-in`, `scale(0)` hoặc animation lặp.

Ngoại lệ có chủ đích: accordion Điện Danh Vọng chuyển `height` trong 200ms vì nội dung có chiều cao động; đây là trường hợp cần giữ quan hệ không gian giữa tiêu đề và phần giải thích. Các animation khác chỉ dùng `transform` và `opacity`.

## Thay đổi theo khu vực

### Trang công khai và xác thực

- Thêm page entry cho trang chủ, Nguyệt Thí, Dương Thí, Thiên Thí, Bảng Vàng, Điện Danh Vọng, đăng nhập, đăng ký và đổi mật khẩu.
- Dùng template ở `nghi-su-duong` và `thanh-toan` để mỗi lần chuyển route trong đúng phân khu đều có nhịp vào ngắn, không ảnh hưởng phần học tập.
- Nút đăng nhập Google, gửi biểu mẫu, mua/nạp xu và kiểm tra thanh toán có press feedback.
- Trạng thái thanh toán được gắn `key` theo status và dùng motion 160ms để người dùng nhận ra hệ thống vừa cập nhật.
- Form hồ sơ công khai có press feedback và trạng thái thành công/lỗi đi vào nhẹ.

### Điện Danh Vọng

- Thay `details/summary` tĩnh bằng `AchievementDisclosure` có `aria-expanded`, `aria-controls` và vùng nội dung đo bằng `ResizeObserver`.
- Chevron quay 200ms; nội dung mở/đóng bằng opacity + height 200ms.
- Đo lại chiều cao khi font tải xong hoặc layout đổi để không cắt mất nội dung.

### Khu học viên ngoài học tập

- Thêm page entry cho Trung Quân Trướng, Chiến Dịch, Danh Hiệu, Nhật Khoa, Sổ Sơ Hở và Dữ Liệu Của Tôi.
- `GoalsCard` dùng motion panel 200ms khi chuyển giữa trạng thái xem và chỉnh sửa; lần render đầu tiên giữ tĩnh để tránh chuyển động không có nguyên nhân.
- Bản đồ chiến dịch bỏ shorthand `transition` và chỉ chuyển màu, tránh vô tình animate thuộc tính layout.

### Khu quản trị

- Page entry được gắn trực tiếp vào từng trang quản trị được phép, không gắn ở layout/template cha.
- `AdminNav` xác định tab hiện tại bằng pathname, thêm `aria-current="page"` và trạng thái active rõ ràng cho cả route con.
- Hộp xác nhận xóa học viên chuyển sang native `<dialog>`: browser quản lý focus trap, Escape, backdrop và focus ban đầu; entry/exit đối xứng 250ms.
- Đối soát, hoàn tiền và đặt lại mật khẩu có press feedback; panel xác nhận dùng motion 200ms.

### Khoảnh khắc Tam Quốc hiếm: thăng cấp

- `RankPromotionMoment` chỉ đủ điều kiện khi học viên ở bậc lớn hơn 1 và `promotedAt` còn trong 14 ngày.
- Chờ 160ms để page entry kết thúc rồi mới trao ấn, tránh hai lớp animation chạy chồng.
- Bố cục dùng ấn triện, dải chu sa và câu dẫn “Khải hoàn · ấn triện mới”; không dùng confetti, bounce, âm thanh hay hiệu ứng lặp.
- Mỗi `promotionId` chỉ hiện một lần trên cùng trình duyệt/tài khoản. Khóa lưu cục bộ có dạng `wb-rank-promotion:<userId>`.
- Nếu localStorage bị chặn, thông báo vẫn hiện trong lượt hiện tại và không làm hỏng hồ sơ.
- Trang dev `/xem-thu-cap-bac` có dữ liệu giả để QA khối này mà không cần database hoặc đăng nhập.

## Tiếp cận và reduced motion

- `prefers-reduced-motion: reduce` giữ tín hiệu đổi trạng thái bằng fade 160ms nhưng loại toàn bộ translate/scale.
- Press feedback không scale trong reduced-motion.
- Dialog reduced-motion chỉ chuyển opacity/backdrop.
- Accordion bỏ chuyển height, chỉ giữ fade; nội dung vẫn hoạt động và có semantic button/region.
- Khoảnh khắc thăng cấp dùng `role="status"`; nút đóng có nhãn truy cập.
- Không thêm hover motion; vì vậy không phát sinh false-hover trên thiết bị cảm ứng.

## Review theo chuẩn animation

| Mức | Hạng mục | Kết quả |
| --- | --- | --- |
| PASS | Tần suất | Motion thường rất ngắn; chất “chiến trận” chỉ dành cho thăng cấp hiếm |
| PASS | Easing | Enter/exit dùng strong ease-out; không có ease-in |
| PASS | Duration | Press 100ms; trạng thái/trang 160ms; panel 200ms; dialog 250ms; rare moment 300ms |
| PASS | Physicality | Press 0.97; dialog 0.96; không xuất hiện từ scale 0 |
| PASS | Performance | Mặc định chỉ transform/opacity; một ngoại lệ height có lý do cho accordion |
| PASS | Accessibility | Có reduced-motion fade-only và semantic/focus behavior |
| PASS | Interruptibility | Dialog dùng transition + `@starting-style`; các keyframe chỉ dành cho mount/entry không kích hoạt liên tục |
| PASS | Cohesion | Không bounce, không loop, không over-animation; màu và motif bám hệ Hổ Phù |

Kết luận review: đạt tiêu chuẩn triển khai; không còn lỗi motion mức blocking hoặc high-priority.

## Xác minh đã thực hiện

- `npx tsc --noEmit`: đạt.
- `npm run lint`: đạt.
- `npm test`: đạt toàn bộ test suite, bao gồm access, Feynman, thanh toán, danh hiệu, integrity, rank, campaign và data rights.
- `npm run build`: đạt, tất cả route được biên dịch và sinh page data thành công.
- `git diff --check`: đạt; chỉ có cảnh báo line-ending LF/CRLF của máy Windows.
- QA trình duyệt tại `/xem-thu-cap-bac`: khối thăng cấp hiển thị đúng, có thể đọc bằng semantic tree, bố cục desktop không che nội dung; reload cho số lượng status bằng 0, xác nhận cơ chế chỉ hiện một lần.
- Kiểm tra phạm vi bằng Git: không có tệp sửa trong `(exam)`, `luyen-tap/reading`, `hoc-vien/bai-lam`, `hoc-vien/thi-luyen` hoặc `quan-tri/ai-feynman`.

## Cảnh báo tồn tại từ trước, không thuộc thay đổi này

- Turbopack cảnh báo hai selector CSS Custom Highlight API: `::highlight(wb-hl)` và `::highlight(wb-note)`. Build vẫn thành công. Đây là CSS cũ của tính năng highlight Reading và không được sửa vì Reading thuộc phạm vi bảo vệ.
- Dev server trong sandbox không tải được ba Google Fonts nên dùng fallback; production build được chạy với quyền mạng và tải font thành công.
- Các script TypeScript của repo phát cảnh báo Node `MODULE_TYPELESS_PACKAGE_JSON`; test vẫn đạt. Không đổi `package.json` vì ngoài phạm vi motion.

## Gợi ý kiểm tra khi review/merge

1. Checkout nhánh `feat/apple-motion-system`.
2. Chạy `npm run dev` và mở `/xem-thu-cap-bac` trong cửa sổ/trình duyệt chưa lưu promotion preview để xem khoảnh khắc thăng cấp.
3. Kiểm tra Điện Danh Vọng, form mục tiêu học viên, thanh toán và hộp xóa học viên quản trị.
4. Bật hệ điều hành “Reduce motion” và xác nhận mọi dịch chuyển/co giãn trở thành fade.
5. Mở Reading, một bài làm, Feynman Review và AI Feynman quản trị để xác nhận các vùng này vẫn tĩnh.
