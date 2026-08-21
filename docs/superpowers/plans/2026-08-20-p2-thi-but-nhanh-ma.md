# P2: Thí Bút, nhánh mã

> Ngày 2026-08-20. Theo `docs/DAC-TA-DAU-TRUONG.md` mục 14, giai đoạn P2.
>
> P2 chia hai nhánh chạy song song. **Tài liệu này chỉ nói về nhánh mã.**
> Nhánh nội dung, tức sinh 400 tới 500 câu và duyệt, do chủ dự án làm.

## Ranh giới giữa hai nhánh

| Nhánh mã (đã xong) | Nhánh nội dung (chủ dự án) |
|---|---|
| Bảng `ThiButItem`, `ThiButAttempt` | Sinh câu nháp |
| Luật thuần: chọn câu, chấm, giá, thời gian chờ | Duyệt từng câu |
| Luồng khảo hạch cho học viên | |
| Màn hình duyệt cho quản trị viên | |
| Script nạp câu nháp vào kho | |

Chỗ nối là `scripts/import-thibut-drafts.mjs`. Nội dung sinh ở ngoài, nạp vào
ở trạng thái chờ duyệt, người duyệt xử lý tại `/quan-tri/thi-but`.

## Bốn câu, cần đúng ba. Con số này tính ra chứ không đoán

Đặc tả mục 03 đòi "người vững qua khoảng 90%, người chưa vững khoảng 20%". Xác
suất nhị thức của từng phương án:

| Số câu, ngưỡng | vững p=.85 | khá p=.65 | yếu p=.45 | đoán bừa p=.25 |
|---|---:|---:|---:|---:|
| 3 câu, cần 3 | 61.4% | 27.5% | 9.1% | 1.6% |
| **4 câu, cần 3** | **89.0%** | 56.3% | **24.1%** | 5.1% |
| 4 câu, cần 4 | 52.2% | 17.9% | 4.1% | 0.4% |
| 5 câu, cần 4 | 83.5% | 42.8% | 13.1% | 1.6% |

Chỉ một phương án khớp cả hai đầu. Nó cũng khoá đường đoán bừa: 5.1% thay vì
25% nếu chỉ hỏi một câu trắc nghiệm bốn lựa chọn.

Đổi hai số này thì phải tính lại bảng trên, đừng chỉnh bằng cảm giác.

## Giá suy ngược từ số ngày học, không từ giá trị món hàng

Đặc tả mục 10 bảo bắt đầu từ đúng một câu hỏi: **bao nhiêu giờ học thật thì đổi
được một đề?** Mục tiêu 2 tới 3 ngày học đều đặn. Một ngày học đạt chuẩn trả 5
Quân Công, nên lượt đầu tốn 12.

Trượt thì lượt sau rẻ hơn: chuỗi 12, 7, 4, 4, 4. Có **sàn 4**, và sàn tồn tại
vì một lý do cụ thể: nếu giá tiến về 0 thì cách tối ưu là cố tình trượt vài lần
rồi mới làm thật.

## Bốn chỗ dễ hỏng, và cách gác

| Chỗ | Hỏng thế nào | Gác bằng |
|---|---|---|
| Đáp án rò xuống máy khách | Cả cơ chế "phải đoạt lấy" thành trò hề | `publicItem()` bóc `answerIndex` và `explanation`; test soi cả chuỗi JSON gửi đi |
| Trừ Quân Công lúc chấm thay vì lúc bắt đầu | Mở nhiều lượt song song bằng số Quân Công chỉ có một lần | Trừ trong cùng transaction với việc tạo lượt |
| Máy khách gửi điểm lên | Mọi thứ phía trên chỉ là trang trí | Máy chủ đọc lại câu từ database rồi tự chấm |
| Quyền do Quân Công ghi `source: PURCHASE` | Báo cáo doanh thu phồng lên bằng đúng phần cho không | `source: "MERIT"`, và `summarizeGrantsForAdmin` tách `readingMerit` khỏi `readingPurchases` |

Chỗ thứ tư không nằm trong đặc tả. Tôi phát hiện khi đọc `access-grants.ts`:
hàm tổng hợp đếm mọi quyền không phải `ADMIN` là "đã mua". Đây đúng là lỗi mà
ví xu đã tránh khi tách `sold` khỏi `gifted`, chỉ là lặp lại ở chỗ khác.

## Trượt phải mất Quân Công mà KHÔNG có hàng

Nghe như một sự khắc nghiệt, nhưng nó chính là cơ chế. Nếu trượt vẫn được hàng
thì Quân Công đang định giá món hàng, và tỷ giá với Xu xuất hiện, tức bức tường
ở mục 01 sụp.

Đổi lại, trượt phải thành buổi học: màn hình hiện lời giải từng câu trước khi
cho vào lại. `scripts/test-thibut-db.ts` gác cả hai vế.

## Còn thiếu

- **Lối vào từ trang đề.** Hiện phải biết đường dẫn mới vào được Thí Bút. Cần
  thêm nút "Đoạt bằng quân công" cạnh nút mua bằng xu ở danh sách đề
- **Kho câu.** Chưa có câu nào được phát hành, nên Thí Bút chưa mở cho học viên.
  Đây là nhánh nội dung
