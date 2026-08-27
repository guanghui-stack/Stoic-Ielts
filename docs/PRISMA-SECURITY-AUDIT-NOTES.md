# Ghi chú audit bảo mật Prisma/deepmerge-ts

## Baseline ngày 27/08/2026

`npm audit` trong repo báo 5 cảnh báo high, 0 critical. Dependency tree hiện tại là:

- `prisma@6.19.3` là dependency trực tiếp.
- `@prisma/client@6.19.3` phụ thuộc cùng Prisma.
- `prisma@6.19.3` kéo theo `@prisma/config@6.19.3`.
- `@prisma/config@6.19.3` kéo theo `deepmerge-ts@7.1.5`.

Npm audit đánh dấu `deepmerge-ts`, `@prisma/config` và `prisma` vì chuỗi phụ thuộc. Npm đề xuất hạ Prisma xuống `6.12.0` bằng `npm audit fix --force`, đây là thay đổi semver-major theo metadata của npm và không nên chạy tự động.

## Advisory đã kiểm chứng

GitHub Reviewed advisory `GHSA-ggr8-5vv4-36mx` / `CVE-2026-40345` mô tả lỗi uncontrolled recursion/CWE-674 trong `deepmerge-ts` dưới `8.0.0`, bản vá là `8.0.0`. Điều kiện cần là hai object được merge cùng chứa self-reference tại cùng property path; plain JSON không tự tạo được điều kiện này. Tác động chính là synchronous crash/availability của tiến trình Node, không phải rò rỉ hoặc sửa dữ liệu.

Release `deepmerge-ts v8.0.0` xác nhận bản vá bảo mật và đồng thời có breaking changes: deep merge Map mặc định, đổi tên một số type/utils, xử lý circular reference, thêm `maxDepth`/`mergeCircularReferences`, và thay đổi hành vi `deepmergeInto` để không leak-mutate input. Vì vậy không thể coi việc nâng riêng deepmerge-ts là thay thế drop-in an toàn nếu Prisma chưa chính thức hỗ trợ nó.

## Nguồn

- https://github.com/advisories/GHSA-ggr8-5vv4-36mx
- https://github.com/RebeccaStevens/deepmerge-ts/releases/tag/v8.0.0

## Đối chiếu upstream

GitHub Advisory Database đánh giá advisory ở mức High, CVSS v4 8.2, tác động Availability High, với điều kiện recursive object graph do input đi vào API merge. Release `deepmerge-ts v8.0.0` là bản vá chính thức và nêu rõ các breaking changes liên quan Map merge, type/utils rename, circular reference handling và `deepmergeInto` mutation semantics.

Trang releases chính thức của Prisma hiện hiển thị dòng Prisma 7.10.0 và các Prisma 8 release candidate; không có bằng chứng trong release page rằng Prisma 6.19.3 đã có bản phát hành tương thích mới để kéo `deepmerge-ts` lên v8. Npm audit hiện đề xuất hạ Prisma xuống 6.12.0, không phải nâng deepmerge-ts, vì Prisma 6.19.3 khai báo/khóa chuỗi config hiện tại.

Repo chỉ import `PrismaClient` tại `src/lib/db.ts`; code ứng dụng không import trực tiếp `deepmerge-ts` hoặc `@prisma/config`. `prisma` và `@prisma/client` đang nằm trong `dependencies`; CI chạy `npm ci`, lint và build nhưng không chạy migrate/generate trong workflow. Cần xác minh thêm dependency production tree trước khi kết luận cách phân loại dev-only.

## Kết quả truy vết và thử nghiệm cô lập

Source ứng dụng import `PrismaClient`/`Prisma` từ `@prisma/client` ở các service database, nhưng không import trực tiếp `deepmerge-ts` hoặc `@prisma/config`. `deepmerge-ts` chỉ xuất hiện qua `@prisma/config` dưới `prisma` CLI. PoC recursive self-reference trong tiến trình con cho `deepmerge-ts@7.1.5` kết thúc bằng lỗi stack exhaustion; cùng PoC với `deepmerge-ts@8.0.0` hoàn thành bình thường.

Thử nghiệm tạm thời pin `overrides.deepmerge-ts=8.0.0` trên bản sao đầy đủ của repo: `npm install`, generated Prisma client và `npm run build` đều đạt; dependency tree xác nhận `@prisma/config@6.19.3` dùng `deepmerge-ts@8.0.0 overridden`. Đây là tín hiệu tương thích tốt nhưng vẫn là override ngoài ma trận hỗ trợ chính thức của Prisma, nên chưa được áp dụng vào repo thật.

Mô phỏng production bằng cách chuyển `prisma` sang devDependencies vẫn cài `prisma@6.19.3` qua peerOptional của `@prisma/client` khi dùng npm mặc định. Vì vậy chỉ chuyển vị trí dependency không đủ để loại CLI khỏi node_modules production; cần cân nhắc cài đặt với peer omission hoặc dùng pipeline build/runtime riêng và phải kiểm thử generated client.

Npm audit hiện có 5 package findings high: `@prisma/config`, `prisma`, `deepmerge-ts` (cùng một chuỗi CVE-2026-40345); `brace-expansion` qua ESLint/typescript-eslint; và `js-yaml` qua ESLint. Override deepmerge-ts 8 làm biến mất ba finding Prisma, còn lại 2 finding toolchain. Dry-run `npm audit fix` chỉ đề xuất các thay đổi `brace-expansion` và `js-yaml` ở lớp toolchain ngoài Prisma; không cần `--force` cho hai finding này.
