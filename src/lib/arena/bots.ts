import "server-only";
import { db } from "@/lib/db";
import { BOT_CAP, BASE_RATING } from "@/lib/arena/rating.ts";

/**
 * Ba mươi bot mang danh tính như người thật, để đấu trường không bao giờ rỗng
 * trong những tháng đầu.
 *
 * VÌ SAO CẦN. Đấu trường đồng thời cần hai người online cùng lúc trong 10 tới
 * 15 phút, mà học viên IELTS học rải rác cả ngày. Rủi ro lớn nhất của cả tính
 * năng là SÂN RỖNG, và nó là rủi ro sản phẩm chứ không phải kỹ thuật.
 *
 * BỐN LUẬT GIỮ CHO BOT KHÔNG LỘ, đặc tả mục 06:
 *
 * 1. **Không có sức mạnh cố định.** Mỗi bot có Chiến Lực riêng, lên xuống theo
 *    kết quả y như người thật. Người mới gặp bot Chiến Lực thấp nên thắng được
 *    và ở lại; người khá gặp bot Chiến Lực cao nên không dễ ăn. Thắng bot khó
 *    đúng bằng thắng người cùng Chiến Lực, đó chính là định nghĩa của không
 *    phân biệt được.
 * 2. **Không có chỗ đặc biệt nào ở tầng ghép cặp.** Càng ít chỗ đặc biệt thì
 *    càng khó lộ.
 * 3. **Giờ online thất thường.** Mười cái tên luôn có mặt, không bao giờ ngủ,
 *    nhịp đều tăm tắp thì lộ trong một tuần.
 * 4. **Bị loại khỏi chat và kết bạn.** Giấu trong bảng đấu là vô hại, giấu
 *    trong một cuộc trò chuyện thì không.
 *
 * Tên đặt theo lối tên người Việt bình thường, KHÔNG lấy tên danh tướng: một
 * người tên "Triệu Vân" trong bảng đấu là lộ ngay.
 */

const BOT_NAMES = [
  "Nguyễn Minh Anh", "Trần Gia Bảo", "Lê Thu Hà", "Phạm Quốc Huy",
  "Hoàng Bảo Ngọc", "Vũ Đức Nam", "Đặng Thảo Vy", "Bùi Tiến Đạt",
  "Đỗ Khánh Linh", "Hồ Anh Khoa", "Ngô Phương Mai", "Dương Hải Long",
  "Lý Ngọc Trâm", "Phan Trung Kiên", "Võ Hà My", "Đinh Xuân Trường",
  "Trịnh Kim Chi", "Mai Hoàng Sơn", "Cao Diệu Linh", "Lâm Việt Anh",
  "Tạ Bích Ngọc", "Chu Nhật Minh", "Hà Tuyết Nhi", "Đoàn Bá Lộc",
  "Trương Yến Nhi", "Nguyễn Hữu Phước", "Lê Gia Hân", "Phạm Tuấn Kiệt",
  "Vương Thanh Trúc", "Tô Minh Quân",
] as const;

/**
 * Chiến Lực khởi điểm rải đều quanh mốc gốc.
 *
 * Rải chứ không đặt bằng nhau: nếu ba mươi bot cùng đúng 1000 điểm thì bảng
 * xếp hạng có một khối ba mươi người trùng số, và đó là dấu hiệu lộ rõ nhất.
 *
 * Khoảng 700 tới 1450 phủ được cả người mới lẫn người đã đánh một thời gian.
 */
function seedRating(index: number): number {
  const spread = [-300, -220, -160, -110, -70, -40, -15, 10, 40, 75, 115, 160, 210, 270, 340, 420];
  return BASE_RATING + spread[index % spread.length] + ((index * 7) % 23);
}

/**
 * Tạo bot nếu chưa đủ. Chạy mỗi lần khởi động, tự biết dừng.
 *
 * Email dùng miền `.invalid` theo RFC 2606: nó KHÔNG BAO GIỜ phân giải được,
 * nên không có đường nào gửi thư tới bot hay ai đó chiếm được địa chỉ ấy.
 *
 * Bot không có `passwordHash`, nên không đăng nhập được bằng bất cứ cách nào.
 */
export async function seedArenaBots(): Promise<{ created: number }> {
  const existing = await db.user.count({ where: { isBot: true } });
  if (existing >= BOT_CAP) return { created: 0 };

  let created = 0;
  for (let i = existing; i < BOT_CAP; i++) {
    const name = BOT_NAMES[i % BOT_NAMES.length];
    const email = `bot-${i + 1}@arena.invalid`;
    const found = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (found) continue;

    const user = await db.user.create({
      data: { email, name, role: "STUDENT", isBot: true, active: true },
      select: { id: true },
    });
    await db.arenaProfile.create({
      data: {
        userId: user.id,
        chienLuc: seedRating(i),
        // Cho sẵn một ít trận để bot không nằm trong giai đoạn biến động mạnh
        // của người mới, tức Chiến Lực của chúng ổn định như người đã đánh lâu.
        duelsPlayed: 12 + (i % 40),
      },
    });
    created++;
  }
  return { created };
}
