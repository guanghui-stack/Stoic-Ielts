# Wobridges English Center

Nền tảng website + e-learning của **Trung tâm Anh ngữ Wobridges** (World Bridges — "những cây cầu kết nối thế giới").

## Tính năng

**Trang công khai** (phong cách editorial: nền kem, navy, vàng đồng, serif):

- Trang chủ, Khóa học Intensive 7.0, Khoá E-learning lẻ
- Luyện tập 4 kỹ năng (Reading · Listening · Writing · Speaking)
- Bài mẫu Writing 8.0+ kèm phân tích, Kết quả học viên

**Nền tảng học viên** (đăng ký/đăng nhập bằng email):

- **Reading**: đề chuẩn format IELTS (TFNG, Multiple Choice, Completion), đồng hồ đếm ngược, tự nộp khi hết giờ, chấm điểm tự động ngay lập tức
- **Writing**: Task 1 & Task 2 với bộ đếm từ + đồng hồ đếm ngược, autosave mỗi 20 giây, nộp cho giáo viên chấm
- Hồ sơ học tập: tiến độ, lịch sử bài làm, xem điểm và nhận xét

**Khu quản trị** (`/quan-tri`):

- Tổng quan: thống kê + hàng chờ chấm
- Chấm bài Writing với band điểm + nhận xét theo rubric
- Quản lý bài tập: tạo/sửa đề Reading (JSON) & Writing (form), tùy chỉnh thời gian từng bài, ẩn/hiện đề
- Quản lý học viên: khóa tài khoản, đặt lại mật khẩu

## Công nghệ

| Thành phần | Lựa chọn |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript, Turbopack) |
| CSDL | MySQL (Hostinger) qua Prisma 6 — dữ liệu bền vững qua các lần deploy |
| Xác thực | Email + mật khẩu (bcryptjs), phiên JWT cookie (jose) |
| Giao diện | Tailwind CSS 4, lucide-react, Google Fonts hỗ trợ tiếng Việt (Playfair Display, Source Serif 4, Be Vietnam Pro) |

## Chạy trên máy local

Cần một database MySQL (cài local, hoặc dùng database dev riêng trên Hostinger
có bật remote access). Sau đó:

```bash
npm install
# tạo file .env theo .env.example, điền DATABASE_URL của MySQL
npx prisma db push        # tạo bảng
node prisma/seed.mjs      # tạo tài khoản admin + bài tập mẫu
npm run dev               # http://localhost:3000
```

**Tài khoản quản trị:** email lấy từ `ADMIN_EMAIL` (mặc định theo
`prisma/seed-data.json`), mật khẩu lấy từ `ADMIN_PASSWORD`. Mật khẩu **không bao
giờ được lưu trong mã nguồn** vì repo công khai — xem [DEPLOY.md](./DEPLOY.md).
Nếu chạy lần đầu mà không đặt `ADMIN_PASSWORD`, hệ thống sinh mật khẩu ngẫu
nhiên và in ra nhật ký khởi động.

## Triển khai

Xem hướng dẫn chi tiết trong [DEPLOY.md](./DEPLOY.md) (đẩy lên GitHub + deploy Hostinger VPS).

## Cấu trúc thư mục chính

```
src/
├── app/
│   ├── (site)/          # Trang công khai + khu học viên + quản trị (có header/footer)
│   ├── (exam)/lam-bai/  # Phòng làm bài (tối giản, không header marketing)
│   └── globals.css      # Design tokens editorial
├── components/          # Header, footer, form, phòng thi, admin
└── lib/
    ├── actions/         # Server actions: auth, attempts, admin
    ├── session.ts       # Phiên đăng nhập JWT
    ├── exercise-content.ts  # Cấu trúc đề + chấm Reading
    └── db.ts            # Prisma client
prisma/
├── schema.prisma        # User · Exercise · Attempt
└── seed.mjs             # Admin + đề mẫu
```
