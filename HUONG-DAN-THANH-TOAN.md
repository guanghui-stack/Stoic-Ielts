# Hướng dẫn bật thanh toán SePay

Dành cho người vận hành trung tâm. Không cần biết lập trình — chỉ cần bấm đúng
chỗ trong hPanel và trên trang SePay.

---

## Website đang bán những gì

Từ 11/08/2026 website chạy **ví xu**. Tiền thật chỉ đi vào một cửa duy nhất:
học viên nạp xu, rồi tiêu xu để mở gói. Không còn đường trả tiền thẳng cho một
gói nào.

**Mốc nạp** — 1 xu = 1.000đ:

| Nạp | Nhận | Thưởng |
|---|---|---|
| 50.000đ | 50 xu | — |
| 100.000đ | 100 xu | — |
| 200.000đ | 210 xu | +10 xu |
| 500.000đ | 550 xu | +50 xu |

**Gói tiêu xu:**

| Gói | Giá | Mở cho |
|---|---|---|
| Mở một đề Reading | 9 xu | Một đề, làm lại không giới hạn, vĩnh viễn |
| Full Test — đáp án chi tiết + Feynman + AI | 39 xu | Đúng một lượt làm bài |
| Đề đơn — đáp án chi tiết + Feynman + AI | 19 xu | Đúng một lượt làm bài |
| Nạp thêm 10 lượt AI chấm | 29 xu | Ví lượt AI của tài khoản |

**Mỗi tài khoản được tặng 150 xu một lần**, sau khi xác minh email — đủ mở 16
đề. Tài khoản đăng nhập bằng Google được tặng ngay (Google đã xác minh hộ).

Chấm điểm, quy đổi band và đáp án đúng/sai vẫn **miễn phí** với mọi đề đã mở.
Luyện Feynman cũng miễn phí không giới hạn; chỉ phần AI chấm mới tính lượt.

Gói 39/19 xu gắn với **một lượt làm bài cụ thể**, nên chỉ mua được từ trang kết
quả của bài vừa làm. Mỗi lần mua tặng 10 lượt AI chấm vào **ví lượt** — thứ này
khác ví xu, đếm riêng, và không mua thẳng bằng xu được.

> **Xu không đổi ngược ra tiền mặt, không chuyển cho tài khoản khác, không hết
> hạn.** Nó là tín dụng học phí trả trước. Chốt ngày 11/08/2026.

> **Bốn gói cũ đã dừng bán** (Reading mở lẻ 9.000đ, Reading 30 ngày 99.000đ,
> Feynman mở lẻ 49.000đ, Feynman 30 ngày 299.000đ). Quyền học viên đã trả tiền
> vẫn còn nguyên và dùng hết thời hạn như cũ — không quy đổi thành xu.

## Cần thêm biến môi trường để gửi thư xác minh

Không có năm biến này thì website vẫn chạy bình thường, nhưng **không ai nhận
được 150 xu** vì không xác minh email được.

| Tên biến | Giá trị |
|---|---|
| `SMTP_HOST` | `smtp.hostinger.com` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | `no-reply@stoic-ielts.online` |
| `SMTP_PASS` | mật khẩu hộp thư |
| `MAIL_FROM` | `HỔ PHÙ · IELTS <no-reply@stoic-ielts.online>` |

Tạo hộp thư ở hPanel → **Email** trước, rồi mới điền biến.

## Đề mới thêm vào mặc định là MIỄN PHÍ

Đây là chỗ dễ mất tiền nhất khi đăng đề mới. Cột mức truy cập mặc định là
**Ai cũng làm được** — đề mới up lên sẽ cho không cho tới khi có người đổi.

Đổi ở **Quản trị → Bài tập → cột Truy cập**, đặt thành **Cần mở khóa** thì đề
đó mới bán 9 xu.



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
2. Vào **Bảng giá**, bấm **Nạp 50.000đ**.
3. Trang sẽ tự chuyển sang SePay. Thanh toán thử theo hướng dẫn của Sandbox.
4. Quay về — trang bảng giá phải hiện **Ví của bạn đang có 50 xu**.
5. Vào **Luyện tập → Reading**, bấm **Mở đề này · 9 xu** ở một đề bất kỳ, rồi
   làm xong và nộp.
6. Ở trang kết quả, khối Feynman phải hiện **19 xu** cho bài một passage, hoặc
   **39 xu** cho đề ghép và Full Test. Bấm **Mở lượt làm bài này**.
7. Quyền mở **ngay lập tức**, không qua cổng thanh toán nữa. Số dư giảm đúng
   19 (hoặc 39) xu.

Sau đó thử thêm bốn tình huống hay hỏng:

- **Tự gõ địa chỉ trang thành công** mà không trả tiền → xu **không** được cộng.
- **Bấm mua khi ví không đủ** → bị đưa về bảng giá kèm câu "còn thiếu N xu",
  không phải một trang trống.
- **Làm lại bài đó lần nữa**: lượt mới là một lượt khác, phải mời mua lại; lượt
  đã mua vẫn mở nguyên.
- **Nạp mốc 200.000đ** → phải nhận đúng **210 xu**, không phải 200.

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
6. Tự nạp mốc 50.000đ bằng tiền thật của mình. Kiểm tra tiền có vào tài khoản
   ngân hàng không, và ví có cộng đúng 50 xu không.

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

Trang **Quản trị → Học viên** có ba nút tặng:

- **Ổ khóa** — tặng quyền làm toàn bộ bài Reading
- **Bộ não** — tặng quyền chữa bài Feynman cho toàn bộ bài
- **Tặng xu** — cộng xu vào ví học viên, bắt buộc ghi lý do

Xu tặng hiện ở trang **Quản trị → Thanh toán** trong ô **Xu đã tặng**, tách hẳn
khỏi ô **Đã thu (tiền thật)**. Hai con số đó không bao giờ được cộng chung: xu
tặng không có đồng tiền thật nào đối ứng.

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
| Không thấy nút nạp ở đâu cả | Thiếu biến môi trường — xem `/api/health` phần `payment` |
| Trả tiền xong ví không cộng xu | Địa chỉ IPN chưa khai hoặc khai sai trên SePay |
| Học viên nói "em có xu mà không mua được" | Xem số dư ở **Quản trị → Học viên**; gói 39/19 xu chỉ mua được từ trang kết quả bài làm |
| Trả tiền xong vẫn "Đang chờ" | Địa chỉ IPN chưa khai hoặc khai sai trên SePay |
| Mọi biểu mẫu lỗi 500 sau khi đổi tên miền | Thiếu tên miền mới trong biến `ALLOWED_ORIGINS` |
| Đơn treo ở "Cần đối soát" | Số tiền không khớp — bấm **Đối soát** để kiểm tra |

Nếu phải khôi phục bản cũ vì lỗi nghiêm trọng: **đừng xóa các đơn hàng**. Khôi
phục mã nguồn trước, sau đó vào bảng thanh toán bấm **Đối soát** từng đơn đang
chờ — không đơn nào bị mất.
