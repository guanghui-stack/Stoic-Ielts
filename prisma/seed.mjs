import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

// Chỉ dùng cho máy local. Mật khẩu KHÔNG nằm trong mã nguồn (repo công khai):
// đặt qua biến môi trường, ví dụ  ADMIN_PASSWORD=... node prisma/seed.mjs
const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL?.trim().toLowerCase() || "dangquanghuy17012001@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD?.trim() || "DevOnly@Local2026";

const reading1 = {
  passage: {
    title: "The Story of Bridges",
    paragraphs: [
      "Few structures embody human ambition as clearly as the bridge. From the first fallen log laid across a stream to the steel giants that now span entire bays, bridges have always served a single, elegant purpose: to connect what nature has kept apart. Historians believe that the earliest deliberate bridges were built more than three thousand years ago, when communities in Mesopotamia and China began laying timber beams over rivers to link farmland with markets.",
      "The Romans transformed bridge-building from a craft into a science. By perfecting the semicircular stone arch, they created crossings of astonishing durability; several Roman bridges, such as the Alcántara Bridge in Spain, still carry traffic today, almost two thousand years after they were completed. Roman engineers also invented a form of concrete that could harden underwater, allowing them to sink foundations directly into riverbeds. Their achievements were so advanced that European bridge design barely changed for the next thousand years.",
      "The Industrial Revolution rewrote the rules. Iron, and later steel, allowed engineers to build longer, lighter and far more daring structures. The world's first major iron bridge was erected at Coalbrookdale in England in 1779, and its success signalled the end of stone's long dominance. In the nineteenth century, the suspension bridge emerged as the champion of great distances: by hanging the roadway from cables strung between tall towers, engineers could leap across gorges and estuaries that had once seemed impossible to span.",
      "The twentieth century brought both triumph and tragedy. The Golden Gate Bridge, opened in San Francisco in 1937, became an icon of modern engineering with its 1,280-metre main span. Yet only three years later, the Tacoma Narrows Bridge in Washington State twisted itself apart in moderate winds, a failure captured on film and studied by engineering students ever since. The disaster taught designers a lasting lesson: a bridge must be tested not only against weight, but against the invisible forces of wind and resonance.",
      "Today, the frontier of bridge-building lies in Asia. China alone has constructed more than a million bridges, including the Danyang–Kunshan Grand Bridge, which stretches 165 kilometres and is currently the longest bridge on Earth. Modern designers combine high-performance concrete, wind-tunnel modelling and computer simulation to create structures that their Roman predecessors could scarcely have imagined. Some experimental designs even generate their own electricity through solar panels embedded in the road surface.",
      "Yet for all this technology, the meaning of the bridge has never changed. Anthropologists note that in almost every culture, the bridge appears as a symbol of connection, opportunity and passage from one stage of life to another. To build a bridge, physically or otherwise, is to declare that separation is temporary and that the other side is worth reaching. It is perhaps for this reason that the bridge, more than any other structure, continues to capture the human imagination.",
    ],
  },
  questionGroups: [
    {
      type: "TFNG",
      instruction:
        "Do the following statements agree with the information given in the passage? Choose TRUE if the statement agrees with the information, FALSE if the statement contradicts the information, or NOT GIVEN if there is no information on this.",
      questions: [
        {
          id: "q1",
          prompt: "The earliest bridges were built primarily for military purposes.",
          options: ["TRUE", "FALSE", "NOT GIVEN"],
          answer: "NOT GIVEN",
        },
        {
          id: "q2",
          prompt: "Some bridges built by the Romans are still in use in the present day.",
          options: ["TRUE", "FALSE", "NOT GIVEN"],
          answer: "TRUE",
        },
        {
          id: "q3",
          prompt: "European bridge design developed rapidly in the centuries immediately after the Roman era.",
          options: ["TRUE", "FALSE", "NOT GIVEN"],
          answer: "FALSE",
        },
        {
          id: "q4",
          prompt: "The Tacoma Narrows Bridge collapsed during a period of exceptionally strong winds.",
          options: ["TRUE", "FALSE", "NOT GIVEN"],
          answer: "FALSE",
        },
        {
          id: "q5",
          prompt: "The Danyang–Kunshan Grand Bridge took more than ten years to build.",
          options: ["TRUE", "FALSE", "NOT GIVEN"],
          answer: "NOT GIVEN",
        },
      ],
    },
    {
      type: "MC",
      instruction: "Choose the correct letter, A, B, C or D.",
      questions: [
        {
          id: "q6",
          prompt: "According to the passage, what was a key innovation of Roman engineers?",
          options: [
            "A. Steel cables strung between towers",
            "B. Concrete that could set underwater",
            "C. Timber beams laid across rivers",
            "D. Solar panels embedded in roads",
          ],
          answer: "B",
        },
        {
          id: "q7",
          prompt: "The bridge at Coalbrookdale was significant because it",
          options: [
            "A. was the longest bridge of its time.",
            "B. marked the decline of stone as the main bridge material.",
            "C. was the first bridge to collapse in high winds.",
            "D. was designed using computer simulation.",
          ],
          answer: "B",
        },
        {
          id: "q8",
          prompt: "What lesson did engineers learn from the Tacoma Narrows disaster?",
          options: [
            "A. Suspension bridges should never exceed one kilometre.",
            "B. Bridges must resist forces other than weight alone.",
            "C. Film should be used to record all bridge openings.",
            "D. Iron is an unsuitable material for large bridges.",
          ],
          answer: "B",
        },
        {
          id: "q9",
          prompt: "In the final paragraph, the writer suggests that bridges",
          options: [
            "A. have lost their cultural significance in modern times.",
            "B. are valued mainly for their economic benefits.",
            "C. carry a symbolic meaning shared across cultures.",
            "D. will eventually be replaced by other structures.",
          ],
          answer: "C",
        },
      ],
    },
    {
      type: "GAP",
      instruction:
        "Complete the sentences below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER from the passage for each answer.",
      questions: [
        {
          id: "q10",
          prompt: "The Romans perfected the semicircular ______, giving their bridges great durability.",
          answer: "stone arch",
        },
        {
          id: "q11",
          prompt: "The main span of the Golden Gate Bridge measures ______ metres.",
          answer: "1,280",
          altAnswers: ["1280"],
        },
        {
          id: "q12",
          prompt: "The world's longest bridge extends for ______ kilometres.",
          answer: "165",
        },
        {
          id: "q13",
          prompt: "Modern engineers test their designs using wind-tunnel modelling and computer ______.",
          answer: "simulation",
        },
      ],
    },
  ],
};

const reading2 = {
  passage: {
    title: "The Bilingual Brain",
    paragraphs: [
      "For much of the twentieth century, raising a child with two languages was widely discouraged. Teachers and even doctors warned parents that bilingualism would confuse young minds and delay learning. Modern neuroscience has overturned this view so completely that researchers now speak of a 'bilingual advantage' — a set of measurable cognitive benefits that come from managing two languages in one brain.",
      "The most striking of these benefits concerns what psychologists call executive function: the mental system that controls attention, switches between tasks and filters out distractions. Because a bilingual person's two languages are always active, the brain must constantly select one and suppress the other. This unceasing exercise appears to strengthen executive function in the same way that daily training strengthens a muscle. In laboratory tests, bilingual participants consistently outperform monolinguals at tasks that require ignoring irrelevant information.",
      "Brain-imaging studies have begun to reveal the physical basis of these effects. Research led by Ellen Bialystok at York University in Toronto found that lifelong bilinguals develop greater density of grey matter in regions associated with attention and control. Perhaps most remarkably, her team observed that bilingual patients developed symptoms of dementia on average four to five years later than monolingual patients with the same degree of brain deterioration. The second language, it seems, builds a 'cognitive reserve' that allows the brain to function well even as it ages.",
      "The advantages are not confined to the laboratory. A study of interpreters at the European Parliament found that professional language-switchers were exceptionally good at what researchers call 'task-set reconfiguration' — abandoning one set of rules and adopting another at speed. Employers appear to have noticed: surveys across several countries show that employees who speak a second language earn, on average, between five and fifteen per cent more than their monolingual colleagues.",
      "It is important, however, not to overstate the case. Some recent studies have failed to replicate the bilingual advantage in young adults, whose executive function is already at its peak. Critics such as Kenneth Paap argue that the benefits may be strongest at the two ends of life — in childhood, when control systems are still developing, and in old age, when they begin to decline. Even sceptics, though, accept that bilingualism does no cognitive harm, and that its social and economic value is beyond dispute.",
      "For language learners, the practical message is encouraging. The brain changes observed in studies do not require perfect fluency acquired in infancy; they appear in people who learned their second language as adults, provided they use it regularly. Every hour spent reading, listening or speaking in another language is, quite literally, an investment in the structure of one's own brain — a bridge built from neuron to neuron, one conversation at a time.",
    ],
  },
  questionGroups: [
    {
      type: "TFNG",
      instruction:
        "Do the following statements agree with the information given in the passage? Choose TRUE, FALSE or NOT GIVEN.",
      questions: [
        {
          id: "q1",
          prompt: "In the past, some medical professionals advised against raising children bilingually.",
          options: ["TRUE", "FALSE", "NOT GIVEN"],
          answer: "TRUE",
        },
        {
          id: "q2",
          prompt: "A bilingual person's two languages are active only when they are speaking.",
          options: ["TRUE", "FALSE", "NOT GIVEN"],
          answer: "FALSE",
        },
        {
          id: "q3",
          prompt: "Ellen Bialystok's research was funded by the Canadian government.",
          options: ["TRUE", "FALSE", "NOT GIVEN"],
          answer: "NOT GIVEN",
        },
        {
          id: "q4",
          prompt: "Critics of the bilingual advantage believe that bilingualism damages young adults' cognition.",
          options: ["TRUE", "FALSE", "NOT GIVEN"],
          answer: "FALSE",
        },
      ],
    },
    {
      type: "MC",
      instruction: "Choose the correct letter, A, B, C or D.",
      questions: [
        {
          id: "q5",
          prompt: "The writer compares managing two languages to",
          options: [
            "A. solving a mathematical problem.",
            "B. physical training that strengthens a muscle.",
            "C. filtering water through a screen.",
            "D. switching off an electrical device.",
          ],
          answer: "B",
        },
        {
          id: "q6",
          prompt: "What did Bialystok's team discover about bilingual patients?",
          options: [
            "A. They never developed dementia.",
            "B. Their brains showed no physical deterioration.",
            "C. Their dementia symptoms appeared several years later than expected.",
            "D. They recovered from dementia more quickly than monolinguals.",
          ],
          answer: "C",
        },
        {
          id: "q7",
          prompt: "The study of European Parliament interpreters showed that they excelled at",
          options: [
            "A. learning new languages quickly.",
            "B. earning higher salaries than politicians.",
            "C. switching rapidly between different sets of rules.",
            "D. remembering long speeches word for word.",
          ],
          answer: "C",
        },
        {
          id: "q8",
          prompt: "According to the final paragraph, the cognitive benefits of bilingualism",
          options: [
            "A. are available only to those who learned two languages in infancy.",
            "B. can be gained by adults who use their second language regularly.",
            "C. disappear if the second language was learned at school.",
            "D. depend on achieving perfect fluency.",
          ],
          answer: "B",
        },
      ],
    },
    {
      type: "GAP",
      instruction:
        "Complete the sentences below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER from the passage for each answer.",
      questions: [
        {
          id: "q9",
          prompt: "The mental system that controls attention and task-switching is known as ______ function.",
          answer: "executive",
        },
        {
          id: "q10",
          prompt: "Lifelong bilinguals were found to have greater density of ______ in key brain regions.",
          answer: "grey matter",
        },
        {
          id: "q11",
          prompt: "A second language builds a 'cognitive ______' that protects the ageing brain.",
          answer: "reserve",
        },
        {
          id: "q12",
          prompt: "Bilingual employees earn on average between five and ______ per cent more.",
          answer: "fifteen",
          altAnswers: ["15"],
        },
      ],
    },
  ],
};

const writingTask1a = {
  task: "TASK_1",
  minWords: 150,
  prompt:
    "The table below shows the percentage of households with internet access in three Southeast Asian countries between 2010 and 2020.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.",
  dataTable: {
    caption: "Households with internet access (%)",
    headers: ["Country", "2010", "2015", "2020"],
    rows: [
      ["Vietnam", "27", "52", "78"],
      ["Thailand", "23", "52", "85"],
      ["Singapore", "82", "91", "98"],
    ],
  },
  guidance:
    "Viết tối thiểu 150 từ. Nên dành khoảng 20 phút cho phần này. Mở bài paraphrase đề, đoạn overview nêu 2 xu hướng nổi bật, 2 đoạn thân bài so sánh số liệu cụ thể.",
};

const writingTask1b = {
  task: "TASK_1",
  minWords: 150,
  prompt:
    "The chart data below shows the number of international students enrolled at a university in Australia between 2018 and 2023, by region of origin.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.",
  dataTable: {
    caption: "International student enrolments by region",
    headers: ["Region", "2018", "2020", "2023"],
    rows: [
      ["Southeast Asia", "2,400", "1,900", "4,100"],
      ["East Asia", "3,800", "2,600", "3,500"],
      ["South Asia", "1,200", "1,100", "2,800"],
      ["Europe", "600", "300", "700"],
    ],
  },
  guidance:
    "Viết tối thiểu 150 từ trong khoảng 20 phút. Chú ý xu hướng giảm năm 2020 và sự phục hồi khác nhau giữa các khu vực.",
};

const writingTask2a = {
  task: "TASK_2",
  minWords: 250,
  prompt:
    "Some people believe that the best way to learn a foreign language is to live in a country where it is spoken. Others think that success depends mainly on the learner's own effort, wherever they study.\n\nDiscuss both these views and give your own opinion.\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience.",
  guidance:
    "Viết tối thiểu 250 từ trong khoảng 40 phút. Cấu trúc gợi ý: mở bài paraphrase + nêu quan điểm; 1 đoạn cho mỗi luồng ý kiến; kết bài khẳng định lại lập trường.",
};

const writingTask2b = {
  task: "TASK_2",
  minWords: 250,
  prompt:
    "In many countries, secondary school students are required to learn a foreign language as part of the national curriculum.\n\nTo what extent do you agree or disagree with this policy?\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience.",
  guidance:
    "Viết tối thiểu 250 từ trong khoảng 40 phút. Chọn rõ mức độ đồng ý và bảo vệ nhất quán xuyên suốt bài.",
};

async function main() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await db.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      email: ADMIN_EMAIL,
      name: "Quản trị Wobridges",
      passwordHash,
      role: "ADMIN",
    },
  });
  console.log(`✓ Tài khoản admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);

  const exercises = [
    {
      skill: "READING",
      taskType: "READING_PASSAGE",
      title: "Reading Practice 01 — The Story of Bridges",
      description:
        "1 passage · 13 câu hỏi · TRUE/FALSE/NOT GIVEN, Multiple Choice, Sentence Completion. Độ khó tương đương Passage 2 đề thi thật.",
      durationMinutes: 20,
      content: JSON.stringify(reading1),
    },
    {
      skill: "READING",
      taskType: "READING_PASSAGE",
      title: "Reading Practice 02 — The Bilingual Brain",
      description:
        "1 passage · 12 câu hỏi · TRUE/FALSE/NOT GIVEN, Multiple Choice, Sentence Completion. Độ khó tương đương Passage 3 đề thi thật.",
      durationMinutes: 20,
      content: JSON.stringify(reading2),
    },
    {
      skill: "WRITING",
      taskType: "WRITING_TASK_1",
      title: "Writing Task 1 — Internet Access in Southeast Asia",
      description: "Dạng bài Table · tối thiểu 150 từ · thời gian khuyến nghị 20 phút.",
      durationMinutes: 20,
      content: JSON.stringify(writingTask1a),
    },
    {
      skill: "WRITING",
      taskType: "WRITING_TASK_1",
      title: "Writing Task 1 — International Student Enrolments",
      description: "Dạng bài Table · tối thiểu 150 từ · thời gian khuyến nghị 20 phút.",
      durationMinutes: 20,
      content: JSON.stringify(writingTask1b),
    },
    {
      skill: "WRITING",
      taskType: "WRITING_TASK_2",
      title: "Writing Task 2 — Learning a Language Abroad",
      description: "Dạng bài Discuss both views · tối thiểu 250 từ · 40 phút.",
      durationMinutes: 40,
      content: JSON.stringify(writingTask2a),
    },
    {
      skill: "WRITING",
      taskType: "WRITING_TASK_2",
      title: "Writing Task 2 — Compulsory Foreign Languages at School",
      description: "Dạng bài Agree/Disagree · tối thiểu 250 từ · 40 phút.",
      durationMinutes: 40,
      content: JSON.stringify(writingTask2b),
    },
  ];

  for (const ex of exercises) {
    const existing = await db.exercise.findFirst({ where: { title: ex.title } });
    if (!existing) {
      await db.exercise.create({ data: ex });
      console.log(`✓ Đã tạo bài tập: ${ex.title}`);
    } else {
      console.log(`- Bỏ qua (đã tồn tại): ${ex.title}`);
    }
  }
}

// Chạy được cả 2 cách: `node prisma/seed.mjs` (thủ công) hoặc được
// server import khi khởi động (src/lib/init-db.ts) — export promise
// để bên import chờ seed xong.
const seedPromise = main()
  .then(() => db.$disconnect())
  .catch((e) => {
    console.error(e);
    db.$disconnect();
    process.exitCode = 1;
  });

export default seedPromise;
