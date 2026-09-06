import Link from "next/link";
import { MessageSquarePlus } from "lucide-react";
import type { QuestionDiscussionLink } from "@/lib/forum/question-context";

export function QuestionDiscussionLinks({discussion}: {discussion: QuestionDiscussionLink}) {
  return <div className="mt-2 flex flex-wrap items-center gap-x-5 font-ui text-sm">
    <Link href={discussion.askHref} className="inline-flex min-h-11 items-center gap-2 text-navy underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"><MessageSquarePlus className="h-4 w-4" aria-hidden="true" />Hỏi cộng đồng</Link>
    {discussion.threads.map((thread, index) => <Link key={thread.href} href={thread.href} title={thread.title} className="inline-flex min-h-11 items-center text-navy underline underline-offset-4">Xem thảo luận{discussion.threads.length > 1 ? ` ${index + 1}` : ""}</Link>)}
  </div>;
}
