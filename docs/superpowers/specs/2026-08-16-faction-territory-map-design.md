# Đặc tả bản đồ lãnh địa Ngụy — Thục — Ngô

Ngày: 2026-08-16
Trạng thái: Đã duyệt hướng thiết kế, chờ duyệt đặc tả viết
Phạm vi: Bản đồ Chiến Dịch trên trang chủ và trang chiến dịch học viên

## 1. Mục tiêu

Tách ba “Lãnh địa chưa khai mở” khỏi bản đồ tám cửa ải và đưa chúng vào một bản đồ Tam Quốc riêng, đặt ngay phía trên bản đồ tám cửa ải. Bản đồ mới dùng bốn ảnh do chủ dự án cung cấp theo đúng cấu trúc layer, cho phép người dùng khám phá từng lãnh địa bằng hover hoặc bàn phím nhưng chưa được chọn phe.

Trải nghiệm phải làm rõ ba ý:

1. Ngụy, Thục và Ngô là ba phe tương lai, không phải ba cửa ải tiếp theo.
2. Mỗi lãnh địa vẫn khóa với thông báo chính xác “Mở khi đạt cấp bậc yêu cầu”.
3. Bản đồ tám cửa ải bên dưới tiếp tục là hành trình học tập hiện tại.

## 2. Ngoài phạm vi

- Không thêm bảng, cột, API hoặc dữ liệu lựa chọn phe.
- Không cho phép click để gia nhập Ngụy, Thục hoặc Ngô.
- Không đặt điều kiện cấp bậc cụ thể cho từng phe ở giai đoạn này.
- Không thêm thành trì hoặc nhân vật chưa có tài nguyên được duyệt.
- Không thay đổi Reading, phòng thi, kết quả Reading, Feynman Review hoặc quản trị AI Feynman.
- Không triển khai hai chế độ ADMIN trong cùng thay đổi này; đó là chu kỳ tiếp theo.

## 3. Mapping tài nguyên

Bốn ảnh nguồn đều có kích thước 1672 × 941. Ba ảnh lãnh địa có alpha; ảnh nền không có alpha. Mapping đã được chủ dự án duyệt:

| Layer | Ảnh nguồn | Tệp đích |
|---|---|---|
| Base Map | `ChatGPT Image Aug 16, 2026, 06_15_16 PM (1).png` | `public/art/territories/base-map.webp` |
| Ngụy | `ChatGPT Image Aug 16, 2026, 06_15_16 PM (2).png` | `public/art/territories/wei.webp` |
| Thục | `ChatGPT Image Aug 16, 2026, 06_15_17 PM (3).png` | `public/art/territories/shu.webp` |
| Ngô | `ChatGPT Image Aug 16, 2026, 06_15_17 PM (4).png` | `public/art/territories/wu.webp` |

Ảnh đích được tối ưu sang WebP nhưng bắt buộc giữ nguyên kích thước, vị trí pixel và alpha. Sau chuyển đổi phải kiểm tra lại kích thước, kênh alpha và chụp ảnh composite để phát hiện lệch layer.

## 4. Kiến trúc component

Tạo `FactionTerritoryMap` là client component độc lập và đặt nó trước `CampaignMap` trong `CampaignWorldSection`.

Thứ tự hiển thị từ dưới lên:

1. `territory-base-layer`: Base Map.
2. `territory-wei-layer`: ảnh Ngụy.
3. `territory-shu-layer`: ảnh Thục.
4. `territory-wu-layer`: ảnh Ngô.
5. `territory-landmarks-layer`: ba nhãn phe, biểu tượng khóa và thông báo mở khóa.
6. `territory-interaction-layer`: SVG trong suốt nhận hover theo vùng lãnh thổ và ba điểm focus HTML tương ứng.

Lớp nhân vật chưa được render. Ranh giới component và tên lớp được giữ ổn định để có thể chèn `territory-character-layer` giữa địa danh và tương tác trong tương lai.

`CampaignMap` chỉ còn tám cửa ải. Khối `world-locked-territories` và ba vị trí giả lập hiện tại bị xóa. `CampaignTimelineMobile` cũng bỏ danh sách lãnh địa cũ vì bản đồ mới sở hữu toàn bộ phần này.

## 5. Mô hình dữ liệu

Ba phần tử lãnh địa đổi từ mã chung sang mã có nghĩa. Tạo kiểu `TerritoryPlace` chuyên biệt để bổ sung `artKey` mà không làm nặng dữ liệu của địa điểm và đại thí:

| Code | `artKey` | Tên | Nhãn chức năng | Trạng thái |
|---|---|---|---|---|
| `TERRITORY_WEI` | `wei` | Ngụy | Lãnh địa phía bắc | Khóa |
| `TERRITORY_SHU` | `shu` | Thục | Lãnh địa phía tây | Khóa |
| `TERRITORY_WU` | `wu` | Ngô | Lãnh địa phía đông nam | Khóa |

Cả ba tiếp tục có `href: null` và `lockedMessage: "Mở khi đạt cấp bậc yêu cầu"`. Dữ liệu chỉ mô tả giao diện; không tạo faction membership.

## 6. Tương tác desktop

Trạng thái ban đầu cho thấy đồng thời cả ba lớp lãnh địa ở opacity `0.68`, đủ để đọc được toàn bản đồ.

Khi pointer đi vào vùng SVG của một phe hoặc focus đi vào nhãn phe:

- Lớp phe đang hoạt động tăng opacity lên `1` để trở thành tiêu điểm.
- Hai lớp còn lại giảm opacity xuống `0.18`.
- Base Map không thay đổi, giúp người dùng giữ định hướng không gian.
- Nhãn của phe đang hoạt động tăng độ tương phản; khóa và thông báo vẫn hiển thị.

Khi pointer rời bản đồ hoặc focus rời toàn bộ nhóm, cả ba lớp trở về trạng thái ban đầu. Vùng SVG chỉ dùng cho pointer; ba nút nhãn HTML với `aria-disabled="true"` là điểm focus bàn phím tương ứng. SVG chỉ nhận pointer trên chính các path, nên không chặn tương tác ngoài vùng lãnh thổ. Các nút không dùng thuộc tính `disabled`, vì phần tử disabled không nhận focus và sẽ làm mất khả năng khám phá bằng bàn phím.

Click, Enter và Space không điều hướng, không tạo dữ liệu và không chọn phe. Giao diện chỉ phản hồi bằng trạng thái sáng/mờ và nội dung khóa hiện có.

## 7. Motion

Đây là tương tác có tần suất trung bình; mục đích là **chỉ báo trạng thái**, không phải trang trí.

- Công cụ: CSS transition.
- Thuộc tính: chỉ `opacity`.
- Thời lượng: 180ms.
- Easing: `ease` cho hover/focus.
- Không scale, parallax, rung, phát sáng liên tục hoặc chuyển động chuột.
- Hover chỉ áp dụng trong `@media (hover: hover) and (pointer: fine)`.
- Với `prefers-reduced-motion: reduce`, vẫn giữ crossfade opacity để trạng thái dễ hiểu nhưng rút xuống 120ms và không thêm transform.

## 8. Responsive

Ưu tiên desktop theo yêu cầu dự án.

- Từ `lg` trở lên: hiển thị đầy đủ bản đồ layer, vùng SVG và ba nhãn khóa.
- Dưới `lg`: dùng chính bốn layer để tạo composite tĩnh, kèm ba thẻ Ngụy — Thục — Ngô ngay bên dưới. Không tạo thêm ảnh composite và không cố mô phỏng hover trên touch.
- Bản đồ tám cửa ải tiếp tục dùng desktop map và mobile timeline như hiện tại.

## 9. Khả năng truy cập

- Bản đồ có heading và mô tả ngắn giải thích đây là ba phe tương lai.
- Nhãn HTML của mỗi phe có tên rõ: “Ngụy — Mở khi đạt cấp bậc yêu cầu”, tương tự cho Thục và Ngô.
- Focus ring dùng token navy/gold hiện có và luôn nhìn thấy.
- Màu/opacity không phải tín hiệu duy nhất; tên phe, biểu tượng khóa và câu trạng thái luôn hiện bằng chữ.
- SVG trang trí và ảnh layer được ẩn khỏi accessibility tree; nội dung đọc nằm ở nhãn HTML.

## 10. Fallback và lỗi tài nguyên

- Khung bản đồ có nền paper/cream hiện có để không xuất hiện vùng trống đen khi ảnh tải chậm.
- Base Map là lớp định hướng chính; nếu một overlay lỗi tải, hai phe còn lại và ba nhãn vẫn hoạt động.
- Không có nhánh lỗi dẫn tới mở khóa hoặc kích hoạt href.

## 11. Kiểm thử và xác minh

### Kiểm thử tự động

- `LOCKED_TERRITORIES` có đúng ba phần tử theo thứ tự Ngụy — Thục — Ngô.
- Mã, tên, nhãn chức năng và mapping asset đúng như bảng đặc tả.
- Cả ba `href` là `null`.
- Cả ba dùng đúng câu “Mở khi đạt cấp bậc yêu cầu”.
- Test campaign world hiện có vẫn giữ thứ tự Nguyệt Thí — Dương Thí — Thiên Thí.
- `npm.cmd test`, `npx.cmd tsc --noEmit`, `npm.cmd run lint` và production build phải đạt.

### Kiểm tra trình duyệt

- Bản đồ mới nằm phía trên bản đồ tám cửa ải ở trang chủ và trang chiến dịch học viên.
- Hover từng vùng nhận đúng Ngụy, Thục và Ngô; lớp được chọn sáng, hai lớp kia mờ.
- Di chuyển nhanh giữa ba vùng không giật hoặc restart keyframe.
- Tab qua ba nhãn tạo hiệu ứng tương đương hover và focus ring rõ.
- Click/Enter/Space không điều hướng và không tạo dữ liệu.
- Chế độ reduced motion chỉ crossfade nhẹ.
- Ba thẻ lãnh địa cũ không còn xuất hiện trong bản đồ tám cửa ải hoặc mobile timeline.
- Reading và Feynman giữ nguyên giao diện tĩnh.

## 12. Tiêu chí hoàn tất

Thay đổi hoàn tất khi người dùng nhìn thấy hai bản đồ có vai trò tách biệt: bản đồ Tam Quốc để khám phá ba phe tương lai và bản đồ tám cửa ải để tiếp tục học. Không có đường nào cho phép chọn phe trước khi hệ thống cấp bậc và faction membership được thiết kế ở giai đoạn sau.
