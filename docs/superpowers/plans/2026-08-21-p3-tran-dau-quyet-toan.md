# P3: Trận đấu và quyết toán

> Ngày 2026-08-21. Theo `docs/DAC-TA-DAU-TRUONG.md` mục 14, giai đoạn P3.

## Phạm vi: cố ý chưa có giao diện đấu trường

Đặc tả gọi P3 là **"bản chứng minh mọi luật quyết toán chạy đúng trước khi thêm
realtime"**, và P4 mới là lúc "đấu trường thành hình". Nên P3 làm tầng luật,
tầng dữ liệu và kiểm thử; chưa dựng màn đấu.

Thứ tự đó không phải để tiết kiệm công. Thêm realtime vào một bộ luật quyết
toán còn sai thì không ai gỡ ra được nữa: lỗi sẽ nằm dưới hai lớp bất đồng bộ,
và mỗi lần tái hiện lại cần đúng hai người vào cùng lúc.

| Làm ở P3 | Để lại cho P4 và P6 |
|---|---|
| Chiến thư, nhận, từ chối, hết hạn | SSE, danh sách người có mặt |
| Hai hạng trận, trừ cược khi vũ trang | Ghép cặp tự động, giờ điểm binh |
| Chấm ở máy chủ, phân định thắng thua | Chiến Lực, Quy Điền |
| Huỷ và phát Quân Công | 30 bot |
| Đầu hàng, giảng hoà, bỏ mặc, huỷ trận | Điểm phe, mùa giải, lãnh địa |

## Quyết định khó nhất: ghi sổ thế nào khi quyết toán

Đặc tả nói "Quân Công của người thua bị huỷ, của người thắng do hệ thống phát
ra". Câu đó dễ đọc thành: quyết toán thì ghi một dòng `BURN` cho người thua và
một dòng `MINT` cho người thắng. **Làm vậy là trừ hai lần.**

Vì cược đã rời ví từ bước vũ trang bằng một dòng `STAKE`. Cách ghi đúng:

| Bước | Người thắng | Người thua |
|---|---|---|
| Vũ trang | `STAKE` trừ mức cược | `STAKE` trừ mức cược |
| Quyết toán | `REFUND` cộng lại cược của mình, cộng `MINT` phần thắng | không ghi gì |
| **Ròng** | **cộng đúng một lần mức cược** | **trừ đúng một lần mức cược** |

Dòng `STAKE` của người thua **chính là** phần bị huỷ. Không ghi thêm `BURN`.

Và không có dòng nào chuyển từ ví này sang ví kia, nên hai tài khoản cày cho
nhau thì một bên mất, một bên được hệ thống phát, tổng bằng không.

## Cái mà kiểm thử phải gác, và cách gác

`scripts/test-duel-db.ts` sau MỖI kịch bản đối chiếu **số dư ví với tổng tính
lại từ sổ cái**. Lệch nhau nghĩa là hoặc có người mất Quân Công oan, hoặc có
người in ra Quân Công từ hư không, và cả hai đều không có thông báo lỗi.

Phép đối chiếu đó đã chứng minh nó có tác dụng ngay lần chạy đầu: nó bắt được
chính bài kiểm thử, chỗ tôi nạp Quân Công khởi điểm thẳng vào ví mà quên ghi
dòng sổ cái tương ứng, tức dựng ra một trạng thái không bao giờ xảy ra trong mã
thật.

Sáu kịch bản: thắng thua có cược, giảng hoà, đầu hàng, huỷ trận, từ chối chiến
thư, hạng không cược.

## Bốn luật dễ bị "đơn giản hoá" nhầm

1. **Bảng chuyển trạng thái khai thành dữ liệu**, không rải `if`. Một chuyển
   trạng thái sai làm Quân Công bị trừ hai lần hoặc không bao giờ được hoàn.
2. **Bên chưa nộp tính `elapsedMs` là vô cùng**, không phải 0. Để 0 thì người
   bỏ mặc lại thắng tiêu chí thời gian, tức bỏ mặc thành chiến thuật.
3. **Đầu hàng rẻ hơn bỏ mặc** về kinh nghiệm. Ngược lại thì không ai đầu hàng
   nữa, tất cả sẽ rút dây mạng.
4. **`voidDuel` bắt buộc có lý do**, ném lỗi nếu để trống. Huỷ trận mà không
   ghi lý do thì người bị huỷ chỉ thấy Quân Công của mình đi qua đi lại.

## Còn thiếu

- **Màn đấu trường.** Có chủ ý, thuộc P4
- **Nối vào phòng thi thật.** Hiện `submitSide` nhận điểm đã chấm; cần nối với
  luồng chấm Reading để lấy điểm từ `Attempt` thay vì nhận từ tầng gọi
- **Hoà khí trên hồ sơ.** Cột đã có dữ liệu, chưa có chỗ hiển thị
