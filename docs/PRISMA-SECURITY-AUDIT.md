# Báo cáo audit bảo mật Prisma và dependency liên quan

**Ngày audit:** 27/08/2026  
**Repo:** `guanghui-stack/Stoic-Ielts`  
**Branch:** `rebrand/stoic-design-system`  
**Phạm vi:** dependency tree, Prisma runtime/CLI, npm audit, dependency production, advisory upstream và kiểm thử cô lập.  
**Thay đổi production:** Không áp dụng remediation vào mã nguồn hoặc lockfile thật trong vòng audit này.

## 1. Tóm tắt điều hành

Audit hiện tại báo **5 finding mức High, 0 Critical**. Ba finding tạo thành một chuỗi Prisma duy nhất: `prisma@6.19.3` → `@prisma/config@6.19.3` → `deepmerge-ts@7.1.5`, trong đó advisory cốt lõi là `GHSA-ggr8-5vv4-36mx` / `CVE-2026-40345`. Hai finding còn lại là `brace-expansion` và `js-yaml` từ ESLint/type tooling, không liên quan tới Prisma.

Lỗ hổng DeepmergeTS là uncontrolled recursion. Nó chỉ xảy ra khi API merge nhận các recursive object graph có self-reference trùng property path; plain JSON không tự tạo được điều kiện này. Impact chính là làm cạn call stack và gây crash/gián đoạn availability, không phải đọc hoặc sửa dữ liệu.[^1]

Trong repo, ứng dụng import `PrismaClient` từ `@prisma/client` ở `src/lib/db.ts` và nhiều service chỉ dùng kiểu/Prisma Client. Không có import trực tiếp `deepmerge-ts` hoặc `@prisma/config` trong `src`. Chuỗi vulnerable được kéo bởi package `prisma` CLI/config. Tuy nhiên `prisma` hiện đang nằm trong `dependencies`, và npm vẫn cài nó trong production tree ngay cả khi thử chuyển sang `devDependencies` do peerOptional của `@prisma/client`; vì vậy không nên kết luận rằng đổi vị trí dependency đã loại được rủi ro.

## 2. Baseline và inventory

| Thành phần | Phiên bản hiện tại | Vai trò | Phơi nhiễm |
|---|---:|---|---|
| `@prisma/client` | 6.19.3 | Prisma Client được import từ runtime app | Production runtime |
| `prisma` | 6.19.3 | CLI, generate/config/migration tooling | Direct dependency; xuất hiện trong production install hiện tại |
| `@prisma/config` | 6.19.3 | Dependency của Prisma CLI | Transitive |
| `deepmerge-ts` | 7.1.5 | Dependency của `@prisma/config` | Transitive vulnerable package |
| Node.js CI | 20.x | Build/CI | Prisma 6 yêu cầu Node >=18.18; phù hợp |
| Node.js sandbox | 22.13.0 | Audit/build local | Prisma 6 phù hợp; Prisma 7 cần >=20.19.0 theo upgrade guide |

`npm audit` full tree trả về 5 High. `npm audit --omit=dev` trả về 3 High, chính là ba package trong chuỗi Prisma. Khi thử override `deepmerge-ts` lên 8.0.0 trong bản sao đầy đủ của repo, production audit giảm còn 2 High và chỉ còn `brace-expansion`/`js-yaml` thuộc toolchain.

## 3. Phân tích từng finding

| ID | Package/path | Advisory | Impact | Đánh giá thực tế |
|---|---|---|---|---|
| P-1 | `deepmerge-ts@7.1.5` qua `@prisma/config@6.19.3` | `GHSA-ggr8-5vv4-36mx`, `CVE-2026-40345`, CWE-674 | Synchronous stack exhaustion/crash khi merge recursive object graph | Không thấy call path từ request data vào deepmerge trong app; rủi ro runtime trực tiếp hiện thấp hơn mức audit banner, nhưng package vẫn nằm trong install tree |
| P-2 | `@prisma/config@6.19.3` | Kế thừa P-1 | Khuếch đại finding của Prisma CLI | Không phải API app import trực tiếp; bị npm audit đánh dấu vì dependency vulnerable |
| P-3 | `prisma@6.19.3` | Kế thừa P-1 | CLI/config chain vulnerable | Là direct dependency và hiện có trong production install tree; cần remediation hoặc risk acceptance có thời hạn |
| T-1 | `brace-expansion` qua ESLint/type tooling | GHSA-3jxr-9vmj-r5cp, GHSA-mh99-v99m-4gvg, GHSA-rgw5-rvv9-x895 | DoS khi xử lý pattern mở rộng | Dev/toolchain finding, không phải Prisma; npm có remediation không cần major downgrade |
| T-2 | `js-yaml@4.3.0` qua ESLint | GHSA-5p4m-2wfm-xmqj, CVE-2026-59870 | Quadratic CPU với `!!omap` | Dev/toolchain finding, tách riêng khi xử lý; không dùng Prisma fix cho finding này |

## 4. Bằng chứng kiểm chứng

### 4.1. Dependency call path

Dependency tree thực tế:

```text
prisma@6.19.3
└── @prisma/config@6.19.3
    └── deepmerge-ts@7.1.5
```

Source import `PrismaClient` tại `src/lib/db.ts` là:

```ts
import { PrismaClient } from "@prisma/client";
export const db = globalForPrisma.prisma ?? new PrismaClient();
```

Không có import trực tiếp `deepmerge-ts` hoặc `@prisma/config` trong `src`. CI hiện chạy `npm ci`, lint và build; không expose endpoint để gọi Prisma CLI.

### 4.2. PoC cô lập

PoC recursive self-reference được chạy trong child process giới hạn 3 giây, không kết nối database. Với `deepmerge-ts@7.1.5`, tiến trình kết thúc lỗi stack overflow trong merge recursion. Với `deepmerge-ts@8.0.0`, cùng PoC hoàn thành bình thường.

### 4.3. Compatibility test của override

Trong bản sao đầy đủ của repo, pin tạm `overrides.deepmerge-ts=8.0.0` cho kết quả:

| Kiểm tra | Kết quả |
|---|---|
| npm install/lockfile | Đạt |
| Prisma generated client postinstall | Đạt |
| `npm run build` | Đạt |
| `npm test` | Đạt |
| Dependency tree | `@prisma/config@6.19.3` dùng `deepmerge-ts@8.0.0 overridden` |
| Prisma-related audit findings | Biến mất; còn 2 High toolchain |

Kết quả này cho thấy override có tính khả thi trong repo hiện tại, nhưng **không biến nó thành tổ hợp được Prisma bảo đảm hỗ trợ**. Release DeepmergeTS v8 có breaking changes về Map merge, type/utils rename, circular reference handling và `deepmergeInto` mutation semantics.[^2]

## 5. Các phương án xử lý an toàn

Tôi chưa chọn hoặc áp dụng phương án nào thay bạn. Mỗi phương án dưới đây phù hợp với một ưu tiên khác nhau.

| Phương án | Cách làm | Ưu điểm | Rủi ro/chi phí | Điều kiện nghiệm thu |
|---|---|---|---|---|
| **A — Nâng Prisma theo major được hỗ trợ** | Đánh giá và nâng đồng bộ `prisma` + `@prisma/client` lên Prisma 7.x phù hợp, sau đó chuyển generator/config/driver adapter theo migration guide | Loại bỏ override ngoài ma trận hỗ trợ; hướng dài hạn sạch hơn | Breaking change lớn: ESM, `prisma-client` generator/output bắt buộc, Prisma Config, driver adapter cho MySQL, thay đổi env/migration; cần staging và rollback | Build, full test, generate, migration dry-run, MySQL smoke test, kiểm tra auth/payment/chat và đo connection pool |
| **B — Override tạm `deepmerge-ts@8.0.0`** | Thêm exact override trong root package, giữ Prisma 6.19.3; pin lockfile và đặt thời hạn loại bỏ override | Ít thay đổi source; đã build và full test đạt trong bản sao; xóa ngay 3 finding Prisma | Prisma 6 chưa tuyên bố hỗ trợ tổ hợp này; v8 có breaking semantics; cần theo dõi release Prisma chính thức | Full test/build mỗi CI, chạy `prisma generate`, kiểm thử seed/check-db-parity và smoke test runtime; rollback bằng một commit |
| **C — Chấp nhận rủi ro có kiểm soát trong thời gian ngắn** | Giữ Prisma 6.19.3, không dùng `npm audit fix --force`, ghi risk acceptance có owner/ngày hết hạn và áp compensating controls | Không tạo thay đổi dependency trước deadline; ít rủi ro regression | Finding vẫn tồn tại; không phải bản vá; cần đánh giá lại định kỳ | Cấm chạy Prisma CLI từ request, không nhận object graph tùy ý cho merge, container non-root, giới hạn CPU/memory, cảnh báo CI và issue có deadline |

### Lựa chọn theo ưu tiên

Nếu ưu tiên là **giảm finding ngay với thay đổi source tối thiểu**, B là ứng viên cần review trong staging. Nếu ưu tiên là **đường nâng cấp được upstream hỗ trợ lâu dài**, A là hướng cần lập migration riêng. Nếu đang ở **release freeze**, C chỉ nên là biện pháp ngắn hạn có thời hạn kết thúc rõ ràng.

## 6. Những cách không nên làm

Không nên chạy `npm audit fix --force` trên repo thật. Npm hiện đề xuất Prisma `6.12.0` và đánh dấu đó là semver-major; đây là hạ phiên bản từ 6.19.3, không phải bản vá upstream cho advisory DeepmergeTS v8. Có thể làm mất bugfix/security patch đã có ở 6.19.3 và tạo thay đổi khó dự đoán.

Không nên tự nâng riêng `deepmerge-ts` mà không pin exact version, lockfile và test. `deepmerge-ts v8.0.0` có breaking changes được upstream công bố, dù compatibility test của repo hiện tại đã đạt.

Không nên chỉ chuyển `prisma` từ `dependencies` sang `devDependencies` rồi kết luận production sạch. Với npm hiện tại, `@prisma/client` có peerOptional `prisma`, và mô phỏng `npm ci --omit=dev` vẫn cài Prisma CLI/config/deepmerge-ts. Nếu chọn tách CLI khỏi runtime, phải thiết kế build/runtime image riêng và chứng minh bằng file system/dependency scan của image thực tế.

## 7. Compensating controls áp dụng ngay dù chưa chọn remediation

Ứng dụng không nên cho phép request người dùng gọi `prisma`, `prisma generate`, migration hoặc đọc config runtime. Prisma CLI cần chạy ở CI/build hoặc maintenance job có quyền hạn riêng, không chạy trong request worker.

Các endpoint nhận object từ người dùng phải dùng schema validation và plain JSON; không truyền object có prototype hoặc self-reference vào bất kỳ generic merge utility nào. Runtime container nên chạy non-root, có giới hạn CPU/memory, restart policy có backoff và log/alert khi worker chết bất thường. CI nên giữ `npm audit --audit-level=high` ở chế độ report/block theo chính sách release, đồng thời pin lockfile.

## 8. Lộ trình triển khai/rollback

Đối với A hoặc B, cần tạo branch remediation riêng, snapshot dependency lockfile, chạy `npm ci`, `npx prisma generate`, lint, build và full test trên CI. Sau đó restore một bản database staging, chạy parity/check schema và smoke test các đường dẫn có Prisma: auth, dashboard, forum/chat, payments, Feynman và seed/check scripts.

Chỉ sau khi staging đạt mới tạo image/deploy canary. Theo dõi error rate, restart count, latency truy vấn và connection pool trong một khoảng quan sát đã thống nhất. Rollback phải là revert lockfile/package change về commit trước, không chạy lệnh migration ngược không được kiểm chứng.

## 9. Kết luận

Hiện chưa có bằng chứng rằng dữ liệu request của STOIC · IELTS đi vào API vulnerable của `deepmerge-ts`; finding chủ yếu đến từ Prisma CLI/config chain. Tuy vậy, Prisma CLI đang là direct dependency và xuất hiện trong production install tree, nên không nên bỏ qua cảnh báo. Có hai hướng kỹ thuật khả thi đã được kiểm thử một phần: **override exact v8.0.0 như biện pháp tạm thời** hoặc **migration đồng bộ lên Prisma 7 như hướng dài hạn**. Chưa có remediation nào được áp dụng vào repo thật trong audit này để tránh tự ý thay đổi dependency production.

## References

[^1]: [GitHub Advisory Database — GHSA-ggr8-5vv4-36mx / CVE-2026-40345](https://github.com/advisories/GHSA-ggr8-5vv4-36mx)
[^2]: [deepmerge-ts v8.0.0 release notes](https://github.com/RebeccaStevens/deepmerge-ts/releases/tag/v8.0.0)
[^3]: [Prisma ORM — Upgrade to v7](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7)
