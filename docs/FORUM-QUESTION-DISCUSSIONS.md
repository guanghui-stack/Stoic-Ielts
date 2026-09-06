# Hỏi từ câu đã nộp và theo dõi thảo luận

## Luồng học viên

- Trang kết quả có “Hỏi cộng đồng” ở mọi câu của bài luyện Reading đã nộp thuộc sở hữu học viên, gồm câu đúng, sai và bỏ trống. Đề thi riêng của Thử thách tháng/Đấu trường không được liên kết.
- Form riêng điền tên passage và số câu; học viên viết điều đang vướng, có thể thêm cách suy luận, xem lại rồi mới đăng. Bậc mặc định là bậc thấp nhất đang mở để dễ nhận giúp đỡ.
- Đề ghép được quy về đúng bài thành phần và mã câu gốc. Số câu trong lượt làm và số câu trong passage được ghi rõ nếu khác nhau. MC_MULTI giữ đúng khoảng số câu.
- Kết quả có liên kết tới tối đa ba thảo luận gần nhất của chính học viên về câu đó (tra tối đa 200 tham chiếu gần nhất trong các bài nguồn). Trang diễn đàn có nhãn passage và “Đã hiểu”.
- Thẻ nguồn dẫn thẳng tới bài trong kho Reading (Academic/General), có lựa chọn mở quyền hiện hành. Tham số `bai` cũng hỗ trợ Full Test dựng sẵn vốn không nằm trong danh sách passage mặc định.

## Dữ liệu và quyền

`ForumQuestionReference` chỉ lưu tham chiếu bài nguồn, mã/số/dạng câu, part, tên passage và hash phiên bản nguồn. Không lưu mã lượt làm, câu trả lời, điểm số, toàn bộ bài làm hay lời giải Feynman. Action tự tra lại chủ sở hữu, trạng thái nộp và metadata; không nhận trích dẫn do trình duyệt gửi. Hash form phải còn khớp khi đăng.

Thẻ trích dẫn kiểm độc lập quyền đọc diễn đàn (bậc, trạng thái bài, tài khoản còn hoạt động) và quyền Reading (bài công khai hoặc grant Reading còn hiệu lực; quản trị viên có quyền đọc). Quyền Feynman và lượt làm cũ không thay thế quyền Reading. Khi không đủ quyền, payload chỉ có tên bài/số câu/dạng câu và đường dẫn mở quyền, không có câu hỏi. Lỗi truy vấn grant đóng quyền trích dẫn.

Trích dẫn chỉ gồm nội dung câu hỏi, chỉ dẫn, lựa chọn và đoạn văn được đề chỉ định với Matching Headings. Không suy ra bằng chứng từ lời giải Feynman. Nếu câu, số câu hoặc passage nguồn đổi, thẻ chuyển sang thông báo nguồn thay đổi, không ghép nội dung mới vào lời bàn cũ.

## “Đã giúp mình hiểu”

Chỉ tác giả chủ đề đang có quyền viết được chọn một phản hồi còn hiển thị của người khác trong cùng chủ đề. Có thể đổi hoặc bỏ chọn. Nhãn “Đã hiểu” là đánh giá của người hỏi, không xác nhận đáp án của giáo viên, không cộng Xu, Đức hạnh hoặc lượt thích. Khi phản hồi bị tác giả gỡ hoặc quản trị viên ẩn, dấu hữu ích được gỡ trong cùng transaction.

Gửi, gỡ, ẩn, đánh dấu hữu ích và đổi lựa chọn theo dõi đều khóa hàng bài trước hàng bình luận/theo dõi, tránh chờ chéo khóa khi hai thao tác xảy ra cùng lúc. Việc gửi bình luận kiểm lại trạng thái bài và bình luận cha bên trong transaction; bài vừa bị đóng/ẩn hoặc cha vừa bị gỡ không nhận phản hồi mới.

## Theo dõi và thông báo

Chủ đề mới tự theo dõi cho người đăng. Người khác có thể theo dõi; lời trả lời trực tiếp cũng báo cho tác giả bình luận nếu họ chưa tắt chủ đề. Không tự báo bài mới, phiếu bầu hay hoạt động toàn diễn đàn. Không gửi email, push thiết bị hoặc nội dung bình luận qua Ably.

`following=false` được giữ để không tự bật lại khi có phản hồi tiếp. Bỏ theo dõi tắt cả trả lời trực tiếp và đánh dấu thông báo cũ đã đọc. Tài khoản bị hạn chế viết vẫn được tắt thông báo.

Mỗi người có tối đa một hàng thông báo mỗi chủ đề, dẫn tới phản hồi mới nhất; trả lời trực tiếp được ưu tiên khi người nhận cũng theo dõi. Không báo hành động của chính mình. Quyền bậc, tài khoản hoạt động, bài/bình luận còn hiển thị được kiểm khi nhận/đọc; nội dung thông báo không chứa trích dẫn hoặc bài làm. Đánh dấu đã đọc có kèm mã bình luận đã thấy để không nuốt thông báo mới đến từ tab khác. Trang theo dõi hiển thị 50 thông báo và 50 chủ đề gần nhất; tự làm mới khi đang mở.

## Triển khai và kiểm thử

- Thêm bốn bảng mới trong cả `schema.prisma` và DDL `init-db.ts`: `ForumQuestionReference`, `ForumHelpfulReply`, `ForumThreadFollow`, `ForumNotification`. Khóa ngoại cascade theo chủ sở hữu/bài/bình luận; không cần ghi file bền vững trên Hostinger.
- Chỉ cập nhật checksum trang kết quả đã nộp trong `PROTECTED-SURFACES.sha256` để thực hiện yêu cầu thêm nút hỏi từng câu. Đây là mở rộng chức năng được người dùng yêu cầu, không phải rebrand phòng thi. Các thay đổi ở trang này chỉ gồm nút/liên kết, anchor và dữ liệu điều kiện hiển thị; giữ nguyên chấm bài, điểm, quyền mở đáp án và luồng Feynman. Các checksum khác giữ nguyên.
- `npm run test:forum-discussions` chạy quy tắc thuần và action/service thật với database giả lập, bao gồm giả mạo chủ lượt, đổi mã nguồn, grant hết hạn/khác tính năng, đề ghép, nhãn hữu ích, phạm vi thông báo và mã đánh dấu đã đọc. Có tình huống tab khác đóng/ẩn chủ đề hoặc gỡ bình luận ngay trước khi ghi, kiểm tra gỡ/ẩn phản hồi hữu ích và thứ tự khóa. Đã gắn vào `npm test`.
- `/xem-thu-forum-discussions` dùng dữ liệu minh họa để kiểm tra responsive, các trạng thái thẻ và bước xem lại form. Các nút ghi dữ liệu bị vô hiệu hóa; route trả 404 ở production.
- Máy phát triển chưa có MySQL: cần kiểm tra tạo bảng và luồng nhiều tài khoản trên database thật khi triển khai. Nhánh tính năng được kiểm tra với `main` mới nhất trước commit/push; việc gộp vào `main` để deploy là bước riêng.
