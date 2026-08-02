# Wobridges IELTS Reading

Nền tảng luyện IELTS Reading của **Trung tâm Anh ngữ Wobridges** (World Bridges — “những cây cầu kết nối thế giới”).

## Tính năng

**Trang công khai** giữ phong cách editorial nền kem, navy, vàng đồng và font serif:

- Trang chủ Reading
- Hai kho đề tách biệt: **Academic** và **General**
- Điện Danh Vọng và Bảng Vàng

**Nền tảng học viên**:

- Đề Reading chuẩn format IELTS với đồng hồ đếm ngược và tự nộp khi hết giờ
- Chấm điểm tự động ngay lập tức
- Ghép ba passage Academic thành Full Test 60 phút
- Chữa sâu bằng phương pháp Feynman
- Theo dõi tiến độ, lịch sử bài làm và danh hiệu

**Khu quản trị** (`/quan-tri`):

- Quản lý đề Reading và chọn kho Academic hoặc General
- Ẩn/hiện đề, phân quyền truy cập và quản lý học viên
- Quản lý bộ đề danh hiệu, Nguyệt Thí, thanh toán và phần thưởng

## Công nghệ

| Thành phần | Lựa chọn |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript, Turbopack) |
| CSDL | MySQL (Hostinger) qua Prisma 6 |
| Xác thực | Email + mật khẩu (bcryptjs), phiên JWT cookie (jose) |
| Giao diện | Tailwind CSS 4, lucide-react, Playfair Display, Source Serif 4, Be Vietnam Pro |

## Chạy trên máy local

```bash
npm install
# Tạo .env.local và điền DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD
npx prisma db push
node prisma/seed.mjs
npm run dev
```

Tài khoản quản trị lấy email từ `ADMIN_EMAIL` và mật khẩu từ
`ADMIN_PASSWORD`. Không lưu mật khẩu thật trong repository công khai. Xem
[DEPLOY.md](./DEPLOY.md) để biết quy trình triển khai.

## Cấu trúc chính

```text
src/
├── app/                 # Trang công khai, học viên, quản trị và phòng thi
├── components/          # Header, footer, Reading CBT, admin
└── lib/                 # Server actions, session, chấm Reading, database
prisma/
├── schema.prisma
└── seed.mjs
```
