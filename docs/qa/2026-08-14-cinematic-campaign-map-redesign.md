# QA — cinematic campaign map redesign

Ngày kiểm chứng cuối: 16/08/2026  
Nhánh: `feat/cinematic-campaign-map-redesign`  
Mốc đặc tả dùng để đối chiếu phạm vi: `1b9fc54`  
Commit sửa artwork phát hiện trong QA: `505d58b`

## Kết luận

Các cổng tự động, production build Webpack, kiểm tra nguồn, kiểm tra phạm vi và
audit ảnh tĩnh đều đạt. Reading/Feynman, phòng thi, bài làm và AI Feynman quản
trị không có source diff kể từ commit đặc tả. Không có thay đổi Prisma, API,
lockfile, dependency hoặc luật nghiệp vụ.

Ma trận trình duyệt cuối chưa thể chạy lại vì Codex Browser đã chặn URL
localhost theo chính sách ở Task 6. Không dùng trình duyệt thay thế hoặc đường
vòng. Những mục chưa quan sát được được ghi là `CHƯA CHẠY`, không suy diễn từ
test nguồn. Ảnh baseline và ảnh kết quả đã thu trước khi chính sách chặn có
hiệu lực vẫn được dẫn bên dưới.

## Cổng kỹ thuật

| Lệnh | Kết quả ngày 16/08/2026 | Ghi chú |
| --- | --- | --- |
| `npm.cmd run test:motion-route` | PASS | Tier 0/1/2 và toàn bộ route bảo vệ đúng bảng |
| `npm.cmd run test:campaign-world` | PASS | Ba lãnh địa khóa; không destination; đúng copy; đúng thứ tự ba kỳ thi |
| `npm.cmd run test:ceremony` | PASS | Khóa phiên bản, one-shot, storage fallback và cửa sổ 14 ngày |
| `npm.cmd run test:no-han` | PASS | Không có ký tự Hán trong source/tài liệu; pixel được audit riêng |
| `npx.cmd tsc --noEmit` | PASS | Không có lỗi TypeScript |
| `npm.cmd test` | PASS | Toàn bộ chuỗi test mặc định, exit 0 |
| `npm.cmd run lint` | PASS | ESLint, exit 0 |
| `npm.cmd run build -- --webpack` | PASS | Next.js 16.2.10; compile, TypeScript, page data và 20 static pages đều hoàn tất |
| `git diff --check` | PASS | Không có whitespace error |

`test:student-pages` dùng MySQL cục bộ đã PASS tại Task 8 và dọn dữ liệu thử
nghiệm sau khi chạy. Test này không nằm trong chuỗi `npm test` mặc định.

Theo quyết định đã duyệt, không tạo `scripts/test-cinematic-contracts.mjs` và
không thêm `test:cinematic-contracts`; các contract được chứng minh bằng behavior
tests, TypeScript, lint, source/diff checks và review.

Build mặc định qua Turbopack không phải cổng phát hành của nhánh này vì parser
coi hai selector Reading có sẵn `::highlight(wb-hl)` và
`::highlight(wb-note)` là lỗi. Build Webpack đạt và chỉ cảnh báo hai selector
này. Không sửa chúng vì thuộc vùng Reading được bảo vệ. Next.js còn cảnh báo
workspace có nhiều lockfile; Node test còn cảnh báo
`MODULE_TYPELESS_PACKAGE_JSON`; cả hai đều không làm lệnh thất bại.

## Bằng chứng ranh giới và dữ liệu

Lệnh sau trả về rỗng:

```powershell
git diff --name-only 1b9fc54 -- "src/app/(exam)" "src/app/(site)/luyen-tap/reading" "src/app/(site)/hoc-vien/bai-lam" "src/app/(site)/quan-tri/ai-feynman"
```

Các kiểm tra bổ sung:

- `git diff --name-only 1b9fc54 -- prisma "src/app/api"`: không có output.
- `git diff --name-only 1b9fc54 -- package-lock.json`: không có output.
- Diff `package.json` chỉ đăng ký `test:motion-route`, `test:campaign-world`,
  `test:ceremony` và nối chúng vào `npm test`; không thêm dependency.
- `campaign-map.tsx`, `world-landmark-rail.tsx` và `next-step-guide.tsx` không
  import Prisma/db và không truy cập `db.*`.
- `test:campaign-world` xác nhận đúng ba lãnh địa; tất cả không có destination
  và dùng đúng “Mở khi đạt cấp bậc yêu cầu”.
- Không có world import trong source của các route bảo vệ nêu trên.

## Route và visual QA

### Bằng chứng đã chụp

- Baseline route tĩnh: `.superpowers/qa/cinematic-redesign/baseline/`.
- Bản đồ desktop và landmark rail:
  `.superpowers/qa/cinematic-redesign/task-4-campaign-map.png` và
  `.superpowers/qa/cinematic-redesign/task-4-landmark-rail.png`.
- Trang chủ 1440/1920:
  `.superpowers/qa/cinematic-redesign/task-5-home-hero.png`,
  `.superpowers/qa/cinematic-redesign/task-5-home-map.png`,
  `.superpowers/qa/cinematic-redesign/task-5-home-guide.png`.

Ở Task 4, DOM xác nhận không có `href="#"`, có ba lãnh địa khóa trong mỗi
world preview và có landmark rail. Ở Task 5, trang chủ có một SceneHero, đúng
ba NarrativeSection, một next-step, một bản đồ, một rail và không overflow ở
1440/1920. Đây là bằng chứng trước khi Codex Browser bắt đầu chặn localhost.

### Ma trận cuối

| Khu vực | Route/viewport dự kiến | Trạng thái |
| --- | --- | --- |
| Public | `/`, `/nghi-su-duong`, `/dien-danh-vong`, `/bang-vang`, ba trang đại thí; 1440/1920/390 | Một phần đã có ảnh Task 5; phần còn lại CHƯA CHẠY |
| Student | `/hoc-vien`, `/hoc-vien/chien-dich`, `/hoc-vien/danh-hieu`; 1440/390 | CHƯA CHẠY do localhost policy |
| Transaction | `/dang-nhap`, `/thanh-toan`; 1440/390 | CHƯA CHẠY lại; route policy và source review đạt |
| Admin | `/quan-tri`, một bảng, một form; 1440 | CHƯA CHẠY do localhost policy |
| Protected | Sáu baseline route, cùng viewport/state | Baseline có ảnh; lần chụp đối chiếu cuối CHƯA CHẠY; source diff rỗng và route policy đạt |

Reduce Motion đã được kiểm tra ở source/review: Tier 1/2 loại translate, scale,
path draw, parallax và clip reveal; ceremony giảm còn fade 120ms; Tier 0 không
có world shell. Việc toggle thực trên home map, student map, ceremony và admin
dialog CHƯA CHẠY lại do cùng giới hạn browser.

Fallback CSS luôn nằm dưới artwork và giữ chiều cao/độ tương phản; `InkWashArt`
tự ẩn ảnh lỗi. Việc chặn từng request trong DevTools CHƯA CHẠY lại. Trang chủ
đã bỏ tham chiếu video chưa kiểm định và dùng ảnh tĩnh sạch, nên không còn lớp
video che lên fallback/artwork.

## Audit artwork

Đã mở và kiểm tra trực quan toàn bộ ảnh tĩnh dùng trong thế giới:

| Asset | Kết quả |
| --- | --- |
| `public/art/campaign/map-loan-the-quan-hung-tam-phan.webp` | Sạch; ấn đỏ để trống |
| `public/art/home/trieu-van-hero.webp` | Đã xóa glyph trên cờ; kiểm lại sạch |
| `public/art/generals/trieu-van.webp` | Đã xóa glyph trên cờ; kiểm lại sạch |
| `public/art/generals/quan-vu.webp` | Sạch |
| `public/art/generals/truong-phi.webp` | Sạch |
| `public/art/generals/hoang-trung.webp` | Sạch |
| `public/art/generals/ma-sieu.webp` | Sạch; ấn đỏ để trống |
| `public/art/generals/lu-bo.webp` | Sạch |
| `public/art/trials/trial-01-dao-vien.webp` | Sạch; ấn đỏ để trống |
| `public/art/trials/trial-02-hoang-can.webp` | Sạch; ấn đỏ để trống |
| `public/art/trials/trial-03-hoa-hung.webp` | Sạch; ấn đỏ để trống |
| `public/art/trials/trial-04-ngu-quan.webp` | Sạch |
| `public/art/trials/trial-05-truong-ban.webp` | Sạch; ấn đỏ để trống |
| `public/art/trials/trial-06-hoang-trung.webp` | Sạch; ấn đỏ để trống |
| `public/art/trials/trial-07-ma-sieu.webp` | Sạch; ấn đỏ để trống |
| `public/art/trials/trial-08-lu-bo.webp` | Sạch; ấn đỏ để trống |

`public/art/home/trieu-van-hero.mp4` không thể trích frame vì môi trường không
có FFmpeg hoặc Python. Asset được giữ để xử lý sau nhưng không còn được tham
chiếu từ trang chủ, vì vậy không nằm trong đường render sản phẩm hiện tại.

Hai ảnh Triệu Vân được chỉnh bằng built-in ImageGen theo mode
`precise-object-edit`: chỉ yêu cầu xóa glyph ở cờ phải, giữ nguyên phong cách,
bố cục, nhân vật và không tạo text/ký hiệu mới. Kết quả được chuyển về WebP,
đúng kích thước nguồn và đã kiểm tra lại bằng trình xem ảnh.

## Kết quả code review

Review cuối dùng diff `1b9fc54..HEAD`, bao phủ route policy, server/client
boundary, dữ liệu chiến dịch, map desktop/mobile, ceremony, admin shell,
accessibility, motion CSS, protected-source scope và dependency scope. Quota
subagent của workspace đã cạn nên review được thực hiện trực tiếp theo cùng
checklist, không giả vờ có reviewer độc lập.

- Critical: 0.
- Important: 0.
- Minor: 1, đã sửa ở `fd9f599`. Trang chủ còn wrapper
  `motion-page-entry` cũ bên trong transition Tier 2, khiến hai entry animation
  chạy chồng. Wrapper cũ đã được bỏ; `rg` không còn page nào dùng pattern này.

Sau khi sửa, motion-route, no-Han, TypeScript, lint và diff check đều PASS.
Full test và production build được chạy lại thêm một lần trước khi handoff.

Việc còn lại ở môi trường có browser localhost là hoàn tất các dòng
`CHƯA CHẠY`, đặc biệt protected-route visual comparison và Reduce Motion.
Không cần migration, seed mới, biến môi trường mới hoặc bước deploy đặc biệt.
