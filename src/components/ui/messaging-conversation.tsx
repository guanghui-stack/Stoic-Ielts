"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, Copy, ExternalLink, LoaderCircle, Minus, MoreHorizontal, Reply, Send, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ChatConversation } from "@/components/chat/chat-workspace";
import { MESSAGE_MAX } from "@/lib/chat/rules";
import { quoteChatDraft } from "@/lib/chat/dock-rules";
import { cn } from "@/lib/utils";
import styles from "@/components/chat/chat-dock.module.css";

type Props = {
  conversation: ChatConversation;
  currentUserId: string;
  draft: string;
  onDraft: (value: string) => void;
  onSend: () => void;
  onRead: (messageId: string) => Promise<boolean>;
  onMinimize: () => void;
  onClose: () => void;
  onRetry: () => void;
  sending?: boolean;
  error?: string;
  online?: boolean;
  presenceReady?: boolean;
  focusRequest?: number;
  claimFocus: (id: string, request: number | undefined) => boolean;
  className?: string;
};

/** Adapted from the supplied conversation component, with real controlled data. */
export default function MessageConversation({ conversation, currentUserId, draft, onDraft, onSend, onRead,
  onMinimize, onClose, onRetry, sending, error, online, presenceReady, focusRequest, claimFocus, className }: Props) {
  const viewport = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const readMessage = useRef("");
  const [newBelow, setNewBelow] = useState(false);
  const [notice, setNotice] = useState("");
  const last = conversation.messages.at(-1);
  const lastRenderedMessage = useRef(last?.id);
  const lastIncoming = conversation.messages.findLast((message) => message.senderId !== currentUserId);

  const acknowledge = () => {
    if (!lastIncoming || !nearBottom.current || document.visibilityState !== "visible" ||
      !panel.current?.contains(document.activeElement) || readMessage.current === lastIncoming.id) return;
    readMessage.current = lastIncoming.id;
    void onRead(lastIncoming.id).then((ok) => {
      if (!ok && readMessage.current === lastIncoming.id) readMessage.current = "";
    }).catch(() => { if (readMessage.current === lastIncoming.id) readMessage.current = ""; });
  };

  useEffect(() => {
    const node = viewport.current;
    if (!node) return;
    if (nearBottom.current || last?.senderId === currentUserId) {
      node.scrollTop = node.scrollHeight;
      nearBottom.current = true;
    }
  }, [last?.id, last?.senderId, currentUserId]);

  useEffect(() => {
    if (claimFocus(conversation.id, focusRequest)) input.current?.focus({ preventScroll: true });
  }, [claimFocus, conversation.id, focusRequest]);

  useEffect(() => {
    const node = viewport.current;
    const onArrival = () => {
      if (lastRenderedMessage.current !== last?.id && !nearBottom.current) setNewBelow(true);
      lastRenderedMessage.current = last?.id;
      acknowledge();
    };
    // Defer until scroll layout is updated, without focusing on incoming mail.
    const frame = requestAnimationFrame(onArrival);
    document.addEventListener("visibilitychange", onArrival);
    node?.addEventListener("scroll", acknowledge);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", onArrival);
      node?.removeEventListener("scroll", acknowledge);
    };
  });

  const name = conversation.other.name;
  return (
    <Card ref={panel} role="region" aria-label={`Chat với ${name}`} className={cn(styles.conversation, className)} onFocus={acknowledge}>
      <CardHeader className={styles.header}>
        <Avatar className="size-9">
          <AvatarImage src={conversation.other.avatarSrc ?? undefined} alt={name} referrerPolicy="no-referrer" />
          <AvatarFallback className="text-xs font-semibold text-stoic-primary">{name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold" title={name}>{name}</h2>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-stoic-muted">
            {presenceReady && <span className={cn("size-1.5 rounded-full", online ? "bg-success" : "bg-stoic-muted")} />}
            {presenceReady ? online ? "Đang hoạt động" : "Đang ngoại tuyến" : "Tin nhắn riêng"}
          </p>
        </div>
        <Button asChild variant="ghost" size="icon" className={styles.iconButton}>
          <Link href={`/hoc-vien/tin-nhan?conversation=${encodeURIComponent(conversation.id)}`} aria-label={`Mở trang tin nhắn với ${name}`} title="Mở trang tin nhắn"><ExternalLink className="size-4" /></Link>
        </Button>
        <Button variant="ghost" size="icon" className={styles.iconButton} onClick={onMinimize} aria-label={`Thu nhỏ chat với ${name}`} title="Thu nhỏ"><Minus className="size-4" /></Button>
        <Button variant="ghost" size="icon" className={styles.iconButton} onClick={onClose} aria-label={`Đóng chat với ${name}`} title="Đóng"><X className="size-4" /></Button>
      </CardHeader>
      <CardContent className="relative min-h-0 flex-1 p-0">
        <ScrollArea viewportRef={viewport} className="h-full" onViewportScroll={() => {
          const node = viewport.current;
          if (!node) return;
          nearBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight < 48;
          if (nearBottom.current) setNewBelow(false);
          acknowledge();
        }}>
          <div role="log" aria-label={`Tin nhắn với ${name}`} aria-live="polite" aria-relevant="additions" className="space-y-4 px-3 py-4">
            <p className="text-center text-[11px] text-stoic-muted">{conversation.messages.length >= 100 ? "100 tin nhắn gần nhất" : "Cuộc trò chuyện riêng của hai bạn"}</p>
            {conversation.messages.length === 0 && <p className="px-6 py-12 text-center text-sm text-stoic-muted">Bắt đầu bằng một lời chào hoặc điều bạn muốn trao đổi.</p>}
            {conversation.messages.map((message) => {
              const mine = message.senderId === currentUserId;
              return (
                <div key={message.id} className={cn("group flex", mine ? "justify-end" : "justify-start")}>
                  <div className="min-w-0 max-w-[86%]">
                    <span className="sr-only">{mine ? "Bạn" : name}: </span>
                    <p className={cn(styles.bubble, mine ? styles.mine : styles.theirs)}>{message.body}</p>
                    <div className={cn("mt-1 flex items-center gap-1", mine && "justify-end")}>
                      <time className="text-[10px] text-stoic-muted" dateTime={message.createdAt} title={new Date(message.createdAt).toLocaleString("vi-VN")}>
                        {new Date(message.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                      </time>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" variant="ghost" size="icon" className={styles.messageMenu} aria-label={`Tùy chọn tin nhắn của ${mine ? "bạn" : name}`}><MoreHorizontal className="size-3.5" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="top" align={mine ? "end" : "start"} className="z-[70] font-ui">
                          <DropdownMenuItem onSelect={() => {
                            if (!navigator.clipboard) { setNotice("Trình duyệt chưa cho phép sao chép. Bạn có thể chọn nội dung tin nhắn để sao chép."); return; }
                            void navigator.clipboard.writeText(message.body).then(() => setNotice("Đã sao chép tin nhắn.")).catch(() => setNotice("Không sao chép được. Bạn có thể chọn và sao chép nội dung tin nhắn."));
                          }}><Copy className="mr-2 size-4" />Sao chép</DropdownMenuItem>
                          <DropdownMenuItem disabled={!conversation.canSend || sending} onSelect={() => {
                            const quote = quoteChatDraft(message.body, draft);
                            if ("error" in quote) { setNotice(quote.error); return; }
                            onDraft(quote.value);
                            setNotice("");
                            setTimeout(() => input.current?.focus(), 0);
                          }}><Reply className="mr-2 size-4" />Trả lời có trích dẫn</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        {newBelow && <Button size="sm" className="absolute bottom-2 left-1/2 -translate-x-1/2 gap-1 rounded-full text-xs shadow-md" onClick={() => {
          if (viewport.current) viewport.current.scrollTop = viewport.current.scrollHeight;
          nearBottom.current = true; setNewBelow(false); input.current?.focus(); acknowledge();
        }}><ArrowDown className="size-3" />Tin nhắn mới</Button>}
      </CardContent>
      <div className={styles.composer}>
        {error && <p className="mb-2 text-xs text-danger" role="alert">{error} <button type="button" onClick={onRetry} className="underline">Thử tải lại</button></p>}
        <p role="status" className="text-xs text-stoic-muted">{notice}</p>
        {conversation.canSend ? <form className="flex items-end gap-2" onSubmit={(event) => { event.preventDefault(); if (!sending && draft.trim()) onSend(); }}>
          <label htmlFor={`chat-input-${conversation.id}`} className="sr-only">Nhắn tin cho {name}</label>
          <textarea ref={input} id={`chat-input-${conversation.id}`} value={draft} onChange={(event) => onDraft(event.target.value)}
            rows={2} maxLength={MESSAGE_MAX} disabled={sending} placeholder="Nhập tin nhắn…" className={styles.input}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) {
                event.preventDefault(); event.currentTarget.form?.requestSubmit();
              }
            }} />
          <Button type="submit" size="icon" className="mb-1 shrink-0 rounded-full" disabled={sending || !draft.trim()} aria-label="Gửi tin nhắn">
            {sending ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" /> : <Send className="size-4" />}
          </Button>
        </form> : <p className="text-xs leading-relaxed text-stoic-muted">Hai bạn cần kết bạn để tiếp tục nhắn tin. <Link href="/hoc-vien/tin-nhan" className="underline">Mở danh sách bạn bè</Link></p>}
        <p className="mt-1.5 text-[10px] text-stoic-muted">Enter để gửi · Shift + Enter để xuống dòng</p>
      </div>
    </Card>
  );
}
