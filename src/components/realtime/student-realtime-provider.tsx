"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import type {
  PresenceMessage,
  Realtime as AblyRealtime,
  RealtimeChannel,
  TokenRequest,
} from "ably";
import { STUDENT_PRESENCE_CHANNEL } from "@/lib/chat/realtime-rules";

const LOGOUT_EVENT = "stoic:realtime-logout";
const LOGOUT_STORAGE_KEY = "stoic:realtime-logout-at";

type RealtimeContextValue = {
  client: AblyRealtime | null;
  connected: boolean;
  enabled: boolean;
  onlineUserIds: ReadonlySet<string>;
  presenceReady: boolean;
  acquirePresenceObserver: () => () => void;
};

const EMPTY_ONLINE_IDS: ReadonlySet<string> = new Set<string>();
const StudentRealtimeContext = createContext<RealtimeContextValue | null>(null);

async function requestRealtimeToken(): Promise<TokenRequest> {
  const response = await fetch("/api/realtime/token", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Realtime auth ${response.status}`);
  return (await response.json()) as TokenRequest;
}

function addPresenceMember(
  members: Map<string, Set<string>>,
  message: PresenceMessage,
) {
  if (!message.clientId || !message.connectionId) return;
  const connections = members.get(message.clientId) ?? new Set<string>();
  connections.add(message.connectionId);
  members.set(message.clientId, connections);
}

function removePresenceMember(
  members: Map<string, Set<string>>,
  message: PresenceMessage,
) {
  if (!message.clientId || !message.connectionId) return;
  const connections = members.get(message.clientId);
  if (!connections) return;
  connections.delete(message.connectionId);
  if (connections.size === 0) members.delete(message.clientId);
}

export function StudentRealtimeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const clientRef = useRef<AblyRealtime | null>(null);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const bootingRef = useRef(false);
  const disposedRef = useRef(false);
  const lastAttemptPathRef = useRef("");
  const observerCountRef = useRef(0);
  const membersRef = useRef(new Map<string, Set<string>>());
  const [client, setClient] = useState<AblyRealtime | null>(null);
  const [connected, setConnected] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [observerVersion, setObserverVersion] = useState(0);
  const [onlineUserIds, setOnlineUserIds] =
    useState<ReadonlySet<string>>(EMPTY_ONLINE_IDS);
  const [presenceReady, setPresenceReady] = useState(false);

  const publishMembers = useCallback(() => {
    setOnlineUserIds(new Set(membersRef.current.keys()));
  }, []);

  const closeClient = useCallback((announceLeave: boolean) => {
    const activeClient = clientRef.current;
    const presenceChannel = presenceChannelRef.current;
    clientRef.current = null;
    presenceChannelRef.current = null;
    membersRef.current.clear();
    setClient(null);
    setConnected(false);
    setEnabled(false);
    setPresenceReady(false);
    setOnlineUserIds(EMPTY_ONLINE_IDS);
    if (!activeClient) return;

    if (announceLeave && presenceChannel) {
      const forceClose = window.setTimeout(() => activeClient.close(), 350);
      void presenceChannel.presence
        .leave()
        .catch(() => undefined)
        .finally(() => {
          window.clearTimeout(forceClose);
          activeClient.close();
        });
    } else {
      activeClient.close();
    }
  }, []);

  const bootstrap = useCallback(async () => {
    if (
      disposedRef.current ||
      bootingRef.current ||
      clientRef.current ||
      lastAttemptPathRef.current === pathname
    ) {
      return;
    }
    lastAttemptPathRef.current = pathname;
    bootingRef.current = true;

    try {
      // Guest dừng ở đây nên không phải tải cả Ably SDK trên những trang public.
      let firstToken: TokenRequest | null = await requestRealtimeToken();
      const { ErrorInfo, Realtime } = await import("ably");
      if (disposedRef.current || clientRef.current) return;

      const nextClient = new Realtime({
        autoConnect: false,
        closeOnUnload: true,
        authCallback: (_params, callback) => {
          if (firstToken) {
            const token = firstToken;
            firstToken = null;
            callback(null, token);
            return;
          }
          void requestRealtimeToken().then(
            (token) => callback(null, token),
            () =>
              callback(
                new ErrorInfo("Không cấp lại được token realtime.", 40101, 401),
                null,
              ),
          );
        },
      });
      if (disposedRef.current) {
        nextClient.close();
        return;
      }

      clientRef.current = nextClient;

      const onConnected = () => setConnected(true);
      const onDisconnected = () => setConnected(false);
      const onFailed = () => {
        setConnected(false);
        setPresenceReady(false);
      };
      nextClient.connection.on("connected", onConnected);
      nextClient.connection.on("disconnected", onDisconnected);
      nextClient.connection.on("suspended", onDisconnected);
      nextClient.connection.on("failed", onFailed);

      const presenceChannel = nextClient.channels.get(
        STUDENT_PRESENCE_CHANNEL,
        { modes: ["presence"] },
      );
      presenceChannelRef.current = presenceChannel;
      nextClient.connect();
      await presenceChannel.presence.enter();
      if (disposedRef.current || clientRef.current !== nextClient) {
        nextClient.close();
        return;
      }
      setClient(nextClient);
      setEnabled(true);
      setConnected(nextClient.connection.state === "connected");
    } catch {
      // Guest, feature flag tắt hoặc Ably lỗi đều không được làm hỏng trang.
      closeClient(false);
    } finally {
      bootingRef.current = false;
    }
  }, [closeClient, pathname]);

  useEffect(() => {
    const timer = window.setTimeout(() => void bootstrap(), 0);
    return () => window.clearTimeout(timer);
  }, [bootstrap]);

  useEffect(() => {
    const onLogout = () => closeClient(true);
    const onStorage = (event: StorageEvent) => {
      if (event.key === LOGOUT_STORAGE_KEY) onLogout();
    };
    window.addEventListener(LOGOUT_EVENT, onLogout);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(LOGOUT_EVENT, onLogout);
      window.removeEventListener("storage", onStorage);
    };
  }, [closeClient]);

  useEffect(() => {
    const presenceChannel = presenceChannelRef.current;
    const activeClient = clientRef.current;
    if (!presenceChannel || !activeClient) return;
    let cancelled = false;

    const onPresence = (message: PresenceMessage) => {
      if (message.action === "leave" || message.action === "absent") {
        removePresenceMember(membersRef.current, message);
      } else {
        addPresenceMember(membersRef.current, message);
      }
      publishMembers();
    };

    const stopObserving = () => {
      presenceChannel.presence.unsubscribe(onPresence);
      membersRef.current.clear();
      setOnlineUserIds(EMPTY_ONLINE_IDS);
      setPresenceReady(false);
    };

    if (observerCountRef.current === 0) {
      stopObserving();
      void presenceChannel
        .setOptions({ modes: ["presence"] })
        .then(() => presenceChannel.presence.enter())
        .catch(() => undefined);
      return stopObserving;
    }

    void presenceChannel
      .setOptions({ modes: ["presence", "presence_subscribe"] })
      .then(async () => {
        if (cancelled) return;
        await presenceChannel.presence.enter();
        presenceChannel.presence.subscribe(onPresence);
        const members = await presenceChannel.presence.get();
        if (cancelled) return;
        membersRef.current.clear();
        for (const member of members) addPresenceMember(membersRef.current, member);
        publishMembers();
        setPresenceReady(true);
      })
      .catch(() => {
        if (!cancelled) setPresenceReady(false);
      });

    return () => {
      cancelled = true;
      stopObserving();
    };
  }, [client, observerVersion, publishMembers]);

  useEffect(
    () => () => {
      disposedRef.current = true;
      closeClient(false);
    },
    [closeClient],
  );

  const acquirePresenceObserver = useCallback(() => {
    const wasIdle = observerCountRef.current === 0;
    observerCountRef.current += 1;
    if (wasIdle) setObserverVersion((value) => value + 1);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      observerCountRef.current = Math.max(0, observerCountRef.current - 1);
      if (observerCountRef.current === 0) {
        setObserverVersion((value) => value + 1);
      }
    };
  }, []);

  const value = useMemo<RealtimeContextValue>(
    () => ({
      client,
      connected,
      enabled,
      onlineUserIds,
      presenceReady,
      acquirePresenceObserver,
    }),
    [
      acquirePresenceObserver,
      client,
      connected,
      enabled,
      onlineUserIds,
      presenceReady,
    ],
  );

  return (
    <StudentRealtimeContext.Provider value={value}>
      {children}
    </StudentRealtimeContext.Provider>
  );
}

export function useStudentRealtime() {
  const value = useContext(StudentRealtimeContext);
  if (!value) {
    throw new Error("useStudentRealtime phải nằm trong StudentRealtimeProvider.");
  }
  return {
    client: value.client,
    connected: value.connected,
    enabled: value.enabled,
  };
}

export function useOnlineStudents(enabled = true) {
  const value = useContext(StudentRealtimeContext);
  if (!value) {
    throw new Error("useOnlineStudents phải nằm trong StudentRealtimeProvider.");
  }
  const acquirePresenceObserver = value.acquirePresenceObserver;

  useEffect(() => {
    if (!enabled) return;
    return acquirePresenceObserver();
  }, [acquirePresenceObserver, enabled]);

  return {
    onlineUserIds: enabled ? value.onlineUserIds : EMPTY_ONLINE_IDS,
    isOnline: (userId: string) => enabled && value.onlineUserIds.has(userId),
    ready: enabled && value.presenceReady,
  };
}

export function announceRealtimeLogout() {
  window.dispatchEvent(new Event(LOGOUT_EVENT));
  try {
    window.localStorage.setItem(LOGOUT_STORAGE_KEY, String(Date.now()));
  } catch {
    // Safari private mode có thể chặn storage; event cùng tab vẫn đủ để đóng.
  }
}
