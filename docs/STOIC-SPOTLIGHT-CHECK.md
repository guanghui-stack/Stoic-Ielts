# Kiểm tra Stoic Spotlight Cards

## Runtime

Trang chủ `/` đã tải thành công sau khi chuyển icon từ object component sang key chuỗi serializable. Section `#ba-tru` hiển thị đủ ba card theo thứ tự **Nhận thức**, **Hành động**, **Ý chí**.

## Visual

Browser audit xác nhận layout desktop ba cột, card có số thứ tự 01/02/03, icon tương ứng, functional label, mô tả đầy đủ và nền gradient/glow nhẹ theo palette STOIC · IELTS. Các card có viền bo, vòng trang trí và hiệu ứng hover/focus theo CSS scoped dưới `.world-shell`.

## Scope safety

Thay đổi chỉ nằm ở component spotlight, CSS scoped và dữ liệu render section trang chủ. Không chạm route hoặc checksum của khu học/làm bài protected.

## Validation at checkpoint

`npm run lint`, `npm run build` và `npm run test:protected-surfaces` đã đạt. Full `npm test` và diff/commit sẽ chạy ở bước bàn giao cuối.
