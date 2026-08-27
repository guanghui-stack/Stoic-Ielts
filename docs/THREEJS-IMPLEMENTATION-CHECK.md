# Kiểm tra triển khai Three.js

## Browser checkpoint

Trang chủ local tải thành công sau khi tích hợp Three.js. Hero hiển thị lớp ambient vòng tròn/quỹ đạo phía sau nội dung, trong khi tiêu đề, mô tả và CTA vẫn là DOM.

Khi cuộn tới bản đồ public desktop, lớp ambient hiển thị phía sau các vòng tròn/route visual; marker, label, trạng thái khóa và link của bản đồ vẫn nằm trên cùng và đọc được. Territory map vẫn giữ các label Nhận thức, Hành động và Ý chí.

## Scope

Canvas được gắn tại Hero, Campaign Map desktop và Faction Territory Map desktop. CSS `display:none` áp dụng dưới breakpoint desktop và khi reduced motion; mobile fallback hiện hữu không bị thay đổi.

## Lưu ý

Browser audit dùng sandbox viewport desktop. Mobile behavior được bảo vệ bằng CSS breakpoint, coarse-pointer guard và SVG/DOM fallback; sẽ được xác nhận thêm bằng test viewport và full regression sau khi hoàn tất cả ba điểm tích hợp.

## Browser runtime sau triển khai

Trang chủ local tải bình thường sau khi mount ba canvas. Hero hiển thị vòng tròn/quỹ đạo ambient, section Ba trụ và nội dung DOM vẫn đầy đủ. Console chỉ ghi nhận Fast Refresh/HMR và thông tin React DevTools; không có lỗi WebGL, hydration hoặc exception từ Three.js.

Khi cuộn trên desktop, Campaign Map/territory visual vẫn giữ marker, label và trạng thái trên lớp canvas. Canvas được đặt `pointer-events: none`, nên không cản link hoặc vùng tương tác hiện hữu.
