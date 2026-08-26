# Ma trận nội dung rebrand STOIC · IELTS

**Ngày lập:** 2026-08-26  
**Tác giả:** Manus AI

## Phạm vi kiểm kê

Lần quét baseline tìm thấy **796 dòng khớp trong 158 file** với các thuật ngữ thương hiệu Tam Quốc/Hổ Phù. Con số này bao gồm nội dung hiển thị, comment, tài liệu lịch sử, test, enum và mã định danh nội bộ. Không được thay hàng loạt bằng chuỗi vì nhiều tên đang là hợp đồng dữ liệu.

## Quy tắc phân loại

| Nhóm | Dấu hiệu | Xử lý |
|---|---|---|
| Nội dung hiển thị | JSX, metadata, nhãn navigation, alt text, mô tả, email template | Viết lại sang Stoic. |
| Nguồn nhãn tập trung | `ui-labels.ts`, `nav.ts`, catalog title/description | Ưu tiên sửa trước để lan tỏa nhất quán. |
| Mã định danh | enum, code, DB field, slug, route, function name | Giữ nguyên; thêm ánh xạ nhãn nếu bị lộ ra UI. |
| Test nghiệp vụ | tên fixture, test mô tả rule hiện hữu | Giữ nguyên trừ khi test đang khẳng định copy hiển thị cần đổi. |
| Tài liệu lịch sử | changelog/spec/plan cũ | Giữ như hồ sơ lịch sử hoặc thêm banner “legacy”; không giả vờ đó là đặc tả hiện hành. |
| Vùng thi | file trong `PROTECTED-SURFACES.sha256` | Không thay đổi. |

## Từ điển thương hiệu chính

| Thuật ngữ cũ | Nhãn STOIC · IELTS | Ý nghĩa sản phẩm |
|---|---|---|
| HỔ PHÙ · IELTS | STOIC · IELTS | Tên thương hiệu. |
| Chiến trận · Phục bàn · Luyện binh | Nhận thức · Hành động · Ý chí | Ba chiều thực hành Stoic gắn với học IELTS. |
| Cổng Doanh | Điểm Khởi Tâm | Trang chủ và điểm bắt đầu. |
| Trung Quân Trướng | Nội Tâm | Tổng quan cá nhân và điều mình kiểm soát. |
| Chiến Trận | Thực Hành | Kho bài Reading; nhãn ở ngoài vùng thi mới được đổi. |
| Đại Chiến | Bài Thi Đầy Đủ | Ghép Full Test 60 phút. |
| Chiến Ký | Nhật Trình | Kết quả và lịch sử bài làm. |
| Phục Bàn | Phản Tư | Chữa bài sâu theo Feynman. |
| Chiến Công | Dấu Mốc | Danh hiệu và tiến độ. |
| Chiến Dịch | Hành Trình | Bản đồ cấp bậc và thí luyện. |
| Sổ Sơ Hở | Điểm Cần Rèn | Dạng câu yếu và lỗi lặp lại. |
| Nhật Khóa | Kỷ Luật Ngày | Ngày học thật và nhịp học. |
| Quân Nhu | Học Liệu | Bảng giá và mở khóa nội dung. |
| Nguyệt Thí | Thử Thách Tháng | Cuộc thi hằng tháng. |
| Dương Thí | Thử Thách Quý | Cuộc thi hằng quý. |
| Thiên Thí | Thử Thách Năm | Cuộc thi hằng năm. |
| Bảng Vàng | Thành Quả | Kết quả kỳ thi đã chốt. |
| Điện Danh Vọng | Dấu Mốc Cộng Đồng | Hồ sơ công khai và thành tích. |
| Nghị Sự Đường | Diễn Đàn | Khu trao đổi chung. |
| Bảng Bố Cáo | Thông Báo | Tin cập nhật của cộng đồng. |
| Quân Công | Điểm Thực Hành | Đơn vị thành tích/kinh tế hiện hữu ở lớp hiển thị. |
| Uy vọng | Tín nhiệm | Phản hồi cộng đồng. |
| Cấp bậc | Chặng rèn luyện | Tiến trình hiện hữu, không đổi rule. |
| Phe | Trụ thực hành | Ba nhóm cộng đồng, mã phe giữ nguyên. |
| Lãnh địa | Miền rèn luyện | Vùng trên bản đồ hiện hữu, dữ liệu giữ nguyên. |
| Danh tướng | Phẩm chất dẫn đường | Ánh xạ sáu nhân vật cũ sang sáu phẩm chất. |
| Thí Bút | Tự Vấn | Bài kiểm tra ngắn có bấm giờ. |
| Đấu trường | Thử thách đối chiếu | Đối kháng giữa hai học viên. |

## Ba trụ thực hành

| Mã nội bộ | Nhãn hiển thị mới | Mô tả |
|---|---|---|
| BATTLE | Nhận thức | Thấy đúng dữ kiện, yêu cầu câu hỏi và giới hạn hiện tại. |
| REVIEW | Hành động | Làm điều đúng tiếp theo: tìm bằng chứng, chữa lỗi, ghi quy tắc. |
| DRILL | Ý chí | Lặp lại việc cần làm đủ lâu để tạo năng lực ổn định. |

## Ánh xạ ba phe

Các mã `WEI`, `SHU`, `WU` và mọi quan hệ DB được giữ nguyên. Chỉ nhãn/description/iconography hiển thị đổi.

| Mã nội bộ | Nhãn mới | Trọng tâm |
|---|---|---|
| WEI | Nhận thức | Quan sát rõ, phân biệt dữ kiện với phán đoán. |
| SHU | Hành động | Chọn việc đúng và thực hiện có trách nhiệm. |
| WU | Ý chí | Duy trì nhịp học, chấp nhận khó khăn và quay lại. |

## Ánh xạ sáu nhân vật cũ

Các code nhân vật và liên kết dữ liệu được giữ. Ảnh, tên và mô tả hiển thị đổi sang sáu phẩm chất không nhân hóa bằng danh tướng.

| Vai trò cũ | Phẩm chất mới | Cách dùng |
|---|---|---|
| Triệu Vân | Sự rõ ràng | Đọc đúng yêu cầu và bằng chứng. |
| Quan Vũ | Hành động đúng | Làm việc cần làm, không né lỗi. |
| Trương Phi | Can đảm | Đối diện câu khó và kết quả chưa tốt. |
| Hoàng Trung | Kỷ luật | Tích lũy ngày học thật. |
| Mã Siêu | Thích nghi | Đổi chiến lược khi dữ liệu cho thấy cần đổi. |
| Lữ Bố | Thử thách | Đối thủ phản chiếu giới hạn hiện tại. |

## Cụm nội dung theo route

| Route hiện hữu | Nhãn/narrative mới | Cấu trúc giữ nguyên |
|---|---|---|
| `/` | Điểm Khởi Tâm; vòng tròn kiểm soát; ba trụ | Hero, CTA, hành trình, ba trụ, competition band. |
| `/hoc-vien` | Nội Tâm; điều có thể hành động hôm nay | Dashboard/data cards/actions. |
| `/hoc-vien/nhat-khoa` | Kỷ Luật Ngày | Dữ liệu ngày học và quy tắc streak. |
| `/hoc-vien/so-so-ho` | Điểm Cần Rèn | Phân tích dạng yếu, không đổi tính toán. |
| `/hoc-vien/danh-hieu` | Dấu Mốc | Catalog và điều kiện hiện hữu. |
| `/hoc-vien/chien-dich` | Hành Trình | Cấu trúc map/rank/trial giữ nguyên. |
| `/nghi-su-duong` | Diễn Đàn | Phòng, bài viết và quyền truy cập giữ nguyên. |
| `/bang-bo-cao` | Thông Báo | Dòng tin và filter giữ nguyên. |
| `/dien-danh-vong` | Dấu Mốc Cộng Đồng | Hồ sơ công khai giữ nguyên. |
| `/bang-vang` | Thành Quả | Kết quả/cuộc thi giữ nguyên. |
| `/nguyet-thi`, `/duong-thi`, `/thien-thi` | Thử Thách Tháng/Quý/Năm | Eligibility, ranking và giải thưởng giữ nguyên. |
| `/thanh-toan` | Học Liệu | Giá, SKU, thanh toán và chính sách giữ nguyên. |
| `/quan-tri/**` | Quản trị STOIC · IELTS | Chỉ rebrand shell, copy và presentation. |

## Vùng không thay nội dung

Các route/component/logic có checksum trong `docs/PROTECTED-SURFACES.sha256` không được sửa. Vì vậy, nếu nhãn cũ vẫn xuất hiện bên trong một màn hình protected, đó là intentional legacy và phải được ghi vào allowlist thay vì sửa.

## Tiêu chí hoàn tất content migration

Nhãn tập trung, metadata, brand lockup, public pages, student shell ngoài phòng thi, admin shell, alt text và tài liệu hiện hành phải dùng STOIC · IELTS. Không còn thuật ngữ Tam Quốc hiển thị ở vùng rebrand. Những chuỗi cũ còn lại phải thuộc một trong ba loại có giải thích: mã nội bộ, test nghiệp vụ/tài liệu lịch sử, hoặc vùng protected.
