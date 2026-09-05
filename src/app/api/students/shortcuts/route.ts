import { getCurrentUser } from "@/lib/session";
import { canUseChatRealtime } from "@/lib/chat/realtime-rules";
import { hasUnreadMessages } from "@/lib/chat/unread";

const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response(null, { status: 401, headers });
  if (!canUseChatRealtime(user)) return new Response(null, { status: 403, headers });
  return Response.json({ hasUnread: await hasUnreadMessages(user.id) }, { headers });
}
