import { notFound } from "next/navigation";
import { ChatDockPreview } from "@/components/chat/chat-dock-preview";

export default function ChatboxPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <ChatDockPreview />;
}
