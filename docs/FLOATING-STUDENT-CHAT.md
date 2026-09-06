# Chatbox học viên

Chatbox dùng hệ nhắn tin riêng hiện có: chỉ học viên đang hoạt động, không phải bot, được đọc cuộc trò chuyện của mình; hai người cần kết bạn để gửi tin. Không thêm bảng database.

## Cách dùng

- “Nhắn tin” trong danh sách bạn bè và bấm một cuộc trò chuyện mở cửa sổ nổi. Liên kết mở trang đầy đủ vẫn có ở đầu cửa sổ; Ctrl/Cmd-click trên danh sách giữ hành vi mở tab.
- Tin chưa đọc mới tự mở chat khi còn chỗ. Desktop hiển thị hai cửa sổ, điện thoại một cửa sổ; các cuộc khác thu thành avatar. Tối đa ba cửa sổ được giữ, danh sách chat vẫn cho mở các cuộc còn lại.
- Cửa sổ đã thu nhỏ giữ nguyên trạng thái khi nhận tin. Tin cũ không mở lại một cửa sổ đã đóng qua mỗi lượt polling. Tin đến không chiếm focus hoặc đẩy cuộc đang soạn khỏi màn hình.
- Yêu cầu focus khi mở thủ công chỉ dùng một lần: đóng rồi nhận tin mới, đổi kích thước màn hình hoặc quay lại sau khi tạm ẩn không phát lại yêu cầu cũ. Thêm trích dẫn vào bản nháp gần đầy sẽ báo để học viên rút gọn, không cắt mất nội dung đang soạn. Thông báo gửi lỗi được giữ riêng, không bị polling xóa mất.
- Enter gửi tin, Shift+Enter xuống dòng; không gửi sớm trong lúc bộ gõ đang ghép ký tự. Giới hạn 2.000 ký tự và quyền gửi vẫn được kiểm lại trên server.
- Có sao chép, trả lời bằng trích dẫn văn bản và trạng thái online từ Presence hiện có. Các nút xóa/chặn/báo cáo trong mẫu không được đưa vào UI vì hệ thống chưa có nghiệp vụ tương ứng.
- Bản nháp được giữ trong bộ nhớ qua thu nhỏ, đóng/mở lại và điều hướng trong nhóm site. Không ghi nội dung riêng vào localStorage/sessionStorage. Tải lại trang, đăng xuất hoặc vào nhóm phòng thi riêng sẽ giải phóng bản nháp.

## Ranh giới làm bài và quyền đọc

Chatbox chỉ gắn vào layout site, không vào nhóm `(exam)`. Route làm bài, Thi Bút/Thi Luyện, thanh toán và xác thực cũng bị chặn bởi quy tắc route. API và action chatbox kiểm thêm lượt `IN_PROGRESS` chưa quá `deadlineAt` để tạm ẩn khi học viên làm bài ở tab khác. Trong tab khác, giao diện cập nhật khi polling/focus/nhận sự kiện; gửi hoặc đọc qua action bị chặn ngay tại lần gọi.

Tin chưa đọc trong thời gian tạm ẩn được phát hiện khi quay lại. Trang xem kết quả được phép chat. Luồng chat trang đầy đủ có sẵn không được thay bằng cơ chế phân quyền mới.

Thông báo Ably vẫn chỉ chứa mã tin và mã cuộc trò chuyện. Chatbox dùng kết nối sitewide, không tạo Realtime client thứ hai. Polling trả metadata của tối đa 50 cuộc, không trả nội dung tin; chỉ cửa sổ cần mở mới tải tối đa 100 tin gần nhất. Fallback 8 giây khi mất realtime, đối soát 60 giây khi đã kết nối, ngừng tải khi tab bị ẩn.

Mọi phản hồi API dùng `private, no-store` và `Vary: Cookie`. Đánh dấu đã đọc yêu cầu mã tin thực sự hiển thị, thuộc đúng cuộc trò chuyện và do người kia gửi. Mốc đọc chỉ tăng đến thời điểm tin đó; tin mới đến trong lúc tải/ghi không bị đánh dấu nhầm. Thu nhỏ và tự bật không đồng nghĩa đã đọc: cửa sổ phải nhận tương tác, ở gần cuối và tab đang hiển thị.

## Thành phần giao diện và kiểm tra

Mẫu `messaging-conversation.tsx` nằm ở `src/components/ui`, đúng alias `@/components/ui` của dự án. Các primitive Avatar, Button, Card, DropdownMenu, ScrollArea, Separator từ mẫu được tích hợp với Radix, TypeScript, Tailwind 4 và token Stoic; cấu hình `components.json` ghi rõ đường dẫn. Không cần khởi tạo lại Tailwind hoặc đổi theme toàn website.

`npm run test:chat-dock` kiểm tra route, dedup tin cũ, bảo toàn cửa sổ đang soạn, xác thực, quyền thành viên, ranh giới làm bài và mốc đọc qua action/API thật với database giả lập. Đã nối vào `npm test`.

Nhánh đã đối chiếu với `main` có trang Đối chiếu đáp án và tín hiệu lời mời Đấu trường. Chatbox giữ nguyên các thay đổi này; trang đối chiếu sau nộp được phép chat, sự kiện lời mời vẫn do thanh lối tắt xử lý riêng. Các kiểm thử mới trên main được giữ trong lệnh `npm test`.

`/xem-thu-chatbox` chỉ mở ở development. Trang này dùng cùng component với bộ truyền dữ liệu minh họa trong bộ nhớ, cho thử gửi/nhận/thu nhỏ/tạm ẩn/lỗi gửi mà không nhắn đến tài khoản thật. Production trả 404. Cần kiểm tra thêm hai tài khoản trên MySQL và Ably thật khi triển khai.
