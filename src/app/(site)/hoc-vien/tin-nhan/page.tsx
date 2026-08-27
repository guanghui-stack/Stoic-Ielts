import { ChatWorkspace, type ChatConversation, type ChatInboxItem } from "@/components/chat/chat-workspace";
import { StudentNav } from "@/components/student/student-nav";
import { getConversation, listInbox, markConversationRead } from "@/lib/chat/service";
import { requireUser } from "@/lib/session";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Đối Thoại — Tin nhắn học viên | STOIC · IELTS",
  description: "Hộp chat riêng để học viên STOIC · IELTS trao đổi với nhau.",
};

type Props = {
  searchParams: Promise<{ conversation?: string | string[] }>;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function StudentMessagesPage({ searchParams }: Props) {
  const user = await requireUser();
  if (user.role !== "STUDENT") redirect("/quan-tri");

  const inboxResult = await listInbox(user.id);
  if (!inboxResult.ok) redirect("/hoc-vien");

  const conversationId = firstParam((await searchParams).conversation);
  let activeConversation: ChatConversation | null = null;

  if (conversationId) {
    const readResult = await markConversationRead(user.id, conversationId);
    if (readResult.ok) {
      const conversationResult = await getConversation(user.id, conversationId);
      if (conversationResult.ok) {
        activeConversation = {
          ...conversationResult.value,
          messages: conversationResult.value.messages.map((message) => ({
            ...message,
            createdAt: message.createdAt.toISOString(),
          })),
        };
      }
    }
  }

  const inbox: ChatInboxItem[] = inboxResult.value.map((item) => ({
    ...item,
    lastMessage: item.lastMessage
      ? { ...item.lastMessage, createdAt: item.lastMessage.createdAt.toISOString() }
      : null,
    lastMessageAt: item.lastMessageAt?.toISOString() ?? null,
    unreadCount: item.unreadCount,
  }));

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-10 md:py-14">
      <StudentNav current="messages" />
      <header className="mb-8 max-w-2xl">
        <p className="label-caps">ĐỐI THOẠI · HỌC VIÊN</p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-navy-deep md:text-4xl">
          Nói điều có ích, lắng nghe có chủ đích.
        </h1>
        <p className="mt-4 max-w-xl font-ui text-sm leading-relaxed text-ink-soft md:text-base">
          Một không gian riêng để học viên trao đổi kinh nghiệm, hỏi đúng điều cần hỏi và giữ cho cuộc trò chuyện tôn trọng, rõ ràng.
        </p>
      </header>
      <ChatWorkspace
        currentUserId={user.id}
        inbox={inbox}
        activeConversation={activeConversation}
        activeConversationId={activeConversation?.id ?? conversationId}
      />
    </div>
  );
}
