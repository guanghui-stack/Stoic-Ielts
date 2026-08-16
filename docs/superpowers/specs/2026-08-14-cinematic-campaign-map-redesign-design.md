# Thiết kế nâng cấp Stoic IELTS — Bản đồ chiến dịch thủy mặc điện ảnh

**Ngày:** 14/08/2026

**Trạng thái:** Đã được người dùng phê duyệt qua ba vòng thiết kế

**Phạm vi:** Toàn bộ giao diện ngoài Reading/Feynman, triển khai theo thứ tự trang công khai → học viên/cấp bậc → quản trị

## 1. Mục tiêu

Nâng cấp toàn bộ trải nghiệm Stoic IELTS để tạo cảm giác của một sản phẩm được đầu tư ở cấp độ cao: mượt mà, sang trọng, có chiều sâu và nhất quán. Branding hiện tại không bị thay thế. Hệ màu kem–navy–vàng đồng, typography editorial, chất liệu giấy cổ, mực thủy mặc và tinh thần Tam Quốc tiếp tục là nền tảng.

Hướng thiết kế đã chốt là **Bản đồ chiến dịch thủy mặc điện ảnh**:

- Thế giới thương hiệu và cảm xúc được ưu tiên trên các trang công khai.
- Bản đồ chiến dịch là xương sống điều hướng và kể chuyện.
- Người mới vẫn luôn hiểu giá trị học tập, nơi cần bắt đầu và bước tiếp theo.
- Motion được dùng theo tầng; không còn nguyên tắc hạn chế số lượng motion ngoài vùng học tập.
- Mọi trang Reading/Feynman giữ nguyên tuyệt đối.

## 2. Quyết định đã được phê duyệt

1. **Bất biến quan trọng nhất:** mọi trang Reading/Feynman, kể cả danh sách đề, phòng thi, kết quả, Feynman Review và quản trị AI Feynman, giữ nguyên.
2. **Hướng thẩm mỹ:** Thủy mặc điện ảnh.
3. **Chiến lược motion:** theo tầng; thao tác thường mềm mại, nghi thức điện ảnh chỉ dành cho khoảnh khắc đặc biệt.
4. **Thứ tự triển khai:**
   1. Trang chủ và các trang công khai.
   2. Khu học viên, chiến dịch, danh hiệu và cấp bậc.
   3. Khu quản trị.
5. **Mục tiêu trang công khai:** xây dựng thế giới thương hiệu trước chuyển đổi đăng ký, nhưng phải chỉ dẫn rõ lộ trình học.
6. **Kiến trúc trải nghiệm:** Bản đồ chiến dịch, không phải cuộn trang tuyến tính hay dashboard thuần tiện ích.
7. **Tầm nhìn ba phe:** hiện ba lãnh địa bị khóa trong sương với thông báo “Mở khi đạt cấp bậc yêu cầu”. Chưa đặt tên, chưa cho tương tác và chưa triển khai luật phe.
8. **Ba kỳ thi liên quan đến tầm nhìn phe:** Nguyệt Thí, Dương Thí và Thiên Thí.

## 3. Mood reference và quy tắc nghệ thuật

Ảnh tham chiếu do người dùng cung cấp được dùng để đọc ngôn ngữ thị giác, không dùng nguyên trạng trong sản phẩm. Những tín hiệu được kế thừa:

- giấy cổ sáng và có vân;
- mực đơn sắc, có độ loang và lớp xa–gần;
- tương phản giữa khoảng lặng lớn và đại cảnh chiến trận;
- nhân vật hoặc đoàn quân chỉ xuất hiện ở cảnh quan trọng;
- dấu chu sa làm điểm neo thị giác;
- bố cục như các chương của một trường quyển.

Ảnh tham chiếu có chữ Hán nên không được đưa trực tiếp vào website. Mọi asset mới phải tuân thủ các quy tắc sau:

- không có chữ Hán, kể cả trên cờ, áo giáp, bảng hiệu, con dấu hoặc chi tiết nền;
- không dùng emoji làm biểu tượng;
- không dùng tranh chiến trận dày đặc làm nền cho mọi section;
- không để art làm giảm độ đọc, độ tương phản hoặc khả năng thao tác;
- có fallback bằng gradient/mực CSS khi ảnh chưa được duyệt hoặc tải lỗi.

## 4. Ranh giới tĩnh tuyệt đối

### 4.1. Các route được bảo vệ

Những nhóm route sau không nhận shell điện ảnh, page transition, section reveal, press transform, parallax, animation nghi thức hoặc motion mới dưới bất kỳ hình thức nào:

- `/luyen-tap/reading` và `/luyen-tap/reading/**`;
- các lối vào Reading tương đương: `/luyen-tap/academic`, `/luyen-tap/general`, `/luyen-tap/ghep-de`;
- `/lam-bai/**`;
- `/hoc-vien/bai-lam` và `/hoc-vien/bai-lam/**`, gồm kết quả và Feynman Review;
- `/quan-tri/ai-feynman` và `/quan-tri/ai-feynman/**`;
- `/xem-thu-cbt`.

Các trang CRUD quản trị như Bài tập, Bộ đề và Chấm bài vẫn thuộc phạm vi nâng cấp quản trị vì đây là công cụ vận hành, không phải trải nghiệm học Reading của học viên. Tuy nhiên, bất kỳ phần nào nhúng trực tiếp giao diện CBT hoặc Feynman phải giữ nguyên và không nhận motion.

### 4.2. Cách bảo vệ

- Dùng một hàm phân loại route tập trung làm nguồn sự thật duy nhất.
- Shell điện ảnh chỉ được render khi route không thuộc danh sách bảo vệ.
- Không đặt page transition ở `src/app/(site)/layout.tsx`, `body` hoặc selector toàn cục có thể ảnh hưởng route bảo vệ.
- Token và style mới được namespace dưới shell mới; không đổi token nền đang được Reading/Feynman sử dụng.
- Component dùng chung giữ giao diện mặc định hiện tại. Biến thể điện ảnh phải được bật tường minh bằng prop hoặc wrapper.
- Không chỉnh component trong các route bảo vệ chỉ để “đồng bộ” với phần còn lại.

“Giữ nguyên” nghĩa là không bổ sung hành vi hoặc phong cách mới vào các trang này. Motion hoặc hành vi cũ vốn có của chúng không bị dọn lại trong đợt này.

## 5. Kiến trúc trải nghiệm Bản đồ chiến dịch

### 5.1. Vai trò của bản đồ

Bản đồ không thay thế hoàn toàn điều hướng truyền thống. Nó là lớp khám phá và kể chuyện nằm trên một hệ điều hướng chức năng, có nhãn rõ và dùng được bằng bàn phím.

Bản đồ phải trả lời được bốn câu hỏi:

1. Tôi đang ở đâu?
2. Tôi có thể khám phá những nơi nào?
3. Tôi cần làm gì tiếp theo?
4. Thành tựu và kỳ thi liên hệ với hành trình học như thế nào?

### 5.2. Thành phần trên bản đồ

- Tám cửa ải hiện có: Đào viên, Hoàng Cân, Hoa Hùng, Ngũ quan, Trường Bản, Khai cung, Tây Lương, Hổ Lao.
- Các địa điểm công khai: Nghị Sự Đường, Điện Danh Vọng và Bảng Vàng.
- Cụm kỳ thi: Nguyệt Thí, Dương Thí và Thiên Thí.
- Ba lãnh địa chưa đặt tên, hiển thị mờ và bị khóa.
- Khối “Bước tiếp theo của bạn” luôn có nội dung chức năng rõ ràng.

### 5.3. Trạng thái người dùng

- Khách chưa đăng nhập thấy bản đồ ở trạng thái khởi đầu và được dẫn tới phần giải thích hệ thống trước khi đăng ký.
- Học viên đăng nhập thấy vị trí, cửa ải hiện tại, cửa ải kế tiếp và tiến độ lấy từ dữ liệu cấp bậc hiện có.
- Nếu dữ liệu cá nhân không tải được, bản đồ quay về trạng thái công khai an toàn và hiển thị liên kết chức năng; không để trang trắng.
- Ba lãnh địa tương lai luôn ở trạng thái khóa trong đợt này, không phụ thuộc database.

### 5.4. Dẫn dắt học tập

Mỗi trang công khai quan trọng phải có một khối hướng dẫn ngắn, trả lời theo ngữ cảnh:

- người học cần hiểu điều gì;
- hành động đầu tiên là gì;
- phần nào nên xem sau đó;
- hành động có đưa vào Reading/Feynman hay không.

Tên cổ phong luôn đi cùng nhãn chức năng thật. Người chưa biết “Điện Danh Vọng” vẫn phải hiểu đó là nơi xem danh hiệu; người chưa biết “Nghị Sự Đường” vẫn phải hiểu đó là cộng đồng thảo luận.

## 6. Hệ thị giác

### 6.1. Branding giữ nguyên

- Nền: kem, giấy và kem đậm.
- Mực: ink, navy và navy đậm.
- Điểm nhấn: vàng đồng; chu sa cho con dấu và nghi thức hiếm.
- Font: Playfair Display cho tiêu đề, Source Serif 4 cho nội dung, Be Vietnam Pro cho nhãn, nút và dữ liệu.
- Mỗi module chỉ dùng một màu accent chức năng; không trộn nhiều màu chiến tướng trên một màn hình.

### 6.2. Cách nâng cấp

- Tăng tương phản kích thước chữ và khoảng thở thay vì thêm nhiều đường viền.
- Dùng section như những cảnh có nhịp, không xếp liên tục các card có trọng lượng ngang nhau.
- Dùng mảng mực lớn cho hero, bản đồ và nghi thức; nội dung thường giữ nền sáng.
- Dùng bất đối xứng có kiểm soát trên desktop, nhưng mọi nội dung quan trọng vẫn nằm trong lưới đọc rõ.
- Dấu chu sa dùng như tín hiệu xác nhận, không phải đồ trang trí lặp ở mọi nơi.

## 7. Hệ motion theo tầng

### Tầng 0 — Tĩnh tuyệt đối

- Phạm vi: toàn bộ route Reading/Feynman được liệt kê ở mục 4.
- Thời lượng mới: `0ms`.
- Không page entry, route transition, parallax, hover transform hoặc nghi thức.

### Tầng 1 — Phản hồi thao tác

- Phạm vi: nút, tab, menu, panel, trạng thái và dialog ngoài vùng bảo vệ.
- Thời lượng: `90–220ms`.
- Mục đích: xác nhận thao tác và quan hệ nhân quả.
- Ưu tiên `transform` và `opacity`; không dùng `transition: all`.

### Tầng 2 — Dẫn chuyện và không gian

- Phạm vi: mở bản đồ, đổi khu vực, section quan trọng, đường hành quân và chuyển trang ngoài vùng bảo vệ.
- Thời lượng: `350–700ms`.
- Mục đích: giúp người dùng hiểu mình vừa đi từ đâu tới đâu.
- Không áp dụng cho mọi section; một màn hình chỉ có một chuyển động chủ đạo tại một thời điểm.

### Tầng 3 — Nghi thức hiếm

- Phạm vi: thăng cấp, mở cửa ải, nhận danh hiệu và công bố kết quả kỳ thi.
- Thời lượng: `900–1600ms`.
- Chỉ chạy một lần cho mỗi sự kiện có định danh; không lặp vô hạn.
- Có thể dùng mực lan, dấu chu sa, ánh vàng và chiều sâu chiến trận, nhưng phải giữ nội dung đọc được.

### Reduce Motion

Khi người dùng bật Reduce Motion:

- loại bỏ parallax, zoom, clip reveal và dịch chuyển không gian;
- giữ tín hiệu đổi trạng thái bằng fade ngắn khi cần;
- route Tầng 0 vẫn hoàn toàn tĩnh, không nhận fade mới.

## 8. Thành phần và ranh giới trách nhiệm

Các đơn vị thiết kế cần tách nhỏ, có nhiệm vụ rõ ràng:

- **World Shell:** tạo nền, chiều sâu, header và ranh giới motion; không chứa dữ liệu nghiệp vụ.
- **World Navigation:** điều hướng chức năng luôn đọc được, độc lập với bản đồ.
- **Campaign Map:** hiển thị địa điểm, cửa ải và trạng thái; nhận dữ liệu đã được chuẩn hóa.
- **Next Step Guide:** quyết định cách trình bày hành động tiếp theo; không tự sửa dữ liệu.
- **Locked Territories:** hiển thị ba lãnh địa khóa từ cấu hình tĩnh.
- **Scene Hero / Narrative Section:** tạo nhịp thị giác cho trang công khai.
- **Motion Boundary:** phân loại route và tầng motion; không chứa style cụ thể của từng trang.
- **Ceremony Layer:** chạy nghi thức một lần dựa trên định danh sự kiện.
- **Command Tent UI:** biến thể dành cho quản trị, ưu tiên mật độ và hiệu quả thao tác.

Mỗi đơn vị phải có giao diện sử dụng rõ và không phụ thuộc trực tiếp vào internals của đơn vị khác. Bản đồ không được đọc Prisma trực tiếp; trang/server component chuẩn hóa dữ liệu trước khi truyền vào.

## 9. Áp dụng theo ba giai đoạn

### Giai đoạn 1 — Trang công khai

- Trang chủ trở thành cổng vào thế giới và Bản đồ chiến dịch.
- Nghị Sự Đường, Điện Danh Vọng, Bảng Vàng, Nguyệt Thí, Dương Thí và Thiên Thí trở thành các địa điểm cùng một hệ.
- Trang đăng nhập, đăng ký và thanh toán dùng cùng chất liệu nhưng motion chủ yếu ở Tầng 1 để giữ sự rõ ràng.
- Danh sách Reading và mọi lối vào Reading giữ nguyên.

### Giai đoạn 2 — Học viên và cấp bậc

- Dashboard học viên trở thành bản đồ cá nhân.
- Cửa ải hiện tại, cửa ải kế tiếp, danh hiệu gần đạt và mục tiêu học tập có thứ bậc rõ.
- Thăng cấp, mở cửa ải và nhận danh hiệu dùng Tầng 3.
- Khi đi vào bài làm, kết quả Reading hoặc Feynman, shell điện ảnh được tháo hoàn toàn.

### Giai đoạn 3 — Quản trị

- Dùng ngôn ngữ “quân trướng”: cùng branding, đường nét gọn, bảng rõ, panel thao tác dễ hiểu.
- Tầng 1 là mặc định; Tầng 2 chỉ dùng cho chuyển khu vực hoặc thay đổi panel có ý nghĩa.
- Không dùng nghi thức chiến trận cho thao tác quản trị thường xuyên.
- Quản trị AI Feynman giữ nguyên tuyệt đối.

## 10. Tầm nhìn ba phe — chỉ chuẩn bị nền

Đợt này không triển khai hệ phe. Những việc sau nằm ngoài phạm vi:

- tên và bản sắc của ba phe;
- cấp bậc đủ điều kiện chọn phe;
- quy tắc gia nhập, đổi hoặc rời phe;
- cách tính tổng điểm và tổng đóng góp;
- trọng số Nguyệt Thí, Dương Thí và Thiên Thí;
- vòng đời mùa giải, chống gian lận, phần thưởng và tranh chấp;
- bảng database, API và trang quản trị phe.

Những nội dung này cần một đặc tả chức năng độc lập. Đợt hiện tại chỉ đảm bảo Bản đồ chiến dịch có vị trí và component phù hợp để gắn hệ phe về sau mà không phá bố cục.

## 11. Trạng thái lỗi, tải và fallback

- Art tải lỗi phải rơi về nền mực/gradient CSS đã kiểm tra độ tương phản.
- Bản đồ không tải được dữ liệu cá nhân phải hiển thị trạng thái công khai và liên kết văn bản tương đương.
- Nút hoặc địa điểm bị khóa dùng trạng thái `aria-disabled` hoặc phần tử không tương tác; không dùng liên kết `#` giả.
- Lỗi form vẫn nằm gần nơi gây lỗi; lỗi toàn form vẫn dùng `role="alert"`.
- Loading không được làm nhảy layout; giữ kích thước vùng bản đồ và panel trước khi dữ liệu đến.
- Logic nghiệp vụ, server action và thông báo hiện có không thay đổi chỉ vì tái thiết kế.

## 12. Tiếp cận, responsive và hiệu năng

- Desktop là sân khấu chính; map và art được thiết kế ưu tiên màn hình lớn.
- Mobile không cần giữ đủ chiều sâu điện ảnh, nhưng phải có danh sách địa điểm và bước tiếp theo dùng được.
- Điều hướng bản đồ có bản tương đương bằng văn bản và bàn phím.
- Focus ring luôn nhìn thấy; vùng chạm tối thiểu 44px.
- Không có animation nền lặp vô hạn trên trang thường.
- Art dùng định dạng tối ưu, kích thước phù hợp và lazy-load khi ở ngoài viewport.
- Motion phổ biến ưu tiên kỹ thuật nhẹ; chỉ thêm thư viện khi implementation plan chứng minh CSS/khả năng trình duyệt không đáp ứng được yêu cầu.

## 13. Kiểm thử và bằng chứng hoàn thành

### 13.1. Kiểm thử ranh giới motion

- Hàm phân loại route có test bảng cho toàn bộ route Tầng 0 và các route được phép motion.
- Test xác nhận World Shell và page transition không render trên route Tầng 0.
- So sánh ảnh trước/sau trên ít nhất: danh sách Reading Academic, phòng thi CBT, kết quả bài làm, Feynman Review và quản trị AI Feynman.
- Kiểm tra computed style trên các trang bảo vệ để xác nhận không có animation hoặc transition mới.

### 13.2. Kiểm thử trải nghiệm

- Khách mới có thể tìm thấy “bắt đầu”, hiểu ba trụ và đi tới lộ trình bằng chuột lẫn bàn phím.
- Học viên thấy đúng vị trí và bước tiếp theo trên bản đồ cá nhân.
- Ba lãnh địa hiển thị khóa, không có thao tác giả và không gọi API.
- Reduce Motion loại bỏ toàn bộ chuyển động không gian.
- Fallback art và fallback dữ liệu vẫn hiển thị nội dung chức năng.

### 13.3. Cổng kỹ thuật bắt buộc

Trước khi push:

```bash
npx tsc --noEmit
npm test
npm run lint
npm run build
```

Ngoài ra phải chạy kiểm tra chữ Hán và rà trực quan asset vì ký tự nằm trong ảnh không thể được test text phát hiện đầy đủ.

### 13.4. Xác minh production

- Đợi Hostinger deploy xong và kiểm tra `/api/health`.
- Rà desktop trên trang chủ, một trang công khai, dashboard học viên và một trang quản trị.
- Rà lại toàn bộ mẫu route Tầng 0 để chứng minh không thay đổi.
- Chỉ coi hoàn thành khi cả trải nghiệm mới và ranh giới tĩnh đều có bằng chứng trực tiếp.

## 14. Tiêu chí chấp nhận

Thiết kế được xem là triển khai đúng khi:

1. Branding hiện tại được nhận ra ngay và không bị thay bằng phong cách fantasy chung chung.
2. Trang công khai tạo được thế giới Tam Quốc thủy mặc có chiều sâu và cảm xúc.
3. Người mới luôn biết giá trị học tập, nơi bắt đầu và bước tiếp theo.
4. Bản đồ chiến dịch kết nối được cửa ải, địa điểm công khai và ba kỳ thi.
5. Ba lãnh địa tương lai hiển thị khóa đúng nội dung, không có chức năng giả.
6. Motion chạy đúng tầng, đúng tần suất và tôn trọng Reduce Motion.
7. Mọi trang Reading/Feynman được chứng minh là giữ nguyên.
8. Trang học viên và quản trị được nâng cấp theo đúng thứ tự đã duyệt.
9. Không có thay đổi database hoặc luật ba phe trong đợt này.
10. Toàn bộ cổng kiểm thử và build đều đạt.
