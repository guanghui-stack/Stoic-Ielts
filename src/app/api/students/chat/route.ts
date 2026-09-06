import { getCurrentUser } from "@/lib/session";
import { canUseChatRealtime } from "@/lib/chat/realtime-rules";
import { chatPausedForAttempt, listDockInbox } from "@/lib/chat/dock-service";
import { getConversation } from "@/lib/chat/service";
import { validChatId } from "@/lib/chat/dock-rules";

const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response(null, { status: 401, headers });
  if (!canUseChatRealtime(user)) return new Response(null, { status: 403, headers });
  if (await chatPausedForAttempt(user.id)) return Response.json({ paused: true }, { headers });
  const id = new URL(request.url).searchParams.get("conversation");
  if (id !== null) {
    if (!validChatId(id)) return new Response(null, { status: 400, headers });
    const result = await getConversation(user.id, id);
    if (!result.ok) return Response.json({ error: result.error }, { status: 404, headers });
    return Response.json({ conversation: result.value }, { headers });
  }
  return Response.json({ inbox: await listDockInbox(user.id), paused: false }, { headers });
}
