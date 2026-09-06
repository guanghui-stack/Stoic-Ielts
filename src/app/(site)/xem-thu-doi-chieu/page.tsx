import { notFound } from "next/navigation";
import { gradeReading, sanitizeReadingParts, type ReadingContent } from "@/lib/exercise-content";
import { buildReviewModel } from "@/lib/attempts/review";
import { ReadingReviewSheet } from "@/components/exam/reading-review";
import {
  ReadingExerciseTable,
  type ReadingExerciseTableRow,
} from "@/components/reading/reading-exercise-table";

export const metadata = { title: "Xem thử đối chiếu và cột Feynman" };

/**
 * Xem thử màn đối chiếu — dữ liệu minh họa, KHÔNG chạm database.
 *
 * Màn đối chiếu thật nằm sau lớp đăng nhập và đòi một lượt làm bài đã chấm, nên
 * không ai nhìn được giao diện của nó trước khi có tài khoản và làm xong một
 * bài. Trang này là cách duy nhất để soi lại bố cục sau mỗi lần sửa. Cùng khuôn
 * với `xem-thu-cbt`, `xem-thu-cap-bac` và `xem-thu-forum-discussions`.
 *
 * Đề mẫu cố ý gom đủ bốn dạng khác nhau (GAP có ô điền giữa dòng, TFNG, MC
 * nhiều đáp án, nối heading) để nhìn được cả bốn cách đáp án rơi vào chỗ.
 */

const content: ReadingContent = {
  parts: [
    {
      passage: {
        title: "The Story of Bridges",
        labelParagraphs: true,
        paragraphs: [
          "The first iron bridge in the world was completed in 1779 at Coalbrookdale. Its builders had no precedent to follow, so they borrowed the joints of carpentry and cast them in metal.",
          "Cost was the argument that carried the day. A stone crossing would have taken four seasons of work and a quarry nearby; iron took one winter and a foundry that already existed.",
          "Later engineers abandoned the carpentry joints entirely. Once iron was understood on its own terms, the shapes it produced looked like nothing that had come before.",
        ],
      },
      questionGroups: [
        {
          type: "GAP",
          instruction: "Complete the notes below.",
          wordLimit: "ONE_WORD",
          boxTitle: "The first iron bridge",
          questions: [
            { id: "g1", prompt: "The builders copied the joints used in ______ work.", answer: "carpentry" },
            { id: "g2", prompt: "Building in stone would have needed a nearby ______ .", answer: "quarry" },
          ],
        },
        {
          type: "TFNG",
          instruction: "Do the following statements agree with the information in the passage?",
          questions: [
            {
              id: "t1",
              prompt: "The Coalbrookdale bridge was built in a single winter.",
              options: ["TRUE", "FALSE", "NOT GIVEN"],
              answer: "TRUE",
            },
          ],
        },
        {
          type: "MC_MULTI",
          instruction: "Choose TWO letters, A–D.",
          questions: [
            {
              id: "m1",
              prompt: "Which TWO reasons made iron the cheaper choice?",
              options: ["Shorter build time", "A lighter deck", "A foundry already existed", "Fewer workers"],
              answer: ["A", "C"],
              selectCount: 2,
            },
          ],
        },
        {
          type: "MATCH_HEADINGS",
          instruction: "Choose the correct heading for each paragraph.",
          options: ["A borrowed language", "The argument of money", "Iron finds its own shape"],
          questions: [
            { id: "h1", paragraph: "A", answer: "i" },
            { id: "h3", paragraph: "C", answer: "iii" },
          ],
        },
      ],
    },
  ],
};

// Bài làm minh họa: đúng một câu, sai một câu, bỏ trống một câu và đúng nửa
// điểm ở câu nhiều đáp án — đủ để nhìn cả bốn trạng thái của ô đối chiếu.
const answers = {
  g1: "carpentry",
  g2: "foundry",
  t1: "",
  m1: ["A", "B"],
  h1: "i",
  h3: "ii",
};

/**
 * Bốn trạng thái của cột Feynman trong kho đề.
 *
 * Cột này là một luồng MUA HÀNG, mà ba trong bốn trạng thái của nó chỉ hiện ra
 * sau khi đã đăng nhập và làm xong ít nhất một bài — tức là gần như không ai
 * soi được chúng trước khi phát hành. Dựng sẵn ở đây để nhìn cả bốn cùng lúc.
 */
const baseRow: Omit<ReadingExerciseTableRow, "id" | "title" | "feynman"> = {
  questionCount: 13,
  questionTypes: ["TFNG", "GAP"],
  difficultyLabel: "Vừa",
  passageFitLabel: "Học thuật",
  durationMinutes: 20,
  access: "OWNED",
  userSignedIn: true,
  inProgress: false,
  attemptCount: 1,
  bestScore: { raw: 9, total: 13 },
  coinCost: 9,
  coinBalance: 60,
  merit: null,
};

const feynmanRows: ReadingExerciseTableRow[] = [
  {
    ...baseRow,
    id: "xt-khach",
    title: "Khách chưa đăng nhập",
    userSignedIn: false,
    coinBalance: null,
    attemptCount: 0,
    bestScore: null,
    feynman: null,
  },
  {
    ...baseRow,
    id: "xt-chua-lam",
    title: "Đã đăng nhập nhưng chưa làm bài",
    attemptCount: 0,
    bestScore: null,
    feynman: {
      attemptId: null,
      owned: false,
      offerCode: "FEYNMAN_ATTEMPT_SINGLE",
      priceCoins: 19,
    },
  },
  {
    ...baseRow,
    id: "xt-chua-mua",
    title: "Đã làm bài, chưa mở Feynman",
    feynman: {
      attemptId: "xem-thu-luot-1",
      owned: false,
      offerCode: "FEYNMAN_ATTEMPT_SINGLE",
      priceCoins: 19,
    },
  },
  {
    ...baseRow,
    id: "xt-da-mua",
    title: "Đã mở Feynman",
    feynman: {
      attemptId: "xem-thu-luot-1",
      owned: true,
      offerCode: "FEYNMAN_ATTEMPT_SINGLE",
      priceCoins: 19,
    },
  },
];

export default function ReviewPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const { detail } = gradeReading(content, answers);
  const parts = sanitizeReadingParts(content);

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <p className="label-caps">Xem thử giao diện · dữ liệu minh họa</p>
      <h1 className="mt-3 font-display text-2xl font-bold text-navy-deep md:text-3xl">
        Đối chiếu đề và đáp án
      </h1>

      <h2 className="mt-10 font-display text-lg font-bold text-navy-deep">
        Đã mở đáp án
      </h2>
      <div className="mt-4">
        <ReadingReviewSheet parts={parts} review={buildReviewModel(detail, true)} />
      </div>

      <h2 className="mt-12 font-display text-lg font-bold text-navy-deep">
        Chưa mở đáp án — chỉ hiện bài làm của học viên
      </h2>
      <div className="mt-4">
        <ReadingReviewSheet parts={parts} review={buildReviewModel(detail, false)} />
      </div>

      <h2 className="mt-14 font-display text-lg font-bold text-navy-deep">
        Cột Feynman trong kho đề — bốn trạng thái
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-soft">
        Feynman bán theo lượt làm bài, nên chưa làm bài thì cột nhắc làm bài chứ
        không mời mua. Bấm dấu hiệu ở dòng thứ ba để xem hộp thoại mua bằng xu.
      </p>
      <div className="mt-4">
        <ReadingExerciseTable rows={feynmanRows} />
      </div>
    </section>
  );
}
