# ĐẶC TẢ THỐNG NHẤT — FEYNMAN AI TUTOR

**Dự án:** Stoic IELTS · `guanghui-stack/Stoic-Ielts`
**Phiên bản:** `2026-08-feynman-ai-v2`
**Thay thế:** bản đặc tả `2026-08-feynman-ai-v1`
**Trạng thái:** đã chốt — năm quyết định ở mục 12 đã có câu trả lời

> Bản v1 được viết trước khi mô hình bán hàng đổi. Tài liệu này giữ lại phần
> còn đúng của v1, sửa các chỗ mâu thuẫn với mã nguồn thật, và ghi lại mô hình
> kinh doanh mới. **Khi hai bản khác nhau, bản này đúng.**

---

## 1. Ba ranh giới bất khả xâm phạm

Mọi thứ khác trong tài liệu này có thể thương lượng. Ba điều dưới đây thì không.

### 1.1. AI không bao giờ chấm điểm Reading

`gradeReading()` trong `src/lib/exercise-content.ts` vẫn là nguồn DUY NHẤT xác
định điểm. AI không được đứng ở bất kỳ vị trí nào trong đường chấm điểm.

Các trường sau tuyệt đối không được AI ghi vào:

```
Attempt.scoreRaw          Attempt.scoreTotal
Attempt.band              Attempt.gradedAt
Attempt.bandScaleVersion  Attempt.validForAchievements
Attempt.integrityStatus   CompetitionAttempt.*
```

Mọi lượt nộp bài vẫn đi qua `finalizeReadingAttempt()`.

**Việc AI được làm:** đánh giá CHẤT LƯỢNG phần tự giảng lại của học viên trong
Feynman, ghi vào một bảng riêng. Đây là thứ mới, không phải chấm lại bài.

### 1.2. Lời giải giáo viên luôn thắng

Thứ tự ưu tiên khi AI giải thích:

```
Lời giải giáo viên đã phê duyệt
        ↓
Đáp án chuẩn trong đề
        ↓
Passage
        ↓
AI cá nhân hóa cách diễn giải
```

AI không được phủ định, thay thế, hay âm thầm sửa lời giải giáo viên. Nếu AI
phát hiện khả năng mâu thuẫn giữa passage và đáp án chuẩn, nó vẫn trả lời học
viên theo đáp án chuẩn, và sinh một cảnh báo riêng cho quản trị viên. Học viên
không bao giờ được nghe rằng đáp án chuẩn có thể sai.

### 1.3. Khóa API chỉ sống ở máy chủ

Không `NEXT_PUBLIC_`, không log, không lưu database, không vào thông báo lỗi,
không commit. `scripts/check-no-secrets.mjs` là hàng rào tự động cho việc này.

---

## 2. Mô hình kinh doanh

> **BẢN NÀY THAY CHO BẢN CŨ NGÀY 09/08/2026.** Bản cũ nói "toàn bộ đề Reading
> miễn phí". Chủ dự án đổi mô hình ngày 12/08/2026: đề khóa lại, mở lẻ bằng xu,
> mỗi tài khoản đã xác minh email được tặng 150 xu. Lịch sử của lần đổi này ghi
> ở mục 10.17 của `BAN-GIAO-TAM-QUOC.md`.

### 2.1. Ví xu — tiền hệ thống

Tiền thật đi vào hệ thống qua **một cửa duy nhất**: học viên nạp xu, rồi tiêu
xu. Không còn đường trả VND thẳng cho một gói nào.

**1 xu = 1.000đ.** Bốn mốc nạp:

| Nạp | Nhận | Thưởng |
|---|---|---|
| 50.000đ | 50 xu | — |
| 100.000đ | 100 xu | — |
| 200.000đ | 210 xu | +5% |
| 500.000đ | 550 xu | +10% |

Xu **không đổi ngược ra tiền mặt, không chuyển nhượng, không hết hạn**. Nó là
tín dụng dịch vụ trả trước, không phải tiền gửi — ranh giới này là có chủ ý.

### 2.2. Quà chào mừng 150 xu

Mỗi tài khoản được tặng **150 xu một lần trong đời**, với điều kiện cứng: **đã
xác minh email**. 150 xu = 16 đề mở lẻ, hoặc 5 lượt làm bài được mở trọn vẹn.

> **Điều kiện xác minh email là MỘT PHẦN của con số này, đừng tách rời.** Xu
> tiêu được vào gói AI chấm, mà mỗi lượt chấm là một hóa đơn OpenAI thật. Tặng
> xu cho tài khoản chưa xác minh là mở đường lập tài khoản ảo hàng loạt.

Tài khoản đăng nhập bằng Google được coi là đã xác minh (Google đã kiểm
`email_verified`). Tài khoản tạo trước 12/08/2026 được grandfather.

### 2.3. Miễn phí

- Chấm điểm tự động + band quy đổi
- Đáp án đúng/sai cơ bản sau khi nộp bài
- Luyện Feynman **không giới hạn số lần**

### 2.4. Trả bằng xu

| Gói | Giá | Mở cho |
|---|---|---|
| Mở một đề Reading | **9 xu** | Một đề, làm lại không giới hạn, vĩnh viễn |
| Full Test (đề ghép 40 câu) | **39 xu** | Một lượt làm bài |
| Đề đơn (một passage) | **19 xu** | Một lượt làm bài |
| Nạp thêm lượt AI | **29 xu** | 10 lượt AI chấm |

Gói 19/39 xu bao gồm:

1. **Đáp án sửa chi tiết** — lời giải giáo viên cho TẤT CẢ các câu. Vĩnh viễn.
2. **Hệ thống Feynman** — luyện lại **không giới hạn số lần**. Chi phí API: 0đ.
3. **AI chấm Feynman** — trừ vào **ví lượt AI**. Mỗi lượt làm bài chấm tối đa
   **1 lần mỗi ngày**.
4. **Hỏi AI** — reset sau mỗi lần chấm. Full Test **10 câu**, đề đơn **5 câu**.

**Hai ví, KHÔNG được gộp.** Ví **xu** là tiền hệ thống, mua gói. Ví **lượt AI**
(`FeynmanAiBudget`) là quyền dùng, do gói **tặng**. Không có đường nào đổi thẳng
xu ra lượt AI ngoài việc mua gói — gộp lại là gỡ mất trần chi phí OpenAI.

### 2.5. Câu chữ phải in đúng trên website

> Luyện Feynman không giới hạn và không tốn phí. Chỉ phần AI chấm và hỏi đáp
> AI mới tính lượt, vì mỗi lần gọi AI là một chi phí thật.

> AI chỉ kết luận điểm yếu khi đã đủ bằng chứng tích lũy — không phán xét bạn
> dựa trên một lần làm bài.

### 2.6. Bốn sản phẩm cũ đã dừng bán

| Mã | Giá cũ | Lý do dừng |
|---|---|---|
| `READING_SINGLE` | 9.000đ | Thay bằng `READING_UNLOCK` 9 xu |
| `READING_ALL_30D` | 99.000đ | Mô hình đổi sang mở lẻ bằng xu |
| `FEYNMAN_ALL_30D` | 299.000đ | Mô hình đổi sang bán theo lượt làm bài |
| `FEYNMAN_SINGLE` | 49.000đ | Như trên |

Cả bốn **gỡ khỏi trang bán nhưng giữ nguyên trong catalog**. Đơn hàng cũ và
`AccessGrant` cũ vẫn phải tra cứu và đọc quyền được bình thường. Không xóa dữ
liệu, không quy đổi thành xu, không hoàn tiền tự động.

`READING_UNLOCK` dùng **mã mới** chứ không dùng lại `READING_SINGLE`: mã cũ
mang giá VND và cả một lịch sử đơn hàng, trộn vào thì không còn phân biệt được
ai đã trả tiền mặt và ai đã tiêu xu.

**Mức truy cập của đề nằm ở dữ liệu, không ở mã nguồn:** cột
`Exercise.accessLevel` (`src/lib/access-rules.ts`). Đề mới thêm vào mặc định là
`PUBLIC` — muốn bán thì phải đặt `RESTRICTED`, ở file seed hoặc ở Quản trị →
Bài tập. Quên bước này thì đề mới bị cho không mà không có cảnh báo nào.

---

## 3. Luồng người dùng

```
Học viên làm bài (miễn phí)
        ↓
gradeReading() chấm — điểm, band, đáp án đúng/sai
        ↓
Xem đáp án cơ bản (miễn phí)          ← KHÔNG có lời giải chi tiết
        ↓
Mua gói 19K hoặc 39K cho lượt làm này
        ↓
Mở "Đáp án sửa chi tiết" — lời giải giáo viên mọi câu (vĩnh viễn)
   + Box AI hỏi đáp                    ← tốn lượt hỏi
        ↓
Chọn có luyện Feynman hay không
        ↓ có
Bảng kết quả 40 câu — học viên TICK tối đa 10 câu muốn chữa
        ↓
Luồng Feynman: DRAFT → REVEALED → COMPLETED   (không giới hạn số lần làm lại)
        ↓
Bấm "Nhờ AI chấm"                      ← tốn 1 lượt chấm, tối đa 1 lần/ngày
        ↓
AI trả về: ĐẠT / KHÔNG ĐẠT + đề xuất cải thiện tổng quan
        ↓
Hỏi AI tối đa 10 câu về lượt chấm này
```

### 3.1. AI không bao giờ tự chạy

Không gọi OpenAI khi: nộp bài · chấm bài · mua gói · bắt đầu Feynman · reveal
lời giải · hoàn thành Feynman. **Chỉ gọi khi học viên chủ động bấm nút.**

### 3.2. Nguyệt Thí bị khóa hoàn toàn cho tới khi thi xong

Với attempt thuộc Nguyệt Thí, khóa **cả ba thứ** cho tới khi `endsAt` của cuộc
thi trôi qua:

- Đáp án chi tiết
- Hệ thống Feynman
- Toàn bộ AI

Sau `endsAt` thì mở bình thường như bài luyện tập.

> **Vì sao:** thí sinh dự thi vào các thời điểm khác nhau trong khung giờ.
> Người thi sớm mua gói 39K rồi mở Feynman sẽ thấy toàn bộ đáp án chuẩn và lời
> giải giáo viên của đề đang thi. Hiện tại `startFeynmanReviewAction` **chưa
> chặn** trường hợp này — đây là lỗ hổng có sẵn, PR này vá luôn.

---

## 4. Cấu trúc dữ liệu

### 4.1. Nguyên tắc migration

Dự án **không dùng Prisma Migrate** (không có `prisma/migrations/`).
Production dựng bảng bằng `initDatabase()` trong `src/lib/init-db.ts`.

Mọi thay đổi schema phải làm **hai nơi**:

1. `prisma/schema.prisma` — để Prisma Client sinh đúng kiểu
2. `src/lib/init-db.ts` — DDL thật mà production chạy

Sau đó chạy `npm run test:indexes` và `npm run check:db` để chắc hai bên khớp.

Bảng mới dùng `CREATE TABLE IF NOT EXISTS`. Cột thêm vào bảng cũ dùng
`ALTER TABLE ADD COLUMN` trong danh sách nâng cấp. Thao tác phá hủy (ví dụ gỡ
một unique index) đặt trong `applyOnce()` để chỉ chạy đúng một lần.

Nguyên tắc này đúng ở CẢ giai đoạn xây lẫn giai đoạn có học viên thật —
`initDatabase()` chỉ thêm, không bao giờ xóa hay sửa dữ liệu.

### 4.2. Sửa bảng có sẵn

**`FeynmanReview`** — bỏ ràng buộc một lượt làm chỉ một phiên:

```
- attemptId String @unique
+ attemptId String
+ runNumber Int @default(1)     // lần luyện thứ mấy của lượt làm này
+ @@unique([attemptId, runNumber])
+ @@index([attemptId, createdAt])
```

`mode` giữ lại cho dữ liệu cũ, ghi `"CUSTOM"` cho phiên mới (học viên tự chọn
câu, không còn QUICK/DEEP tự động).

**`PaymentOrder`** và **`AccessGrant`** — thêm:

```
attemptId String?
attempt   Attempt? @relation(fields: [attemptId], references: [id], onDelete: SetNull)
```

**`AccessScope`** — thêm giá trị thứ ba:

```ts
export type AccessScope = "ALL" | "EXERCISE" | "ATTEMPT";
```

### 4.3. Bảng mới

```
Attempt
  └─(n) FeynmanReview          runNumber 1, 2, 3...  (luyện không giới hạn)
          └─(0..1) FeynmanAiEvaluation                (tốn 1 lượt chấm)
                     └─(0..10) FeynmanAiMessage       (10 câu hỏi)

FeynmanAiBudget       — ví lượt AI, MỘT dòng cho MỖI TÀI KHOẢN
FeynmanAiAttemptState — nhịp chấm, MỘT dòng cho MỖI LƯỢT LÀM BÀI
FeynmanAiAlert        — hàng đợi cảnh báo cho quản trị viên
```

Ví và nhịp chấm là **hai thứ tách rời**, vì quyết định Q1 và Q2 chọn hai phạm
vi khác nhau: ví theo tài khoản, nhịp theo lượt làm bài. Nhét chung một bảng sẽ
không biểu diễn được.

**`FeynmanAiEvaluation`** — một lần AI chấm. Lưu đầy đủ để đo tiến độ và để
quản trị viên phúc tra:

| Nhóm trường | Nội dung |
|---|---|
| Kết quả | `verdict` ĐẠT/KHÔNG_ĐẠT · `similarityPercent` · `confidence` |
| Bằng chứng | `reasonJson` — lý do + trích dẫn từng câu, để admin phúc tra |
| Lời khuyên | `overallAdviceJson` — đề xuất cải thiện tổng quan |
| Ảnh chụp | `currentBandSnapshot` · `targetBandSnapshot` · `attemptNumberSnapshot` · `weaknessSnapshotJson` |
| Vận hành | `model` · `promptVersion` · `schemaVersion` · token vào/ra/cache · `estimatedCostMicroUsd` · `latencyMs` · `openaiRequestId` · `errorCode` |
| Quota | `questionLimit` mặc định 10 · `questionUsed` |

**`FeynmanAiBudget`** — ví lượt AI, **một dòng cho mỗi tài khoản**:

```
userId       String   @unique
grantedTotal Int      @default(0)   // +10 mỗi gói 19K/39K/29K đã thanh toán
usedTotal    Int      @default(0)
```

Còn lượt khi `usedTotal < grantedTotal`. Cộng ví chỉ xảy ra trong
`fulfillPaidOrder()`, cùng transaction với việc tạo `AccessGrant`, để một đơn
hàng không bao giờ cộng ví hai lần.

**`FeynmanAiAttemptState`** — nhịp chấm, **một dòng cho mỗi lượt làm bài**:

```
attemptId    String    @unique
lastGradedOn DateTime?               // chặn 1 lần/ngày cho riêng lượt này
gradedCount  Int       @default(0)   // để thống kê, không phải để chặn
```

Hai hàng rào chạy độc lập: hết ví thì `QUOTA_EXHAUSTED`, chấm lần hai trong
ngày trên cùng lượt làm bài thì `DAILY_LIMIT_REACHED`. Thông báo cho học viên
phải phân biệt được hai lỗi này, vì cách xử lý khác nhau — một bên mua thêm,
một bên chờ hôm sau.

**`FeynmanAiAlert`** — nguồn `MODEL` (AI tự báo) hoặc `STUDENT` (học viên báo
sai). Trạng thái `OPEN` / `RESOLVED` / `DISMISSED`.

### 4.4. Ràng buộc index của MySQL

InnoDB giới hạn khóa index **3072 byte**. utf8mb4 tính 4 byte mỗi ký tự, nên
`VARCHAR(191)` = 764 byte. Production **đã từng sập** vì lỗi này.

- Cột trạng thái (`status`, `verdict`, `severity`, `source`) khai `VARCHAR(16)`
  hoặc `VARCHAR(24)`, không để mặc định 191
- Trước khi commit phải chạy `npm run test:indexes`

---

## 5. Quyền truy cập

### 5.1. Luật đọc quyền

```
FEYNMAN + ALL       → mọi attempt đủ điều kiện trong thời hạn
FEYNMAN + ATTEMPT   → đúng một attemptId đó
FEYNMAN + EXERCISE  → quyền legacy, mọi attempt thuộc exerciseId đó
```

Quyền legacy `EXERCISE` của người đã mua **vẫn phải chạy**. Không tự động
chuyển đổi dữ liệu cũ.

### 5.2. Mở rộng `hasActiveAccess`

```ts
hasActiveAccess({ userId, feature, exerciseId, attemptId, at })
```

Phải truyền `attemptId` ở **cả ba** nơi đang gọi, bỏ sót chỗ nào là bán trùng
hoặc chặn nhầm:

```
src/lib/actions/payments.ts:57
src/lib/actions/feynman.ts:67
src/app/(site)/hoc-vien/bai-lam/[attemptId]/page.tsx:72
```

Quyết định nằm trong hàm thuần `decideGrantAccess()` (`payment-rules.ts`) để
kiểm thử được không cần database.

### 5.3. Tạo đơn hàng

Với gói 19K/39K, `createPaymentOrderAction` bắt buộc có `attemptId` và phải tự
đọc database để xác minh:

- Attempt thuộc đúng user
- `status === "GRADED"`
- Skill là Reading
- **Không thuộc Nguyệt Thí còn trong khung giờ**
- `exerciseId` khớp dữ liệu máy chủ

Không tin bất kỳ ID nào từ trình duyệt.

Truy vấn tìm đơn PENDING tái sử dụng **phải lọc thêm `attemptId`** — hiện tại
chỉ lọc `exerciseId`, nên học viên mua lượt thứ hai sẽ bị đẩy về đơn cũ.

---

## 6. Quota và chống lạm dụng

| Giới hạn | Giá trị | Kiểm tra ở đâu |
|---|---|---|
| Luyện Feynman | Không giới hạn | — |
| Số câu tick mỗi phiên Feynman | 10 | Máy chủ, trước khi tạo phiên |
| AI chấm — ví | +10 mỗi gói, dùng chung cả tài khoản | `FeynmanAiBudget` |
| AI chấm — nhịp | 1 lần/ngày cho **mỗi lượt làm bài** | `FeynmanAiAttemptState.lastGradedOn` |
| Hỏi AI | Full Test 10 câu · đề đơn 5 câu, mỗi lượt chấm | `FeynmanAiEvaluation.questionUsed` |
| Câu hỏi không hợp lệ | 3 lần/giờ → HTTP 429 | Đếm trên database |
| Request đang chạy | 1 cho mỗi học viên | Khóa ở database |

### 6.1. Giữ chỗ quota trước khi gọi API

Phải giữ chỗ **hai thứ**, theo đúng thứ tự này:

```ts
// 1. Nhịp chấm của lượt làm bài — chặn cày lại cùng một bài
updateMany({
  where: { attemptId, OR: [{ lastGradedOn: null }, { lastGradedOn: { lt: dauNgayHomNay } }] },
  data:  { lastGradedOn: now, gradedCount: { increment: 1 } }
})
// khong update duoc → DAILY_LIMIT_REACHED

// 2. Ví lượt của tài khoản
updateMany({
  where: { userId, usedTotal: { lt: prisma.feynmanAiBudget.fields.grantedTotal } },
  data:  { usedTotal: { increment: 1 } }
})
// khong update duoc → QUOTA_EXHAUSTED, va phai NHA LAI buoc 1
```

Kiểm nhịp trước vì nó rẻ hơn và là lỗi hay gặp hơn. Nếu bước 2 trượt thì **phải
trả `lastGradedOn` về giá trị cũ**, nếu không học viên hết ví sẽ mất luôn suất
chấm của ngày hôm đó.

`dauNgayHomNay` tính theo **giờ Việt Nam**, không phải UTC — nếu dùng UTC thì
mốc reset rơi vào 7 giờ sáng và học viên sẽ thấy vô lý.

**Không giữ transaction mở trong lúc gọi OpenAI.**

Câu hỏi bị từ chối vì ngoài phạm vi hoặc không đọc được thì **hoàn lại quota**
và không tính vào 10 câu.

### 6.2. Chống bấm hai lần

- `FeynmanAiEvaluation.reviewId @unique` — một phiên Feynman chỉ một lần chấm
- `FeynmanAiMessage.requestKey @unique` — một cú bấm chỉ một lần gọi API

RequestKey đã tồn tại thì trả về trạng thái hiện tại, **không gọi lại OpenAI**.

---

## 7. Dữ liệu gửi sang OpenAI

### 7.1. Được gửi

Passage · tiêu đề · group instruction · question prompt · options · question
type · đáp án chuẩn · đáp án thay thế · đáp án học viên · lời giải giáo viên
(evidence, trap, paraphrases) · band hiện tại · band mục tiêu · số lần làm ·
Sổ Sơ Hở · nội dung Feynman học viên viết · mức độ chi tiết · câu hỏi học viên.

### 7.2. Không bao giờ được gửi

Tên · email · số điện thoại · password hash · candidate code · user ID ·
attempt ID · review ID · thông tin thanh toán · dữ liệu webcam · dữ liệu giám
sát thi · integrity event · địa chỉ IP · user agent · nội dung Nguyệt Thí ·
khóa API · chuỗi kết nối database.

Mã câu hỏi dạng `p2:q14` **được phép gửi** — đó là vị trí câu trong đề, không
phải định danh người dùng.

### 7.3. Nguồn lời giải giáo viên

Bản v1 ghi sai nguồn. Sự thật:

- Các trường `modelEvidence`, `modelExplanation`, `modelTrap`,
  `modelParaphrasesJson` nằm trên `FeynmanMistake` — **chỉ tồn tại cho các câu
  học viên đã tick**, không phải mọi câu
- Nguồn gốc thật là `question.learning` trong nội dung đề, đọc qua
  `buildFeynmanLearningLookup()` trong `src/lib/feynman.ts`

**Luật:** đọc `buildFeynmanLearningLookup()` cho mọi câu; khi câu đó có
`FeynmanMistake` thì **ưu tiên snapshot** vì nó cố định lịch sử, không đổi khi
giáo viên sửa đề.

Câu có lời giải giáo viên → `sourceBasis = TEACHER_APPROVED`.
Câu không có → `sourceBasis = PASSAGE_DERIVED`, AI vẫn phải tôn trọng đáp án
chuẩn và dẫn chứng passage.

---

## 8. Cá nhân hóa

| Dữ liệu | Nguồn |
|---|---|
| Band hiện tại | `attempt.band` |
| Band mục tiêu | `user.targetReading`, null nếu chưa đặt |
| Số lần làm | `attempt.attemptNumber` |
| Điểm yếu | **Sổ Sơ Hở** — `weaknessRows()` trong `src/lib/ranks/weakness.ts` |
| Nội dung Feynman | `FeynmanReview` + `FeynmanMistake` của phiên đang chấm |

### 8.1. Sổ Sơ Hở là nguồn duy nhất cho kết luận điểm yếu

**Không viết bộ đếm thứ hai.** Dùng lại `weaknessRows()` và `buildRankFacts()`
trong `src/lib/ranks/facts.ts`, giữ nguyên hai hàng rào:

- `MIN_SAMPLES = 20` — dưới ngưỡng này không kết luận gì cả
- `WINDOW_DAYS = 90` — chỉ nhìn 90 ngày gần nhất

Khi chưa đủ mẫu, AI nhận snapshot rỗng và **phải nói rõ với học viên rằng chưa
đủ dữ liệu để kết luận**, thay vì đoán bừa.

> Đây cũng là điểm bán hàng: AI đánh giá dựa trên bằng chứng tích lũy, không
> phán xét dựa trên một lần làm bài. Phải in câu này trên trang giới thiệu.

---

## 9. Cấu hình OpenAI

### 9.1. Biến môi trường

Khai báo trong `DEPLOY.md` và `HUONG-DAN-FEYNMAN-AI.md`.

**Không tạo `.env.example`** — `.gitignore` chặn `.env*`, và
`scripts/check-no-secrets.mjs` sẽ làm `npm test` thất bại nếu có file `.env*`
bị Git theo dõi.

```
OPENAI_API_KEY=
OPENAI_FEYNMAN_ENABLED=false
OPENAI_FEYNMAN_MODEL=gpt-5-mini
OPENAI_FEYNMAN_TIMEOUT_MS=90000

OPENAI_FEYNMAN_GRADING_PER_PURCHASE=10
OPENAI_FEYNMAN_GRADING_PER_DAY=1
OPENAI_FEYNMAN_CHAT_LIMIT_FULL=10
OPENAI_FEYNMAN_CHAT_LIMIT_SINGLE=5
OPENAI_FEYNMAN_MAX_QUESTIONS_PER_RUN=10

OPENAI_FEYNMAN_EVAL_MAX_OUTPUT=4000
OPENAI_FEYNMAN_CHAT_MAX_OUTPUT=1200
OPENAI_FEYNMAN_INVALID_REQUESTS_PER_HOUR=3
```

Thiếu cấu hình thì mặc định **tắt**. Khi `OPENAI_FEYNMAN_ENABLED !== "true"`,
giao diện không hiện nút AI và API trả lỗi feature disabled.

### 9.2. Gọi API

- SDK chính thức `openai`, dùng Responses API
- `maxRetries: 0` — **không tự động thử lại**
- `store: false` — ứng dụng tự lưu lịch sử trong MySQL
- **Không** dùng `previous_response_id`; mỗi request tự dựng context từ database
- **Không** khai báo web search, file search, hay function tools
- Structured Outputs với strict JSON Schema
- Lưu usage, request ID, latency cho mọi lần gọi

`gpt-5-mini` là reasoning model — `max_output_tokens` **bao gồm cả reasoning
token**. Đặt trần quá thấp sẽ làm JSON bị cắt giữa chừng. Tối thiểu 4000 cho
lần chấm.

---

## 10. Chấm ĐẠT / KHÔNG ĐẠT

### 10.1. Luật

- **ĐẠT** khi phần tự giảng lại của học viên tương đồng **từ 70% trở lên** với
  lời giải chuẩn về **ý nghĩa**, không phải về từ ngữ
- AI phải trả về `similarityPercent`, `confidence`, và **lý do kèm trích dẫn**
  cho từng câu — đây là thứ quản trị viên dùng để phúc tra
- Kết quả lưu vào `FeynmanAiEvaluation`, **không ghi vào bảng điểm Reading**

### 10.2. Chưa nối vào hệ danh hiệu trong PR này

Hệ danh hiệu hiện tại xây trên dữ liệu xác định: cùng đầu vào luôn ra cùng kết
quả (`isValidAchievementAttempt`, `validForAchievements` chốt ngay lúc chấm).
AI thì không — cùng một bài viết, hôm nay ĐẠT, mai có thể KHÔNG ĐẠT.

**PR này:** lưu đầy đủ verdict + lý do + trích dẫn + độ tin cậy để quản trị
viên đối chiếu. **Chưa** nối vào XP/danh hiệu.

**Sau vài tháng** có dữ liệu thật, đánh giá độ ổn định rồi mới nối. Khi nối
phải lưu cả lý do và trích dẫn để phúc tra khiếu nại — đúng như yêu cầu đã
thống nhất.

### 10.3. Sự kiện danh hiệu khi Feynman làm lại nhiều lần

`FEYNMAN_COMPLETED` hiện đang khóa theo `review.id`. Khi một lượt làm có nhiều
phiên, học viên sẽ cày danh hiệu bằng cách làm lại mỗi ngày.

**Đổi khóa sự kiện sang `attemptId`** — chỉ lần hoàn thành **đầu tiên** của một
lượt làm bài tính danh hiệu; các lần sau là luyện tập.

---

## 11. Vận hành

### 11.1. Khi OpenAI lỗi

- Điểm, Feynman, thanh toán **không bị ảnh hưởng**
- Evaluation/message chuyển `FAILED`, lưu error code đã làm sạch
- **Hoàn lại lượt** đã giữ chỗ
- Không tự động thử lại, không hiện nút thử lại

Thông báo học viên:

> Hệ thống chưa thể tạo phản hồi AI cho lần chấm này. Lượt AI của bạn đã được
> hoàn lại. Điểm số và nội dung Feynman vẫn được lưu bình thường.

### 11.2. Trang quản trị

Tab **AI & Feynman** tại `/quan-tri/ai-feynman`, **gate bằng cờ**
`features.feynmanAi` trong `src/lib/features.ts` — dùng quy ước của các tab
chưa phát hành, tránh hiện tab dẫn tới trang 404.

Theo dõi 7 ngày và 30 ngày: số học viên dùng AI · số lần chấm · số câu hỏi ·
tỷ lệ hợp lệ · số thất bại · token vào/ra/cache · chi phí ước tính · latency
trung bình và p95 · số gói đã hết lượt · cảnh báo đang mở · model · phiên bản
prompt.

Hàng đợi cảnh báo lọc theo trạng thái, mức độ, loại, bài, mã câu, ngày. Quản
trị viên xem được passage, đáp án chuẩn, lời giải giáo viên, đầu ra AI; đánh
dấu đã xử lý hoặc bỏ qua kèm ghi chú.

**Không hiện:** khóa API · toàn văn prompt · chuỗi kết nối database.

### 11.3. Bảo mật giao diện

- Không render HTML từ model, không dùng `dangerouslySetInnerHTML`
- Passage, options và câu hỏi học viên là **dữ liệu không đáng tin** — prompt
  phải nói rõ model bỏ qua mọi chỉ thị nằm trong đó
- Giới hạn đầu vào: câu hỏi 3–1.000 ký tự · ghi chú phản hồi tối đa 500 ký tự ·
  `requestKey` phải là UUID hợp lệ · `detailLevel` và `targetKind` dùng
  allow-list

### 11.4. Rollback

Đặt `OPENAI_FEYNMAN_ENABLED=false` rồi khởi động lại. Giữ nguyên bản ghi để
kiểm toán. Khi AI tắt hoàn toàn, các thứ sau **vẫn phải chạy bình thường**:
nộp bài · chấm bài · xem đáp án · thanh toán · Feynman · danh hiệu · Nguyệt Thí.

---

## 12. Các mục còn chờ quyết định

| Mã | Vấn đề | Đã chốt |
|---|---|---|
| Q1 | Gói 29K nạp lượt cho một lượt làm bài hay dùng chung tài khoản | **Ví chung cả tài khoản** |
| Q2 | Giới hạn 1 lần chấm/ngày tính theo phạm vi nào | **Theo lượt làm bài** |
| Q3 | Bỏ chế độ ghép đề MANUAL — làm trong PR này hay tách riêng | **Tách riêng**, làm sau |
| Q4 | Số câu hỏi AI mỗi lượt chấm | **Full Test 10 · đề đơn 5** |
| Q5 | `FEYNMAN_ALL_30D` 299.000đ | **Dừng bán**, giữ quyền cũ |

Q1 và Q2 chọn hai phạm vi khác nhau nên ví và nhịp chấm phải tách thành hai
bảng — xem mục 4.3. Q4 hạ giá vốn gói 19K từ 46% xuống 27% — xem mục 13.

---

## 13. Giá vốn AI

Tính theo `gpt-5-mini` (0,25 USD vào / 2,00 USD ra mỗi triệu token), tỷ giá
26.000đ/USD, **mức dùng tối đa**:

| | Full Test 39K | Đề đơn 19K |
|---|---|---|
| Số câu hỏi mỗi lượt chấm | 10 | **5** |
| Một lần AI chấm | ~215đ | ~156đ |
| Một câu hỏi AI | ~100đ | ~72đ |
| 10 lần chấm | 2.150đ | 1.560đ |
| Toàn bộ câu hỏi | 100 câu · 10.000đ | 50 câu · 3.600đ |
| **Tổng tối đa** | **~12.150đ** | **~5.160đ** |
| **Tỷ lệ giá vốn** | **31%** | **27%** |

Quyết định Q4 kéo giá vốn gói 19K từ 46% xuống 27%, ngang ngửa gói Full Test.
Hai gói giờ có biên tương đương nhau, không còn gói nào lỗ ẩn.

Phần hỏi đáp vẫn chiếm phần lớn chi phí (82% ở gói 39K, 70% ở gói 19K), không
phải phần chấm. Nếu sau này cần siết thêm, siết số câu hỏi có tác dụng hơn siết
số lần chấm.

**Lưu ý:** đây là mức dùng kịch trần, giả định học viên tiêu hết ví và hỏi hết
số câu. Thực tế phần lớn học viên dùng 30–50% ngân sách.

**Rủi ro của ví chung (Q1):** ví cộng dồn theo số gói đã mua, nên học viên mua
10 lượt làm bài sẽ có 100 lượt chấm trong ví. Con số này vẫn nằm trong dự tính
vì mỗi gói đã tự trả cho 10 lượt của nó. Nhưng phải theo dõi ở trang quản trị:
nếu thấy tài khoản nào tiêu ví lệch hẳn so với số gói đã mua thì xem lại.

Bảng giá lưu trong `src/lib/feynman-ai/cost.ts` có đánh phiên bản. Model không
có trong bảng giá thì vẫn chạy, vẫn lưu token, `estimatedCostMicroUsd = 0`, và
trang quản trị hiện "Chưa có bảng giá".

---

## 14. Các file sẽ đụng tới

### 14.1. Sửa

```
package.json
prisma/schema.prisma
src/lib/init-db.ts                  ← bản v1 bỏ sót, đây là file quan trọng nhất
src/lib/features.ts
src/lib/payments/catalog.ts
src/lib/payments/payment-rules.ts
src/lib/payments/fulfillment.ts
src/lib/access-grants.ts
src/lib/actions/payments.ts
src/lib/actions/feynman.ts
src/lib/feynman-rules.ts
src/app/(site)/hoc-vien/bai-lam/[attemptId]/page.tsx
src/app/(site)/hoc-vien/bai-lam/[attemptId]/feynman/page.tsx
src/app/(site)/quan-tri/layout.tsx
DEPLOY.md
```

### 14.2. Tạo mới

```
src/lib/feynman-ai/{openai-client,config,types,schemas,prompts,context,scope,service,usage,cost,errors,rules}.ts
src/app/api/feynman/ai/{evaluate,messages,feedback}/route.ts
src/components/feynman/{feynman-ai-panel,feynman-ai-evaluation,feynman-ai-chat,feynman-question-picker}.tsx
src/app/(site)/hoc-vien/bai-lam/[attemptId]/dap-an-chi-tiet/page.tsx
src/app/(site)/quan-tri/ai-feynman/{page,[sessionId]/page}.tsx
scripts/test-feynman-ai.ts
HUONG-DAN-FEYNMAN-AI.md
```

`rules.ts` chứa toàn bộ luật **dạng hàm thuần** (quyền, quota, 1 lần/ngày, chọn
câu, ngưỡng 70%) để `scripts/test-feynman-ai.ts` chạy được **không cần MySQL**,
dùng khuôn của `payment-rules.ts`.

---

## 15. Kiểm thử bắt buộc

Nối `"test:feynman-ai"` vào chuỗi `npm test`.

| Nhóm | Phải chứng minh |
|---|---|
| Cách ly điểm | AI trả đáp án khác hẳn → `scoreRaw`, `scoreTotal`, `band`, `gradedAt`, `validForAchievements`, `CompetitionAttempt` **không đổi một chữ số** |
| Nguyệt Thí | Trước `endsAt`: không đáp án, không Feynman, không AI, không gọi API |
| Quyền | ALL mở được · ATTEMPT chỉ đúng attempt đó · EXERCISE legacy vẫn chạy · Reading không bị ảnh hưởng |
| Ví chung | Mua ở đề A tiêu được ở đề B · mỗi gói cộng đúng 10 · một đơn hàng không cộng ví hai lần · hết ví trả `QUOTA_EXHAUSTED` |
| Nhịp chấm | Chấm lần 2 cùng ngày trên **cùng** lượt làm bài bị chặn · chấm hai lượt làm bài **khác nhau** trong cùng ngày vẫn chạy · hết ví thì `lastGradedOn` được nhả lại, hôm sau vẫn chấm được · mốc reset theo giờ Việt Nam |
| Quota | Full Test câu thứ 11 bị chặn · đề đơn câu thứ 6 bị chặn · hai request đồng thời không vượt trần · thất bại thì hoàn lượt · bấm hai lần chỉ gọi API một lần |
| Sản phẩm dừng bán | `FEYNMAN_ALL_30D` không hiện ở trang bán · `AccessGrant` cũ của gói này vẫn mở được Feynman tới hết hạn |
| Ưu tiên giáo viên | Passage mâu thuẫn → đầu ra theo giáo viên, cảnh báo vào hàng đợi admin, không lọt xuống học viên |
| Chọn câu | Tick quá 10 câu bị chặn · tick câu đúng vẫn hợp lệ |
| Riêng tư | Payload không chứa email, tên, passwordHash, candidateCode, thanh toán, integrity, webcam, userId, attemptId |
| Phạm vi hỏi | Câu liên quan được trả lời · câu ngoài phạm vi bị từ chối không trừ quota · lỗi chính tả nhỏ vẫn trả lời · câu trống không gọi API · prompt injection không đổi được chính sách |

---

## 16. Không làm trong PR này

AI chấm điểm Reading · Writing/Listening/Speaking AI · AI giám sát thi ·
AI trong Nguyệt Thí · web search · fine-tuning · embedding · vector database ·
agent framework · tự động thử lại · background job · Redis · queue ·
email thông báo · nối verdict AI vào XP/danh hiệu · gỡ chế độ ghép MANUAL ·
đổi thang band · đổi achievement engine.

**Ghi nhận cho sau này:** áp cơ chế giám sát kỳ thi cho mọi bài tập thường, và
kiểm tra CCCD qua meeting trực tuyến trước kỳ Nguyệt Thí — hai việc này nằm
ngoài phạm vi PR AI Tutor.
