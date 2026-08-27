# Audit cơ hội animation bằng Three.js

## Kết luận

Repo `mrdoob/three.js` đã được cài tại `/home/ubuntu/three.js`, phiên bản local là `0.185.0`. Repo STOIC · IELTS hiện chưa có dependency `three`; vì vậy Three.js đang được dùng làm nguồn tham khảo kỹ thuật, chưa được đưa vào production. Cấu trúc hiện tại của STOIC · IELTS đã có một motion system CSS theo `motionTier`, `WorldShell`, asset SVG Stoic và mobile fallback riêng. Đây là nền tảng tốt để bổ sung một vài canvas có mục đích, nhưng không nên gắn WebGL toàn site.

> Nguyên tắc đề xuất: Three.js chỉ làm lớp nền thị giác không mang thông tin nghiệp vụ. Tất cả chữ, trạng thái, liên kết và thao tác quan trọng vẫn phải là DOM/HTML có thể truy cập.

## Vị trí nên bổ sung

| Ưu tiên | Vị trí | Phạm vi route | Ý tưởng animation | Mobile | Đánh giá |
|---|---|---|---|---|---|
| P1 | `src/components/brand/ink-wash-hero.tsx` / `SceneHero` | Trang chủ và các trang công khai có hero | Canvas nền với quỹ đạo/vòng tròn kiểm soát, parallax rất nhẹ, phản hồi theo pointer | Dùng SVG hiện tại hoặc canvas tối giản; không chạy WebGL trên màn hình hẹp mặc định | **Ứng viên tốt nhất** vì hero đã có sẵn media slot, safe area cho text và asset fallback. |
| P1 | `src/components/campaign/campaign-map.tsx` | Bản đồ hành trình desktop | Chiều sâu ambient phía sau đường đi, điểm sáng di chuyển chậm dọc tuyến, phản hồi khi hover marker | Giữ nguyên `CampaignTimelineMobile` thuần DOM | **Ứng viên tốt** vì component đã chỉ hiển thị ở `lg`, còn marker/link vẫn là DOM. |
| P2 | `src/components/campaign/faction-territory-map.tsx` | Bản đồ ba trụ trên public/world surfaces | Halo nhẹ quanh trụ đang active, lớp bụi/đường quỹ đạo phản hồi hover/focus | Không thêm WebGL; dùng SVG/CSS mobile fallback hiện có | Phù hợp nếu canvas chỉ là lớp visual phía sau SVG hit area. |
| P2 | `src/components/ui/spotlight-card.tsx` | Ba card Nhận thức–Hành động–Ý chí | Không cần Three.js; hiệu ứng CSS spotlight hiện tại đã đúng mục đích và nhẹ hơn WebGL | Giữ nguyên | **Không khuyến nghị dùng Three.js** ở đây vì không tăng đủ giá trị so với CSS. |
| P3 | `CompetitionPath` trên trang chủ | Public landing page | Hạt sáng hoặc đường nối khi card vào viewport | CSS reveal là đủ | Chỉ nên làm nếu cần một pass trang trí rất nhẹ; không phải điểm ưu tiên. |
| Không dùng | `src/app/(exam)`, `/lam-bai`, `/hoc-vien/bai-lam`, `/luyen-tap/reading`, `/hoc-vien/thi-luyen`, `/hoc-vien/thi-but`, `/xem-thu-cbt` và các route study-static | Phòng thi, làm bài, chữa bài và học tập protected | Không thêm canvas, pointer effect hoặc animation trang trí | Giữ nguyên hoàn toàn | **Cấm thay đổi** theo yêu cầu bảo vệ mô phỏng thi thật. |

## Kiến trúc tích hợp nên dùng

Nếu triển khai, nên tạo một client component nhỏ như `src/components/motion/three-ambient-canvas.tsx`. Component nhận `scene` hoặc `variant` dạng string, không nhận dữ liệu nghiệp vụ; canvas đặt `aria-hidden="true"`, `pointer-events: none` và nằm dưới lớp DOM hiện hữu.

Canvas chỉ nên được mount từ allowlist rõ ràng trong `SceneHero` hoặc `campaign-map`, không mount ở `WorldShell` toàn cục. Cách này bảo đảm `WorldShell` tiếp tục điều khiển motion tier, còn route study-static không thể vô tình nhận Three.js.

| Quy tắc runtime | Mức cần thiết | Cách thực hiện |
|---|---:|---|
| Dừng khi tab ẩn | Bắt buộc | Dùng `visibilitychange` để dừng render loop. |
| Dừng khi ngoài viewport | Bắt buộc | Dùng `IntersectionObserver`; không render scene khi section không nhìn thấy. |
| Reduced motion | Bắt buộc | `prefers-reduced-motion: reduce` chỉ render một frame tĩnh hoặc dùng SVG fallback. |
| Mobile | Bắt buộc | Mặc định không WebGL ở dưới breakpoint `md`; giữ SVG/CSS hiện tại. |
| Pixel ratio | Bắt buộc | Giới hạn `devicePixelRatio` ở mức 1–1.5 để tránh nóng máy và hao pin. |
| Pointer input | Hạn chế | Chỉ đọc pointer trên desktop; không bắt `pointermove` toàn document. |
| Nội dung quan trọng | Bắt buộc | Không vẽ chữ, button, trạng thái hoặc thông tin nghiệp vụ lên canvas. |
| Rendering | Khuyến nghị | Dùng WebGLRenderer cơ bản, `Points`/buffer geometry nhỏ; chưa dùng bloom/postprocessing. |
| Fallback | Bắt buộc | Canvas lỗi hoặc WebGL không có thì asset SVG hiện tại vẫn giữ nguyên trải nghiệm. |

## Thứ tự triển khai hợp lý

Đợt đầu nên thử nghiệm một scene ambient duy nhất ở `SceneHero`, vì đây là khu vực dễ đo hiệu năng và đã có asset fallback. Sau khi kiểm tra tốt trên desktop và mobile, có thể tái sử dụng cùng runtime vào `campaign-map` desktop bằng một variant khác. Không nên triển khai đồng thời nhiều scene hoặc đưa Three.js vào ba spotlight card.

## Tiêu chí chấp nhận

Animation được xem là đạt khi không thay đổi layout hoặc nội dung DOM, không tạo overflow ngang, không làm mất focus/link, tự dừng khi ngoài viewport hoặc tab ẩn, tắt/giảm đúng với reduced motion, có fallback khi WebGL không khả dụng và không làm thay đổi checksum của vùng protected. Cần kiểm tra thêm Lighthouse/Performance trên mobile thật trước khi bật mặc định.

## Nguồn kiểm tra nội bộ

- `src/lib/motion/route-policy.ts` — phân loại route và motion tier.
- `src/components/world/world-shell.tsx` — điểm bọc route công khai và thuộc tính `data-motion-tier`.
- `src/components/brand/ink-wash-hero.tsx` — media slot của hero.
- `src/components/campaign/campaign-map.tsx` — bản đồ desktop đã tách khỏi mobile.
- `src/components/campaign/campaign-timeline-mobile.tsx` — fallback mobile thuần DOM.
- `src/components/campaign/faction-territory-map.tsx` — interaction hover/focus của bản đồ ba trụ.
- `/home/ubuntu/three.js/examples/jsm` — các module Three.js được kiểm tra gồm renderer, controls, postprocessing, shader và geometry.
