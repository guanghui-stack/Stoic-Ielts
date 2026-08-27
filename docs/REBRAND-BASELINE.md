# Baseline rebrand STOIC · IELTS

**Nhánh:** `rebrand/stoic-design-system`  
**Commit gốc:** `f18d5fb`  
**Ngày lập:** 2026-08-26  
**Tác giả:** Manus AI

## Mục đích

Tài liệu này ghi trạng thái repo trước khi rebrand và xác định vùng học/làm bài mô phỏng thi thật không được thay đổi.

## Baseline kiểm thử

| Kiểm tra | Kết quả baseline | Ghi chú |
|---|---|---|
| `npm test` lần đầu | Không chạy qua `test:production-hardening` | Prisma client chưa được sinh vì dependency được cài với `--ignore-scripts`. |
| `npx prisma generate` | Đạt | Sinh Prisma Client 6.19.3 trong `node_modules`; không tạo thay đổi được Git theo dõi. |
| `npm test` sau Prisma generate | Đạt | Toàn bộ test hiện hữu đạt. |
| `npm run build` | Đạt, có 2 cảnh báo sẵn có | Hai cảnh báo Turbopack liên quan `::highlight(wb-hl)` và `::highlight(wb-note)` trong CSS phòng thi. Không sửa trong rebrand vì thuộc vùng được bảo vệ. |

## Vùng được bảo vệ

Checksum SHA-256 của 23 tệp route, component, logic và dữ liệu phòng thi/thí luyện nằm trong `docs/PROTECTED-SURFACES.sha256`. Lệnh `npm run test:protected-surfaces` phải đạt ở mọi checkpoint và trước bàn giao.

Các nhóm được bảo vệ gồm:

| Nhóm | Phạm vi |
|---|---|
| Route phòng thi | `src/app/(exam)/**` |
| Route kho luyện/ghép đề | `src/app/(site)/luyen-tap/reading/**` |
| Route kết quả và chữa bài theo attempt | `src/app/(site)/hoc-vien/bai-lam/**` |
| Route thí luyện/tự vấn | `src/app/(site)/hoc-vien/thi-but/**`, `src/app/(site)/hoc-vien/thi-luyen/**` |
| Component cốt lõi | `reading-cbt.tsx`, `reading-module-page.tsx`, `trial-reflection-form.tsx`, `thi-but-*` |
| Logic | attempt actions/finalize, reading band/assembly, exercise content, study heartbeat |
| Dữ liệu | Hai gói dữ liệu Reading chuyên biệt trong `prisma/` |
| Chính sách motion | `src/lib/motion/route-policy.ts` |

## Nguyên tắc thực thi

Rebrand phải được scope qua WorldShell và `data-route-area`; không được thay đổi default làm rò theme/motion vào route tier 0. Nếu một component dùng chung với vùng thi cần diện mạo mới ở khu khác, tạo biến thể mới thay vì sửa component đang được bảo vệ.
