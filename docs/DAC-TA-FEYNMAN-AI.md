# ĐẶC TẢ THỐNG NHẤT — FEYNMAN AI TUTOR

**Dự án:** Stoic IELTS · `guanghui-stack/Stoic-Ielts`
**Phiên bản:** `2026-08-feynman-ai-v2`
**Thay thế:** bản đặc tả `2026-08-feynman-ai-v1`
**Trạng thái:** đang chốt — mục 12 còn chờ quyết định

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

### 2.1. Miễn phí

- Toàn bộ đề thi Reading — đề đơn và đề ghép
- Chấm điểm tự động + band quy đổi
- Đáp án đúng/sai cơ bản sau khi nộp bài

### 2.2. Trả phí

| Gói | Giá | Mở cho |
|---|---|---|
| Full Test (đề ghép 40 câu) | **39.000đ** | Một lượt làm bài |
| Đề đơn (một passage) | **19.000đ** | Một lượt làm bài |
| Nạp thêm lượt AI | **29.000đ** | 10 lượt AI chấm |

Gói 19K/39K bao gồm:

1. **Đáp án sửa chi tiết** — lời giải giáo viên cho TẤT CẢ các câu, không chỉ
   câu sai. Vĩnh viễn, không giới hạn lượt xem. Chi phí API: 0đ.
2. **Hệ thống Feynman** — luyện lại **không giới hạn số lần**. Chi phí API: 0đ.
3. **AI chấm Feynman** — tối đa **10 lượt**, mỗi ngày **1 lượt**.
4. **Hỏi AI** — **10 câu mỗi lượt chấm**, reset sau mỗi lần chấm.

Hết 10 lượt AI chấm thì mua gói 29.000đ để nạp thêm 10 lượt. Phần đáp án chi
tiết và Feynman vẫn dùng bình thường, không bị khóa lại.

### 2.3. Câu chữ phải in đúng trên website

> Luyện Feynman không giới hạn và không tốn phí. Chỉ phần AI chấm và hỏi đáp
> AI mới tính lượt, vì mỗi lần gọi AI là một chi phí thật.

> AI chỉ kết luận điểm yếu khi đã đủ bằng chứng tích lũy — không phán xét bạn
> dựa trên một lần làm bài.

### 2.4. Hai sản phẩm cũ dừng lại

`READING_SINGLE` (9.000đ) và `READING_ALL_30D` (99.000đ) mất ý nghĩa khi đề
miễn phí. Gỡ khỏi trang bán, giữ lại trong catalog để đơn cũ và quyền cũ vẫn
tra cứu được.

**Việc mở đề miễn phí không cần sửa mã nguồn:** chỉ cần đặt
`Exercise.accessLevel = "PUBLIC"` cho mọi bài. Cơ chế khóa nằm ở cột đó
(`src/lib/access-rules.ts`), không nằm trong logic.

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

FeynmanAiBudget    — ví lượt AI của học viên
FeynmanAiAlert     — hàng đợi cảnh báo cho quản trị viên
```

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

**`FeynmanAiBudget`** — ví lượt AI:

```
userId + attemptId (unique)
gradingLimit    Int  @default(10)   // 10 lượt, +10 mỗi gói 29K
gradingUsed     Int  @default(0)
lastGradedOn    DateTime?           // chặn 1 lần/ngày
```

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
| AI chấm — tổng | 10 lượt/gói | `FeynmanAiBudget.gradingUsed` |
| AI chấm — mỗi ngày | 1 lượt | `FeynmanAiBudget.lastGradedOn` |
| Hỏi AI | 10 câu mỗi lượt chấm | `FeynmanAiEvaluation.questionUsed` |
| Câu hỏi không hợp lệ | 3 lần/giờ → HTTP 429 | Đếm trên database |
| Request đang chạy | 1 cho mỗi học viên | Khóa ở database |

### 6.1. Giữ chỗ quota trước khi gọi API

```ts
updateMany({
  where: { id: budgetId, gradingUsed: { lt: gradingLimit } },
  data:  { gradingUsed: { increment: 1 } }
})
```

Không update được → `QUOTA_EXHAUSTED`. **Không giữ transaction mở trong lúc
gọi OpenAI.**

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

OPENAI_FEYNMAN_GRADING_LIMIT=10
OPENAI_FEYNMAN_GRADING_PER_DAY=1
OPENAI_FEYNMAN_CHAT_LIMIT=10
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

| Mã | Vấn đề | Đề xuất |
|---|---|---|
| Q1 | Gói 29K nạp lượt cho đúng một attempt hay dùng chung cả tài khoản | **Ví chung** — dễ bán và dễ hiểu hơn |
| Q2 | Giới hạn 1 lần chấm/ngày tính theo attempt hay theo tài khoản | **Theo attempt** |
| Q3 | Bỏ chế độ ghép đề MANUAL (học viên tự chọn passage) — làm trong PR này hay tách riêng | **Tách riêng** |
| Q4 | 10 câu hỏi reset mỗi lần chấm = tối đa 100 câu/gói. Giá vốn cao | Xem mục 13 |
| Q5 | `FEYNMAN_ALL_30D` 299.000đ còn bán không | Chờ trả lời |

---

## 13. Giá vốn AI

Tính theo `gpt-5-mini` (0,25 USD vào / 2,00 USD ra mỗi triệu token), tỷ giá
26.000đ/USD, **mức dùng tối đa**:

| | Full Test 39K | Đề đơn 19K |
|---|---|---|
| Một lần AI chấm | ~215đ | ~156đ |
| Một câu hỏi AI | ~100đ | ~72đ |
| 10 lần chấm | 2.150đ | 1.560đ |
| 100 câu hỏi | 10.000đ | 7.200đ |
| **Tổng tối đa** | **~12.150đ** | **~8.760đ** |
| **Tỷ lệ giá vốn** | **31%** | **46%** |

Phần hỏi đáp chiếm hơn 80% chi phí, không phải phần chấm.

**Lưu ý:** đây là mức dùng kịch trần. Thực tế phần lớn học viên dùng 30–50%
ngân sách. Nhưng gói 19K có biên mỏng — nếu muốn rộng hơn, giảm số câu hỏi mỗi
lần chấm từ 10 xuống 5 sẽ hạ giá vốn gói 19K về khoảng 25%.

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
| Quota | Câu thứ 11 bị chặn · hai request đồng thời không vượt trần · chấm lần 2 trong ngày bị chặn · thất bại thì hoàn lượt · bấm hai lần chỉ gọi API một lần |
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
