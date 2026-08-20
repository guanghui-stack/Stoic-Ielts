# Đặc tả Đấu Trường Hổ Phù

> Bản 6, ngày 2026-08-20. Hệ tỷ thí, kinh tế Quân Công, thang kinh nghiệm,
> danh hiệu chất vấn và cộng đồng Nghị Sự Đường.
>
> Giao diện **đã chốt**: xem `docs/BRAND-GUIDELINE.md`. Ký hiệu và ảnh cần đặt
> hàng: xem `docs/DAT-HANG-KY-HIEU.md`.

**Quy ước của tài liệu này:** không chữ Hán, không dấu gạch ngang dài. Xem mục 13.

---

## Mục lục

- [00. Triết lý: mua hay đoạt](#00-triết-lý-mua-hay-đoạt)
- [01. Ba đơn vị đo và rào chắn](#01-ba-đơn-vị-đo-và-rào-chắn)
- [02. Kinh nghiệm, Vũ Môn, Hoá Long](#02-kinh-nghiệm-vũ-môn-hoá-long)
- [03. Thí Bút](#03-thí-bút)
- [04. Luật trận](#04-luật-trận)
- [05. Ghép cặp, Chiến Lực, Quy Điền](#05-ghép-cặp-chiến-lực-quy-điền)
- [06. Bot](#06-bot)
- [07. Danh hiệu](#07-danh-hiệu)
- [08. Liêm chính](#08-liêm-chính)
- [09. Phe phái và mùa giải](#09-phe-phái-và-mùa-giải)
- [10. Vòng lặp hằng ngày](#10-vòng-lặp-hằng-ngày)
- [11. Nghị Sự Đường](#11-nghị-sự-đường)
- [12. Mô hình dữ liệu](#12-mô-hình-dữ-liệu)
- [13. Quy tắc chữ nghĩa toàn website](#13-quy-tắc-chữ-nghĩa-toàn-website)
- [14. Lộ trình](#14-lộ-trình)
- [15. Nhật ký quyết định](#15-nhật-ký-quyết-định)

---

## 00. Triết lý: mua hay đoạt

> **Người trả tiền thì mua được binh thư. Người không trả tiền thì phải đánh mà đoạt lấy, và khi đoạt được, họ biết mình xứng đáng theo cách người mua không có.**

Đây là xương sống, không phải khẩu hiệu. Mọi quyết định trong tài liệu này đều quy về nó. Bất cứ tính năng nào sau này mâu thuẫn với câu trên thì tính năng đó sai, không phải câu này sai.

**Xu là tiền mua thời gian. Quân Công là công sức mua quyền.** Hai đường tới cùng một nội dung, trả bằng hai loại chi phí khác nhau. Đường Quân Công có một cửa khảo hạch mà đường Xu không có, nên Quân Công không phải "Xu của người nghèo", nó là con đường khó hơn và danh giá hơn.

Điều nền tảng bán là **sự tiện lợi**, không phải **sức mạnh**. Người trả tiền đi nhanh hơn. Người không trả tiền vẫn tới được cùng một nơi, và mang theo thứ người kia không có.

**Phải nói thành lời với người dùng.** Giá trị này chỉ tồn tại nếu người học biết nó tồn tại. Câu trên phải xuất hiện ở màn hình Thí Bút, ở trang giới thiệu Quân Công, và ở khoảnh khắc mở được đề đầu tiên bằng Quân Công. Nếu để người dùng tự đoán, họ sẽ chỉ thấy một hàng rào phí.

---

## 01. Ba đơn vị đo và rào chắn

### Xu

- Nạp bằng tiền thật qua SePay
- Mua thẳng đề và lượt AI Feynman, không qua cửa nào
- Bán **hai** thứ: kho đề hiện hành, và dung lượng AI
- Không vào đấu trường, không nhận từ người khác

### Quân Công

- Chỉ kiếm bằng công sức
- Chỉ làm đúng hai việc: mua một lượt Thí Bút, và đặt cược
- Không mua được bằng tiền, không rút ra, không tặng nhau
- Kiếm từ ngày học đạt chuẩn, tỉ thí, danh hiệu, thăng cấp

### Luật duy nhất, không ngoại lệ

> **Quân Công không bao giờ định giá một món hàng. Quân Công chỉ mua một lượt Thí Bút.**

Áp cho cả đề lẫn Feynman. Ngay khi có một món hàng mang cả hai giá, tỷ giá xuất hiện và rào chắn sụp.

### Ba chỗ rò rỉ đã bịt

**Chung giỏ hàng.** Nếu Quân Công mua cùng món với Xu thì tỷ giá tự sinh dù không có nút đổi. Ví dụ đề giá 9 Xu, cũng đề đó giá 120 Quân Công, vậy 120 Quân Công đáng giá 9 Xu, mà 9 Xu là tiền thật. Bịt bằng luật trên: Quân Công không mua hàng, chỉ mua lượt khảo hạch, và trượt thì mất Quân Công mà không có hàng.

**Bán quyền bỏ qua Thí Bút bằng Xu.** Đây là lỗ rò tinh vi nhất vì nó không
trông giống chung giỏ hàng. Quân Công mua một lượt Thí Bút, qua được thì mở đề.
Nếu Xu mua được quyền không phải khảo hạch thì hai đồng tiền cùng định giá
**một cánh cửa**, và thị trường tự suy ra tỷ giá: quyền bỏ qua giá 5 Xu, một
lượt Thí Bút giá 100 Quân Công với tỷ lệ qua 90 phần trăm, vậy 111 Quân Công
đáng 5 Xu. Bịt bằng cách **bỏ hẳn món hàng đó**. Nó vốn thừa: ai trả Xu mua đề
thì đương nhiên không bao giờ chạm tới Thí Bút.

**Trả Quân Công theo số đề làm xong.** Ai mua nhiều đề sẽ kiếm nhiều Quân Công hơn, tức tiền mua được sản lượng. Bịt bằng cách đổi thứ được đo: **Quân Công từ việc học trả theo ngày học đạt chuẩn, không trả theo số đề hoàn thành.** Người có 5 đề và người có 500 đề, cùng học 25 phút thì nhận như nhau.

### Đặt cược không phải là chuyển tiền

Khi quyết toán, **Quân Công của người thua bị huỷ, Quân Công của người thắng do hệ thống phát ra**, không chuyển thẳng ví sang ví. Trải nghiệm y hệt (cược 100, thắng được 100) nhưng sổ cái không có giao dịch giữa hai người dùng.

Cơ chế này còn giết bài toán thông đồng ở gốc: hai tài khoản cày cho nhau thì một bên huỷ một bên phát, tổng bằng không. Và bot không "lấy" của ai, phần đã cược bị huỷ bất kể đối thủ là người hay máy.

### Bất biến phải gác bằng test

Luôn phải tồn tại ít nhất một đường kiếm Quân Công **không đòi hỏi Quân Công lẫn Xu**. Hiện có ba đường:

1. Đề `accessLevel = PUBLIC`
2. Trận không cược
3. Ngày học đạt chuẩn

**Test một, không lối ra.** Khẳng định "ít nhất một trong ba đường còn sống"
là chưa đủ: nó qua được trong khi thực tế đã bế tắc, ví dụ cờ `PUBLIC` vẫn tồn
tại nhưng số đề mang cờ đó bằng không. Test phải khẳng định hai điều cụ thể:

1. Số đề `accessLevel = PUBLIC` **lớn hơn không**
2. Vào hạng không cược **không đòi hỏi Xu lẫn Quân Công**

Nếu không, ngày nào đó có người khoá hết đề để tăng doanh thu và tạo ra một
trạng thái không lối ra mà không ai nhận thấy.

**Test hai, hai đồng tiền không gặp nhau.** Khẳng định không tồn tại hàm nào
nhận Xu trả về Quân Công hoặc ngược lại, và không món hàng nào có cả hai giá.

**Test ba, không hai cửa dẫn về một kết quả.** Test hai không bắt được lỗ rò
"quyền bỏ qua Thí Bút", vì đó là hai món hàng khác tên cùng mở ra một đề. Test
phải khẳng định: **không món hàng nào mua bằng Xu mà kết quả là mở được thứ
Quân Công cũng mở được**, ngoài chính món đề đó.

Cả ba đặt cạnh `test:no-han` trong `npm test`.

### Nguồn kiếm Quân Công

Số khởi điểm để hiệu chỉnh, không phải kết luận.

| Nguồn | Quân Công | Ghi chú |
|---|---:|---|
| Thắng tỉ thí | 12 tới 25 | Cao hơn khi đối thủ Chiến Lực cao hơn |
| Thua tỉ thí | trừ mức cược | Chỗ duy nhất Quân Công giảm |
| Giảng hoà | 0 | Hoàn cược cả hai |
| Đạt danh hiệu | 30 tới 150 | Theo loại danh hiệu, xem mục 07 |
| Thăng cấp bậc | 200 | Thưởng vượt Vũ Môn |
| Ngày học đạt chuẩn | 3 tới 8 | Xem mục 10 |
| Phục bàn Feynman | 10 | Thưởng cho việc chữa sai |

### Quân Công mỗi phút cố ý nghiêng về đấu trường

Đối chiếu bảng trên với mục 10: một ngày học đạt chuẩn tốn 25 phút và phải nộp
bài, trả 3 tới 8 Quân Công. Một trận thắng tốn 10 tới 15 phút, trả 12 tới 25.
Đấu trường trả cao hơn hẳn trên mỗi phút.

**Đây là chủ ý, không phải lỗi hiệu chỉnh.** Mục tiêu là người học thi đấu nhiều
hơn, và trận đấu nào cũng là một lần đọc đề thật, nên thời gian ở đấu trường
không phải thời gian mất đi. Nguyên tắc "kinh nghiệm mỗi phút xấp xỉ ngang nhau"
ở mục 02 áp cho **kinh nghiệm**, và cố ý không áp cho Quân Công.

Điều cần theo dõi khi có dữ liệu thật: nếu số ngày học đạt chuẩn trung bình bắt
đầu giảm trong khi số trận tăng, thì mới là lúc xem lại. Trước đó thì đừng chỉnh.

**Cảnh báo về cơ cấu thu nhập:** đừng để phần lớn Quân Công đến từ lên cấp. Lên cấp là sự kiện hiếm và giật cục. Nếu đó là nguồn chính thì người đang kẹt giữa hai cấp sẽ không có thu nhập gì suốt nhiều tuần rồi bỏ cuộc. Thu nhập chính phải đều đặn hằng ngày từ học và đấu, lên cấp chỉ là tiền thưởng.

---

## 02. Kinh nghiệm, Vũ Môn, Hoá Long

### Hệ này vốn đã là Hổ Phù

**Kinh nghiệm là nửa kết quả đo được. Vũ Môn là nửa quá trình kiểm chứng được.** Thiếu một nửa thì lệnh không có hiệu lực. Hệ kinh nghiệm không phải thứ gắn thêm, nó là phần còn thiếu của ẩn dụ gốc.

Về code, cấu trúc này ghép thẳng vào `src/lib/ranks/rules.ts`, nơi đã tách sẵn **GATE** (cửa đã hiện ra chưa) và **SUCCESS** (đã vượt chưa). Kinh nghiệm trở thành một điều kiện GATE mới, không phá ranh giới đang có.

### Ba đại lượng, ba vai trò

| Đại lượng | Chiều | Vai trò | Công khai |
|---|---|---|---|
| **Kinh nghiệm** | Chỉ tăng | Mở Vũ Môn kế tiếp | Có |
| **Quân Công** | Tăng và giảm | Mua lượt Thí Bút, đặt cược | Không |
| **Chiến Lực** | Tăng và giảm | Ghép cặp, tính điểm phe | Có |

### Đổi tên

**Vũ Môn** thay cho *cửa ải*. Cá chép vượt vũ môn hoá rồng, người Việt nào cũng hiểu ngay. Nó mang đúng nghĩa cần thiết: một ngưỡng mà vượt qua thì bản thân biến đổi, không phải chỉ đi qua một cánh cổng. Và nó vẫn là một cái cổng nên khớp nguyên vẹn với khái niệm GATE đang có.

**Hoá Long** là tên của khoảnh khắc vượt qua.

Giữ nguyên chữ *thí luyện* cho route `/hoc-vien/thi-luyen` đang chạy.

### Kinh nghiệm chỉ tăng, cấp bậc không tụt

Kinh nghiệm không bao giờ giảm. Thắng nhiều, thua rất ít nhưng luôn dương, vì trận nào cũng là một lần đọc đề thật.

**Nguyên tắc hiệu chỉnh:** kinh nghiệm không bao giờ được là thứ chắn giữa một người đủ năng lực và cấp bậc kế tiếp. Vũ Môn mới là ràng buộc thật, kinh nghiệm chỉ định nhịp. Nếu ngưỡng kinh nghiệm đặt cao, nó thành thuế thời gian và cấp bậc thoái hoá thành huy hiệu thâm niên.

**Tỷ lệ kinh nghiệm giữa các hoạt động** quyết định hành vi nhiều hơn con số tuyệt đối. Nếu 10 phút tỉ thí cho nhiều hơn 10 phút học và chữa bài, người học tối ưu sẽ bỏ học đi đấu, và bạn xây được một trò chơi cạnh tranh với chính sản phẩm của mình. Kinh nghiệm mỗi phút nên xấp xỉ ngang nhau, và nếu lệch thì lệch về phía vòng học chính.

### Kinh nghiệm giảm dần theo đối thủ

Luật này áp cho **tất cả mọi người**, không riêng bot.

| Lần đấu với cùng một đối thủ trong ngày | Kinh nghiệm |
|---|---:|
| Lần 1 | 100% |
| Lần 2 | 60% |
| Lần 3 | 30% |
| Từ lần 4 | 10% |

Ba tác dụng trong một luật: chặn cày bot mà không hé lộ bot nào, chặn thông đồng (hai tài khoản cày cho nhau rơi xuống 10% từ lần thứ tư), và đẩy người ta đi tìm đối thủ mới. Trong truyện thì có lý: đánh mãi một người thì học thêm được gì.

### Bố cáo toàn cõi

Tin Hoá Long phát ra toàn nền tảng. Đi ké kênh SSE của đấu trường. Bản đầu có thể chỉ cần một **Bảng Bố Cáo** lưu trong database, ai vào cũng thấy.

| Tham số | Giá trị | Lý do |
|---|---:|---|
| Thời lượng hiện | 8 giây cộng 1 giây tan | Đọc xong một dòng mất 3 giây. 8 giây đủ trang trọng, 15 giây thì tới lần thứ ba đã phiền |
| Hàng đợi tối đa | 3 tin | Giờ điểm binh dồn người nên tin cũng dồn theo |
| Nhịp tối đa | 1 tin mỗi 20 giây | Không có van thì hai mươi người lên cấp một tối thành hàng đợi năm phút |
| Tin tràn | Rơi vào Bảng Bố Cáo | Không mất tin, chỉ không hiện băng chạy |

Ba điều bắt buộc:

- **Chỉ nhóm cấp cao mới bố cáo.** Ai lên cấp cũng bố cáo thì bảng thành rác trong một tuần và tin Hoá Long mất hết trọng lượng.
- **Phải cho tắt**, dùng đúng cơ chế `PublicProfile` đã có, không làm cờ mới.
- **Chỉ bố cáo tin vinh danh.** Danh hiệu chất vấn nằm im trên hồ sơ cho ai xem hồ sơ thì thấy. Đẩy lên bảng công cộng là bêu riếu, và mất luôn phần nhân từ.

---

## 03. Thí Bút

Cửa khảo hạch ngắn để đổi Quân Công lấy quyền mở một đề hoặc một lượt Feynman.

Câu ghi trên màn hình: *"Không mua được binh thư, phải đánh mà đoạt lấy."*

| Tham số | Giá trị | Lý do |
|---|---|---|
| Số câu | 3 tới 5 | Một câu thì đoán bừa đúng 25 tới 33%, đó là quay số chứ không phải khảo hạch |
| Ngưỡng qua | Đúng gần hết | Người vững qua khoảng 90%, người chưa vững khoảng 20% |
| Thời lượng | 2 tới 3 phút | Đủ ngắn để không thành gánh nặng |
| Nguồn câu | Cùng dạng bài với đề đang mở | Qua được nghĩa là sẵn sàng cho đề đó |
| Khi trượt | Chỉ rõ sai ở đâu, cho thử lại sau thời gian chờ với giá giảm | Biến thất bại thành buổi học thay vì đồng xu mất trắng |

### Câu hỏi lấy từ đâu

**Không dùng câu Reading.** Câu Reading không đứng một mình được. Muốn hỏi thì phải đưa cả passage, tức cho không đúng cái đề mà người ta đáng lẽ phải đoạt lấy. Đường này bế tắc về bản chất chứ không phải về kỹ thuật.

Thí Bút dùng **câu ngắn đứng độc lập**: nhận diện diễn đạt lại, từ vựng theo ngữ cảnh, collocation, ngữ pháp câu.

Lý do quan trọng nhất: **nhận diện paraphrase chính là kỹ năng lõi của IELTS Reading.** True/False/Not Given và Matching Headings về bản chất đều là bài toán paraphrase trá hình. Nên qua Thí Bút thật sự có nghĩa là sẵn sàng cho đề, mà không tốn một đề nào.

### Quy mô kho

Một lượt lấy 4 câu, một học viên làm khoảng 30 lượt trong đời, tức gặp 120 câu. Kho **400 tới 500 câu chia ba mức khó** là đủ để hiếm khi lặp.

### AI đặt đúng chỗ

Dùng AI làm **xưởng sản xuất nội dung ngoại tuyến**, tuyệt đối không đặt vào đường đi của request.

| | Sinh sẵn ngoại tuyến | Gọi lúc người dùng bấm |
|---|---|---|
| Chi phí | Một lần, không đáng kể cho 500 câu | Tăng theo lượt dùng, không có trần |
| Độ trễ | Bằng không | Có, ngay giữa một luồng bấm giờ |
| Kiểm duyệt | Người duyệt trước khi phát hành | Không ai duyệt, đăng thẳng cho người trả tiền |
| Đáp án sai | Bắt được lúc duyệt | Người dùng mất Quân Công oan |
| Tranh chấp | Truy được, cố định | Không tái lập được |

### Ba kho tách bạch, không trộn

| Kho | Nội dung | Nguồn |
|---|---|---|
| **Kho bán** (Xu) | Đề IELTS đầy đủ, mới nhất | Giữ nguyên như hiện tại |
| **Kho đấu trường** | Đề IELTS đầy đủ, dùng cho tỉ thí | Chỗ hợp lý cho đề cũ đã rút khỏi kho bán |
| **Kho Thí Bút** | 400 tới 500 câu ngắn độc lập | AI sinh nháp ngoại tuyến, người duyệt |

Đề cũ **không** hợp cho Thí Bút vì sai hình dạng bài toán, nhưng **rất hợp** cho kho đấu trường và sân tập với bot, nơi rủi ro rò rỉ không quan trọng.

### Bẫy kỹ thuật

`Exercise.content` là một khối JSON chứa passage, toàn bộ câu hỏi **và đáp án**. Không có bảng `Question` riêng. Nếu server gửi nguyên `content` xuống để render một câu thì vừa phát không cả đề kèm đáp án. **Phải bóc ở server, chỉ gửi đúng câu đó.**

### Cờ đánh dấu kho

`Exercise` đã có `competitionOnly` cho đề riêng của Nguyệt Thí. Thêm `arenaOnly` theo đúng cách đó, vì logic lọc đã có sẵn và đã chạy đúng. Nếu sau này xuất hiện kho thứ tư thì đổi cả hai thành một trường enum `reservedFor`.

---

## 04. Luật trận

### Vòng đời

```
INVITED  ->  ARMED  ->  LIVE  ->  RESOLVING  ->  SETTLED
         nhận lời   trừ cược   cả hai nộp    huỷ / phát
```

Nhánh rẽ:

| Trạng thái | Khi nào |
|---|---|
| `DECLINED` | Đối phương từ chối chiến thư |
| `EXPIRED` | Chiến thư quá 90 giây không ai trả lời |
| `TRUCE` | Hai bên giảng hoà, trung tính ở mọi chiều |
| `ABANDONED` | Bỏ mặc tới hết giờ, chấm theo phần đã làm |
| `HELD` | Hệ liêm chính đánh dấu nghi vấn, treo quyết toán chờ người xử |
| `VOIDED` | Huỷ trận, hoàn cược cả hai, ghi lý do vào `voidReason` |

**Trừ Quân Công ở bước ARMED, không phải lúc quyết toán.** Nếu chờ tới cuối mới trừ, một người có thể mở hai trận song song và cược số Quân Công họ chỉ có một lần.

### Phân định thắng thua

1. **Điểm**: số câu đúng, máy chủ chấm. Máy khách không bao giờ gửi điểm lên, chỉ gửi đáp án.
2. **Thời gian**: `elapsedMs` đo ở máy chủ lúc nhận bài nộp, không tin đồng hồ trình duyệt.
3. **Hoà**: bằng cả hai. Với độ chính xác mili giây thì gần như không xảy ra.

Hệ quả: cột "hoà" trên hồ sơ thực chất chỉ đến từ giảng hoà. Nó không đo sự bế tắc mà đo sự nhún nhường, nên gọi đúng tên là **Hoà khí**.

### Đồng hồ là trọng tài, không phải đường truyền

| Tình huống | Kết quả | Quân Công | Kinh nghiệm |
|---|---|---:|---:|
| **Đầu hàng** chủ động | Thua | trừ cược | cộng ít |
| **Mất liên lạc, quay lại kịp hạn** | Đánh tiếp bình thường | không đổi | không đổi |
| **Bỏ mặc tới hết giờ** | Chấm theo phần đã làm | trừ cược | 0 |

Đầu hàng **rẻ hơn** bỏ mặc. Nếu ngược lại thì không ai đầu hàng nữa, tất cả sẽ rút dây mạng.

Mất kết nối không tự xử thua. Mạng 4G rớt thật, cuộc gọi đến cũng làm trình duyệt ngủ, xử thua tức thì sẽ phạt oan người ngay thẳng. Cách này còn tiện ở chỗ không cần viết logic dò mất kết nối, vốn rất khó tin cậy với SSE trên Hostinger.

### Giảng hoà

Lời đề nghị: *"Văn vô đệ nhất. Nay xin gác bút thu quân, hẹn ngày khác lại phân cao thấp."*

Lời chấp thuận: *"Chuẩn lời. Hai bên cùng lui, tình nghĩa còn nguyên."*

**Phải trung tính ở mọi chiều: không Quân Công, không kinh nghiệm, không điểm phe, không Chiến Lực.** Chỉ ghi một dấu vào cột Hoà khí.

Nếu giảng hoà mà vẫn được kinh nghiệm hay điểm phe thì hai người vào trận, bấm hoà ở giây thứ năm, ba mươi giây một vòng, không phải đọc chữ nào. Đây là thứ sẽ bị khai thác trong ngày đầu tiên chứ không phải tháng đầu tiên.

Chốt chặn thứ hai: chỉ được đề nghị giảng hoà **trong nửa đầu thời gian và khi cả hai chưa nộp quá một phần ba số câu**, để người đang thua không dùng nó làm đường thoát phút chót.

### Chiến thư không trả lời

Bốn chốt bảo vệ người dùng thật:

- Đếm theo **số người thách khác nhau**, không theo số thư
- Mỗi người thách chỉ tính tối đa **một lần từ chối mỗi ngày**
- Đang trong trận thì không tính
- Chỉ tính chiến thư gửi tới khi người đó **đang hiện diện ở đấu trường**

Không có bốn chốt này thì người mạnh sẽ bị dội thư liên tục, không thể nhận hết, rồi bị phạt vì được nhiều người muốn đấu chứ không phải vì hèn.

### Hai hạng trận

| Hạng | Quân Công | Kinh nghiệm | Điểm phe | Chiến Lực |
|---|---|---:|---|---|
| **Có cược** | Lên xuống theo mức cược | 100% | Có | Có |
| **Không cược** | Không đổi | 60 tới 70% | Có | Có |

**Cửa đấu trường luôn mở, chỉ sới cược là đóng.** Hết Quân Công thì không đặt cược được, nhưng vẫn vào đấu được. Không có van này thì người thua vài trận sẽ bị khoá khỏi đấu trường đúng lúc họ cần luyện nhất, ngược hẳn mục tiêu đấu nhiều hơn.

---

## 05. Ghép cặp, Chiến Lực, Quy Điền

### Vì sao ghép bằng Chiến Lực chứ không bằng cấp bậc

Kinh nghiệm chỉ tăng và cấp bậc không tụt, nên **cấp bậc là hàm của thời gian, không phải của năng lực**. Ghép cặp theo cấp bậc sẽ đẩy người chăm mà yếu lên đấu với người cấp cao thật sự mạnh, họ thua liên tục, rồi bị gắn Danh Bất Phù Thực. Hệ thống tự tạo ra tội rồi trừng phạt người ta vì nó.

**Cấp bậc là huy hiệu hành trình, Chiến Lực làm việc ghép đôi.**

### Ba đường vào trận

- **Chiến thư trực tiếp**: chọn người đang có mặt, thư sống 90 giây. Mỗi cặp chỉ một thư treo, tránh dội.
- **Tự động ghép**: hàng đợi theo Chiến Lực, dải nới dần. Cộng trừ 50 lúc đầu, mỗi 15 giây nới thêm 50, trần cộng trừ 300.
- **Hẹn trận**: đặt lịch với ai đó vào giờ sau, cả hai được nhắc. Đây là cách duy nhất để hai người bận vẫn đấu được khi trận phải diễn ra đồng thời.

### Giờ điểm binh

Khung giờ cố định công bố trước, thưởng thêm trong khung đó.

Đấu trường đồng thời cần hai người online cùng lúc trong 10 tới 15 phút, mà học viên IELTS học rải rác cả ngày. **Rủi ro lớn nhất của cả tính năng là sân rỗng, và nó là rủi ro sản phẩm chứ không phải kỹ thuật.** Dồn dân số vào một khung thay vì rải đều là cách rẻ nhất để chữa.

### Quy Điền

Trạng thái tạm rút khỏi đấu trường. **Không giới hạn thời gian, mà giới hạn bằng cái giá.**

| Khi Quy Điền | Điều gì xảy ra |
|---|---|
| Chiến thư | Không ai thách được, không đếm từ chối |
| Bảng xếp hạng | Biến khỏi bảng |
| Điểm phe | Không kiếm được |
| Chiến Lực | **Chỉ trôi xuống, không bao giờ trôi lên** |

**Vì sao trôi một chiều:** nếu Chiến Lực trôi về trung vị thì người đang thua sấp mặt sẽ được kéo lên. Chỉ cần bấm Quy Điền, ngồi im vài tuần, rồi quay lại sạch sẽ. Cái giá đặt ra để phạt kẻ trốn lại hoá thành phần thưởng cho đúng người cần bắt. Trôi một chiều thì người mạnh mất dần danh tiếng, người yếu giữ nguyên chỗ đang đứng, và không ai giặt được hồ sơ.

Quy Điền và Án Binh Bất Động là một cặp đối xứng có chủ ý: cùng là không ra trận, nhưng một bên **tuyên bố và trả giá**, một bên **im lặng lẩn tránh**. Đó là ranh giới hành xử mà cả hệ danh hiệu dựa vào.

### Chỉ số công khai

Bốn thứ đặt cạnh nhau, vì chính sự đặt cạnh nhau tạo ra câu hỏi:

- **Cấp bậc** và ấn triện
- **Chiến Lực**
- **Chiến tích**: số trận, thắng, Hoà khí
- **Danh hiệu**: cả vinh danh lẫn chất vấn, không giấu cái nào

Riêng thắng suất: khi ghép cặp làm đúng việc, mọi người hội tụ về khoảng 50% và so thắng suất giữa hai người không nói lên gì. Chỉ số có thông tin thật là **"thắng suất trước đối thủ mạnh hơn"**, tính trên Chiến Lực.

---

## 06. Bot

**30 bot** mang danh tính như người thật, để đấu trường không bao giờ rỗng trong những tháng đầu.

- **Không có sức mạnh cố định.** Mỗi bot có Chiến Lực riêng, lên xuống theo kết quả, y như người thật. Người mới gặp bot Chiến Lực thấp nên thắng được và ở lại. Người khá gặp bot Chiến Lực cao nên không dễ ăn. Thắng bot khó đúng bằng thắng người cùng Chiến Lực, đó chính là định nghĩa của không phân biệt được.
- **Không có chỗ đặc biệt nào ở tầng ghép cặp.** Càng ít chỗ đặc biệt thì càng khó lộ.
- **Trận có bot không sinh điểm phe cho bất kỳ ai**, nhưng **vẫn tính Chiến Lực**, vì lúc mới ra mắt bot là phần lớn dân số và người mới phải có cách định vị thực lực.
- **Kết quả đấu bot không đếm vào Danh Bất Phù Thực.** Không để máy quyết định một danh hiệu công khai dựa trên kết quả với máy.
- Bot có **giờ online thất thường** và **tiến bộ cấp bậc theo tuần**. Mười cái tên luôn có mặt, không bao giờ ngủ, nhịp đều tăm tắp thì lộ trong một tuần.
- **Bot bị loại khỏi chat và kết bạn.** Giấu trong bảng đấu là vô hại, giấu trong một cuộc trò chuyện thì không.

### Ngưỡng rút bot

Giữ **bot không quá 25% dân số đang có mặt** ở đấu trường, tính theo trung vị giờ điểm binh trong 7 ngày trượt. Sàn **5 bot** giữ vĩnh viễn cho khung giờ vắng, trần **30 bot**.

Vượt trần thì bot dư chuyển sang Quy Điền, thiếu sàn thì gọi bot trở lại. Bot rút qua đúng cửa mà người thật dùng, nên không cần code đặc biệt và nhìn từ ngoài y hệt một người bận việc tạm nghỉ.

---

## 07. Danh hiệu

### Nguyên lý

Danh hiệu chất vấn chỉ mặt đúng một thứ: **hai nửa binh phù không khớp nhau**. Danh cao mà thực thấp, hoặc thực cao mà danh thấp. Nó không chê ai yếu, nó chỉ ra chỗ tên gọi và sự thật lệch nhau.

**Ranh giới đạo đức, giữ chặt:** danh hiệu chất vấn nhắm vào *hành xử*, không bao giờ nhắm vào *năng lực*. Thua nhiều vì học chưa giỏi thì không gắn, vì như thế là phạt người yếu, trái với giá trị nhân từ mà nền tảng theo đuổi.

**Về câu chữ:** dùng thành ngữ bốn chữ Hán Việt, viết bằng chữ Latin. Thể này đúng chất Tam Quốc hơn một câu chửi, giữ được phẩm giá nền tảng, và không cũ đi sau vài tháng. Chất châm biếm dồn vào dòng mô tả, nơi nó có sức nặng mà không thành sỉ nhục.

### Máy tự gắn, dựa trên sự thật đếm được

#### Danh Bất Phù Thực

> *Ấn triện thì cao, chiến tích thì thấp. Thiên hạ đã có lời bàn.*

- **Điều kiện**: Chiến Lực thấp hơn hẳn trung vị Chiến Lực của người cùng cấp bậc, xét trên 10 trận gần nhất với **người thật**, và **phải đúng liên tục trong 7 ngày**
- **Xoá khi**: Chiến Lực trở lại vùng của người đồng cấp, hoặc thắng 5 trận trước đối thủ Chiến Lực cao hơn

**Vì sao có điều kiện bảy ngày:** với ngưỡng "3 thắng trở xuống trong N trận" và người chơi trung bình thật sự, N bằng 10 khiến **17,2%** người ngay thẳng chạm ngưỡng do thuần may rủi, tức cứ 6 người thì 1. N bằng 20 thì còn 5,8%. Giữ N bằng 10 để danh hiệu phản ánh hiện tại, nhưng thêm bộ lọc thời gian: vận rủi thì thoáng qua, danh không xứng thực thì kéo dài.

#### Ẩn Tài Đãi Giá

> *Sức đủ vượt Vũ Môn từ lâu, mà cố nán lại chốn thấp để tìm phần dễ.*

- **Điều kiện**: Chiến Lực vượt xa nhóm cấp bậc hiện tại, trong khi Vũ Môn đã mở mà không khởi thí
- **Xoá khi**: Khởi thí Vũ Môn kế tiếp

#### Án Binh Bất Động

> *Mười lần trống giục, mười lần cửa doanh khép chặt.*

- **Điều kiện**: Từ chối hoặc bỏ qua 10 người thách khác nhau liên tiếp khi đang có mặt ở đấu trường
- **Xoá khi**: Nhận và đánh trọn 5 trận

#### Lâm Trận Thoát Đào

> *Trống chưa dứt hồi, bóng người đã khuất sau trại.*

- **Điều kiện**: Bỏ mặc trận đấu tới hết giờ 3 lần trong 30 ngày
- **Xoá khi**: Đánh trọn 5 trận liên tiếp, thắng thua không kể

#### Ỷ Cường Lăng Nhược

> *Đao chỉ hướng kẻ yếu, chưa từng ngước nhìn lên trên.*

- **Điều kiện**: 10 trận liên tiếp **do mình chủ động gửi chiến thư** đều nhắm đối thủ dưới Chiến Lực mình
- **Xoá khi**: Thắng 3 trận trước đối thủ Chiến Lực ngang hoặc cao hơn

> Chỉ đếm trận chủ động gửi chiến thư. Trận tự ghép do máy chọn đối thủ ngang Chiến Lực, không phải lỗi của ai.

**Danh Bất Phù Thực** và **Ẩn Tài Đãi Giá** là cặp đối xứng: một bên danh vượt thực, một bên thực vượt danh. Đặt cạnh nhau, chúng nói đúng luận điểm của cả sản phẩm.

### Người xử sau khi xem hồ sơ, không bao giờ tự động

#### Ngụy Tạo Quân Công

> *Công trạng ghi trong sổ, mà chiến trường chưa từng thấy mặt.*

- **Điều kiện**: Gian lận đã được người xét duyệt xác minh, có bằng chứng lưu
- **Xoá khi**: Hết một mùa giải không tái phạm, và có đơn xin xét lại

#### Nội Ứng Ngoại Hợp

> *Hai quân giao tranh mà cùng một lòng, thắng bại đã định trước khi gióng trống.*

- **Điều kiện**: Thông đồng đã được xác minh
- **Xoá khi**: Hết một mùa giải không tái phạm

### Đường chuộc lỗi

#### Cải Quá Tự Tân

> *Từng có lời bàn sau lưng, nay đã tự mình rửa sạch.*

- **Điều kiện**: Xoá xong một danh hiệu chất vấn bằng đúng điều kiện của nó
- **Tính chất**: Danh hiệu vinh danh, giữ vĩnh viễn. Chỉ người từng vấp mới có được.

Danh hiệu này quan trọng hơn vẻ ngoài của nó: nó biến vết trượt thành một thứ đáng kể, và là lời hứa cụ thể rằng nền tảng không đóng đinh ai vĩnh viễn.

### Quân Công thưởng theo thứ danh hiệu ĐO, không theo độ hiếm

| Loại | Đo cái gì | Quân Công | Vì sao |
|---|---|---|---|
| **Chặn bằng độ khó**<br>thạo dạng bài, ngưỡng chính xác, thí luyện | Năng lực | **Càng hiếm càng cao** | Ai cày thứ này là đang học thật, càng khuyến khích càng tốt |
| **Chặn bằng số lượng**<br>100 trận, 500 bài, 200 ngày | Thời gian | Phẳng hoặc giảm dần | Trả cao cho số lượng là mua giờ chứ không mua tiến bộ |
| **Chặn bằng thắng người khác**<br>vô địch mùa, chuỗi thắng dài | Hơn người | Nghiêng về danh dự | Trả cao sẽ dựng động lực săn kẻ yếu và thông đồng |
| **Nhập môn** ngày 1 tới 7<br>bài đầu tiên, trận đầu tiên, phục bàn đầu tiên | Đã thử chưa | Cao, thu nhập mồi | Vừa là Quân Công đầu đời, vừa là hướng dẫn sử dụng trá hình |

**Mỗi danh hiệu chỉ nhận một lần.** Chặn bằng unique index trên `(userId, titleCode)` ở tầng database, đừng chỉ chặn ở tầng logic.

Câu giải thích đặt ngay trang danh hiệu:

> *Quân Công thưởng cho năng lực, không thưởng cho số lượng. Danh hiệu càng đòi hỏi thực lực thì Quân Công càng cao. Danh hiệu đếm số trận hay số ngày thì trả ít hơn, vì thời gian ai cũng có, còn thực lực thì phải rèn.*

### Tông màu

Đã chốt trong `docs/BRAND-GUIDELINE.md` mục 1.8. Chép lại phần cốt lõi:

- Nền `--color-cream-deep` `#f3ecdd`, viền `--color-ash` `#77736c`, chữ tiêu đề
  `--color-ash-ink` `#5f5b54`
- **Không dùng chu sa**, đang là màu con dấu và màu khải hoàn, dùng lẫn sẽ nhoè cả hai
- **Sắt gỉ, xám lạnh, giảm bão hoà**. Danh hiệu chất vấn không nên hét lên, nó nên im lặng mà ai cũng thấy
- **Ấn vỡ thay cho ấn lành**: cùng con dấu ấy nhưng nứt một đường. Không phát minh ngôn ngữ hình mới, chỉ bẻ ngôn ngữ đang có, mà lại là hình ảnh trực tiếp của hai nửa phù không khớp
- **Không hoạt ảnh, không phát sáng**. Vinh danh thì có nghi thức, chất vấn thì chỉ hiện ra và ở lại

### Họ danh hiệu trong code

Repo đã có hơn 30 danh hiệu thuộc các họ `PRACTICE`, `FEYNMAN`, `DISCIPLINE`, `COMPOSITE`, `RANK`, `TRIAL`, và đã có tiền lệ cho danh hiệu không phải để khen ở `TRANSFORM_01_LOW_WARNING`. Danh hiệu mới slot vào cùng quy ước `FAMILY_NN_NAME`: thêm họ `ARENA_*` và họ chất vấn.

**Tầng Nhập môn hiện đang thiếu** và là tầng quan trọng nhất.

---

## 08. Liêm chính

### Ranh giới đã có sẵn trong code

`src/lib/integrity/similarity.ts` ghi rõ:

> *"chỉ là MẪU BẤT THƯỜNG, dùng để xếp thứ tự hồ sơ cho người thật xem, không bao giờ tự đổi trạng thái của ai."*

Một danh hiệu tiêu cực công khai **chính là đổi trạng thái của một người**, trước mặt tất cả bạn học.

> **Máy tự gắn cho những gì đếm được là sự thật. Gian lận và thông đồng thì máy chỉ xếp hồ sơ, người xử.**

### Bốn tín hiệu

| Tín hiệu | Cách đo | Độ tin |
|---|---|---|
| **Trùng đáp án sai** | Đã có sẵn trong `similarity.ts` | Cao, hai người cùng sai một kiểu là hiếm |
| **Nhanh bất khả thi** | Thời gian tới câu đầu tiên thấp hơn sàn tính từ số từ của đoạn văn | Cao, không ai trả lời trước khi kịp đọc |
| **Đột biến năng lực** | Độ chính xác trong trận vượt xa độ chính xác luyện tập của chính người đó | Trung bình, cần nhiều trận mới chắc |
| **Lặp cặp đấu** | Số lần một cặp gặp nhau trong 30 ngày, kèm mẫu thắng luân phiên | Trung bình, nhưng huỷ / phát và giảm dần theo đối thủ đã làm việc cày thành vô ích |

**Tài khoản phụ**: một rào nhẹ, tối thiểu vài ngày học thật đọc từ `StudyDay`,
trước khi được vào **hạng có cược**. Đủ chặn tài khoản lập ra chỉ để cày, không
đủ làm phiền người mới thật.

**Rào này không áp cho hạng không cược.** Mục 10 nhắm khoảnh khắc mở được đề
đầu tiên vào ngày thứ hai hoặc ba, và gọi đó là toàn bộ cái móc. Nếu đấu trường
đòi vài ngày học trước khi vào được thì cái móc trượt sang ngày thứ năm hoặc
sáu, muộn hơn hẳn cửa sổ mà người mới còn ở lại. Giá trị chống tài khoản phụ
nằm ở chỗ ngăn cày Quân Công và thông đồng, mà cả hai đều cần cược mới có nghĩa,
nên đặt rào ở đúng chỗ đó là đủ.

**Hồ sơ xử lý** ghi kèm phiên bản chính sách, đúng cách `Competition` đang làm với `integrityPolicyVersion`, để khi xét khiếu nại thì xét theo đúng luật đã công bố lúc xảy ra việc.

---

## 09. Phe phái và mùa giải

- **Điểm phe tính theo Chiến Lực của đối thủ**, không theo cấp bậc. Vẫn giữ cách nói "thắng danh tướng thì công lớn" ở phần hiển thị, nhưng con số tính trên Chiến Lực. Vì khi ghép cặp theo Chiến Lực thì cấp bậc của đối thủ không còn liên quan tới độ khó, và tính theo cấp bậc sẽ mở đường cày: săn người cấp cao mà Chiến Lực thấp.
- **Thắng cộng nhiều, thua cộng ít, không trừ.** Trừ điểm khi thua sẽ khiến người yếu thấy mình là gánh nặng cho phe rồi tránh đấu.
- **Trận có bot không sinh điểm phe.**
- **Giảng hoà không sinh điểm phe.**

### Vấn đề kinh điển của ba phe

Nếu chỉ cộng dồn tổng điểm thì **phe đông người luôn thắng** và hai phe kia bỏ cuộc từ giữa mùa. Phải chia cho số thành viên hoạt động, hoặc chỉ tính N thành viên đóng góp nhiều nhất mỗi phe. Không có bước này thì hệ phe phái chết ngay mùa đầu tiên.

### Mùa giải

- Mỗi mùa 6 tới 8 tuần
- Cuối mùa kéo Chiến Lực về gần trung bình. **Cấp bậc, kinh nghiệm và Quân Công không đụng tới.**
- Trao danh hiệu mùa qua `TitleDefinition` và `UserTitle` đã có, không cần bảng mới
- Phe thắng chiếm lãnh địa trên bản đồ cho tới hết mùa sau. Đây là lúc
  `src/components/campaign/faction-territory-map.tsx` và bốn ảnh
  `public/art/territories/base-map|wei|shu|wu.webp` cuối cùng được dùng tới. Cả
  hai đã có trên `main` từ PR #16 ngày 2026-08-16, nhưng lãnh địa hiện đang khoá
  theo cấp bậc (`LOCKED_TERRITORIES` trong `src/lib/campaign/world.ts`) chứ chưa
  có khái niệm phe nào sở hữu. Cần thêm quyền sở hữu theo mùa
- **Màu ba phe** đã chốt ở `docs/BRAND-GUIDELINE.md` mục 1.5: Ngụy `#705a86`,
  Thục `#6a7f3a`, Ngô `#9c5b52`. Bản đồ **không** tô lãnh địa bằng màu phẳng, nó
  đã giải xong bằng lớp tranh cộng thang opacity. Màu phe chỉ dùng ở bảng xếp
  hạng và chú giải bản đồ
- **Chưa có bảng nào cho phe phái trong `schema.prisma`.** Toàn bộ mục 09 là đất
  trống, không phải nối dây vào thứ có sẵn

---

## 10. Vòng lặp hằng ngày

### Điểm danh là kết quả của việc học, không phải điều kiện

**Không làm cái nút.** Một cái nút điểm danh chỉ đo được việc mở trang, không đo được việc học, và số liệu gắn bó sẽ toàn người vào, bấm, thoát. Đúng ngược điều cần đo.

Hạ tầng đã có sẵn và đã làm đúng: `StudyDay` ghi `activeSeconds`, `readingSeconds`, `feynmanSeconds`, `sessionsCount` theo từng ngày. `StudyPresence` có `lastCreditedAt` để chống ăn gian thời gian.

### Định nghĩa ngày học đạt chuẩn: hai vế, phải đủ cả hai

1. **Ít nhất 25 phút hoạt động thật** trong ngày, theo `dateKey` giờ Việt Nam
2. **VÀ hoàn thành ít nhất một việc**: nộp một bài luyện tập, xong một phục bàn Feynman, hoặc đánh trọn một trận

Vế 2 mới là vế quan trọng. Chỉ có vế 1 thì mở tab để đó là đủ.

### Chữ hiện cho người dùng

Phải hiện **trong lúc** họ học, không phải cuối ngày.

> **Quân lệnh hôm nay** - 17/25 phút, chưa nộp bài nào
>
> *Ghi công khi: học đủ 25 phút **và** nộp xong ít nhất một bài, một phục bàn, hoặc một trận.*
>
> ***Nộp bài đã làm rồi vẫn tính***, *làm lại một đề cũ và nộp thì vẫn là học.*
>
> *Không tính: mở bài ra đọc mà không nộp, và mở xem lại kết quả cũ.*

Dòng "không tính" bắt buộc phải có, và phải nói rõ vế "nộp lại bài cũ vẫn tính". Nếu không, người dùng sẽ đọc thành làm lại đề cũ là vô ích. **Ranh giới thật nằm ở có nộp hay không, không nằm ở bài mới hay bài cũ.**

### Chuỗi ngày

Tối đa **3 ngày phép liên tiếp**. Tổng **7 ngày phép trong 30 ngày trượt**. Tự động áp dụng, không cần xin.

Chuỗi liên tiếp mà mất một ngày là bay sạch ba tháng thì người ta bỏ luôn, không quay lại. Trong truyện gọi là *quân lệnh có châm chước*.

### Bảy ngày đầu của một người mới

1. **Làm đề `PUBLIC` miễn phí**. Có những Quân Công đầu tiên mà chưa cần biết Quân Công là gì.
2. **Vào đấu trường ở hạng không cược**. Không cần Quân Công. Gặp người, gặp bot, thêm kinh nghiệm và Quân Công. Danh hiệu tầng Nhập môn dẫn họ đi.
3. **Đủ Quân Công cho lượt Thí Bút đầu tiên**. Màn hình hiện câu: *"Không mua được binh thư, phải đánh mà đoạt lấy."*
4. **Mở được đề thật đầu tiên mà chưa trả một đồng nào.**

**Bước 4 là toàn bộ cái móc.** Cảm giác lúc đó không phải "tôi được phát đồ miễn phí" mà là *"tôi vừa đoạt được thứ này bằng thực lực"*.

Nhắm rơi vào **ngày thứ hai hoặc thứ ba** sau khi đăng ký, với người học nghiêm túc mỗi ngày. Muộn hơn thì họ bỏ đi trước khi kịp cảm nhận. Sớm hơn thì chẳng ai thấy cần nạp tiền.

### Cách định số

Đừng bắt đầu từ "một đề bao nhiêu Quân Công". Bắt đầu từ một câu duy nhất:

> **Bao nhiêu giờ học thật thì đổi được một đề?**

Đề xuất mục tiêu **2 tới 3 ngày học đều đặn**, rồi suy ngược ra mọi con số Quân Công từ đó. So với người nạp tiền có ngay cả thư viện, chênh lệch tốc độ khoảng vài chục lần. Đủ lớn để người có tiền thấy đáng nạp, đủ nhỏ để người không có tiền vẫn thấy mình tiến thật.

---

## 11. Nghị Sự Đường

### Phần lớn đã xây xong

Cấu trúc kiểu Reddit đã có trong repo:

- Bình luận lồng nhau: `ForumComment.parentId` cộng `depth`, chặn ở `MAX_DEPTH = 5`
- Phiếu hai chiều: Cắm cờ cộng 1, Hạ cờ trừ 1, điểm gọi là *uy vọng*
- Chín phòng theo cấp bậc, phòng bậc N mở cho mọi người từ bậc N trở lên, bậc cao quay về phòng dưới **đăng bài được** chứ không chỉ bình luận
- Khoá đăng trong giờ Nguyệt Thí, vẫn đọc được
- Giới hạn tần suất, báo cáo, xoá mềm để tra cứu khi tranh chấp

### Giữ nguyên chín phòng, đổi trang mặc định

Các phòng **cộng dồn, không loại trừ nhau**. Phòng Bạch thân mở cho 100% người dùng, phòng bậc 9 chỉ mở cho bậc 9. Nên cộng đồng không hề bị chia làm chín, nó là kim tự tháp lồng nhau với đáy chứa tất cả mọi người. Phòng vắng chỉ có ở đỉnh, và phòng đỉnh vắng không tốn gì: không ai bị kẹt trong đó, người bậc cao chỉ việc quay xuống phòng dưới đăng bài.

**Gộp phòng lại sẽ phá mất chín khoảnh khắc mở khoá** gắn với chín lần thăng cấp.

**Vấn đề thật là thị giác, không phải cấu trúc.** Người bậc 5 mở trang, thấy 5 phòng mà 3 phòng ghi "chưa có bài nào", sẽ đọc cả sản phẩm thành bỏ hoang.

Chữa bằng cách **đổi trang mặc định từ danh sách phòng sang một dòng chảy chung** gồm mọi bài người đó xem được, xếp theo hoạt động gần nhất. Phòng thành **bộ lọc**, không phải cửa vào.

### Mỗi bài trong dòng chảy phải mang nhãn phòng

Nhãn trả lại hai thông tin:

- **Mức độ bàn luận đang chờ họ.** Một bài từ phòng Nha tướng viết cho người đã đi được một quãng. Người bậc 2 vào đọc cần biết trước điều đó để không nản.
- **Ai nhìn thấy bài này.** Bài ở phòng bậc 7 chỉ hiện với bậc 7 trở lên. Người viết cần biết phạm vi người đọc *trước khi* gõ, nên ô soạn bài phải ghi rõ: *"Bài này chỉ hiện với bậc 7 trở lên."*

Nhãn dùng đúng tên bậc trong `ranks/catalog.ts`, không dùng số trần. Phòng càng cao thì nhãn càng đậm.

### Nối diễn đàn vào việc học

Khoảng trống lớn nhất hiện nay: không có cách gắn một bài viết với **một đề hoặc một câu cụ thể**. Mà người ta thắc mắc *về một câu*, không thắc mắc trong chân không.

- Cho `ForumPost` gắn tuỳ chọn vào `exerciseId` và mã câu
- Từ màn hình phục bàn hoặc từ một câu vừa làm sai, đặt lối **"Đưa câu này ra Nghị Sự Đường"**. Một cú bấm, tự trích sẵn ngữ cảnh

Đây là thứ biến diễn đàn từ *một khu vực trong website* thành *một phần của việc học*.

### Trạng thái Đã sáng tỏ

Reddit không có khái niệm câu hỏi đã được giải đáp, nên người thứ mười vào đọc phải lội hết ba mươi bình luận để đoán ai đúng.

Thêm một dấu nhẹ: **người đăng đánh dấu "Đã sáng tỏ" vào một bình luận, bình luận đó được ghim lên đầu.** Không cần cả bộ máy StackOverflow, chỉ cần một dấu.

### Bỏ Hạ cờ ở bài đăng, chỉ giữ ở bình luận

Hạ cờ hoạt động tốt trên Reddit vì đám đông lớn và ẩn danh. Trong một cộng đồng vài trăm người học cùng nhau, một lá cờ hạ vào câu hỏi thật thà của người mới đọc lên thành **lời chê cá nhân**, và người đó sẽ không hỏi lần thứ hai.

**Chê một câu trả lời sai là việc lành mạnh. Chê một người dám hỏi thì không.** Báo cáo vẫn còn đó để xử nội dung xấu.

### Định dạng chữ

**Ràng buộc kiến trúc phải giữ:** `markup.ts` cố ý **không dùng trình soạn thảo HTML**. Chỉ lưu văn bản thuần với vài dấu quy ước rồi dựng React lúc hiện, nên React tự thoát chuỗi và người dùng không có đường chèn thẻ của họ. **`dangerouslySetInnerHTML` không được xuất hiện ở đâu trong luồng diễn đàn.** Mọi dấu mới phải sinh thẻ từ danh sách trắng cố định.

Hiện có bốn dấu: `**đậm**`, `*nghiêng*`, `__gạch chân__`, `- đầu dòng`.

Thêm:

| Dấu | Cú pháp | Vì sao cần |
|---|---|---|
| **Chữ ẩn** | `\|\|đáp án\|\|` | **Quan trọng nhất.** Bàn về đáp án câu 12 mà lộ ngay thì hỏng bài của người đang làm dở. Bấm mới hiện |
| **Trích dẫn** | `>` đầu dòng | Trích một câu trong đoạn văn, hoặc trích lời người đang phản biện |
| **Nguyên văn** | `` `từ` `` | Bàn về paraphrase thì từng chữ phải giữ nguyên |
| **Danh sách đánh số** | `1.` đầu dòng | Giải thích cách làm theo bước |
| **Dẫn câu hỏi** | `#12` | Tự liên kết tới câu 12 của đề đã gắn kèm |
| **Gạch bỏ** | `~~sai rồi~~` | Cho phép sửa ý ngay trong bài mà vẫn thấy đường đi của suy nghĩ |
| **Đường kẻ** | `---` một dòng riêng | Ngắt phần trong bài giảng dài |
| **Màu chữ** | `{lam:chữ}` | Năm màu, xem dưới |

### Năm màu chữ: đặt theo nghĩa, không đặt theo màu

Cho người dùng chọn màu tự do thì mỗi bài một kiểu và diễn đàn thành mớ hỗn độn. Cho họ chọn **nghĩa** thì màu được dùng nhất quán và bài dễ đọc hơn hẳn.

| Tên trong thanh công cụ | Cú pháp | Dùng khi |
|---|---|---|
| Đáp án đúng | `{dung:...}` | Khẳng định phương án đúng, kết luận đã kiểm chứng |
| Bẫy thường gặp | `{bay:...}` | Chỗ đề gài, lỗi nhiều người mắc |
| Nhấn mạnh | `{nhan:...}` | Ý cốt lõi của cả bài |
| Trích từ đề | `{de:...}` | Chữ lấy nguyên văn từ đoạn văn |
| Ghi chú thêm | `{chu:...}` | Phần phụ, đọc sau cũng được |

**Hai điều bắt buộc:**

- **Danh sách trắng, không nhận mã màu tự do.** Nếu cú pháp cho phép nhập mã màu bất kỳ thì có người sẽ viết chữ trắng trên nền trắng để giấu nội dung hoặc phá đám. Năm cái tên cố định là năm cái tên.
- **Mỗi màu là một cặp token sáng / tối.** Người dùng chọn *nghĩa*, hệ thống chọn *giá trị* theo nền đang hiển thị. Không bao giờ để một mã màu cứng đi thẳng vào database.

> **Đã có.** Năm cặp mã màu sáng và tối nằm ở `docs/BRAND-GUIDELINE.md` mục 1.6.
> Không một mã màu mới nào: cả năm đều dùng token `-ink` sẵn có. `markup.ts` lưu
> **tên nghĩa**, không bao giờ lưu mã màu.

### Tiện lợi hơn

- Phím tắt `Ctrl/Cmd + B/I/U`
- Một nút **Xem trước** để người viết thấy kết quả trước khi đăng
- Trên điện thoại, thanh công cụ phải nổi trên bàn phím chứ không nằm dưới nó

Ảnh và video để bản sau, dung lượng lưu trữ chưa cho phép, và chữ vẫn đủ cho việc bàn bài.

### Uy vọng

Hiện trên hồ sơ cá nhân, cạnh cấp bậc và Chiến Lực. Ba con số nói ba chuyện khác nhau: **cấp bậc là hành trình, Chiến Lực là sức trên chiến trường, uy vọng là mức tin cậy trong cộng đồng.**

**Đừng đổi uy vọng ra Quân Công.** Ngay khi phiếu bầu quy ra tiền, người ta bắt đầu viết để lấy phiếu chứ không để giúp nhau, và cụm tài khoản bầu chéo xuất hiện trong tuần đầu. Uy vọng mở ra danh hiệu và địa vị, không mở ra tiền.

---

## 12. Mô hình dữ liệu

`MeritLedger` cố ý sao chép đúng kỷ luật của `CoinLedger` đã có: số tiền luôn dương, chiều nằm ở `kind`, có `balanceAfter` thừa để đối chiếu từng dòng, và có khoá chống ghi hai lần.

| Bảng | Vai trò | Cột đáng chú ý |
|---|---|---|
| `ArenaProfile` | Hồ sơ đấu trường | `merit`, `chienLuc`, `ratingDeviation`, `seasonId`, `quyDienAt`, `wins`, `losses`, `truces` |
| `ArenaSeason` | Mùa giải | `code`, `startAt`, `endAt`, `status` |
| `Duel` | Một trận đấu | `status`, `mode`, `tier` (STAKED hoặc FREE), `exerciseId`, `stake`, `startedAt`, `deadlineAt`, `winnerId`, `voidReason`, `integrityPolicyVersion` |
| `DuelSide` | Một bên, luôn đúng hai dòng mỗi trận | `duelId`, `userId`, `attemptId`, `score`, `submittedAt`, `elapsedMs`, `integrityFlags` |
| `DuelInvite` | Chiến thư đang chờ | `fromUserId`, `toUserId`, `stake`, `expiresAt`, `status` |
| `MeritLedger` | Sổ cái Quân Công | `kind` (EARN, STAKE, MINT, BURN, REFUND, REVOKE), `amount` luôn dương, `balanceAfter`, `ledgerKey` duy nhất, `duelId` |
| `ThiButAttempt` | Một lượt khảo hạch | `userId`, `targetKind` (EXERCISE hoặc FEYNMAN), `targetId`, `cost`, `passed`, `itemIds`, `retryOf` |
| `ThiButItem` | Kho câu ngắn | `type`, `difficulty`, `prompt`, `options`, `answer`, `reviewedBy`, `publishedAt` |
| `ForumPost` *(sửa bảng có sẵn)* | Nối bài viết vào việc học | Thêm `exerciseId`, `questionRef`, `resolvedCommentId` |

**Thêm vào `Exercise`:** `arenaOnly Boolean @default(false)`

**Khoá chống ghi hai lần:** đặt `ledgerKey` dạng `DUEL:<duelId>:<userId>:<kind>`. Nếu quyết toán chạy hai lần do bấm nhanh hoặc job chạy lại, dòng thứ hai bị chặn ở tầng database chứ không phải tầng logic, đúng cách `TOPUP:<orderId>` đang làm.

**Sửa `src/lib/ranks/catalog.ts:67`:** chỉ cần đổi **mệnh đề đầu**. Câu hiện tại
đã là *"Người áo vải chưa có quân công. Chưa làm bài nào được chấm, và đó là điểm
xuất phát bình thường của tất cả mọi người."* Vế sau giữ nguyên, vế đầu phải đổi
thành *"Người áo vải chưa lập được chiến công nào."*, vì theo thiết kế mới người
bậc 1 có Quân Công ngay từ ngày đầu nên câu cũ thành sai sự thật ngay trên giao
diện.

---

## 13. Quy tắc chữ nghĩa toàn website

Hai quy tắc này áp cho mọi chữ hiện ra trước mắt người dùng: giao diện, thông báo, mô tả danh hiệu, tài liệu, và nội dung người dùng viết.

| Quy tắc | Đã có gì | Cần thêm gì |
|---|---|---|
| **Không chữ Hán** | `npm run test:no-han` gác mã nguồn | Chưa gác ảnh (đã từng phải làm sạch hai ảnh Triệu Vân ở commit `505d58b`) và chưa gác nội dung người dùng viết |
| **Không dấu gạch ngang dài** | Chưa có gì | Thêm `check-no-em-dash.mjs` theo đúng khuôn của `check-no-han-characters.mjs` |

**Lý do của quy tắc thứ hai:** người Việt viết bình thường không ai dùng dấu này. Nó là dấu vết của chữ máy sinh ra, và một trang đầy dấu gạch ngang dài đọc lên có mùi máy móc dù từng câu đều đúng. Nếu bắt buộc phải ngắt ý thì dùng dấu gạch nối, dấu phẩy, hoặc tách thành hai câu.

**Hai chỗ áp dụng khác nhau:**

- **Chữ trong mã nguồn**: test chặn thẳng, hỏng build. Giống cách `test:no-han` đang làm.
- **Chữ người dùng viết**: không chặn, không báo lỗi, không dạy đời. **Lặng lẽ chuẩn hoá lúc lưu** trong `markup.ts`. Người viết không cần biết luật này tồn tại, và diễn đàn vẫn sạch.

---

## 14. Lộ trình

### P1. Kinh nghiệm, Quân Công, điểm danh

Thang kinh nghiệm nối vào GATE trong `rules.ts`. Sổ cái Quân Công. Quân Công từ ngày học đạt chuẩn qua `StudyDay`. Test gác bất biến hai đơn vị và bất biến không lối ra. Chưa có trận nào.

### P2. Thí Bút và kho câu

Sinh 400 tới 500 câu ngoại tuyến, duyệt, phát hành. Luồng khảo hạch, thử lại, giá giảm.

Đây là lúc chứng minh được cái móc ở bước 4 có hoạt động thật không, **trước khi** xây đấu trường. Kiểm chứng giả định đắt nhất trước, xây thứ tốn công nhất sau.

### P3. Trận đấu và quyết toán

Chiến thư, hai hạng trận, chấm ở máy chủ, huỷ / phát Quân Công, đầu hàng, giảng hoà, hết giờ. Bản chứng minh mọi luật quyết toán chạy đúng trước khi thêm realtime.

### P4. Đồng thời, Chiến Lực, 30 bot

SSE, danh sách người đang có mặt, ghép cặp, thang Chiến Lực, Quy Điền, giờ điểm binh, hẹn trận. Đây là lúc đấu trường thành hình.

### P5. Danh hiệu và liêm chính

Nhóm tự động trước, nhóm cần người xử sau. Kèm màn hình xét duyệt và đường khiếu nại. Đừng làm sớm hơn, cần dữ liệu trận thật để định ngưỡng.

### P6. Mùa giải, lãnh địa, bố cáo

Tổng kết mùa, chia điểm phe theo đầu người, mở khoá bản đồ, Bảng Bố Cáo. Chỉ làm sau khi P4 chạy ổn vài tuần với người thật.

### Nghị Sự Đường chạy song song

Diễn đàn đã chạy rồi, nên các việc ở mục 11 là sửa nhỏ và độc lập, làm xen vào bất cứ lúc nào.

Nhưng hai việc nên làm **sớm nhất có thể**, ngay từ P1 hoặc P2: **bỏ Hạ cờ ở bài đăng** và **dòng chảy chung thay danh sách phòng**. Cả hai đều rẻ, và cả hai đều ảnh hưởng tới việc người mới có ở lại hay không, thứ quyết định mọi phần còn lại có ai dùng hay không.

---

## 15. Nhật ký quyết định

Mục này ghi lại **những phương án đã bác bỏ và lý do**. Sáu tháng nữa sẽ có người muốn "đơn giản hoá" một trong các luật ở trên. Không có mục này thì họ sẽ gỡ đúng cái chốt đang giữ hệ đứng vững.

### Đã bác bỏ: cược bằng Xu

Xu nạp bằng tiền thật (`CoinLedger.kind` có `TOPUP = nạp tiền thật`). Người thắng lấy Xu của người thua sẽ hội đủ ba yếu tố cơ quan quản lý nhìn vào: khoản cược mua bằng tiền, cuộc thi đấu, phần thưởng chuyển từ người thua sang người thắng. Vì vậy mới sinh ra Quân Công.

### Đã bác bỏ: Quân Công mua đề với giá riêng

Nếu Quân Công mua cùng món với Xu thì tỷ giá tự sinh dù không có nút đổi. Thay bằng: Quân Công chỉ mua một lượt Thí Bút.

### Đã bác bỏ: thua thì trừ kinh nghiệm và tụt cấp bậc

Hai lý do. Một, `rank-promotion-moment.tsx:56` đang hứa nguyên văn trên màn hình *"cấp bậc này sẽ không bao giờ bị mất"*. Hai, và quan trọng hơn: nếu thua thì tụt cấp, người thua nhiều sẽ rơi xuống đúng tầm của họ và **hiện tượng "cấp cao mà thua mãi" tự động biến mất**, tức cơ chế tụt hạng tiêu diệt chính tín hiệu mà danh hiệu chất vấn sinh ra để chỉ mặt.

### Đã bác bỏ: đầu hàng tốn nhiều kinh nghiệm hơn mất kết nối

Người chơi luôn chọn đường rẻ. Nếu rút phích rẻ hơn đầu hàng thì không ai đầu hàng nữa.

### Đã bác bỏ: mất kết nối tự động xử thua

Mạng 4G rớt thật. Xử thua tức thì sẽ phạt oan người ngay thẳng, và còn phải viết logic dò mất kết nối vốn rất khó tin cậy với SSE trên Hostinger.

### Đã bác bỏ: ghép cặp theo cấp bậc

Vì kinh nghiệm chỉ tăng và cấp bậc không tụt, cấp bậc là hàm của thời gian chứ không phải của năng lực. Ghép theo cấp bậc sẽ tạo ra chính hiện tượng mà Danh Bất Phù Thực trừng phạt.

### Đã bác bỏ: Thí Bút một câu

Một câu True/False/Not Given đoán bừa đúng 33%, trắc nghiệm 4 lựa chọn đúng 25%. Đó là quay số chứ không phải khảo hạch, và người giỏi thật vẫn trượt 1 trong 4 lần vì lý do không liên quan tới năng lực.

### Đã bác bỏ: trần kinh nghiệm riêng cho bot

Sẽ làm lộ bot. Thay bằng luật giảm dần theo đối thủ, áp cho tất cả mọi người.

### Đã bác bỏ: làm bot mạnh lên đồng loạt

Bot là đường vào cho người mới. Bot mạnh thì người mới thua liên tục trước những đối thủ duy nhất có mặt. Thay bằng: mỗi bot có Chiến Lực riêng, lên xuống như người thật.

### Đã bác bỏ: Quy Điền giới hạn một tuần

Học viên thi học kỳ ba tuần sẽ bị đẩy trở lại rồi bị phạt vì đang bận học. Đấu trường là tính năng phụ, học mới là sản phẩm chính. Thay bằng: giới hạn bằng cái giá, không bằng thời gian.

### Đã bác bỏ: Quy Điền kéo Chiến Lực về trung vị

Sẽ kéo người đang thua sấp mặt **lên**, biến hình phạt thành phần thưởng cho đúng người cần bắt. Thay bằng: chỉ trôi xuống.

### Đã bác bỏ: giảng hoà vẫn được kinh nghiệm và điểm phe

Hai người vào trận, bấm hoà ở giây thứ năm, ba mươi giây một vòng, không phải đọc chữ nào.

### Đã bác bỏ: bán quyền bỏ qua Thí Bút bằng Xu

Xu mua quyền không phải khảo hạch, Quân Công mua lượt khảo hạch, hai đường cùng
mở ra một đề. Tỷ giá tự sinh y hệt trường hợp chung giỏ hàng, mà bài test "không
món hàng nào có cả hai giá" lại không bắt được vì đây là hai món hàng khác tên.
Bỏ hẳn món hàng đó, và thêm test thứ ba ở mục 01.

### Đã bác bỏ: rào tài khoản phụ áp cho cả đấu trường

Mâu thuẫn trực tiếp với mục 10: rào vài ngày học đẩy khoảnh khắc mở đề đầu tiên
sang ngày thứ năm hoặc sáu, trong khi mục 10 nhắm ngày thứ hai hoặc ba và gọi đó
là toàn bộ cái móc. Thay bằng: rào chỉ áp cho hạng có cược.

### Đã bác bỏ: test "ít nhất một trong ba đường còn sống"

Test này qua được trong khi thực tế đã bế tắc, ví dụ cờ `PUBLIC` vẫn tồn tại
nhưng số đề mang cờ đó bằng không. Thay bằng hai khẳng định cụ thể ở mục 01.

### Đã bác bỏ: bất biến "Quân Công mỗi phút ở vòng học không thấp hơn vòng đấu"

Đề xuất ngày 2026-08-20, chủ dự án bác bỏ cùng ngày. Lý do: **mục tiêu là người
học thi đấu nhiều hơn**, nên việc đấu trường trả cao hơn trên mỗi phút là công
cụ chứ không phải lỗi. Trận nào cũng là một lần đọc đề thật.

Đừng thêm bất biến này lại. Nếu lo vòng học bị bỏ, hãy theo dõi số ngày học đạt
chuẩn trung bình thay vì siết tỷ lệ.

### Đã bác bỏ: mức trần Quân Công kiếm mỗi ngày

Chủ dự án không đồng ý. Thay bằng cách khiến trần không còn cần thiết: Quân Công từ việc học trả theo **ngày học đạt chuẩn**, không trả theo **số đề hoàn thành**.

### Đã bác bỏ: danh hiệu hiếm trả ít Quân Công

Ban đầu tôi đề xuất theo trục *hiếm hay không*. Sai trục. Danh hiệu hiếm của sản phẩm này phần lớn chặn bằng **độ khó học thuật**, mà ai cày thứ đó là đang học thật. Trục đúng là *đo năng lực hay đo thời gian*.

### Đã bác bỏ: gộp chín phòng diễn đàn xuống ba

Các phòng cộng dồn chứ không loại trừ nhau, nên cộng đồng không hề bị chia nhỏ. Gộp lại sẽ phá mất chín khoảnh khắc mở khoá gắn với chín lần thăng cấp, để đổi lấy việc chữa một vấn đề không tồn tại. Vấn đề thật chỉ là thị giác, và chữa bằng dòng chảy chung.

### Đã bác bỏ: nút điểm danh

Chỉ đo được việc mở trang, không đo được việc học. Số liệu gắn bó sẽ toàn người vào, bấm, thoát, đúng ngược điều cần đo.

### Đã bác bỏ: gọi API AI lúc người dùng bấm Thí Bút

Chi phí không có trần, có độ trễ giữa một luồng bấm giờ, không ai duyệt nội dung, và một câu sai đáp án sẽ lấy mất Quân Công của người ngay thẳng mà không tái lập được để xử tranh chấp.

---

## Còn chờ

- **Ký hiệu và ảnh do chủ dự án tự thiết kế.** Danh sách đặt hàng đầy đủ ở
  `docs/DAT-HANG-KY-HIEU.md`
- **Toàn bộ phần dựng giao diện.** Luật đã chốt, mã chưa viết

**Đã xong, không còn chờ:** brand guideline nằm ở `docs/BRAND-GUIDELINE.md` bản 1,
gồm năm cặp mã màu cho mục 11, tông màu danh hiệu chất vấn, ba màu phe cho mục 09,
sáu màu trạng thái trận cho mục 04, và bốn chỉ số cho mục 05.
