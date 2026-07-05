import { useEffect, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Bell, LogOut, Settings, LayoutGrid, CheckCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { createSocket } from '@/lib/socket';
import { cn, timeAgo } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useNotifications } from '@/lib/queries';
import { Logo } from '@/components/ui/Logo';
import { Avatar } from '@/components/ui/Avatar';
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, DropdownSeparator } from '@/components/ui/Dropdown';
import { EmptyState } from '@/components/ui/misc';
import type { AppNotification } from '@/types';

function NotificationsBell() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data } = useNotifications();

  // Live: /app socket pushes 'notification' into the cached list.
  useEffect(() => {
    const socket = createSocket('/app');
    socket.on('notification', (n: AppNotification) => {
      qc.setQueryData<{ unread: number; items: AppNotification[] }>(['notifications'], (old) =>
        old ? { unread: old.unread + 1, items: [n, ...old.items].slice(0, 40) } : { unread: 1, items: [n] }
      );
    });
    return () => {
      socket.disconnect();
    };
  }, [qc]);

  const markAllRead = async () => {
    await api.post('/notifications/read-all');
    qc.setQueryData<{ unread: number; items: AppNotification[] }>(['notifications'], (old) =>
      old ? { unread: 0, items: old.items.map((n) => ({ ...n, read: true })) } : old
    );
  };

  const openItem = async (n: AppNotification) => {
    if (!n.read) {
      api.post(`/notifications/${n.id}/read`).catch(() => undefined);
      qc.setQueryData<{ unread: number; items: AppNotification[] }>(['notifications'], (old) =>
        old
          ? { unread: Math.max(0, old.unread - 1), items: old.items.map((i) => (i.id === n.id ? { ...i, read: true } : i)) }
          : old
      );
    }
    if (n.link) navigate(n.link);
  };

  return (
    <Dropdown>
      <DropdownTrigger>
        <button
          aria-label="Notifications"
          className="relative h-9 w-9 rounded-xl2 flex items-center justify-center text-ink-dim hover:text-ink hover:bg-white/[0.06] transition-colors"
        >
          <Bell size={17} />
          {Boolean(data?.unread) && (
            <span className="absolute top-1.5 right-1.5 min-w-[15px] h-[15px] px-0.5 rounded-full bg-primary text-[9px] font-bold text-white flex items-center justify-center ring-2 ring-bg">
              {data!.unread > 9 ? '9+' : data!.unread}
            </span>
          )}
        </button>
      </DropdownTrigger>
      <DropdownMenu className="w-[360px] p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-line">
          <span className="text-[13px] font-semibold text-ink">Notifications</span>
          {Boolean(data?.unread) && (
            <button
              onClick={markAllRead}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary-hover transition-colors"
            >
              <CheckCheck size={13} />
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-[380px] overflow-y-auto">
          {!data?.items.length ? (
            <EmptyState title="All caught up" description="Mentions, invites and project updates land here." className="py-10" />
          ) : (
            data.items.map((n) => (
              <button
                key={n.id}
                onClick={() => openItem(n)}
                className={cn(
                  'w-full text-left px-4 py-3 flex gap-3 border-b border-line last:border-b-0 transition-colors hover:bg-white/[0.04]',
                  !n.read && 'bg-primary-soft/40'
                )}
              >
                <span className={cn('mt-1.5 h-1.5 w-1.5 rounded-full shrink-0', n.read ? 'bg-transparent' : 'bg-primary')} />
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium text-ink leading-snug">{n.title}</span>
                  {n.body && <span className="block text-xs text-ink-dim mt-0.5 leading-relaxed line-clamp-2">{n.body}</span>}
                  <span className="block text-[11px] text-ink-faint mt-1">{timeAgo(n.createdAt)}</span>
                </span>
              </button>
            ))
          )}
        </div>
      </DropdownMenu>
    </Dropdown>
  );
}

function UserMenu() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  if (!user) return null;

  const signOut = async () => {
    await api.post('/auth/logout').catch(() => undefined);
    useAuthStore.getState().clearSession();
    navigate('/signin');
  };

  return (
    <Dropdown>
      <DropdownTrigger>
        <button aria-label="Account menu" className="rounded-full hover:opacity-90 transition-opacity">
          <Avatar name={user.name} color={user.avatarColor} size="md" />
        </button>
      </DropdownTrigger>
      <DropdownMenu className="w-56">
        <div className="px-3 py-2.5">
          <p className="text-[13px] font-semibold text-ink truncate">{user.name}</p>
          <p className="text-xs text-ink-faint truncate">{user.email}</p>
        </div>
        <DropdownSeparator />
        <DropdownItem icon={<LayoutGrid size={15} />} onClick={() => navigate('/dashboard')}>
          Dashboard
        </DropdownItem>
        <DropdownItem icon={<Settings size={15} />} onClick={() => navigate('/settings/profile')}>
          Settings
        </DropdownItem>
        <DropdownSeparator />
        <DropdownItem icon={<LogOut size={15} />} danger onClick={signOut}>
          Sign out
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}

/** Top navigation + centered content column, shared by dashboard & settings. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-[60px] flex items-center justify-between">
          <Link to="/dashboard">
            <Logo />
          </Link>
          <div className="flex items-center gap-2.5">
            <NotificationsBell />
            <UserMenu />
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
