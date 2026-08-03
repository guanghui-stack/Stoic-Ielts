# Dự thảo hồ sơ pháp lý — Nguyệt Thí

**Phiên bản chính sách:** `consent-2026-08-v1`
**Trạng thái:** DỰ THẢO KỸ THUẬT — chờ luật sư rà soát
**Phạm vi:** Kỳ thi Nguyệt Thí từ xa, thí sinh từ 16 tuổi

---

## Bản chất của tài liệu này

Tôi soạn phần **sự thật kỹ thuật**: hệ thống thu thập chính xác dữ liệu gì, lưu ở
đâu, ai đọc được, giữ bao lâu, xóa bằng cách nào. Đây là thứ chỉ đọc mã nguồn mới
biết chắc, và cũng là thứ một thông báo xử lý dữ liệu sai thường sai — vì người
soạn mô tả theo ý định chứ không theo hệ thống thật.

Phần **câu chữ pháp lý** và việc đối chiếu với Luật 91/2025/QH15, Nghị định
356/2025/NĐ-CP thuộc về bạn.

Nếu có chỗ nào trong bảng kê dưới đây khiến bạn thấy rủi ro, hãy nói — tôi sửa
được **hệ thống** cho khớp yêu cầu pháp lý, chứ không chỉ sửa câu chữ mô tả. Đó là
thứ tự đúng: hệ thống chạy theo cam kết, không phải cam kết viết theo hệ thống.

---

## 1. Bảng kê dữ liệu — theo đúng mã nguồn

### 1.1. Dữ liệu định danh

| Dữ liệu | Dạng lưu | Nơi lưu | Mục đích | Thời hạn |
|---|---|---|---|---|
| Số giấy tờ tùy thân | **HMAC-SHA256, không hoàn nguyên được** | MySQL, cột `identityKey` | Chặn một người tạo nhiều tài khoản dự thi | Giữ lâu dài (xem §1.5) |
| Bốn số cuối giấy tờ | Văn bản rõ | MySQL, `documentLast4` | Nhân viên đối chiếu bằng mắt khi xác minh thủ công | 30 ngày sau khi chốt giải |
| Họ tên | Văn bản rõ | MySQL, `fullNameSnapshot` | Đối chiếu với giấy tờ | 30 ngày sau khi chốt giải |
| Ngày sinh | Ngày | MySQL, `birthDate` | Kiểm tra đủ 16 tuổi | 30 ngày sau khi chốt giải |
| Ảnh mặt trước/sau giấy tờ | **File mã hóa** | Kho riêng, không nằm trong MySQL | Xác minh danh tính | 30 ngày sau khi chốt giải |
| Ảnh chân dung (selfie) | **File mã hóa** | Kho riêng | Đối chiếu khuôn mặt lúc check-in | 30 ngày sau khi chốt giải |
| Đặc trưng khuôn mặt (face template) | **Mã hóa** | MySQL, `faceTemplateCiphertext` | So khớp khuôn mặt | 30 ngày, muốn dùng lại kỳ sau phải xin đồng ý riêng |

**Điểm đáng chú ý về `identityKey`:** hệ thống **không bao giờ lưu số CCCD dạng
rõ**. Số được chuẩn hóa rồi băm HMAC bằng một khóa bí mật chỉ nằm trong biến môi
trường máy chủ. Ngay cả khi toàn bộ database bị lộ, không thể suy ngược ra số CCCD
nếu chưa lấy được khóa bí mật đó.

Lý do phải dùng HMAC chứ không phải băm thường: số CCCD Việt Nam chỉ có 12 chữ số,
băm thường thì dò cạn toàn bộ trong vài giờ.

### 1.2. Dữ liệu giám sát trong lúc thi

| Dữ liệu | Ghi hay không | Nơi lưu | Thời hạn |
|---|---|---|---|
| Hình webcam trực tiếp | **KHÔNG ghi lại toàn buổi** — chỉ truyền cho giám thị xem | Không lưu | — |
| Ảnh chụp webcam định kỳ | Có, mỗi ~60 giây | Kho riêng, mã hóa | 30 ngày |
| Đoạn video 30 giây quanh sự kiện nghi vấn | Chỉ khi có sự kiện HIGH/CRITICAL hoặc giám thị bấm lưu | Kho riêng, mã hóa | 7 ngày |
| Âm thanh | Chỉ nằm trong đoạn video 30 giây nói trên; **mặc định TẮT** ở màn hình giám thị | Kho riêng | 7 ngày |
| Ảnh màn hình máy thí sinh | Có, mỗi ~5 giây (chuỗi ảnh, **không phải video**) | Kho riêng | 7 ngày |
| Nhật ký sự kiện (copy, chuyển cửa sổ, phím tắt…) | Có | MySQL | 30 ngày |
| Địa chỉ IP, thông tin trình duyệt | **Băm, không lưu dạng rõ** | MySQL | 30 ngày |

**Ba điểm tôi cho là quan trọng khi bạn soạn thông báo:**

1. Webcam **không được ghi lại cả buổi**. Đây là lựa chọn thiết kế có chủ ý, giảm
   đáng kể khối lượng dữ liệu nhạy cảm phải bảo vệ. Thông báo nên nói rõ điều này
   thay vì để thí sinh tưởng mình bị quay phim 60 phút.

2. Màn hình được lưu dưới dạng **chuỗi ảnh cách nhau 5 giây**, không phải video
   liên tục. Mức chi tiết thấp hơn nhiều so với cách nói "ghi màn hình".

3. Micro **không phát cho giám thị theo mặc định**. Giám thị phải chủ động bật, và
   mỗi lần bật đều bị ghi vào nhật ký kiểm toán.

### 1.3. Ai đọc được dữ liệu

- Toàn bộ ảnh và video nằm trong kho riêng, **không có đường dẫn công khai**.
- Giám thị và quản trị viên xem qua trình phát trung gian; đường dẫn ký số **hết
  hạn sau 60 giây**.
- **Mỗi lần xem đều bị ghi nhật ký**: ai xem, xem của ai, lúc nào, vì sao. Nhật ký
  này chính là để phòng chuyện quản trị viên tò mò xem dữ liệu ngoài nhiệm vụ.
- Không bên thứ ba nào nhận dữ liệu. Không dùng dịch vụ proctoring nước ngoài.

### 1.4. Nơi lưu và chuyển dữ liệu xuyên biên giới

Kiến trúc mặc định **tự vận hành toàn bộ** — không gửi hình ảnh, khuôn mặt hay ảnh
màn hình sang bất kỳ dịch vụ nước ngoài nào.

> **Điểm cần bạn quyết:** nếu máy chủ đặt tại Việt Nam thì không phát sinh việc
> chuyển dữ liệu ra nước ngoài. Nếu vì lý do kỹ thuật phải đặt ở Singapore hay nơi
> khác, nghĩa vụ sẽ khác hẳn. Tôi chưa chốt vị trí máy chủ và đang chờ bạn.

### 1.5. Thứ được giữ lâu dài và lý do

Sau khi xóa mọi thứ khác, hệ thống **chỉ giữ lại `identityKey`** — chuỗi băm không
hoàn nguyên được — để chặn cùng một người tạo tài khoản mới dự thi lại ở kỳ sau.

> **Điểm cần bạn quyết:** giữ vô thời hạn hay đặt hạn (ví dụ 24 tháng)? Giữ càng
> lâu thì chống gian lận càng tốt, nhưng đây vẫn là dữ liệu cá nhân dù đã băm.

---

## 2. Bốn văn bản đồng ý — tách lớp

Hệ thống ép tách bốn loại đồng ý riêng biệt, mỗi loại một ô tích. Gộp chung vào
một ô là điều mã nguồn **không cho phép làm**.

Trong đó **ba loại đầu bắt buộc**, loại thứ tư tự nguyện.

### 2.1. Thể lệ Nguyệt Thí *(bắt buộc)*

> Tôi đã đọc và đồng ý với thể lệ Nguyệt Thí, bao gồm các hành vi bị cấm trong
> lúc thi và hậu quả nếu vi phạm. Tôi hiểu rằng bài thi có thể bị máy chủ tự động
> nộp khi tôi rời khỏi màn hình thi quá số lần hoặc quá thời lượng đã công bố, và
> trường hợp đó sẽ được người thật xem xét lại chứ không tự động bị loại.

### 2.2. Giám sát trong lúc thi *(bắt buộc)*

> Tôi đồng ý để STOIC-IELTS, trong thời gian tôi làm bài thi Nguyệt Thí:
>
> - phát trực tiếp hình ảnh webcam của tôi cho giám thị theo dõi (**không ghi lại
>   toàn bộ buổi thi**);
> - chụp ảnh từ webcam khoảng mỗi 60 giây;
> - lưu chuỗi ảnh màn hình máy tính của tôi khoảng mỗi 5 giây;
> - lưu một đoạn video và âm thanh dài khoảng 30 giây khi hệ thống ghi nhận sự
>   kiện nghi vấn hoặc khi giám thị yêu cầu;
> - ghi lại các thao tác trên màn hình thi như sao chép, chuyển cửa sổ, phím tắt.
>
> Tôi hiểu dữ liệu này chỉ dùng để bảo đảm tính công bằng của kỳ thi, được xóa
> theo lịch tại mục [Lịch xóa dữ liệu], và **không được dùng cho quảng cáo hay
> huấn luyện phần mềm**.

### 2.3. Đối chiếu khuôn mặt *(bắt buộc)*

> Tôi đồng ý để STOIC-IELTS thu thập ảnh giấy tờ tùy thân và ảnh chân dung của
> tôi, tạo dữ liệu đặc trưng khuôn mặt và dùng nó để xác minh rằng người ngồi thi
> đúng là tôi.
>
> Tôi hiểu rằng đây là **dữ liệu sinh trắc học**, rằng kết quả so khớp tự động
> **không bao giờ tự quyết định** việc tôi bị loại, và mọi nghi ngờ đều do người
> thật xem xét trước khi có bất kỳ quyết định nào.

### 2.4. Công bố tên trên Bảng Vàng *(tự nguyện)*

> Tôi đồng ý cho STOIC-IELTS công bố tên hoặc biệt danh của tôi trên Bảng Vàng và
> Điện Danh Vọng nếu tôi đoạt giải.

**Điều mã nguồn bảo đảm:** không tích ô này **vẫn dự thi và vẫn nhận giải bình
thường**, chỉ là tên không hiện công khai. Không ai phải đánh đổi quyền riêng tư
để được dự thi.

---

## 3. Hệ thống lưu gì mỗi lần có người đồng ý

Mỗi lần tích một ô, hệ thống ghi lại: chủ thể là ai, loại đồng ý nào, **phiên bản
chính sách tại thời điểm đó**, thời điểm chính xác, IP đã băm, trình duyệt đã băm,
và mã kiểm tra toàn vẹn của nội dung văn bản người đó đã đọc.

Mã kiểm tra toàn vẹn là điểm mấu chốt: nó chứng minh được **người ta đã đồng ý với
đúng bản văn nào**, kể cả khi sau này chính sách được sửa. Không có nó thì một
tranh chấp về sau sẽ không có cách nào phân xử.

---

## 4. Rút lại sự đồng ý

| Rút lúc nào | Hệ quả |
|---|---|
| Trước kỳ thi | Hủy đăng ký dự thi. Dữ liệu định danh xóa theo lịch. |
| Đang thi | **Phiên thi dừng lại** — vì không còn điều kiện giám sát thì không thể bảo đảm công bằng. Bài làm tới thời điểm đó được lưu và xử lý theo thể lệ. |
| Sau kỳ thi | Dữ liệu giám sát xóa sớm hơn lịch, **trừ** hồ sơ đang có khiếu nại hoặc đang bị rà soát. |

> **Điểm cần bạn quyết:** người bị đề xuất loại có được rút đồng ý để buộc xóa
> bằng chứng đang dùng xem xét chính họ không? Tôi thiên về **không** — bằng chứng
> phải giữ tới khi giải quyết xong khiếu nại, nếu không thì cơ chế khiếu nại tự
> vô hiệu hóa mọi bằng chứng. Nhưng đây là câu hỏi pháp lý, không phải kỹ thuật.

---

## 5. Lịch xóa dữ liệu

| Dữ liệu | Thời hạn | Mốc tính |
|---|---|---|
| Đoạn video/âm thanh quanh sự kiện | 7 ngày | Từ ngày thi |
| Chuỗi ảnh màn hình | 7 ngày | Từ ngày thi |
| Ảnh webcam định kỳ | 30 ngày | Từ ngày thi |
| Nhật ký sự kiện | 30 ngày | Từ khi chốt giải |
| IP, thông tin trình duyệt (đã băm) | 30 ngày | Từ khi chốt giải |
| Ảnh giấy tờ, ảnh chân dung | 30 ngày | Từ khi chốt giải |
| Đặc trưng khuôn mặt | 30 ngày | Từ khi chốt giải |
| Hồ sơ đang khiếu nại | Tới 30 ngày sau quyết định cuối | Giữ có chủ đích |
| Hồ sơ đồng ý và quyết định xử lý | Theo hồ sơ tuân thủ | Không xóa cùng media |
| `identityKey` (băm) | Xem §1.5 | Chờ bạn quyết |

Việc xóa do một tiến trình tự động chạy theo giờ thực hiện, xóa cả file lẫn bản
ghi, và **không sao chép nội dung đã xóa vào nhật ký**.

---

## 6. Quyền của thí sinh

Hệ thống cần hỗ trợ được các quyền sau. Phần nào chưa có, tôi ghi rõ:

| Quyền | Hiện trạng |
|---|---|
| Biết mình bị thu thập gì | Có — tài liệu này khi được duyệt |
| Xem dữ liệu của mình | **Chưa có giao diện tự phục vụ** — hiện phải yêu cầu qua trung tâm |
| Yêu cầu xóa | **Chưa có nút bấm** — hiện xử lý thủ công |
| Rút đồng ý | Có ở mức mô hình dữ liệu; **giao diện chưa làm** |
| Khiếu nại quyết định loại | Có — cửa sổ 24 giờ, đã thiết kế |
| Không bị quyết định hoàn toàn tự động | **Có, và được ràng buộc bằng kiểm thử** |

Điểm cuối đáng nói riêng: mã nguồn bảo đảm **không tín hiệu tự động nào tự loại
được ai**. Nhận diện khuôn mặt, phát hiện điện thoại, điểm rủi ro — tất cả chỉ đưa
hồ sơ vào hàng chờ cho người thật xem. Việc loại một thí sinh cần **hai quản trị
viên khác nhau**, và người đề xuất không được tự phê duyệt. Có phép thử tự động
chặn đúng tình huống đó.

Ba dòng "chưa có" ở trên là việc thật còn thiếu, tôi sẽ đưa vào kế hoạch.

---

## 7. Những câu hỏi tôi cần bạn quyết

1. **Vị trí máy chủ** — Việt Nam hay nước ngoài? Ảnh hưởng trực tiếp tới nghĩa vụ
   chuyển dữ liệu xuyên biên giới.
2. **Thời hạn giữ `identityKey`** — vô thời hạn hay có hạn?
3. **Rút đồng ý khi đang bị rà soát** — có được buộc xóa bằng chứng không?
4. **Đánh giá tác động xử lý dữ liệu** — bạn tự làm hay cần tôi cung cấp thêm mô
   tả kỹ thuật nào?
5. **Tuổi 16–17** — theo pháp luật Việt Nam, người 16–17 tuổi tự đồng ý được hay
   vẫn cần người đại diện? Hiện hệ thống coi 16+ là tự đồng ý. Nếu sai, tôi phải
   thêm luồng người đại diện cho nhóm này.
6. **Giao diện tự phục vụ** cho quyền xem và xóa dữ liệu — bắt buộc phải có trước
   khi mở đăng ký, hay chấp nhận xử lý thủ công giai đoạn đầu?

---

## 8. Điều bắt buộc phải có trong thể lệ

Không được tuyên bố hệ thống phát hiện được 100% gian lận. Thi tại nhà trên máy cá
nhân **không thể loại trừ** việc thí sinh dùng điện thoại thứ hai ngoài khung hình
webcam. Đặc tả kỹ thuật nói thẳng điều này (§2.2), và thể lệ cũng phải nói thẳng.

Câu đề xuất:

> Hệ thống giám sát của Nguyệt Thí được thiết kế để ngăn cản, phát hiện và tạo
> bằng chứng về các hành vi gian lận, nhưng không cam kết phát hiện được mọi hành
> vi. Mọi quyết định xử lý đều dựa trên bằng chứng cụ thể và do con người xem xét.
