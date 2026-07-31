/**
 * Gắn lời giải mẫu (question.learning) cho đề Reading Practice 03 — Game Theory.
 * Nội dung được soạn dựa trên chính passage trong đề, dùng cho bước "Reveal"
 * của Feynman Review. Chạy một lần: node scripts/add-feynman-learning.mjs
 */
import fs from "node:fs";

const PATH = "prisma/reading-game-theory.json";

const LEARNING = {
  q1: {
    evidenceParagraph: "A",
    evidenceText:
      "Đoạn mở đầu nói phần mềm mô phỏng hành vi con người có thể “make forecasts” — tức dự báo diễn biến sắp tới.",
    explanation:
      "Câu hỏi giới hạn ở đoạn đầu tiên. Đoạn A chỉ nêu ba khả năng của phần mềm, trong đó “make forecasts” khớp với C (dự đoán kết quả của sự kiện tương lai). B nói về độ chính xác của các giá trị gán vào — đó là nội dung đoạn B, không phải đoạn A. D dùng từ “dominated” mạnh hơn hẳn những gì bài viết khẳng định.",
    trap: "Câu hỏi khoanh vùng “in the first paragraph”: phương án đúng phải nằm trong đúng đoạn đó, không lấy từ đoạn sau.",
    paraphrases: [{ question: "anticipates the outcome of future events", passage: "make forecasts" }],
    skillTag: "MC_SCOPE_TO_PARAGRAPH",
  },
  q2: {
    evidenceParagraph: "C",
    evidenceText:
      "“Sorting out people's motivations is much easier when making money is the main object.” — việc mô hình hóa dễ hơn khi mục tiêu chính là tiền.",
    explanation:
      "Van Oosten nêu vấn đề khi con người hành động vì “non-rational emotions”; ngay sau đó bài viết đối lập bằng “However”, khẳng định mọi thứ dễ hơn khi động cơ là lợi nhuận → D. C là mô tả tình huống phần mềm hoạt động KÉM chứ không phải tốt nhất.",
    trap: "Từ “hatred” xuất hiện rất nổi bật khiến nhiều người chọn C, nhưng đó là ví dụ cho trường hợp dự đoán KHÔNG đáng tin.",
    paraphrases: [{ question: "profit is the primary motivator", passage: "making money is the main object" }],
    skillTag: "MC_CONTRAST_SIGNAL",
  },
  q3: {
    evidenceParagraph: "D",
    evidenceText:
      "Phần mềm xác định các giấy phép lớn đang bị định giá quá cao, nên khách hàng “were then directed to obtain a collection of smaller, less expensive licences instead”.",
    explanation:
      "Sau khi phát hiện giấy phép lớn bị thổi giá, Milgrom hướng khách mua nhiều giấy phép nhỏ hơn → D. A đúng nghĩa đen của “big licences” nhưng ngược hoàn toàn với lời khuyên trong bài.",
    trap: "Đáp án A lặp lại đúng từ khóa trong bài (“big licences”) nhưng đảo ngược ý — luôn kiểm tra chiều của hành động, không chỉ từ khóa.",
    skillTag: "MC_REVERSED_KEYWORD",
  },
  q4: {
    evidenceParagraph: "E",
    evidenceText:
      "“Introduce a third seller, however, and the stifling equilibrium is broken as relocations and pricing changes energise the market.”",
    explanation:
      "Ví dụ người bán kem được đưa ra để cho thấy khi có đối thủ MỚI tham gia thì thế bế tắc bị phá vỡ → A. Vị trí (B) và giá (D) chỉ là chi tiết trong ví dụ, không phải mục đích người viết nhắc tới nó.",
    trap: "Câu hỏi “in order to” hỏi MỤC ĐÍCH của ví dụ, không hỏi ví dụ chứa những chi tiết gì.",
    skillTag: "MC_PURPOSE_OF_EXAMPLE",
  },
  q5: {
    evidenceParagraph: "F",
    evidenceText:
      "“Difficult negotiations can often be pushed along by neutral mediators… if a human mediator was not trusted, affordable, or available, a computer could do the job instead.”",
    explanation:
      "Ponsati cho rằng đàm phán tiến triển khi có bên trung gian — người hoặc máy — nắm giữ thông tin bí mật của các bên → B.",
    paraphrases: [
      { question: "mediators or computers take over", passage: "neutral mediators… a computer could do the job instead" },
    ],
    skillTag: "MC_PARAPHRASE_MATCH",
  },
  q6: {
    evidenceParagraph: "C",
    evidenceText:
      "“Feeding software with accurate data on all the players involved is especially tricky for political matters.”",
    explanation:
      "Bài viết nói rõ với vấn đề chính trị thì việc nạp dữ liệu chính xác rất khó và dự đoán có thể không đáng tin — đúng với nhận định “may be unhelpful” → YES.",
    trap: "Từ “may” trong câu hỏi khiến mệnh đề nhẹ đi; mệnh đề nhẹ dễ được bài viết ủng hộ hơn mệnh đề tuyệt đối.",
    skillTag: "YNNG_HEDGED_CLAIM",
  },
  q7: {
    evidenceParagraph: "D",
    evidenceText: "“He was apprehensive at first, but the result was a triumph.”",
    explanation:
      "“Apprehensive” nghĩa là lo lắng — trái ngược trực tiếp với “confident”. Bài viết phủ định mệnh đề nên đáp án là NO.",
    trap: "Vế sau “the result was a triumph” dễ khiến người đọc nhớ cảm giác tích cực và chọn YES; nhưng câu hỏi hỏi về thái độ TRƯỚC khi làm.",
    paraphrases: [{ question: "was confident", passage: "was apprehensive at first" }],
    skillTag: "YNNG_CONTRADICTION",
  },
  q8: {
    evidenceParagraph: "F",
    evidenceText:
      "Ponsati chỉ nói “mediation machines” có thể được dùng để thúc đẩy đàm phán; bài không nêu quan điểm của bà về việc dùng ngoài lĩnh vực kinh doanh.",
    explanation:
      "Không có câu nào cho thấy Ponsati coi phương pháp này là KHÔNG phù hợp ở lĩnh vực khác. Thiếu mệnh đề đó nên đáp án là NOT GIVEN.",
    trap: "Đoạn G có bàn tới tranh chấp chính trị/quân sự, nhưng đó là câu hỏi của người viết chứ không phải quan điểm của Ponsati — đừng gán quan điểm nhầm người.",
    skillTag: "YNNG_ATTRIBUTION",
  },
  q9: {
    evidenceParagraph: "G",
    evidenceText:
      "Đoạn G nói các bên đối địch “might be tempted to use it” trong tương lai; không đề cập tổ chức quân sự từ chối chấp nhận điều gì.",
    explanation:
      "Mệnh đề “refuse to accept” không xuất hiện dưới bất kỳ hình thức nào. Có chủ đề liên quan không đồng nghĩa với có thông tin — đáp án NOT GIVEN.",
    trap: "Cùng chủ đề (quân sự, chiến tranh) nhưng khác mệnh đề. NOT GIVEN thường rơi vào đúng kiểu bẫy này.",
    skillTag: "YNNG_TOPIC_NOT_CLAIM",
  },
  q10: {
    evidenceParagraph: "C",
    evidenceText:
      "Van Oosten: dự đoán trở nên không đáng tin khi con người “unexpectedly give in to 'non-rational emotions', such as hatred”.",
    explanation:
      "Phần mềm thất bại khi con người để cảm xúc chi phối quyết định thay vì theo đuổi lợi ích của mình → E.",
    paraphrases: [{ question: "allow their feelings to influence decisions", passage: "give in to non-rational emotions" }],
    skillTag: "ENDINGS_PARAPHRASE",
  },
  q11: {
    evidenceParagraph: "D",
    evidenceText:
      "“The software estimated the secret values bidders placed on specific licences, and determined that certain big licences were being overvalued.”",
    explanation:
      "Phần mềm phát hiện thứ đang bị định giá cao hơn giá trị thật → A.",
    paraphrases: [{ question: "worth more than it really is", passage: "were being overvalued" }],
    skillTag: "ENDINGS_PARAPHRASE",
  },
  q12: {
    evidenceParagraph: "E",
    evidenceText:
      "“The use of modelling makes clients more inclined to look at future repercussions when making business decisions.”",
    explanation:
      "Công cụ của Dr Black hữu ích khi doanh nghiệp cân nhắc hệ quả trong tương lai → D.",
    paraphrases: [{ question: "consider possible future developments", passage: "look at future repercussions" }],
    skillTag: "ENDINGS_PARAPHRASE",
  },
  q13: {
    evidenceParagraph: "F",
    evidenceText:
      "“The first side to disclose the maximum amount that it is willing to pay loses considerable bargaining power.”",
    explanation:
      "Bên tiết lộ giới hạn của mình trước sẽ mất lợi thế, tức là bị bỏ lại phía sau khi đưa quá nhiều thông tin ra sớm → C.",
    trap: "Ending F (“cần đàm phán trực tiếp”) nghe hợp lý về mặt thường thức nhưng không hề được bài đọc nêu.",
    skillTag: "ENDINGS_EVIDENCE_CHECK",
  },
  q14: {
    evidenceParagraph: "F",
    evidenceText:
      "“But if neither side reveals the concessions it is prepared to make, negotiations can become very slow or collapse.”",
    explanation:
      "Máy trung gian phát huy tác dụng đúng lúc đàm phán chững lại hoặc đổ vỡ → B.",
    paraphrases: [{ question: "begin to break down", passage: "become very slow or collapse" }],
    skillTag: "ENDINGS_PARAPHRASE",
  },
};

const data = JSON.parse(fs.readFileSync(PATH, "utf8"));
const content = data.content;
const parts = content.parts ?? [
  { passage: content.passage, questionGroups: content.questionGroups },
];

let attached = 0;
let missing = [];
for (const part of parts) {
  for (const group of part.questionGroups) {
    for (const q of group.questions) {
      const note = LEARNING[q.id];
      if (note) {
        q.learning = note;
        attached += 1;
      } else {
        missing.push(q.id);
      }
    }
  }
}

fs.writeFileSync(PATH, JSON.stringify(data, null, 2));
console.log(`✓ Đã gắn lời giải mẫu cho ${attached} câu trong "${data.title}"`);
if (missing.length) console.log(`- Chưa có lời giải: ${missing.join(", ")}`);
