# Cẩm nang tự thêm nội dung bài tập

Hướng dẫn dành cho giáo viên/quản trị viên Wobridges — **không cần biết lập
trình**, mọi thao tác đều làm trên giao diện web.

## Vào khu quản trị

1. Mở **wobridges.com/dang-nhap**, đăng nhập bằng tài khoản admin.
2. Trên thanh menu xanh đậm, chọn **Bài tập**.
3. Tại đây bạn thấy toàn bộ ngân hàng đề, với các nút ở cột "Thao tác":
   - ✏️ **Sửa** nội dung bài
   - 👁 **Ẩn/Hiện** — ẩn bài khỏi học viên mà không xóa (dùng khi cần chỉnh sửa lớn)
   - 🗑 **Xóa** — chỉ xóa được bài chưa có học viên nào làm

---

## Thêm đề WRITING (dễ nhất — chỉ điền form)

Bấm **"Tạo bài tập mới"**, chọn Kỹ năng = **Writing**, rồi điền:

| Ô | Điền gì | Ví dụ |
|---|---------|-------|
| Thời gian làm bài | Số phút — hết giờ bài tự nộp | Task 1: `20` · Task 2: `40` |
| Tiêu đề | Tên hiện với học viên | `Writing Task 2 — Technology in Education` |
| Mô tả ngắn | Một dòng giới thiệu | `Dạng Agree/Disagree · tối thiểu 250 từ · 40 phút` |
| Task | Task 1 (mô tả số liệu) hoặc Task 2 (bài luận) | |
| Số từ tối thiểu | Task 1: `150` · Task 2: `250` | |
| Đề bài | Đề tiếng Anh, các đoạn cách nhau MỘT DÒNG TRỐNG | xem dưới |
| Hướng dẫn | Lời khuyên tiếng Việt cho học viên (không bắt buộc) | |
| Bảng số liệu | CHỈ dùng cho Task 1 dạng bảng — xem dưới | |

**Ví dụ ô "Đề bài"** (dòng trống giữa các đoạn — đoạn sau dòng trống sẽ in đậm):

```
Some people believe that children should learn a foreign language from primary school.

To what extent do you agree or disagree?

Give reasons for your answer and include any relevant examples from your own knowledge or experience.
```

**Ví dụ ô "Bảng số liệu"** (chỉ Task 1; giữ nguyên các dấu ngoặc, phẩy, nháy kép):

```json
{
  "caption": "Tỷ lệ hộ gia đình sở hữu ô tô (%)",
  "headers": ["Quốc gia", "2010", "2020"],
  "rows": [
    ["Việt Nam", "12", "34"],
    ["Thái Lan", "35", "51"]
  ]
}
```

Tick **"Mở cho học viên làm ngay"** → bấm **Tạo bài tập**. Xong!

---

## Thêm đề READING (soạn bằng form — không cần JSON)

Chọn Kỹ năng = **Reading** là trình tạo đề hiện ra. Quy trình:

1. Điền **tiêu đề bài đọc** và dán **bài đọc** (các đoạn cách nhau một dòng
   trống — đoạn 1 tự thành A, đoạn 2 thành B…).
2. Ở ô **"Thêm nhóm câu hỏi — chọn dạng bài"**, chọn 1 trong 8 dạng rồi bấm
   **Thêm nhóm**. Form nhập nội dung + đáp án của đúng dạng đó sẽ hiện ra.
3. Nhập câu hỏi, chọn đáp án đúng từ trình đơn (hệ thống **tự đánh số câu**,
   kể cả dạng chọn 2 đáp án chiếm 2 số).
4. Cần thêm passage? Bấm **Thêm Part 2/3** ở cuối.

| Dạng bài | Học viên thao tác |
|---|---|
| True/False/Not Given | Chọn 1 trong 3 |
| Multiple Choice (1 đáp án) | Radio A–D |
| Multiple Choice (nhiều đáp án) | Tick đúng số đáp án quy định, chiếm nhiều số câu |
| Gap Filling | Ô điền ngay trong câu; admin chọn giới hạn từ (ONE WORD → NO MORE THAN THREE WORDS AND/OR A NUMBER); vượt giới hạn có cảnh báo đỏ |
| Matching Headings | Kéo heading thả vào ô nét đứt **trong bài đọc** |
| Matching Information | Kéo chữ cái A–F vào ô cạnh câu — **dùng lại được** |
| Matching Features | Nối câu với danh sách A–F — dùng lại được |
| Matching Sentence Endings | Kéo phần kết thúc câu vào ô — mỗi ending 1 lần |

> Trên máy tính bảng/không kéo-thả được: bấm chọn thẻ đáp án rồi bấm vào ô
> trống. Bấm ✕ trên ô để gỡ đáp án.

Phần dưới đây là **chế độ nâng cao (JSON)** — chỉ dành cho người muốn sửa tay
hoặc sao chép đề giữa các hệ thống. Người dùng thông thường bỏ qua.

### Cấu trúc tổng thể — đề gồm 1 đến 3 part (giống đề thi thật)

```json
{
  "parts": [
    {
      "passage": {
        "title": "Tiêu đề bài đọc Part 1",
        "paragraphs": [
          "Đoạn văn thứ nhất...",
          "Đoạn văn thứ hai...",
          "Mỗi đoạn là một dòng trong cặp ngoặc vuông, bọc trong nháy kép, cách nhau dấu phẩy"
        ]
      },
      "questionGroups": [ ...các nhóm câu hỏi của Part 1... ]
    },
    {
      "passage": { ...Part 2... },
      "questionGroups": [ ... ]
    }
  ]
}
```

> Muốn đề chỉ có 1 passage thì mảng `parts` chỉ chứa 1 phần tử. Muốn đề thi
> thử hoàn chỉnh thì thêm 3 phần tử. Học viên sẽ thấy thanh chuyển Part 1/2/3
> dưới màn hình làm bài, đúng như phần mềm thi thật.
>
> **Quan trọng:** `id` câu hỏi phải duy nhất trong TOÀN BỘ đề và nên đánh liên
> tục xuyên part: Part 1 dùng q1–q13, Part 2 dùng q14–q26, Part 3 dùng q27–q40.

### Ba loại nhóm câu hỏi được hỗ trợ

**1. TFNG — TRUE / FALSE / NOT GIVEN**

```json
{
  "type": "TFNG",
  "instruction": "Do the following statements agree with the information in the passage?",
  "questions": [
    {
      "id": "q1",
      "prompt": "The company was founded in 1990.",
      "options": ["TRUE", "FALSE", "NOT GIVEN"],
      "answer": "FALSE"
    }
  ]
}
```

**2. MC — Trắc nghiệm A/B/C/D** (đáp án chỉ ghi CHỮ CÁI)

```json
{
  "type": "MC",
  "instruction": "Choose the correct letter, A, B, C or D.",
  "questions": [
    {
      "id": "q2",
      "prompt": "What is the main idea of paragraph 2?",
      "options": [
        "A. The history of the invention",
        "B. The cost of production",
        "C. The impact on society",
        "D. The future development"
      ],
      "answer": "C"
    }
  ]
}
```

**3. GAP — Điền từ vào chỗ trống**

```json
{
  "type": "GAP",
  "instruction": "Complete the sentences. Write NO MORE THAN TWO WORDS.",
  "questions": [
    {
      "id": "q3",
      "prompt": "The bridge was built using ______ techniques.",
      "answer": "modern engineering",
      "altAnswers": ["modern", "engineering"]
    }
  ]
}
```

> `altAnswers` là các đáp án biến thể cũng được chấm đúng (không bắt buộc).
> Hệ thống tự bỏ qua hoa/thường và dấu câu khi chấm.

### Quy tắc bắt buộc (sai là hệ thống báo lỗi ngay, không hỏng gì)

1. Mỗi câu hỏi cần `id` **duy nhất trong bài**: `q1`, `q2`, `q3`… theo thứ tự.
2. Mỗi câu cần đủ `id`, `prompt` (câu hỏi) và `answer` (đáp án).
3. Nháy kép `"` bao quanh mọi đoạn chữ; phẩy `,` giữa các mục; **không có phẩy
   sau mục cuối cùng** của một danh sách.
4. Nếu trong nội dung có dấu nháy kép, thay bằng nháy đơn hoặc “ ” cong.

**Mẹo:** soạn đề trong file Word trước, rồi dán từng phần vào khung JSON mẫu.
Nếu báo "JSON không hợp lệ", dán toàn bộ nội dung vào trang jsonlint.com để nó
chỉ chính xác dòng bị lỗi.

---

## Lời giải mẫu cho phần chữa bài Feynman

Sau khi nộp bài Reading, học viên **không thấy ngay đáp án đúng của câu sai**.
Các em phải tự giảng lại bài đọc và tự chẩn đoán lỗi trước; xong bước đó hệ
thống mới mở lời giải. Muốn phần "mở lời giải" có nội dung của giáo viên thay vì
chỉ hiện đáp án trơ, hãy thêm khối `learning` vào từng câu hỏi ở **Chế độ nâng
cao (JSON)**:

```json
{
  "id": "q7",
  "prompt": "Dr Milgrom was confident about applying his software in 2006.",
  "options": ["YES", "NO", "NOT GIVEN"],
  "answer": "NO",
  "learning": {
    "evidenceParagraph": "D",
    "evidenceText": "“He was apprehensive at first, but the result was a triumph.”",
    "explanation": "“Apprehensive” nghĩa là lo lắng — trái ngược trực tiếp với “confident”, nên mệnh đề bị phủ định.",
    "trap": "Vế sau nói kết quả thành công dễ khiến học viên chọn YES.",
    "paraphrases": [{ "question": "was confident", "passage": "was apprehensive at first" }],
    "skillTag": "YNNG_CONTRADICTION"
  }
}
```

| Trường | Nên có? | Tiêu chuẩn |
|---|---|---|
| `evidenceParagraph` | Nên | Vị trí ngắn: `C`, `Part 2 — B` |
| `evidenceText` | Nên | 1–2 câu, trích ngắn hoặc diễn giải — **đừng chép cả đoạn** |
| `explanation` | Nên | Vì sao đáp án đúng VÀ vì sao phương án khác không đủ căn cứ |
| `trap` | Nên | Một bẫy chuyển giao được sang bài khác |
| `paraphrases` | Tùy câu | 1–3 cặp quan trọng |
| `skillTag` | Tùy chọn | Nhãn để thống kê sau này |

> Đề chưa có `learning` vẫn chạy bình thường — học viên sẽ thấy đáp án đúng kèm
> hướng dẫn chung. Đề **Reading Practice 03 — Game Theory** đã có đủ lời giải
> mẫu cho cả 14 câu, dùng làm mẫu tham khảo.

## Quy trình kiểm tra trước khi giao cho học viên

1. Khi tạo bài, **bỏ tick** "Mở cho học viên làm ngay" → bài ở trạng thái Ẩn.
2. Tự đăng ký một tài khoản học viên thử (email bất kỳ của bạn).
3. Vào Quản trị → Bài tập → bấm 👁 để mở bài → làm thử bằng tài khoản học viên,
   kiểm tra đáp án chấm đúng.
4. Ổn rồi thì để bài ở trạng thái "Đang mở". Nếu cần sửa, bấm 👁 ẩn đi trước.

## Listening & Speaking

Hai trang này hiện là **trang gợi ý chủ đề** (nội dung tĩnh trong code).
Muốn đổi nội dung, cần sửa file mã nguồn `src/app/(site)/luyen-tap/listening/page.tsx`
và `speaking/page.tsx` — phần này nên nhờ hỗ trợ kỹ thuật, hoặc chờ phòng
luyện tương tác cho hai kỹ năng này được xây ở giai đoạn sau.
