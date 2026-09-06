/**
 * Mồi diễn đàn: 10 chủ đề kèm bình luận và lượt Like từ bot.
 * Chạy: npm run seed:forum
 *
 * VÌ SAO CẦN: một diễn đàn trống là một diễn đàn không ai viết vào. Người đầu
 * tiên ghé qua nhìn thấy con số 0 sẽ đóng tab, và con số 0 giữ nguyên. Mười
 * chủ đề có sẵn cho họ thấy chỗ này nói về cái gì và viết ở đây thì viết kiểu
 * gì.
 *
 * BA RÀNG BUỘC:
 *
 * 1. **Chạy lại được nhiều lần.** Nhận diện bài đã mồi bằng tiêu đề; đã có thì
 *    bỏ qua, không nhân bản.
 * 2. **Bot không bao giờ đăng nhập được.** Email dùng miền `.invalid` (RFC
 *    2606) và tài khoản không có mật khẩu — giống hệt bot đấu trường.
 * 3. **Số đếm phải khớp bảng phiếu.** Mỗi lượt Like phải có một hàng ForumVote
 *    thật, vì uy vọng của tác giả được TÍNH RA từ `upCount`/`downCount`, và
 *    những cột đó chỉ được phép đổi cùng lúc với hàng phiếu.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

/** Bot viết bài và bình luận. Tách khỏi bot đấu trường để dễ nhận ra ở đâu ra. */
const FORUM_BOTS = [
  { email: "forum-bot-1@wobridges.invalid", name: "Lan Anh" },
  { email: "forum-bot-2@wobridges.invalid", name: "Minh Khoa" },
  { email: "forum-bot-3@wobridges.invalid", name: "Thu Hà" },
  { email: "forum-bot-4@wobridges.invalid", name: "Đức Duy" },
  { email: "forum-bot-5@wobridges.invalid", name: "Ngọc Mai" },
  { email: "forum-bot-6@wobridges.invalid", name: "Gia Bảo" },
];

/**
 * Mười chủ đề.
 *
 * Cố ý là những câu hỏi có thật của người luyện Reading, không phải chủ đề xã
 * giao. Chủ đề xã giao sinh ra bình luận xã giao, và diễn đàn thành chỗ tán
 * gẫu thay vì chỗ chữa bài.
 */
const TOPICS = [
  {
    title: "Mình hay hết giờ ở passage 3 — cắt chỗ nào cho kịp?",
    body: "Hai lần thi thử gần nhất mình đều còn 6 câu chưa kịp đọc ở passage 3. Passage 1 và 2 thì thoải mái, thậm chí thừa 5 phút. Có phải mình đang đọc quá kỹ hai bài đầu không? Mọi người chia thời gian ba passage thế nào?",
    comments: [
      "Mình từng y hệt. Cách sửa: đặt chuông ở phút 17 và phút 37, hết giờ là chuyển passage dù còn câu chưa xong. Câu bỏ lại quay về sau, nhưng passage 3 phải được đọc.",
      "Chú ý là passage 3 thường khó nhất nên chia đều 20-20-20 là bất lợi. Mình chia 16-20-24 và thấy ổn hơn hẳn.",
      "Thêm một ý: đọc kỹ hai bài đầu không phải lúc nào cũng sai. Nếu bạn sai nhiều ở passage 1 thì vấn đề không nằm ở thời gian.",
    ],
  },
  {
    title: "TRUE/FALSE/NOT GIVEN: phân biệt FALSE với NOT GIVEN kiểu gì?",
    body: "Mình sai chủ yếu ở chỗ chọn FALSE trong khi đáp án là NOT GIVEN. Cảm giác như bài không nói gì trái ngược, nhưng mình cứ thấy nó sai sai nên chọn FALSE. Có mẹo nào để tách hai cái này không?",
    comments: [
      "Câu hỏi mình tự hỏi: bài có nói điều NGƯỢC LẠI không? Nếu chỉ là bài không nhắc tới thì luôn là NOT GIVEN. FALSE cần một câu trong bài mâu thuẫn trực tiếp.",
      "Mẹo của mình là phải chỉ ra được DÒNG NÀO khiến mình chọn FALSE. Không chỉ ra được dòng đó thì đáp án là NOT GIVEN.",
      "Cẩn thận với các từ như only, always, all. Chúng hay biến một câu đúng thành FALSE thật.",
    ],
  },
  {
    title: "Matching Headings làm trước hay làm sau khi đọc bài?",
    body: "Mình thấy có người bảo đọc heading trước rồi mới đọc bài, người khác bảo ngược lại. Mọi người làm theo cách nào và vì sao?",
    comments: [
      "Mình đọc heading trước, nhưng chỉ đọc lướt để biết bài sẽ nói về mấy hướng. Rồi đọc từng đoạn và chọn ngay khi đọc xong đoạn đó.",
      "Đọc heading trước dễ bị ám vào một cái rồi cố nhét đoạn văn vào nó. Mình đọc đoạn trước, tự tóm tắt một câu, xong mới đi tìm heading khớp với câu tóm tắt đó.",
    ],
  },
  {
    title: "Từ vựng học thuật: học theo list hay học theo bài đọc?",
    body: "Mình đang phân vân giữa cày một list 570 từ academic và việc chỉ ghi lại từ gặp trong đề đã làm. Thời gian có hạn nên muốn chọn một cái làm cho tới.",
    comments: [
      "Học theo bài đọc thắng, vì bạn nhớ luôn ngữ cảnh và cách nó được paraphrase. List rời rạc dễ thuộc nhưng vào đề là quên.",
      "Mình làm cả hai nhưng khác mục đích: list để nhận mặt chữ cho nhanh, từ trong đề để hiểu sâu. Đừng bỏ hẳn cái nào.",
      "Gợi ý nhỏ: mỗi bài đọc chỉ chọn 5 từ đáng nhớ nhất thôi. Ghi 30 từ một bài thì tuần sau không ai đọc lại nổi.",
    ],
  },
  {
    title: "Có nên đọc hết passage trước khi xem câu hỏi không?",
    body: "Mình đọc hết bài rồi mới làm câu hỏi, nhưng thấy nhiều người bảo nên xem câu hỏi trước rồi quét bài tìm đáp án. Cách nào hợp với người band 6.0 đang muốn lên 7.0?",
    comments: [
      "Ở band 6-7 mình khuyên đọc lướt toàn bài trong 2-3 phút để nắm bố cục, rồi mới vào câu hỏi. Đọc kỹ hết bài thì không kịp giờ.",
      "Tuỳ dạng câu hỏi nữa. Matching Headings thì phải nắm bố cục, còn dạng điền từ thì quét thẳng cũng được.",
    ],
  },
  {
    title: "Làm sao biết mình sai vì từ vựng hay sai vì kỹ thuật?",
    body: "Mỗi lần chữa bài mình đều biết đáp án đúng là gì, nhưng không biết vì sao lần sau mình vẫn sai kiểu đó. Có cách nào phân loại lỗi cho rõ không?",
    comments: [
      "Mình chia ba nhóm: (1) không hiểu từ, (2) hiểu từ nhưng không tìm ra chỗ, (3) tìm ra chỗ nhưng suy diễn thêm. Ba nhóm này chữa bằng ba cách khác hẳn nhau.",
      "Bước chữa bài Feynman trên web đúng là để làm việc này. Tự giảng lại vì sao chọn sai thì lộ ra ngay mình thuộc nhóm nào.",
      "Ghi lại vào một cuốn sổ. Sau 10 bài bạn sẽ thấy mình lặp đúng một kiểu lỗi, và đó là chỗ đáng luyện nhất.",
    ],
  },
  {
    title: "Paraphrase trong đề Reading — nhận ra bằng cách nào?",
    body: "Câu hỏi gần như không bao giờ dùng đúng từ trong bài. Mình muốn luyện riêng kỹ năng nhận ra cặp paraphrase thì nên làm gì?",
    comments: [
      "Sau mỗi bài, viết ra cặp từ: từ trong câu hỏi ↔ từ trong bài. Làm 20 bài là bạn có một bảng paraphrase của riêng mình, và nó lặp lại nhiều hơn bạn tưởng.",
      "Để ý cả paraphrase ở mức CÂU chứ không chỉ mức từ. Nhiều khi cả mệnh đề bị đổi cấu trúc chứ không đổi từ nào đáng kể.",
    ],
  },
  {
    title: "Nên làm lại đề cũ hay luôn làm đề mới?",
    body: "Mình có xu hướng làm đề mới liên tục vì thấy làm lại đề cũ thì đã nhớ đáp án nên không còn ý nghĩa. Nhưng làm mãi đề mới thì band không lên.",
    comments: [
      "Làm lại đề cũ sau 2-3 tuần là đủ quên đáp án. Và mục đích lúc đó không phải điểm, mà là xem mình còn mắc lại lỗi cũ không.",
      "Mình làm lại nhưng theo kiểu khác: không làm câu hỏi, chỉ đọc bài và tự tóm tắt từng đoạn. Rèn tốc độ đọc mà không tốn đề mới.",
      "Đề mới để đo, đề cũ để chữa. Hai việc khác nhau, đừng dùng lẫn.",
    ],
  },
  {
    title: "Mất tập trung giữa bài — mọi người xử lý thế nào?",
    body: "Đọc được khoảng 10 phút là mình bắt đầu đọc mà không vào chữ nào, phải quay lại đọc từ đầu đoạn. Trong phòng thi thật thì không có thời gian để làm vậy.",
    comments: [
      "Mình dùng cách gạch chân bằng mắt: đưa ngón tay hoặc con trỏ chạy theo dòng. Nghe trẻ con nhưng nó giữ mắt không nhảy lung tung.",
      "Thường là do đọc quá lâu không nghỉ. Thử làm từng passage một, nghỉ 2 phút giữa các passage khi luyện ở nhà.",
      "Nếu đọc mà không vào, khả năng cao là bạn đang cố hiểu từng từ. Chấp nhận bỏ qua từ không biết và đọc tiếp, phần lớn thời gian nó không ảnh hưởng đáp án.",
    ],
  },
  {
    title: "Band 6.5 mãi không lên 7.0 — mình đang thiếu gì?",
    body: "Ba tháng nay mình dao động 6.5-7.0, hôm nào may thì 7.0. Mình vẫn làm đề đều, mỗi tuần 4-5 bài. Mọi người từng vượt qua giai đoạn này thì làm gì khác đi?",
    comments: [
      "Câu hỏi ngược lại: bạn CHỮA bao nhiêu trong 5 bài đó? Mình từng làm 5 chữa 0 và đứng yên nửa năm. Giảm còn 2 bài nhưng chữa kỹ thì lên trong 6 tuần.",
      "Dao động 6.5-7.0 thường là vấn đề ổn định chứ không phải năng lực. Xem lại xem hôm 6.5 và hôm 7.0 khác nhau ở điều kiện gì: ngủ, giờ làm bài, dạng đề.",
      "Mình đã ở đúng chỗ bạn. Thứ tạo khác biệt là ghi lại lỗi và đọc lại sổ lỗi trước mỗi lần làm đề mới.",
    ],
  },
];

async function ensureBots() {
  const bots = [];
  for (const bot of FORUM_BOTS) {
    const existing = await db.user.findUnique({
      where: { email: bot.email },
      select: { id: true, name: true },
    });
    if (existing) {
      bots.push(existing);
      continue;
    }
    const created = await db.user.create({
      data: {
        email: bot.email,
        name: bot.name,
        role: "STUDENT",
        isBot: true,
        active: true,
      },
      select: { id: true, name: true },
    });
    bots.push(created);
  }
  return bots;
}

/** Thêm phiếu Like thật cho một mục, và cập nhật số đếm trong cùng transaction. */
async function likeBy(targetType, targetId, voterIds) {
  let added = 0;
  for (const userId of voterIds) {
    const existing = await db.forumVote.findUnique({
      where: {
        userId_targetType_targetId: { userId, targetType, targetId },
      },
      select: { id: true },
    });
    if (existing) continue;
    await db.forumVote.create({
      data: { userId, targetType, targetId, value: 1 },
    });
    added++;
  }
  if (added === 0) return;

  const data = { upCount: { increment: added }, score: { increment: added } };
  if (targetType === "POST") {
    await db.forumPost.update({ where: { id: targetId }, data });
  } else {
    await db.forumComment.update({ where: { id: targetId }, data });
  }
}

async function main() {
  const channel = await db.forumChannel.findFirst({
    orderBy: { level: "asc" },
    select: { id: true, key: true, name: true, level: true },
  });
  if (!channel) {
    console.error(
      "Chưa có phòng diễn đàn nào. Khởi động máy chủ một lần để initDatabase seed phòng, rồi chạy lại.",
    );
    process.exitCode = 1;
    return;
  }

  const bots = await ensureBots();
  console.log(`Bot diễn đàn: ${bots.length} tài khoản.`);
  console.log(`Đăng vào phòng bậc ${channel.level} — ${channel.name}.`);

  let createdPosts = 0;
  let createdComments = 0;

  for (const [index, topic] of TOPICS.entries()) {
    const already = await db.forumPost.findFirst({
      where: { title: topic.title },
      select: { id: true },
    });
    if (already) {
      console.log(`  · đã có: ${topic.title}`);
      continue;
    }

    const author = bots[index % bots.length];
    // Rải mốc thời gian lùi dần để danh sách không phải là mười bài cùng một phút.
    const createdAt = new Date(Date.now() - (TOPICS.length - index) * 3.5 * 3600_000);

    const post = await db.forumPost.create({
      data: {
        channelId: channel.id,
        authorId: author.id,
        title: topic.title,
        body: topic.body,
        createdAt,
        lastActivityAt: createdAt,
        commentCount: 0,
      },
      select: { id: true },
    });
    createdPosts++;

    let lastAt = createdAt;
    for (const [commentIndex, body] of topic.comments.entries()) {
      // Người bình luận không trùng tác giả: bot tự trả lời bài mình trông giả.
      const commenter = bots[(index + commentIndex + 1) % bots.length];
      lastAt = new Date(lastAt.getTime() + (25 + commentIndex * 40) * 60_000);
      const comment = await db.forumComment.create({
        data: {
          postId: post.id,
          authorId: commenter.id,
          body,
          depth: 0,
          createdAt: lastAt,
        },
        select: { id: true },
      });
      createdComments++;

      // Vài lượt Like cho bình luận, để uy vọng của bot khác 0 và cột số trên
      // nút Like có gì để trượt.
      const commentVoters = bots
        .filter((bot) => bot.id !== commenter.id)
        .slice(0, (index + commentIndex) % 3);
      await likeBy("COMMENT", comment.id, commentVoters.map((bot) => bot.id));
    }

    await db.forumPost.update({
      where: { id: post.id },
      data: { commentCount: topic.comments.length, lastActivityAt: lastAt },
    });

    const postVoters = bots
      .filter((bot) => bot.id !== author.id)
      .slice(0, 1 + (index % 4));
    await likeBy("POST", post.id, postVoters.map((bot) => bot.id));

    console.log(`  ✓ ${topic.title}`);
  }

  console.log(
    `\nXong: thêm ${createdPosts} chủ đề và ${createdComments} bình luận.`,
  );
}

main()
  .catch((error) => {
    console.error("Mồi diễn đàn thất bại:", error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
