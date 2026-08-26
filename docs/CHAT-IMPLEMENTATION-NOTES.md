# Box chat học viên — ghi chú triển khai

## Quyết định

Box chat dùng mô hình tin nhắn riêng 1–1, lưu trong database và cập nhật định kỳ mỗi 8 giây bằng `router.refresh()`. Không cần hạ tầng kết nối realtime luôn mở.

## Bảo mật và dữ liệu

`DirectConversation` lưu cặp participant theo thứ tự ổn định để một cặp học viên chỉ có một hội thoại. `DirectMessage` lưu người gửi, nội dung và thời gian. Mỗi participant có mốc `ReadAt` riêng để tính unread. Service kiểm tra membership ở máy chủ cho inbox, đọc hội thoại, đánh dấu đã đọc và gửi tin; tài khoản bot, tài khoản bị vô hiệu hóa và tài khoản không phải học viên bị loại khỏi chat.

## Runtime kiểm tra

Route `/hoc-vien/tin-nhan` đã được tạo. Khi chưa đăng nhập, route chuyển hướng về `/dang-nhap` thay vì trả dữ liệu hoặc lỗi server. Trang chat đặt dưới `StudentNav` với nhãn `Đối Thoại — Tin nhắn riêng với học viên`.

## Chưa kiểm tra bằng tài khoản thật

Do phiên browser hiện tại chưa đăng nhập, chưa thể tạo hai tài khoản học viên để kiểm tra end-to-end việc gửi tin và unread trên runtime. Các lớp TypeScript, lint và production build đã đạt sau khi thêm route chat.
