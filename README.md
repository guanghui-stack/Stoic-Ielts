# STOIC · IELTS

**Nhận thức · Hành động · Ý chí**

STOIC · IELTS là nền tảng luyện IELTS Reading được thiết kế quanh tinh thần Khắc kỷ: tập trung vào điều có thể kiểm soát, hành động có chủ đích và kiên trì với một nhịp học bền vững. Sản phẩm do **Công ty TNHH Kết Nối Toàn Cầu** (Wobridges — World Bridges) phát triển.

Nền tảng không hứa hẹn một con đường tắt. Mỗi kết quả được đặt cạnh quá trình tạo ra nó: band điểm, độ chính xác và thời gian chỉ có ý nghĩa khi đi cùng bài làm thật, lần chữa lỗi có bằng chứng, ngày học thực tế và sự liêm chính. Người học không cần kiểm soát đề thi, người chấm hay kết quả tức thời; người học có thể kiểm soát cách chuẩn bị, cách nhìn lại và việc tiếp tục làm đúng bước tiếp theo.

Mọi nội dung giao diện, tài liệu và metadata dùng tiếng Việt. Các thuật ngữ IELTS như Reading, Academic, General, band và Feynman được giữ khi cần thiết để bảo đảm tính chính xác chức năng. Không ký tự chữ Hán được sử dụng trong sản phẩm; quy tắc này được `npm run test:no-han` kiểm tra tự động.

## Tính năng

**Trang công khai** dùng hệ thiết kế STOIC · IELTS: nền sáng dịu, mực xanh đậm, lavender làm điểm tập trung, ruby để cảnh báo, sage cho trạng thái tích cực và các vòng tròn mở tượng trưng cho vùng kiểm soát. Typography, card, tag, table, calendar và trạng thái chờ AI dùng chung cùng một hệ token.

- Trang chủ Reading với câu chuyện Vòng tròn kiểm soát.
- Hai kho đề tách biệt: **Academic** và **General**.
- Dấu Mốc Cộng Đồng và bảng Thông Báo tiến bộ.
- Diễn đàn học tập với tag chủ đề, quyền truy cập theo chặng và cơ chế chỉ đọc trong thời gian thử thách.
- Các thử thách tháng, quý và năm với điều kiện tuyển chọn giữ nguyên.

**Nền tảng học viên**:

- Đề Reading đúng format IELTS với đồng hồ đếm ngược và tự nộp khi hết giờ.
- Chấm điểm tự động ngay lập tức.
- Ghép ba passage Academic thành Full Test 60 phút.
- Nhìn lại lỗi bằng phương pháp Feynman.
- Theo dõi tiến độ, lịch sử bài làm, ngày học và các dấu mốc đã đạt.
- Dashboard trình bày dữ liệu theo tinh thần quan sát không phán xét: biết điều gì đã xảy ra, chọn điều có thể làm tiếp.

**Khu quản trị** (`/quan-tri`):

- Quản lý đề Reading và chọn kho Academic hoặc General.
- Ẩn/hiện đề, phân quyền truy cập và quản lý học viên.
- Quản lý bộ đề dấu mốc, thử thách, thanh toán và phần thưởng.
- Theo dõi diễn đàn, liêm chính và số liệu Feynman AI bằng bảng dữ liệu responsive.

## Nguyên tắc sản phẩm

| Nguyên tắc | Cách thể hiện trong sản phẩm |
|---|---|
| Điều có thể kiểm soát | Người học được dẫn về bài làm, lỗi, lịch học và bước tiếp theo thay vì bị ám ảnh bởi kết quả ngoài tầm tay. |
| Nhận thức trước hành động | Mỗi lần chữa bài bắt đầu từ bằng chứng trong passage, câu trả lời và thời gian đã dùng. |
| Kỷ luật không phô trương | Calendar, streak và lịch sử chỉ ghi nhận hành vi học thật; không tạo áp lực bằng thông báo thừa. |
| Tiến bộ có kiểm chứng | Dấu mốc dựa trên điều kiện dữ liệu rõ ràng, không mua bằng điểm hay tiền. |
| Tôn trọng sự tập trung | Animation có cấp độ; vùng học và phòng thi mô phỏng giữ nguyên hành vi, không có hiệu ứng gây xao nhãng. |

## Ranh giới mô phỏng thi thật

Các route phòng thi, kho luyện, route làm bài, route kết quả/chữa bài và các màn hình thí luyện/tự vấn của học viên là **vùng protected**. Rebrand chỉ thay đổi lớp nhận diện ở các bề mặt được phép; không thay đổi câu hỏi, timer, tự nộp, chấm điểm, dữ liệu bài làm, logic chữa bài, hành vi keyboard, layout đặc thù hoặc motion policy của những vùng này.

Guardrail checksum nằm tại `docs/PROTECTED-SURFACES.sha256`. Chạy `npm run test:protected-surfaces` trước mỗi commit liên quan đến giao diện. Nếu một tệp protected thay đổi, kiểm thử sẽ dừng để tránh thay đổi mô phỏng thi ngoài chủ đích.

## Công nghệ

| Thành phần | Lựa chọn |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript, Turbopack) |
| CSDL | MySQL qua Prisma 6 |
| Xác thực | Email + mật khẩu (bcryptjs), phiên JWT cookie (jose) |
| Giao diện | Tailwind CSS 4, lucide-react và hệ token STOIC · IELTS |
| Tài sản thị giác | SVG deterministic, không chứa chữ, được quản lý qua art manifest |
| Kiểm thử bảo vệ | Checksum SHA-256 cho các route, component, logic và dữ liệu protected |

## Chạy trên máy local

```bash
npm install
# Tạo .env.local và điền DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD
npx prisma db push
node prisma/seed.mjs
npm run dev
```

Tài khoản quản trị lấy email từ `ADMIN_EMAIL` và mật khẩu từ `ADMIN_PASSWORD`. Không lưu mật khẩu thật trong repository công khai. Xem [DEPLOY.md](./DEPLOY.md) để biết quy trình triển khai.

Các lệnh kiểm tra chính:

```bash
npm run lint
npm run build
npm run test:protected-surfaces
npm run test:no-han
```

## Cấu trúc chính

```text
src/
├── app/                 # Trang công khai, học viên, quản trị và phòng thi
├── components/          # Header, footer, UI primitives, Reading CBT, admin
├── lib/                 # Server actions, session, chấm Reading, database, motion
└── app/globals.css      # Token baseline và lớp theme Stoic scoped
public/
└── art/stoic/           # SVG hero, quỹ đạo và ba trụ
prisma/
├── schema.prisma
└── seed.mjs
docs/
├── BRAND-GUIDELINE.md
├── STOIC-CONTENT-RESEARCH.md
├── STOIC-CONTENT-MIGRATION.md
├── REBRAND-BASELINE.md
└── PROTECTED-SURFACES.sha256
```

## Tài liệu nhận diện

- [Brand Guideline](./docs/BRAND-GUIDELINE.md) — token, typography, màu, layout, tag, table, calendar, AI waiting, motion và prompt thiết kế.
- [Nghiên cứu nội dung Stoic](./docs/STOIC-CONTENT-RESEARCH.md) — nguồn tham khảo và nguyên tắc diễn giải bằng tiếng Việt.
- [Ma trận chuyển đổi nội dung](./docs/STOIC-CONTENT-MIGRATION.md) — thuật ngữ hiển thị mới, mã nội bộ được giữ và vùng không được đổi.
- [Baseline và vùng bảo vệ](./docs/REBRAND-BASELINE.md) — mốc kiểm thử, build và checksum trước/sau rebrand.
