# Hướng dẫn vận hành Danh hiệu và Nguyệt Thí

Dành cho người điều hành trung tâm. Không cần biết lập trình.

---

## Hệ thống này là gì

Một **hành trình danh dự**, không phải trò chơi tích điểm. Không có điểm kinh
nghiệm, không có cửa hàng đổi điểm. Mỗi danh hiệu nói cho học viên biết họ đã
làm được điều gì có giá trị thật.

**18 danh hiệu**, chia năm nhóm:

| Nhóm | Đo cái gì |
|---|---|
| Giải đề | Làm bao nhiêu đề, đạt band nào ngay lần đầu |
| Sửa đề | Chữa bài Feynman sâu tới đâu |
| Kỷ luật | Bao nhiêu ngày học thật, bao nhiêu giờ |
| Tổng hợp | Đủ cả ba trụ trên — đây là vé vào Nguyệt Thí |
| Chuyển hóa | Đi lên từ giai đoạn sa sút |

Ba danh hiệu **Nguyệt Thí** dành cho Top 3 cuộc thi hàng tháng, kèm huy hiệu
30 ngày và tiền thưởng.

---

## Hai việc bạn PHẢI làm, nếu không 4 danh hiệu vĩnh viễn không ai đạt được

### Việc 1 — Xếp mức độ khó cho từng đề

Vào **Quản trị → Bài tập**, cột **Danh hiệu**. Mỗi đề Reading có hai nút:

- Nút mức độ: bấm để xoay **Chưa xếp → Dễ → Vừa → Khó**
- Nút **Tính danh hiệu**: bật/tắt việc đề này được tính

Ghép đề tự động dùng mức độ này để chọn mỗi tầng một bài, đúng trình tự đề thi
thật. Không xếp thì vẫn ghép được nhưng độ khó sẽ lệch.

### Việc 2 — Tạo và đóng băng một bộ đề

Vào **Quản trị → Bộ đề**. Đặt mã (ví dụ `FREE2026Q3`) và tên, bấm **Tạo bộ
mới**, chọn các bài, rồi bấm **Đóng băng và kích hoạt**. Cần tối thiểu **8 bài**.

> **Vì sao phải đóng băng?** Bốn danh hiệu kiểu *"hoàn thành toàn bộ đề"* phải
> xét trên một danh sách cố định. Nếu xét trên "mọi đề hiện có", chỉ cần bạn
> đăng thêm một bài là học viên vừa đạt danh hiệu bỗng dưng mất nó. Đóng băng
> chính là lời hứa đó với người học.

Đăng thêm đề sau khi đóng băng **không ảnh hưởng** bộ đang chạy. Muốn đưa đề mới
vào danh hiệu thì tạo bộ mới rồi kích hoạt — học viên có cơ hội đạt lại ở mùa
mới, và danh hiệu mùa cũ vẫn được giữ nguyên.

---

## Phần thưởng mở bài

Hai danh hiệu hiếm cho học viên quyền mở **một bài trả phí kèm Feynman**.

Luồng: học viên đạt danh hiệu → tự chọn bài đang khóa → gửi yêu cầu → bạn duyệt
ở **Quản trị → Phần thưởng** → hệ thống mở luôn cả hai quyền, vĩnh viễn.

Nút **Trả lại** không tước phần thưởng: yêu cầu quay về trạng thái chờ chọn bài
kèm ghi chú, học viên vẫn còn 90 ngày để chọn bài khác.

---

## Nguyệt Thí

### Chuẩn bị đề

Ba đề dùng cho cuộc thi phải được đánh dấu **"chỉ dùng cho cuộc thi"** trước.
Hệ thống sẽ từ chối tạo kỳ thi nếu thiếu bước này.

> Đề đã công khai thì học viên luyện trước được, và cuộc thi mất hết ý nghĩa.

### Năm bước điều hành một kỳ

Vào **Quản trị → Nguyệt Thí**. Trạng thái đi theo đúng thứ tự, không nhảy cóc:

1. **Tạo kỳ thi** — chọn đúng 3 đề, đặt ngày bắt đầu. Đăng ký tự mở trước 7
   ngày; ba đề mở dần vào ngày 1 · 3 · 5; kỳ thi kéo dài 7 ngày.
2. **Mở đăng ký** — học viên đủ điều kiện mới đăng ký được.
3. **Bắt đầu thi** — học viên vào làm bài. Mỗi đề đúng một lượt.
4. **Đóng cổng, chuyển sang rà soát** — hết hạn thì bấm nút này.
5. **Chốt kết quả** — sau khi rà soát xong. Phải gõ `CHOT` để xác nhận.

### Rà soát trước khi chốt — đọc kỹ phần này

Đây là bước duy nhất có con người trong vòng lặp, và nó tồn tại vì một lý do:
**máy không nhìn ra được những thứ bạn nhìn ra ngay.**

Với các thí sinh sắp nhận giải, hãy xem:

- **Thời gian làm bài có hợp lý không?** Ba đề 60 phút mà làm xong trong 15
  phút mỗi đề với band 8.5 là bất thường.
- **Có tài khoản trùng không?** Cùng một người đăng ký nhiều tài khoản.
- **Điểm có nhảy vọt đột ngột không?** Đang 6.0 suốt ba tháng rồi bỗng 9.0.

Thấy dấu hiệu thì bấm **Loại** kèm lý do. Hệ thống ghi lại thành cờ liêm chính
và **không xóa bài làm** — nếu sau này học viên khiếu nại, bạn vẫn còn bằng chứng.

> Hệ thống **không bao giờ tự kết luận ai gian lận**. Một tín hiệu đơn lẻ không
> đủ để tước giải của ai. Quyết định là của bạn, và phải có lý do.

### Trao giải

| Giải | Điều kiện | Tiền |
|---|---|---|
| Nhất | Cả 3 đề từ 8.5 | 999.000đ |
| Nhì | Cả 3 đề từ 8.0 | 499.000đ |
| Ba | Cả 3 đề từ 7.5 | 199.000đ |

**Không ai đạt chuẩn thì giải để trống.** Hệ thống không đôn người kém hơn lên
cho đủ mâm — làm vậy là hạ giá trị của giải với tất cả những người sau này.

**Tiền KHÔNG tự chuyển.** Sau khi chốt, hệ thống ghi *"đã duyệt, chờ chi"*. Bạn
tự chuyển khoản rồi tự đánh dấu. Đây là cố ý: không phần mềm nào nên tự động
chuyển tiền của bạn đi.

---

## Quyền riêng tư của học viên

**Mặc định là không công khai gì cả.**

Ở **Danh hiệu của tôi**, học viên tự chọn có hiện tên ở Điện Danh Vọng không, và
tự đặt tên hiển thị (có thể là biệt danh). Không bật thì danh hiệu vẫn được tính
vào tổng số nhưng ẩn danh hoàn toàn.

Khi đăng ký Nguyệt Thí, họ chọn riêng: tên thật, biệt danh, hoặc ẩn danh trên
Bảng Vàng.

Email, điểm số chi tiết và lịch sử học tập **không bao giờ** hiển thị công khai,
dù học viên có bật gì đi nữa.

Có một danh hiệu **riêng tư** dành cho giai đoạn sa sút. Nó chỉ chủ tài khoản
thấy, không vào Điện Danh Vọng, không trang bị được, và **tự động biến mất** khi
học viên đạt danh hiệu phục hồi. Nó tồn tại để có cái vượt qua, không phải để
nhắc mãi rằng họ từng kém.

---

## Vì sao học viên chưa có danh hiệu nào

Mở `https://stoic-ielts.online/api/health`, xem khối `achievements`:

| Con số | Ý nghĩa khi bằng 0 |
|---|---|
| `titleCount` | Danh mục chưa gieo — lỗi hệ thống, báo cho người phát triển |
| `progressRows` | Chưa ai được xét — lỗi hệ thống |
| `validAttempts` | Chưa có bài làm nào **nghiêm túc** |
| `activeCollection` | Chưa đóng băng bộ đề — 4 danh hiệu không thể đạt |

**`validAttempts = 0` thường là bình thường**, không phải lỗi. Hàng rào chống cày
yêu cầu: trả lời ít nhất **nửa số câu**, và ngồi làm ít nhất **3 phút**. Bài bấm
thử để kiểm tra giao diện sẽ không được tính — đúng như thiết kế.

Tài khoản **quản trị viên không bao giờ được tính** vào thống kê học tập. Muốn
thử nghiệm, hãy đăng ký một tài khoản học viên riêng.

---

## Cách kiểm tra hệ thống chạy đúng trong 15 phút

1. Đăng ký một tài khoản **học viên** mới.
2. Làm **3 bài Reading công khai**, làm thật, trả lời hết câu.
3. Vào **Danh hiệu của tôi**.

Nếu đúng, danh hiệu *"Kích thạch nãi hữu hỏa"* xuất hiện sau bài thứ ba. Trước
đó, mỗi lần nộp bài thanh tiến độ sẽ nhích lên kèm câu nhắc còn thiếu mấy bài.

Nếu làm đủ ba bài nghiêm túc mà vẫn không có danh hiệu nào, đó mới là lỗi thật —
gửi kết quả `/api/health` cho người phát triển.
