# Vận hành website Wobridges trên Hostinger

Website đang chạy theo mô hình:

```
GitHub (guanghui-stack/Wobrigdes-Education)
   │  push code → Hostinger TỰ ĐỘNG triển khai lại
   ▼
Hostinger "Ứng dụng web Node.js" (hPanel) ── CDN ── wobridges.com (DNS tại Vinahost)
   │
   ▼
MySQL của Hostinger  ←  TOÀN BỘ dữ liệu học viên, bài làm, điểm nằm ở đây
```

**Điều quan trọng nhất cần nhớ:** mỗi lần triển khai lại, Hostinger **xóa toàn
bộ file** của lần chạy trước. Vì vậy dữ liệu phải nằm trong **database MySQL**
(đã cấu hình) — tuyệt đối không lưu gì quan trọng vào file trên hosting.

## Thiết lập database MySQL (làm một lần)

1. Vào **hPanel → trang web wobridges.com → Cơ sở dữ liệu** (hoặc nút
   **"Kết nối"** ở mục Yếu tố cần thiết) → tạo một database MySQL mới.
2. Ghi lại: **host, cổng (3306), tên database, tên user, mật khẩu**.
3. Vào **hPanel → Biến môi trường** của website, thêm biến:
   - Tên: `DATABASE_URL`
   - Giá trị: `mysql://TEN_USER:MAT_KHAU@HOST:3306/TEN_DATABASE`
4. Bấm **Tái triển khai**.

Khi khởi động, website tự tạo bảng, tự tạo tài khoản admin + bài mẫu nếu
database trống. Không cần chạy lệnh gì.

## Kiểm tra tình trạng hệ thống

Mở: **https://wobridges.com/api/health**

- `"initStatus": "ok"` + `"database": "ok"` → mọi thứ hoạt động
- `"adminCount": 1` trở lên → tài khoản admin tồn tại
- Có lỗi → gửi nguyên văn nội dung trang này cho người hỗ trợ kỹ thuật

## Cập nhật website

Chỉ cần push code lên nhánh `main` của GitHub — Hostinger tự triển khai trong
1–2 phút (xem tiến trình ở hPanel → Triển khai). Dữ liệu trong MySQL không bị
ảnh hưởng.

## Sao lưu

- Bật **Sao lưu hằng ngày** trong hPanel (mục Sao lưu).
- Database có thể xuất thủ công: hPanel → Cơ sở dữ liệu → phpMyAdmin →
  Export → định dạng SQL → lưu file về máy.

## Tài khoản quản trị

Email đăng nhập: **dangquanghuy17012001@gmail.com**

Mật khẩu **không nằm trong mã nguồn** (repo công khai). Có hai cách đặt:

1. **Qua giao diện (khuyên dùng):** đăng nhập rồi vào **Quản trị → Đổi mật khẩu**.
2. **Qua biến môi trường:** thêm biến `ADMIN_PASSWORD` trong hPanel → Biến môi
   trường, rồi **Tái triển khai**. Mật khẩu chỉ được áp dụng **một lần** khi giá
   trị biến thay đổi, nên mật khẩu bạn tự đổi trong giao diện về sau sẽ không bị
   ghi đè. Muốn đặt lại lần nữa thì sửa giá trị biến rồi triển khai lại.

Biến `ADMIN_EMAIL` (tùy chọn) dùng để đổi email đăng nhập mà không cần sửa mã.
Khi email thay đổi, hệ thống **đổi tên tài khoản cũ** thay vì tạo mới — toàn bộ
lịch sử chấm bài được giữ nguyên. Các tài khoản quản trị mặc định cũ sẽ tự động
bị khóa.

## Thêm/sửa nội dung bài tập

Xem hướng dẫn chi tiết trong [HUONG-DAN-NOI-DUNG.md](./HUONG-DAN-NOI-DUNG.md).
