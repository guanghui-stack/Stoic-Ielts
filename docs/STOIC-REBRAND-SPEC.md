# Đặc tả rebrand STOIC · IELTS

**Trạng thái:** Đặc tả hiện hành cho lớp thương hiệu và trải nghiệm ngoài vùng protected  
**Ngôn ngữ sản phẩm:** Tiếng Việt  
**Ngày:** 26/08/2026

## 1. Mục tiêu

STOIC · IELTS là một nền tảng học IELTS Reading đặt trên ba hành vi: nhìn rõ bằng chứng, làm đúng bước có thể làm và duy trì nhịp học đủ lâu để tiến bộ được kiểm chứng. Rebrand thay thế câu chuyện Tam Quốc/thủy mặc ở các bề mặt cho phép bằng ngôn ngữ hình học mềm, quỹ đạo, vòng tròn kiểm soát và bảng dữ liệu rõ ràng.

Rebrand **không thay đổi cấu trúc website, route, schema dữ liệu, nghiệp vụ chấm điểm hoặc trải nghiệm mô phỏng thi**. Các thay đổi chỉ tác động đến content hiển thị, brand lockup, token có scope, primitive UI, asset ngoài protected và motion của route được phép.

## 2. Vùng protected tuyệt đối

Các vùng sau không được chỉnh sửa:

| Vùng | Quy tắc |
|---|---|
| Phòng thi | Giữ nguyên layout, timer, keyboard behavior, câu hỏi, nộp bài, tự nộp và trạng thái focus. |
| Kho luyện Reading | Giữ nguyên cấu trúc chọn đề, dữ liệu passage, điều kiện truy cập và CTA nghiệp vụ. |
| Làm bài và kết quả | Giữ nguyên attempt, điểm, lịch sử trả lời, review, chữa bài và các trạng thái lỗi. |
| Thí luyện/tự vấn | Giữ nguyên nội dung, logic và luồng tương tác của các màn hình được checksum. |
| Motion policy protected | Không thêm animation hoặc wrapper mới vào các route tier 0 đã đóng băng. |

Guardrail thực thi tại `scripts/check-protected-surfaces.mjs` và manifest `docs/PROTECTED-SURFACES.sha256`.

## 3. Hệ nhận diện

### 3.1. Ý tưởng

Hình ảnh chủ đạo là **vòng tròn kiểm soát**: một điểm trung tâm cho điều người học có thể làm, các quỹ đạo bên ngoài cho hoàn cảnh cần quan sát nhưng không thể điều khiển ngay. Vòng tròn không đóng kín hoàn toàn để gợi mở lựa chọn và tránh cảm giác phán xét.

### 3.2. Palette

| Vai trò | Màu | Cách dùng |
|---|---|---|
| Canvas | `#F7F8FC` | Nền chính, khoảng thở và vùng đọc dài. |
| Canvas ấm | `#F6EEDF` | Callout, empty state và vùng chuyển sắc nhẹ. |
| Ink | `#202A44` | Chữ chính, heading và đường viền quan trọng. |
| Primary violet | `#5B5FEF` | CTA chính, focus, active state và điểm tập trung. |
| Lavender | `#B8A8F8` | Gradient, border mềm và trạng thái đang xử lý. |
| Ruby | `#D85B78` | Cảnh báo, lỗi và điểm nhấn cần chú ý. |
| Sage | `#33745A` | Thành công, hoàn tất và hành động đã xác nhận. |
| Sherbet | `#D78A58` | Accent phụ cho chuyển tiếp và illustration. |

### 3.3. Typography

Dùng biến font `--font-stoic` trong `WorldShell` cho các route ngoài protected. Heading có nhịp editorial nhưng không làm giảm khả năng đọc; label dùng chữ hoa nhỏ với tracking vừa phải; số liệu dùng tabular numerals. Font baseline của phòng thi không đổi.

## 4. Primitive giao diện

### 4.1. Tag

`TagsInput` dùng cho kênh chat chung. Tag được nhập bằng Enter hoặc dấu phẩy, hỗ trợ xóa bằng Backspace, chống trùng, tối đa năm tag và giới hạn 36 ký tự/tag. Server action chuẩn hóa tag, giới hạn lại ở máy chủ và lưu trong metadata văn bản tương thích bài cũ; không thay schema.

| Trạng thái | Hành vi |
|---|---|
| Trống | Hiện placeholder và hướng dẫn ngắn. |
| Có tag | Mỗi tag là một pill có nút xóa và nhãn đọc được bằng screen reader. |
| Đủ giới hạn | Không nhận thêm, thông báo nhẹ, không làm mất tag cũ. |
| Lỗi nhập | Giữ giá trị hợp lệ, bỏ chuỗi rỗng và ký tự `#` đầu thừa. |

### 4.2. Table

`DataTable` dùng cho dashboard quản trị và các bảng dữ liệu ngoài protected. Table hỗ trợ cột số, status badge, sticky header, chiều cao tối đa, empty state, loading state, chi tiết responsive và caption cho trợ năng. Không dùng DataTable để thay bảng/câu hỏi trong phòng thi.

### 4.3. Calendar

Calendar học tập dùng locale Việt Nam, tuần bắt đầu từ thứ Hai, có nút chuyển tháng keyboard-friendly, legend, ngày hiện tại, ngày đã học và streak. Dữ liệu ngày vẫn lấy từ attempt đã hoàn tất; component chỉ thay cách trình bày ở dashboard ngoài protected.

### 4.4. AI waiting

`AiWaiting` dùng trong các bề mặt AI ngoài protected. Trạng thái phải nói rõ hệ thống đang làm gì, có `aria-live`, progress tùy chọn, variant panel/overlay và fallback khi người dùng bật reduced motion. Không dùng animation vô hạn ở phòng thi hoặc route học đã đóng băng.

## 5. Nội dung và giọng văn

Mỗi màn hình trả lời một câu hỏi thực tế: “Tôi đang thấy gì?”, “Tôi kiểm soát được gì?” và “Bước tiếp theo là gì?”. Câu ngắn, động từ rõ, tiếng Việt phổ thông. Không dùng “Khắc kỷ” để cổ vũ lạnh lùng, chịu đựng vô hạn hoặc đồng nhất giá trị con người với band điểm.

| Trụ | Thông điệp | Ví dụ CTA |
|---|---|---|
| Nhận thức | Nhìn đúng lỗi trước khi sửa. | Xem bằng chứng |
| Hành động | Làm bước kế tiếp trong điều kiện rõ ràng. | Bắt đầu Reading |
| Ý chí | Quay lại và giữ nhịp học có thể duy trì. | Giữ nhịp hôm nay |
| Trách nhiệm | Ghi nhận điều có thể thay đổi lần sau. | Viết điều rút ra |
| Chấp nhận | Đón nhận kết quả đã có rồi chọn hành động tiếp theo. | Xem bước tiếp |

## 6. Motion

Motion được phân theo route:

| Tier | Phạm vi | Quy tắc |
|---|---|---|
| 0 | Phòng thi, kho luyện, làm bài, kết quả/chữa bài, thí luyện protected | Không thêm animation; giữ nguyên baseline. |
| 1 | Giao dịch và quản trị | Fade/press ngắn, không gây phân tán. |
| 2 | Trang công khai, dashboard và cộng đồng | Reveal theo section, stagger tối đa 210ms, hover lift 1px và chuyển màu mềm. |

Mọi animation phải có fallback `prefers-reduced-motion: reduce`. Không animate nội dung dài theo từng dòng; không dùng chuyển động để che trạng thái tải hoặc lỗi.

## 7. Asset

Asset hiện hành nằm trong `public/art/stoic/` và được gọi thông qua `src/lib/brand/art-manifest.ts`:

| Asset | Vai trò |
|---|---|
| `control-circle-hero.svg` | Hero trang chủ và các bề mặt định hướng. |
| `quiet-orbit.svg` | Panel phản tư, trạng thái chờ và trang cộng đồng. |
| `three-virtues.svg` | Section ba trụ và các bề mặt bản đồ đã được chuyển ngữ. |
| `src/app/icon.svg` | Favicon vòng tròn kiểm soát. |

Asset không chứa chữ, không có ký tự chữ Hán và có alt tiếng Việt khi mang ý nghĩa; tài sản trang trí dùng alt rỗng.

## 8. Tiêu chí nghiệm thu

1. Header, footer, navigation, metadata, public pages, dashboard ngoài protected và admin hiển thị STOIC · IELTS bằng tiếng Việt.
2. Không còn tên thương hiệu Tam Quốc ở các bề mặt runtime ngoài các mã nội bộ bắt buộc hoặc tài liệu lịch sử đã đánh dấu.
3. Tag, table, calendar và AI waiting có thể dùng lại, có trạng thái rỗng/lỗi/loading và reduced-motion.
4. SVG Stoic tải được từ manifest; không có chữ trong asset.
5. `npm run lint`, `npm run build`, `npm run test:no-han` và `npm run test:protected-surfaces` đều đạt.
6. Checksum của toàn bộ vùng protected không thay đổi.
