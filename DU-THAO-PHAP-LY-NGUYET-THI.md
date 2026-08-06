# Dự thảo hồ sơ pháp lý — Nguyệt Thí

**Phiên bản chính sách:** `consent-2026-08-v2`
**Trạng thái:** DỰ THẢO KỸ THUẬT — chờ luật sư rà soát
**Phạm vi:** Kỳ thi Nguyệt Thí từ xa, thí sinh từ 16 tuổi

> **BẢN NÀY THAY THẾ HOÀN TOÀN bản `v1` ngày 03/08/2026.** Bản cũ mô tả webcam,
> ghi ảnh màn hình và đối chiếu khuôn mặt tự động. Chủ dự án đã quyết định **không
> triển khai hạ tầng giám sát**, nên hệ thống KHÔNG còn thu thập những dữ liệu đó.
> Đừng dùng bản cũ để rà.

---

## Bản chất của tài liệu này

Tôi soạn phần **sự thật kỹ thuật**: hệ thống thu thập chính xác dữ liệu gì, lưu
ở đâu, ai đọc được, giữ bao lâu, xóa bằng cách nào. Đây là thứ chỉ đọc mã nguồn
mới biết chắc, và cũng là thứ một thông báo xử lý dữ liệu thường sai — vì người
soạn mô tả theo ý định chứ không theo hệ thống thật.

Phần **câu chữ pháp lý** và việc đối chiếu với Luật 91/2025/QH15, Nghị định
356/2025/NĐ-CP thuộc về bạn.

Nếu có chỗ nào khiến bạn thấy rủi ro, hãy nói — tôi sửa được **hệ thống** cho
khớp yêu cầu pháp lý, chứ không chỉ sửa câu chữ mô tả.

---

## 1. Thay đổi lớn nhất: hệ thống KHÔNG quan sát phòng thi

| Bản v1 dự kiến | Thực tế sẽ triển khai |
|---|---|
| Webcam phát trực tiếp cho giám thị | **Không có webcam** |
| Ảnh chụp webcam mỗi 60 giây | **Không chụp ảnh nào** |
| Chuỗi ảnh màn hình mỗi 5 giây | **Không ghi màn hình** |
| Đoạn video/âm thanh quanh sự kiện | **Không ghi âm, không ghi hình** |
| Đối chiếu khuôn mặt tự động | **Không xử lý dữ liệu sinh trắc học** |
| Lưu ảnh CCCD và ảnh chân dung | **Không lưu ảnh giấy tờ** |

Hệ quả pháp lý: hệ thống **không xử lý dữ liệu sinh trắc học**, và toàn bộ nghĩa
vụ gắn với dữ liệu nhạy cảm loại này không phát sinh.

Hệ quả về chuyên môn — cần nói thẳng trong thể lệ: hệ thống **không phát hiện
được** thí sinh dùng điện thoại thứ hai, hay có người ngồi cạnh nhắc bài.

---

## 2. Hệ thống thật sự thu thập gì

### 2.1. Định danh

| Dữ liệu | Dạng lưu | Mục đích | Thời hạn |
|---|---|---|---|
| Số giấy tờ tùy thân | **HMAC-SHA256, không hoàn nguyên được** | Chặn một người tạo nhiều tài khoản dự thi | Xem §6 |
| Bốn số cuối giấy tờ | Văn bản rõ | Nhân viên đối chiếu bằng mắt khi gọi video | 30 ngày sau khi chốt giải |
| Họ tên | Văn bản rõ | Đối chiếu với giấy tờ | 30 ngày sau khi chốt giải |
| Ngày sinh | Ngày | Kiểm tra đủ 16 tuổi | 30 ngày sau khi chốt giải |
| Kết quả xác minh | Ai xác minh, lúc nào | Bằng chứng đã kiểm tra danh tính | Theo hồ sơ tuân thủ |

**Không có ảnh nào được lưu.** Nhân viên nhìn giấy tờ và khuôn mặt qua cuộc gọi
video, rồi bấm xác nhận. Hệ thống chỉ ghi lại *đã xác minh, bởi ai, lúc nào*.

**Về `identityKey`:** hệ thống không lưu số CCCD dạng rõ. Số được chuẩn hóa rồi
băm HMAC bằng khóa bí mật chỉ nằm trong biến môi trường máy chủ. Database bị lộ
cũng không suy ngược ra số gốc nếu chưa lấy được khóa đó. Phải dùng HMAC chứ
không phải băm thường vì số CCCD chỉ 12 chữ số — băm thường dò cạn được trong
vài giờ.

### 2.2. Trong lúc thi

| Dữ liệu | Có ghi không | Nơi lưu | Thời hạn |
|---|---|---|---|
| Nhật ký thao tác: sao chép, chuyển cửa sổ, phím tắt bị cấm | Có | MySQL | 30 ngày |
| Thời điểm và thời lượng rời khỏi màn hình thi | Có | MySQL | 30 ngày |
| Trạng thái mạng (mất/có kết nối) | Có | MySQL | 30 ngày |
| Phiên bản Safe Exam Browser và mã cấu hình | Có | MySQL | 30 ngày |
| Vân tay thiết bị | **Băm** | MySQL | 30 ngày |
| Địa chỉ IP, thông tin trình duyệt | **Băm** | MySQL | 30 ngày |
| Đáp án và thời điểm trả lời | Có | MySQL | Theo hồ sơ học tập |

Toàn bộ là **dữ liệu văn bản và con số**. Không có hình ảnh, không có âm thanh.

### 2.3. Hai điều nên nói rõ trong thông báo

**Bài có thể bị nộp tự động.** Rời khỏi màn hình thi quá ba lần, hoặc tổng cộng
quá mười giây, thì máy chủ tự chốt bài. Thí sinh cần biết điều này *trước khi
thi*, không phải lúc màn hình hiện thông báo.

**Mất mạng không bị tính là vi phạm.** Đồng hồ vẫn chạy, nhưng thí sinh có 15
phút để vào lại trên đúng máy cũ. Hệ thống phân biệt rõ sự cố kỹ thuật với hành
vi cố ý, và điều này được ràng buộc bằng kiểm thử tự động.

---

## 3. Hai văn bản đồng ý bắt buộc, một tự nguyện

Mã nguồn ép tách riêng từng loại, mỗi loại một ô tích. Gộp chung là điều hệ thống
**không cho phép làm**.

### 3.1. Thể lệ Nguyệt Thí *(bắt buộc)*

> Tôi đã đọc và đồng ý với thể lệ Nguyệt Thí, bao gồm các hành vi bị cấm trong
> lúc thi và hậu quả nếu vi phạm. Tôi hiểu rằng bài thi có thể bị máy chủ tự động
> nộp khi tôi rời khỏi màn hình thi quá số lần hoặc quá thời lượng đã công bố, và
> trường hợp đó sẽ được người thật xem xét lại chứ không tự động bị loại.

### 3.2. Ghi nhật ký thao tác trong lúc thi *(bắt buộc)*

> Tôi đồng ý để HỔ PHÙ · IELTS ghi lại các thao tác của tôi trên màn hình thi trong
> thời gian làm bài Nguyệt Thí: nỗ lực sao chép, chuyển cửa sổ, sử dụng phím tắt
> bị cấm, thời điểm và thời lượng rời khỏi màn hình thi, trạng thái kết nối mạng.
>
> Tôi hiểu rằng **hệ thống không sử dụng webcam, không ghi màn hình, không ghi âm
> và không thu thập dữ liệu sinh trắc học của tôi**. Dữ liệu nhật ký chỉ dùng để
> bảo đảm tính công bằng của kỳ thi, được xóa theo lịch tại mục 6, và không được
> dùng cho quảng cáo hay huấn luyện phần mềm.

### 3.3. Công bố tên trên Bảng Vàng *(tự nguyện)*

> Tôi đồng ý cho HỔ PHÙ · IELTS công bố tên hoặc biệt danh của tôi trên Bảng Vàng và
> Điện Danh Vọng nếu tôi đoạt giải.

**Điều mã nguồn bảo đảm:** không tích ô này **vẫn dự thi và vẫn nhận giải bình
thường**, chỉ là tên không hiện công khai. Không ai phải đánh đổi quyền riêng tư
để được dự thi. Có kiểm thử tự động chặn việc đưa loại này vào nhóm bắt buộc.

---

## 4. Xác minh danh tính — hai mốc

| Mốc | Cách làm | Hệ thống lưu gì |
|---|---|---|
| Trước ngày thi | Nhân viên gọi video, xem giấy tờ và khuôn mặt | Đã xác minh, bởi ai, lúc nào |
| T-5 phút trước giờ thi | Gọi video lần hai, xác nhận đúng người ngồi vào máy | Đã xác minh, bởi ai, lúc nào |

**Cả hai đều là điều kiện cứng ở máy chủ**, không phải thủ tục hành chính: thiếu
một mốc thì phiên thi không kích hoạt được.

Lý do cần hai lần: lần đầu soi kỹ được giấy tờ nhưng không chứng minh được ai
ngồi vào máy lúc thi; lần hai chứng minh đúng người nhưng quá gấp để soi giấy tờ.
Vì không còn webcam trong lúc thi, đây là **toàn bộ hàng rào chống thi hộ**.

---

## 5. Rút lại sự đồng ý

| Rút lúc nào | Hệ quả |
|---|---|
| Trước kỳ thi | Hủy đăng ký. Dữ liệu định danh xóa theo lịch. |
| Đang thi | Phiên thi dừng lại — không còn điều kiện bảo đảm công bằng. Bài làm tới thời điểm đó được lưu và xử lý theo thể lệ. |
| Sau kỳ thi | Nhật ký xóa sớm hơn lịch, **trừ** hồ sơ đang có khiếu nại hoặc đang bị rà soát. |

> **Điểm cần bạn quyết:** người bị đề xuất loại có được rút đồng ý để buộc xóa
> nhật ký đang dùng xem xét chính họ không? Tôi thiên về **không** — bằng chứng
> phải giữ tới khi giải quyết xong khiếu nại, nếu không thì cơ chế khiếu nại tự
> vô hiệu hóa mọi bằng chứng. Nhưng đây là câu hỏi pháp lý.

---

## 6. Lịch xóa dữ liệu

| Dữ liệu | Thời hạn | Mốc tính |
|---|---|---|
| Nhật ký thao tác trong phòng thi | 30 ngày | Từ khi chốt giải |
| IP, trình duyệt, vân tay thiết bị (đã băm) | 30 ngày | Từ khi chốt giải |
| Họ tên, ngày sinh, bốn số cuối giấy tờ | 30 ngày | Từ khi chốt giải |
| Hồ sơ đang khiếu nại | Tới 30 ngày sau quyết định cuối | Giữ có chủ đích |
| Hồ sơ đồng ý và quyết định xử lý | Theo hồ sơ tuân thủ | Không xóa cùng nhật ký |
| `identityKey` (băm) | Xem dưới | Chờ bạn quyết |

Sau khi xóa mọi thứ khác, hệ thống chỉ giữ lại `identityKey` — chuỗi băm không
hoàn nguyên được — để chặn cùng một người tạo tài khoản mới dự thi lại kỳ sau.

> **Điểm cần bạn quyết:** giữ vô thời hạn hay đặt hạn (ví dụ 24 tháng)?

---

## 7. Quyền của thí sinh

| Quyền | Hiện trạng |
|---|---|
| Biết mình bị thu thập gì | Có — tài liệu này khi được duyệt |
| Xem dữ liệu của mình | Có — `/hoc-vien/du-lieu-cua-toi` |
| Yêu cầu xóa | Có — gửi yêu cầu, trung tâm xác nhận trước khi thực hiện |
| Rút đồng ý | Có — cả mô hình dữ liệu lẫn giao diện |
| Khiếu nại quyết định loại | Có — cửa sổ 24 giờ, đã thiết kế |
| Không bị quyết định hoàn toàn tự động | **Có, và được ràng buộc bằng kiểm thử** |

Điểm cuối đáng nói riêng: mã nguồn bảo đảm **không tín hiệu tự động nào tự loại
được ai**. Mọi ngưỡng chỉ đưa hồ sơ vào hàng chờ cho người thật xem. Việc loại
một thí sinh cần **hai quản trị viên khác nhau**, và người đề xuất không được tự
phê duyệt — có phép thử tự động chặn đúng tình huống đó.

Ba dòng từng ghi "chưa có" nay đã làm xong (06/08/2026). Trang tự phục vụ
lấy bảng kê từ `src/lib/identity/data-rights.ts` — cùng nguồn với tài liệu này,
nên hai bên không trôi khỏi nhau. Có kiểm thử canh: `npm run test:data-rights`.

---

## 8. Những câu hỏi đã được chủ dự án quyết

Chốt ngày **06/08/2026**. Mã nguồn đã theo đúng các quyết định này, và có kiểm
thử canh để không ai đổi ngầm.

| # | Câu hỏi | Quyết định | Đã làm gì |
|---|---|---|---|
| 1 | Vị trí máy chủ | **Việt Nam** | Không phát sinh chuyển dữ liệu xuyên biên giới |
| 2 | Thời hạn `identityKey` | **24 tháng** | `RETENTION_IDENTITY_KEY_MONTHS = 24` |
| 3 | Rút đồng ý khi đang bị rà soát | **Không buộc xóa** | `planWithdrawal(underReview)` giữ nguyên nhật ký |
| 4 | Người 16–17 tuổi | **Tự đồng ý được** | Giữ nguyên `MIN_COMPETITION_AGE = 16`, không cần luồng người đại diện |
| 5 | Giao diện tự phục vụ | **Có, trước khi mở đăng ký** | `/hoc-vien/du-lieu-cua-toi` |
| 6 | Đánh giá tác động xử lý dữ liệu | **Nhẹ đi** theo phạm vi đã thu hẹp | Cần luật sư xác nhận mức độ |

Còn lại **một việc duy nhất**: đưa tài liệu này cho luật sư rà soát. Trạng thái
ở đầu trang vẫn là DỰ THẢO KỸ THUẬT cho tới khi có ý kiến pháp lý.

## 9. Điều bắt buộc phải có trong thể lệ

Câu đề xuất:

> Kỳ thi Nguyệt Thí được tổ chức từ xa trong phần mềm khóa máy Safe Exam Browser.
> Hệ thống ghi nhận các thao tác trên màn hình thi để bảo đảm công bằng, nhưng
> **không sử dụng webcam, không ghi màn hình và không quan sát phòng thi của thí
> sinh**. Do đó hệ thống không cam kết phát hiện được mọi hành vi gian lận. Mọi
> quyết định xử lý đều dựa trên bằng chứng cụ thể và do con người xem xét.

Nói thẳng như vậy có hai cái lợi: đúng sự thật, và tránh cho trung tâm một cam
kết không giữ được khi có tranh chấp.
