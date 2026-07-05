import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { createSocket } from '@/lib/socket';
import { useAuthStore } from '@/stores/authStore';
import { useIdeStore } from '@/stores/ideStore';
import type { ChatMessage, PresenceUser } from '@/types';

interface CollabContextValue {
  socket: Socket | null;
  joined: boolean;
  presence: PresenceUser[];
  messages: ChatMessage[];
  typingUsers: string[];
  unreadChat: number;
  clearUnread: () => void;
  sendMessage: (body: string, mentions: string[]) => void;
  setTyping: (typing: boolean) => void;
  setActiveFile: (path: string | null) => void;
}

const CollabContext = createContext<CollabContextValue>({
  socket: null,
  joined: false,
  presence: [],
  messages: [],
  typingUsers: [],
  unreadChat: 0,
  clearUnread: () => {},
  sendMessage: () => {},
  setTyping: () => {},
  setActiveFile: () => {},
});

export const useCollab = () => useContext(CollabContext);

export function CollabProvider({ projectId, children }: { projectId: string; children: ReactNode }) {
  const qc = useQueryClient();
  const myId = useAuthStore((s) => s.user?.id);

  const [socket, setSocket] = useState<Socket | null>(null);
  const [joined, setJoined] = useState(false);
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [unreadChat, setUnreadChat] = useState(0);
  const chatOpenRef = useRef(false);

  // Track whether the chat panel is visible so we can count unread messages.
  const sidebarPanel = useIdeStore((s) => s.sidebarPanel);
  const sidebarVisible = useIdeStore((s) => s.sidebarVisible);
  chatOpenRef.current = sidebarVisible && sidebarPanel === 'chat';
  useEffect(() => {
    if (chatOpenRef.current) setUnreadChat(0);
  }, [sidebarPanel, sidebarVisible]);

  useEffect(() => {
    let cancelled = false;
    const s = createSocket('/collab');
    setSocket(s);

    const join = () => {
      s.emit('project:join', { projectId }, (ok: boolean) => {
        if (!cancelled) setJoined(ok);
      });
    };
    s.on('connect', join);

    s.on('presence', (users: PresenceUser[]) => {
      if (!cancelled) setPresence(users);
    });
    s.on('chat:message', (msg: ChatMessage) => {
      if (cancelled) return;
      setMessages((prev) => [...prev.filter((m) => m.id !== msg.id), msg]);
      if (!chatOpenRef.current && msg.author.id !== myId) setUnreadChat((n) => n + 1);
    });
    s.on('chat:typing', ({ name, typing }: { userId: string; name: string; typing: boolean }) => {
      if (cancelled) return;
      setTypingUsers((prev) => (typing ? [...new Set([...prev, name])] : prev.filter((n) => n !== name)));
    });
    s.on('files:changed', () => {
      qc.invalidateQueries({ queryKey: ['tree', projectId] });
    });
    s.on('disconnect', () => {
      if (!cancelled) setJoined(false);
    });

    // Chat history via REST.
    api
      .get<ChatMessage[]>(`/projects/${projectId}/chat/messages`)
      .then((res) => {
        if (!cancelled) setMessages(res.data);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      s.disconnect();
      setSocket(null);
      setJoined(false);
      setPresence([]);
    };
  }, [projectId, qc, myId]);

  const sendMessage = useCallback(
    (body: string, mentions: string[]) => {
      socket?.emit('chat:send', { body, mentions });
    },
    [socket]
  );

  const setTyping = useCallback(
    (typing: boolean) => {
      socket?.emit('chat:typing', typing);
    },
    [socket]
  );

  const setActiveFile = useCallback(
    (path: string | null) => {
      socket?.emit('presence:update', { activeFile: path });
    },
    [socket]
  );

  const clearUnread = useCallback(() => setUnreadChat(0), []);

  const value = useMemo(
    () => ({
      socket,
      joined,
      presence,
      messages,
      typingUsers,
      unreadChat,
      clearUnread,
      sendMessage,
      setTyping,
      setActiveFile,
    }),
    [socket, joined, presence, messages, typingUsers, unreadChat, clearUnread, sendMessage, setTyping, setActiveFile]
  );

  return <CollabContext.Provider value={value}>{children}</CollabContext.Provider>;
}
