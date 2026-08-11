# Hướng dẫn bật thanh toán SePay

Dành cho người vận hành trung tâm. Không cần biết lập trình — chỉ cần bấm đúng
chỗ trong hPanel và trên trang SePay.

---

## Website đang bán những gì

| Sản phẩm | Giá | Mở cho |
|---|---|---|
| Full Test — đáp án chi tiết + Feynman + AI | 39.000đ | Đúng một lượt làm bài, vĩnh viễn |
| Đề đơn — đáp án chi tiết + Feynman + AI | 19.000đ | Đúng một lượt làm bài, vĩnh viễn |
| Nạp thêm 10 lượt AI chấm | 29.000đ | Ví chung của tài khoản |

**Đề thi Reading hoàn toàn miễn phí**, kể cả chấm điểm, quy đổi band và đáp án
đúng/sai. Trung tâm bán lớp chữa sâu: lời giải mẫu của giáo viên cho từng câu,
phân tích bẫy, quy trình bắt học viên tự giảng lại bài, và phần AI chấm.

Gói 39k/19k gắn với **một lượt làm bài cụ thể**, nên chỉ mua được từ trang kết
quả của bài vừa làm. Mỗi lần mua tặng 10 lượt AI chấm vào **ví chung** — mua ở
đề nào cũng tiêu được ở đề khác. Hết ví thì nạp gói 29.000đ; phần đáp án chi
tiết và Feynman vẫn dùng bình thường, không bị khóa lại.

> **Ba gói cũ đã dừng bán** (Reading mở lẻ 9.000đ, Reading 30 ngày 99.000đ,
> Feynman 30 ngày 299.000đ). Quyền học viên đã trả tiền vẫn còn nguyên và dùng
> hết thời hạn như cũ.

Mức truy cập của từng bài đổi ở **Quản trị → Bài tập → cột Truy cập**. Mặc định
mọi bài là **Ai cũng làm được**; đặt **Cần mở khóa** thì bài đó chỉ mở cho học
viên được trung tâm cấp quyền tay — **không bán online nữa**.

---

## Việc 1 — Lấy khóa từ SePay

1. Đăng nhập [my.sepay.vn](https://my.sepay.vn).
2. Vào phần **Cổng thanh toán**, chọn môi trường **Sandbox** (chạy thử, tiền giả).
3. Ghi lại hai giá trị: **Merchant ID** và **Secret Key**.

> **Đừng gửi Secret Key qua chat, email hay chụp màn hình cho ai.** Ai có nó thì
> có thể giả lệnh "đã thanh toán" và học miễn phí toàn bộ. Nếu đã lỡ gửi đi đâu
> đó, hãy vào SePay cấp lại khóa mới trước khi chuyển sang tiền thật.

---

## Việc 2 — Nhập khóa vào Hostinger

Vào hPanel → **Ứng dụng web Node.js** → chọn ứng dụng → **Biến môi trường**.
Thêm từng dòng dưới đây rồi bấm **Lưu**:

| Tên biến | Giá trị điền |
|---|---|
| `APP_URL` | `https://stoic-ielts.online` (địa chỉ thật, không có `/` ở cuối) |
| `SEPAY_ENV` | `sandbox` |
| `SEPAY_MERCHANT_ID` | Merchant ID vừa lấy |
| `SEPAY_SECRET_KEY` | Secret Key vừa lấy |

Xong bấm **Tái triển khai** (Redeploy).

Kiểm tra bằng cách mở địa chỉ này trên trình duyệt:

```
https://stoic-ielts.online/api/health
```

Trong phần `payment` phải thấy `merchantIdConfigured: true` và
`secretKeyConfigured: true`. Trang chỉ báo *đã điền hay chưa*, không hiện giá trị.

---

## Việc 3 — Khai báo địa chỉ nhận báo có

Đây là bước quan trọng nhất. Nếu thiếu, học viên trả tiền xong mà website không
biết, quyền học không được mở.

1. Trong SePay, tìm mục **Cấu hình IPN** (thông báo thanh toán).
2. Điền địa chỉ:
   ```
   https://stoic-ielts.online/api/payments/sepay/ipn
   ```
3. Nếu SePay hỏi kiểu xác thực, chọn **SECRET_KEY**.
4. Bấm **Lưu**, rồi bấm **Gửi test**.
5. Vào **Quản trị → Thanh toán** trên website. Bấm test thành công thì hệ thống
   đã nhận được thông báo.

---

## Việc 4 — Chạy thử một lượt

Làm đúng như một học viên thật:

1. Đăng nhập bằng một tài khoản học viên (đừng dùng tài khoản quản trị —
   quản trị viên vốn đã có mọi quyền nên không thử được).
2. Vào **Luyện tập → Reading**, làm xong một bài và nộp.
3. Ở trang kết quả, bấm nút **Mở lượt làm bài này** trong khối Feynman. Bài một
   passage phải hiện **19.000đ**; đề ghép hoặc Full Test phải hiện **39.000đ**.
4. Trang sẽ tự chuyển sang SePay. Thanh toán thử theo hướng dẫn của Sandbox.
5. Quay về, trang kết quả tự đổi sang **Thanh toán thành công**.
6. Bấm **Vào học ngay** — phải vào được lớp chữa bài Feynman của đúng lượt đó.

Sau đó thử thêm ba tình huống hay hỏng:

- **Tự gõ địa chỉ trang thành công** mà không trả tiền → quyền **không** được mở.
- **Làm lại bài đó lần nữa**: lượt mới là một lượt khác, phải mời mua lại; lượt
  đã mua vẫn mở nguyên.
- **Nạp ví 29.000đ**: số lượt trên trang bảng giá phải tăng đúng 10.

---

## Việc 5 — Chuyển sang tiền thật

Chỉ làm khi bốn việc trên đã chạy đúng.

1. **Cấp lại Secret Key mới** trên SePay. Khóa Sandbox đã từng xuất hiện trong
   tài liệu hoặc tin nhắn thì coi như không còn an toàn.
2. Liên kết tài khoản ngân hàng thật trên SePay, lấy Merchant ID và Secret Key
   của môi trường **Production**.
3. Trong hPanel, đổi:
   - `SEPAY_ENV` thành `production`
   - `SEPAY_MERCHANT_ID` và `SEPAY_SECRET_KEY` thành giá trị Production
4. Khai báo lại địa chỉ IPN trong môi trường Production.
5. Bấm **Tái triển khai**.
6. Tự mua một gói 19.000đ bằng tiền thật của mình. Kiểm tra tiền có vào tài
   khoản ngân hàng không, và quyền có mở không.

---

## Việc hằng ngày

Mở **Quản trị → Thanh toán**. Bảng đó cho biết đã thu bao nhiêu, đơn nào thành
công, đơn nào có vấn đề.

**Học viên báo "em chuyển khoản rồi mà chưa vào học được":**

1. Hỏi **mã đơn** (dạng `WB-260801-A1B2C3`, hiện ngay trên trang kết quả của họ).
2. Tìm mã đó trong bảng.
3. Bấm **Đối soát** — website sẽ hỏi thẳng SePay xem đơn đó đã trả tiền chưa.
4. Nếu SePay xác nhận rồi, quyền được mở ngay. Nếu chưa, nghĩa là tiền thật sự
   chưa tới.

**Đơn ở trạng thái "Cần đối soát"** nghĩa là số tiền hoặc thông tin giao dịch
không khớp với đơn. Website cố tình **không** mở quyền trong trường hợp này.
Bấm **Đối soát** để kiểm tra lại.

> **Cố ý không có nút "đánh dấu đã thanh toán".** Một nút như vậy sẽ khiến sổ
> sách doanh thu sai lệch so với tiền thật trong tài khoản, và về lâu dài không
> ai còn biết con số nào đúng. Muốn tặng quyền cho học viên (đóng học phí tại
> lớp, đền bù sự cố) thì dùng nút tặng ở trang **Học viên**.

---

## Tùy chọn — bật đối soát tự động

Website đã có sẵn một lưới an toàn: nếu vì lý do nào đó SePay không báo về được,
một tác vụ chạy định kỳ sẽ tự hỏi lại và mở quyền. Bật như sau:

1. Nghĩ ra một chuỗi ngẫu nhiên dài (30 ký tự trở lên), ví dụ gõ bừa các chữ và số.
2. Thêm biến `PAYMENT_CRON_SECRET` trong hPanel với chuỗi đó, rồi **Tái triển khai**.
3. Vào [cron-job.org](https://cron-job.org) (miễn phí) tạo một tác vụ chạy **15 phút
   một lần**, gọi địa chỉ:
   ```
   https://stoic-ielts.online/api/payments/reconcile
   ```
   và thêm header `X-Cron-Secret` với đúng chuỗi ở bước 1.

Không đặt biến này thì đường dẫn đó **đóng hoàn toàn** — không ai gọi được. Bỏ qua
bước này cũng không sao: bạn vẫn đối soát tay bằng nút **Đối soát**.

---

## Tặng quyền không qua thanh toán

Trang **Quản trị → Học viên** có hai nút tặng:

- **Ổ khóa** — tặng quyền làm toàn bộ bài Reading
- **Bộ não** — tặng quyền chữa bài Feynman cho toàn bộ bài

Bấm lần nữa là thu hồi. Hai nút này **chỉ gỡ đúng phần trung tâm tặng** — bài
học viên đã tự bỏ tiền mua không bao giờ bị mất.

---

## Hoàn tiền

Trong bảng thanh toán, đơn đã trả tiền có nút **Hoàn tiền**. Bấm vào, ghi lý do,
xác nhận. Website sẽ ghi nhận và thu hồi quyền của **đúng đơn đó**.

Việc **chuyển tiền lại cho học viên bạn phải tự làm** trên SePay hoặc ngân hàng
— website không tự chuyển tiền đi được, và cố ý không làm vậy.

Bài làm và bản chữa bài Feynman của học viên **không bị xóa** khi hoàn tiền. Đó
là lịch sử học tập của họ, và là bằng chứng nếu sau này có tranh cãi.

---

## Khi có sự cố

| Hiện tượng | Nguyên nhân thường gặp |
|---|---|
| Không thấy nút mua ở đâu cả | Thiếu biến môi trường — xem `/api/health` phần `payment` |
| Trả tiền xong vẫn "Đang chờ" | Địa chỉ IPN chưa khai hoặc khai sai trên SePay |
| Mọi biểu mẫu lỗi 500 sau khi đổi tên miền | Thiếu tên miền mới trong biến `ALLOWED_ORIGINS` |
| Đơn treo ở "Cần đối soát" | Số tiền không khớp — bấm **Đối soát** để kiểm tra |

Nếu phải khôi phục bản cũ vì lỗi nghiêm trọng: **đừng xóa các đơn hàng**. Khôi
phục mã nguồn trước, sau đó vào bảng thanh toán bấm **Đối soát** từng đơn đang
chờ — không đơn nào bị mất.
