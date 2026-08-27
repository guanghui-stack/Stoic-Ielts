# Audit mobile trang chủ

## Checkpoint 390px

Ảnh chụp headless viewport 390 × 844 sau khi chờ đủ thời gian cho thấy header mobile hiển thị logo/wordmark và nút menu gọn trong một hàng; hero không bị tràn ngang; tiêu đề xuống dòng tự nhiên; phần mô tả có chiều rộng đọc được; hai CTA xếp dọc phù hợp thao tác chạm.

## Ghi chú về lần chụp đầu

Ảnh 320px lần đầu chỉ ghi nhận nền vì chụp trước khi dev server/render hoàn tất. Không dùng ảnh đó làm kết luận; lần retry 390px đã render đầy đủ và được dùng làm checkpoint trực quan hợp lệ.

## Phạm vi tiếp theo

Cần chụp lại 320/375/430px sau khi đã xác nhận cấu hình render ổn định, sau đó định vị section `#ba-tru` để kiểm tra riêng ba spotlight card, chiều rộng chữ và khoảng cách giữa các card trên từng viewport.

## Checkpoint 320px và 375px

Ở 320px, wordmark và menu vẫn nằm gọn trong header; tiêu đề hero xuống nhiều dòng nhưng không cắt chữ; nội dung mô tả giữ lề 24px và không tạo overflow ngang. CTA đầu tiên nằm sát đáy ảnh chụp do hero cao hơn viewport, nhưng vẫn hiển thị đúng trong flow và không bị cố định sai vị trí.

Ở 375px, headline và đoạn mô tả có nhịp xuống dòng tự nhiên hơn; CTA xếp dọc, bề rộng phù hợp thao tác chạm và không có dấu hiệu tràn ngang. Các hiện tượng này phù hợp với thiết kế responsive hiện tại, chưa cần sửa ở hai breakpoint này.

## Ghi chú về ảnh anchor

Một số lần chụp trực tiếp URL có hash `#ba-tru` bằng Chromium headless trả ảnh nền trắng dù log không báo lỗi. Kiểm tra HTTP trả `200`, HTML có đủ section “Ba trụ” và các tên trụ. Vì vậy đây là vấn đề timing/anchor trong headless capture, không phải kết luận card bị trắng trên runtime. Ảnh trang đầy đủ 390px trước đó đã render đúng; cần dùng DOM/layout metrics và ảnh full-page để đánh giá section.

## Đo DOM và ảnh section Ba trụ

DevTools đã đo các card ở 320/375/390/430px. Tất cả đều chuyển về một cột trên mobile; lề trái là 24px và mép phải nằm trong viewport; không phát hiện overflow ngang. Chiều rộng card lần lượt theo viewport là khoảng 272px, 327px, 342px và 382px; chiều cao ổn định khoảng 352px, riêng 320px/“Hành động” tăng nhẹ do nội dung xuống dòng.

Ảnh section ở 390px và 430px xác nhận card không bị tràn, nhưng thao tác scroll tới anchor trong headless đôi lúc giữ phần đầu trang thay vì đưa đúng section vào tâm ảnh. DOM measurement và ảnh full-page vẫn xác nhận layout mobile hợp lệ.
