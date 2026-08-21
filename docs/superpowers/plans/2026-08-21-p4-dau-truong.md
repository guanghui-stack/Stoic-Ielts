# P4: Đấu trường thành hình

> Ngày 2026-08-21. Theo `docs/DAC-TA-DAU-TRUONG.md` mục 05 và 06.

## Sai lệch lớn nhất so với đặc tả: không dùng SSE

Đặc tả nhắc tới SSE cho đấu trường. Tôi không dùng, và đây là lý do.

Dự án này **không có SSE ở đâu cả**. Phòng thi Nguyệt Thí dùng POST theo lô,
đếm giờ học dùng nhịp tim và polling. Và chính đặc tả mục 04 đã ghi:

> logic dò mất kết nối vốn rất khó tin cậy với SSE trên Hostinger

Nên P4 dùng **nhịp tim và mốc thời gian**, đúng cách `StudyPresence` và
`api/study/heartbeat` đang làm.

| Được | Mất |
|---|---|
| Không phụ thuộc kết nối sống | Danh sách người có mặt trễ tối đa một nhịp |
| Đọc được sau khi máy chủ khởi động lại | |
| Không phải viết logic dò mất kết nối | |

Nhịp 15 giây, hạn sống 45 giây. Với một sân đấu mà trận kéo dài 10 tới 15 phút
thì độ trễ đó không ai nhận ra.

Nhịp **dừng khi tab bị ẩn**. Người mở tab rồi đi ngủ không nên xuất hiện trong
danh sách sẵn sàng đấu: thách họ thì chỉ nhận lại im lặng, mà im lặng đó lại bị
đếm vào Án Binh Bất Động của chính họ.

## Quy Điền: cái sàn là phần tinh tế nhất

Đặc tả nói Chiến Lực "chỉ trôi xuống, không bao giờ trôi lên", và giải thích vì
sao không trôi về trung vị: người đang thua sấp mặt sẽ được **kéo lên**, nên cái
giá đặt ra để phạt kẻ trốn lại hoá thành phần thưởng cho đúng người cần bắt.

Nhưng đặc tả cũng nói "người yếu giữ nguyên chỗ đang đứng". Hai câu đó chỉ cùng
đúng khi có một cái **sàn**, và sàn đặt ở đúng điểm khởi đầu:

| Ai | Điều gì xảy ra |
|---|---|
| Trên 1000 | Trôi xuống dần, dừng ở 1000 |
| Dưới hoặc bằng 1000 | Không đổi, vì đã ở dưới sàn |

Phần trôi áp lúc **đọc hồ sơ**, không phải bằng một job riêng. Hồ sơ chỉ có ý
nghĩa khi có người đọc nó, và đọc tới đâu tính tới đó thì không bao giờ có một
job im lặng hỏng mà không ai biết. Cột `driftedAt` chặn việc áp hai lần cho
cùng những ngày đó; kiểm thử đọc ba lần liên tiếp để gác điều này.

## Ghép cặp phải hợp dải của CẢ HAI bên

Dải nới dần: cộng trừ 50 lúc đầu, mỗi 15 giây nới thêm 50, trần 300 sau 75 giây.

Người chờ lâu có dải rộng, người vừa vào có dải hẹp. Nếu chỉ xét dải của người
chờ lâu thì người vừa vào bị kéo vào một trận lệch hẳn mà họ không đồng ý. Kiểm
thử gác đúng trường hợp này.

Một chi tiết nhỏ mà dễ hỏng: `joinQueue` gọi lại **không** đặt lại `joinedAt`.
Nếu ghi đè thì mỗi nhịp tim lại đặt thời gian chờ về 0 và dải không bao giờ nới
ra, tức người ta chờ mãi không gặp ai mà không hiểu vì sao.

## Bot: sàn thắng luật 25 phần trăm

Đặc tả đặt trần 30 bot, sàn 5 bot, và bot không quá 25 phần trăm dân số.

Ba luật đó **mâu thuẫn nhau lúc mới ra mắt**: khi chỉ có 3 người thật, 25 phần
trăm nghĩa là 1 bot, nhưng sàn đòi 5. Tôi cho **sàn thắng**, vì cả tính năng
sinh ra để sân không rỗng, và thà tỷ lệ bot cao còn hơn không ai để đấu. Luật
25 phần trăm chỉ bắt đầu có hiệu lực khi dân số thật vượt khoảng 20 người.

Ba chi tiết chống lộ:

- **Chiến Lực rải đều, không trùng nhau.** Ba mươi bot cùng đúng 1000 điểm là
  dấu hiệu lộ rõ nhất trên bảng xếp hạng. Đã kiểm: 30 giá trị, 0 trùng.
- **Tên người Việt bình thường, không lấy tên danh tướng.** Một người tên
  "Triệu Vân" trong bảng đấu là lộ ngay.
- **Không có mật khẩu**, nên không đăng nhập được. Email dùng miền `.invalid`
  theo RFC 2606, không bao giờ phân giải được.

Cờ `isBot` đặt trên `User` chứ không trên `ArenaProfile`, vì luật "bot bị loại
khỏi chat và kết bạn" phải kiểm được ở ngoài đấu trường.

## Còn thiếu

- **Nhận chiến thư trên giao diện.** Gửi đã có, màn nhận chưa
- **Bot chưa tự đánh.** Chúng có mặt trong bảng xếp hạng và ghép cặp được,
  nhưng chưa có vòng lặp khiến chúng nhận lời và nộp bài
- **Hẹn trận** đã có bảng và luật, chưa có màn hình
- **Nối trận vào phòng thi thật**, vẫn là việc dang dở từ P3
