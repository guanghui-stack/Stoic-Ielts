# P1: Kinh nghiệm, Quân Công, ngày học đạt chuẩn

> Ngày 2026-08-20. Theo `docs/DAC-TA-DAU-TRUONG.md` mục 14, giai đoạn P1.
>
> **P1 không có trận đấu nào.** Đây là tầng kinh tế và tầng nhịp độ, xây trước
> để P2 (Thí Bút) có Quân Công mà tiêu.

## Phạm vi

| Làm | Không làm ở P1 |
|---|---|
| Sổ cái Quân Công, ví Quân Công | Đặt cược, huỷ và phát |
| Quân Công từ ngày học đạt chuẩn | Quân Công từ tỉ thí |
| Thang kinh nghiệm, nối vào GATE | Chiến Lực, ghép cặp |
| Ba bài test gác bất biến | Bot, mùa giải, phe phái |

## Ba quyết định thiết kế, kèm lý do

### 1. Ví riêng `MeritWallet`, không nhét Quân Công vào `ArenaProfile`

Đặc tả mục 12 xếp `merit` làm một cột của `ArenaProfile`. Tôi tách ra, vì hai
lý do:

- `ArenaProfile` là khái niệm của P4: nó giữ `chienLuc`, `ratingDeviation`,
  `seasonId`, `quyDienAt`. P1 chưa có đấu trường, mà Quân Công thì phải có ngay
  từ P1 để P2 tiêu được. Nếu nhét chung, P1 buộc phải dựng nửa cái đấu trường
  chỉ để giữ một con số
- Đặc tả nói `MeritLedger` "cố ý sao chép đúng kỷ luật của `CoinLedger`". Mà
  `CoinLedger` đi cặp với `CoinWallet`. Sao chép kỷ luật thì phải sao chép cả
  cặp, không phải nửa cặp

**Ranh giới rút ra:** Quân Công là chuyện kinh tế, Chiến Lực là chuyện ghép
cặp. Hai thứ đổi vì hai lý do khác nhau nên không ở chung bảng.

### 2. Kinh nghiệm là hàm thuần, không phải cột trong database

Kinh nghiệm chỉ tăng và tính được hoàn toàn từ dữ liệu đã có: bài đã nộp, lượt
phục bàn, ngày học đạt chuẩn. Nên nó **được tính ra, không được lưu**.

Đổi lại được ba thứ: không có migration nào ở P1, không bao giờ lệch giữa cột
lưu và sự thật, và kiểm thử được bằng node thuần trên máy không có MySQL, đúng
như `rules.ts` đang làm.

Khi P3 có trận đấu, thêm một số hạng vào cùng hàm đó. Không phải đổi kiến trúc.

**Cái giá:** phải đọc lịch sử mỗi lần tính. Chấp nhận được vì `rules.ts` vốn đã
đọc đúng bộ dữ liệu đó rồi, không thêm truy vấn nào.

### 3. Kinh nghiệm là điều kiện CỘNG THÊM, không phải một `gateRuleKey` mới

Mỗi cửa ải có đúng một `gateRuleKey`. Nếu kinh nghiệm thành một khoá mới thì nó
**thay thế** luật hiện có chứ không cộng vào, và cửa ải mất đi điều kiện năng
lực của nó.

Thay bằng: thêm trường `gateExperience` tuỳ chọn cho định nghĩa cửa ải. Cửa mở
khi **cả hai** cùng đạt. Ranh giới GATE và SUCCESS giữ nguyên vẹn.

Đặc tả cũng cảnh báo ngưỡng kinh nghiệm đặt cao sẽ biến cấp bậc thành huy hiệu
thâm niên, nên ngưỡng ở P1 để **rất thấp**, chỉ đủ định nhịp.

## Thứ tự thực thi

1. `src/lib/merit/merit.ts` và `src/lib/experience/experience.ts`, hàm thuần
2. Ba script kiểm thử, chạy được ngay khi chưa có database
3. Prisma: `MeritWallet`, `MeritLedger`. Migration
4. `src/lib/merit/merit-service.ts`, chạm database
5. Nối kinh nghiệm vào `rules.ts`
6. Chạy toàn bộ `npm test`

Viết hàm thuần và kiểm thử trước khi chạm database là cố ý: nếu luật sai thì
sai ở bước 1, nơi sửa không tốn gì, chứ không phải ở bước 4, nơi đã có dữ liệu
thật.

## Bất biến phải gác bằng test

Theo đặc tả mục 01, ba bài:

1. **Không lối ra.** Số đề `PUBLIC` lớn hơn không, VÀ hạng không cược không đòi
   Xu lẫn Quân Công
2. **Hai đồng tiền không gặp nhau.** Không hàm nào nhận Xu trả Quân Công hoặc
   ngược lại, không món hàng nào có cả hai giá
3. **Không hai cửa dẫn về một kết quả.** Không món hàng nào mua bằng Xu mà kết
   quả là mở được thứ Quân Công cũng mở được

Bài 1 và 3 chỉ kiểm chứng được đầy đủ khi P2 có Thí Bút và P3 có hạng trận.
Ở P1 dựng khung và kiểm phần đã tồn tại, phần còn lại đánh dấu rõ là chưa gác
được, không giả vờ là đã xong.
