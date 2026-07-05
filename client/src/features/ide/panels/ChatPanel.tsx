import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Send, Users } from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { Avatar } from '@/components/ui/Avatar';
import { useCollab } from '../collab/CollabProvider';
import type { Project } from '@/types';

/** Render @mentions in a message body as highlighted chips. */
function MessageBody({ body }: { body: string }) {
  const parts = body.split(/(@[\w.-]+)/g);
  return (
    <p className="text-[13px] text-ink-dim leading-relaxed break-words whitespace-pre-wrap">
      {parts.map((part, i) =>
        part.startsWith('@') ? (
          <span key={i} className="text-primary font-medium bg-primary-soft rounded px-1 py-px">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  );
}

export function ChatPanel({ project, readOnly }: { project: Project; readOnly: boolean }) {
  const me = useAuthStore((s) => s.user);
  const { presence, messages, typingUsers, sendMessage, setTyping, clearUnread } = useCollab();

  const [draft, setDraft] = useState('');
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearUnread();
  }, [clearUnread, messages.length]);

  // Stick to the bottom when new messages arrive.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, typingUsers.length]);

  const onlineIds = useMemo(() => new Set(presence.map((p) => p.id)), [presence]);
  const members = project.members.filter((m) => m.name);

  const mentionCandidates = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return members.filter((m) => m.id !== me?.id && (m.name ?? '').toLowerCase().includes(q)).slice(0, 5);
  }, [mentionQuery, members, me?.id]);

  const updateDraft = (value: string) => {
    setDraft(value);
    const match = /(?:^|\s)@([\w.-]*)$/.exec(value);
    setMentionQuery(match ? match[1] : null);
    setMentionIndex(0);
    if (!readOnly) {
      setTyping(true);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTyping(false), 1500);
    }
  };

  const applyMention = (name: string) => {
    setDraft((d) => d.replace(/@[\w.-]*$/, `@${name.replace(/\s+/g, '')} `));
    setMentionQuery(null);
  };

  const send = () => {
    const body = draft.trim();
    if (!body) return;
    // Map @tokens back to member ids for server-side notifications.
    const mentions = members
      .filter((m) => body.includes(`@${(m.name ?? '').replace(/\s+/g, '')}`))
      .map((m) => m.id);
    sendMessage(body, mentions);
    setDraft('');
    setTyping(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionCandidates.length) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((i) => (i + 1) % mentionCandidates.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((i) => (i - 1 + mentionCandidates.length) % mentionCandidates.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        applyMention(mentionCandidates[mentionIndex].name!);
        return;
      }
      if (e.key === 'Escape') {
        setMentionQuery(null);
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* ------------------------------------------------------- presence */}
      <div className="px-3 h-9 flex items-center gap-2 shrink-0">
        <Users size={13} className="text-ink-faint" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          Team · {presence.length} online
        </span>
      </div>
      <div className="px-3 pb-2 space-y-1 max-h-40 overflow-y-auto shrink-0">
        {members.map((m) => {
          const online = onlineIds.has(m.id);
          const activeFile = presence.find((p) => p.id === m.id)?.activeFile;
          return (
            <div key={m.id} className="flex items-center gap-2.5 py-0.5">
              <Avatar name={m.name!} color={m.avatarColor} size="xs" online={online} />
              <div className="min-w-0 flex-1">
                <p className={cn('text-[12px] truncate', online ? 'text-ink' : 'text-ink-faint')}>
                  {m.name}
                  {m.id === me?.id && ' (you)'}
                </p>
                {online && activeFile && (
                  <p className="text-[10px] text-ink-faint truncate font-mono">{activeFile}</p>
                )}
              </div>
              <span className="text-[10px] text-ink-faint">{m.role}</span>
            </div>
          );
        })}
      </div>
      <div className="h-px bg-line mx-3 shrink-0" />

      {/* ------------------------------------------------------- messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {!messages.length && (
          <p className="text-[12px] text-ink-faint leading-relaxed py-4 text-center">
            No messages yet. Say hi to your collaborators 👋
          </p>
        )}
        {messages.map((msg, i) => {
          const prev = messages[i - 1];
          const grouped =
            prev &&
            prev.author.id === msg.author.id &&
            new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() < 3 * 60_000;
          return (
            <div key={msg.id} className={cn('flex gap-2.5', grouped && '-mt-3')}>
              {grouped ? (
                <span className="w-6 shrink-0" />
              ) : (
                <Avatar name={msg.author.name} color={msg.author.avatarColor} size="sm" className="mt-0.5 !h-6 !w-6" />
              )}
              <div className="min-w-0 flex-1">
                {!grouped && (
                  <p className="flex items-baseline gap-2">
                    <span className="text-[12.5px] font-semibold text-ink">{msg.author.name}</span>
                    <span className="text-[10px] text-ink-faint">{timeAgo(msg.createdAt)}</span>
                  </p>
                )}
                <MessageBody body={msg.body} />
              </div>
            </div>
          );
        })}
        {typingUsers.length > 0 && (
          <p className="text-[11px] text-ink-faint italic">
            {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing…
          </p>
        )}
      </div>

      {/* --------------------------------------------------------- composer */}
      <div className="p-3 border-t border-line shrink-0 relative">
        {mentionCandidates.length > 0 && (
          <div className="absolute bottom-full left-3 right-3 mb-1 rounded-xl2 border border-line-strong bg-surface-overlay shadow-modal p-1 z-10">
            {mentionCandidates.map((m, i) => (
              <button
                key={m.id}
                onClick={() => applyMention(m.name!)}
                onMouseEnter={() => setMentionIndex(i)}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12.5px] text-left transition-colors',
                  i === mentionIndex ? 'bg-primary-soft text-ink' : 'text-ink-dim'
                )}
              >
                <Avatar name={m.name!} color={m.avatarColor} size="xs" />
                {m.name}
              </button>
            ))}
          </div>
        )}
        {readOnly ? (
          <p className="text-[11.5px] text-ink-faint text-center py-1">Viewers can read chat but not post.</p>
        ) : (
          <div className="flex items-end gap-2">
            <textarea
              placeholder="Message the team… use @ to mention"
              value={draft}
              onChange={(e) => updateDraft(e.target.value)}
              onKeyDown={onKeyDown}
              rows={Math.min(4, draft.split('\n').length)}
              className="flex-1 p-2.5 rounded-xl2 bg-surface-raised border border-line-strong text-[13px] text-ink placeholder:text-ink-faint resize-none focus:outline-none focus:border-primary/60 transition-colors"
              aria-label="Chat message"
            />
            <button
              onClick={send}
              disabled={!draft.trim()}
              aria-label="Send message"
              className="h-9 w-9 shrink-0 rounded-xl2 bg-primary text-white grid place-items-center hover:bg-primary-hover disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <Send size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
