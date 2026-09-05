# Lối tắt học viên

Thanh nổi gồm Tin nhắn, Cá nhân, Diễn đàn và Đấu trường. Chỉ tài khoản học viên
đang hoạt động được thấy thanh này. Mỗi mục là một liên kết Next.js thật, mở bằng
một lần bấm; mục hiện tại có `aria-current="page"`.

## Giao diện

- Tái sử dụng token Stoic hiện tại: nền trắng, tím primary, chữ slate, bo pill.
- Desktop mở rộng nhãn khi trỏ chuột hoặc focus. Điện thoại luôn hiện cả bốn nhãn.
- Vùng chạm tối thiểu 48px; có focus ring, nhãn cho screen reader và reduced motion.
- Thanh nằm ngoài vùng chuyển cảnh để không cuộn theo trang hoặc bị transform giữ lại.
- Chừa khoảng cuối trang và safe area. Ẩn khi nhập liệu trên màn hình nhỏ/chạm.
- Ẩn trong phòng thi, Thí Bút, thí luyện, kết quả/Feynman, thanh toán và quản trị.
- Kho Reading vẫn có lối tắt nhưng tắt hiệu ứng theo chính sách route tier 0.

## Tín hiệu tin nhắn

`GET /api/students/shortcuts` trả về duy nhất `hasUnread`, lấy danh tính từ session,
không nhận user ID do trình duyệt chọn, không trả nội dung tin nhắn và không cache.
Một truy vấn SQL có tham số tìm tin từ người khác sau mốc đã đọc của chính học viên.
Tài khoản đối thoại bị khóa, admin hoặc bot được bỏ qua, giống hộp thư hiện có.

Client dùng kết nối Ably sitewide hiện có; sự kiện tin mới chỉ kích hoạt đọc lại
trạng thái. Hộp thư render sau bước đánh dấu đã đọc phát tín hiệu đồng bộ lại.
Khi tab bị ẩn không gọi API. Có đồng bộ dự phòng 60 giây khi mất kết nối realtime,
120 giây khi đã nối, và khi quay lại tab. Không tạo kết nối/presence bổ sung.

## Kiểm chứng

- Xem và thao tác bản desktop và iframe rộng 375px bằng trình duyệt thật.
- Đã xác nhận nhãn mobile, mục đang mở, bật/tắt chấm báo và ẩn trong chế độ làm bài.
- Bấm Tin nhắn ở bản xem thử chuyển khách tới trang đăng nhập, không còn thanh học viên.
- Gọi endpoint khi chưa đăng nhập trả `401`, body rỗng, `Cache-Control: private, no-store`.
- `npm run test:student-shortcuts`: chạy nguyên truy vấn với SQLite trong bộ nhớ;
  kiểm tra người tham gia A/B, người ngoài cuộc, ID chứa SQL, tin tự gửi, mốc đã đọc,
  tin đến sau đó, tài khoản không hợp lệ và quy tắc route.
- `npm run test:chat-realtime` và `npm run test:protected-surfaces`: đạt.
- Trang xem thử tạm đã được xóa khỏi mã nguồn sau khi kiểm tra.

Máy local không có MySQL hoặc phiên học viên production. Chưa thực hiện luồng
hai tài khoản nhận/đọc tin trên production; kiểm thử SQL trong bộ nhớ không thay
thế kiểm thử tích hợp MySQL/Ably sau triển khai.
