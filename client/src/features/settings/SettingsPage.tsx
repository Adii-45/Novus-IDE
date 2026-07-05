import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { User as UserIcon, Code2, Bell, ShieldCheck, Link2, MonitorSmartphone, MailCheck } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { cn, timeAgo } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/stores/toastStore';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { Badge, Switch, Skeleton } from '@/components/ui/misc';
import type { EditorSettings, User, UserSession } from '@/types';

const AVATAR_COLORS = ['#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4', '#EF4444'];

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="card p-6">
      <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
      {description && <p className="mt-1 text-[13px] text-ink-dim">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SettingRow({ label, description, control }: { label: string; description?: string; control: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 py-3 first:pt-0 last:pb-0">
      <div>
        <p className="text-[13px] font-medium text-ink">{label}</p>
        {description && <p className="text-xs text-ink-faint mt-0.5">{description}</p>}
      </div>
      {control}
    </div>
  );
}

// -------------------------------------------------------------------- profile

function ProfileSettings() {
  const user = useAuthStore((s) => s.user)!;
  const [form, setForm] = useState({ name: user.name, bio: user.bio, avatarColor: user.avatarColor });
  const [resent, setResent] = useState(false);

  const save = useMutation({
    mutationFn: async () => (await api.patch<User>('/users/me', form)).data,
    onSuccess: (u) => {
      useAuthStore.getState().setUser(u);
      toast.success('Profile updated');
    },
    onError: (err) => toast.error('Update failed', apiErrorMessage(err)),
  });

  const resend = useMutation({
    mutationFn: async () => (await api.post('/auth/resend-verification')).data,
    onSuccess: () => {
      setResent(true);
      toast.success('Verification email sent', 'Check your inbox (or the server console in dev).');
    },
    onError: (err) => toast.error('Could not resend', apiErrorMessage(err)),
  });

  return (
    <div className="space-y-6">
      <Section title="Profile" description="How you appear to collaborators.">
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            save.mutate();
          }}
          className="space-y-5"
        >
          <div className="flex items-center gap-5">
            <Avatar name={form.name} color={form.avatarColor} size="lg" />
            <div>
              <p className="text-[13px] font-medium text-ink-dim mb-2">Avatar color</p>
              <div className="flex gap-2">
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Avatar color ${c}`}
                    onClick={() => setForm((f) => ({ ...f, avatarColor: c }))}
                    className={cn(
                      'h-6 w-6 rounded-full transition-transform hover:scale-110',
                      form.avatarColor === c && 'ring-2 ring-offset-2 ring-offset-surface ring-white/60'
                    )}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <Input label="Full name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Textarea
            label="Bio"
            placeholder="A line about you"
            value={form.bio}
            maxLength={240}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
          />
          <div className="flex justify-end">
            <Button type="submit" loading={save.isPending}>
              Save profile
            </Button>
          </div>
        </form>
      </Section>

      <Section title="Email">
        <SettingRow
          label={user.email}
          description={user.emailVerified ? 'Verified' : 'Not verified yet'}
          control={
            user.emailVerified ? (
              <Badge tone="green">
                <MailCheck size={11} />
                verified
              </Badge>
            ) : (
              <Button size="sm" variant="secondary" loading={resend.isPending} disabled={resent} onClick={() => resend.mutate()}>
                {resent ? 'Sent' : 'Resend verification'}
              </Button>
            )
          }
        />
      </Section>
    </div>
  );
}

// --------------------------------------------------------------------- editor

function EditorSettingsPane() {
  const user = useAuthStore((s) => s.user)!;
  const [editor, setEditor] = useState<EditorSettings>(user.settings.editor);

  const save = useMutation({
    mutationFn: async (next: EditorSettings) => (await api.patch<User>('/users/me/settings', { editor: next })).data,
    onSuccess: (u) => useAuthStore.getState().setUser(u),
    onError: (err) => toast.error('Update failed', apiErrorMessage(err)),
  });

  const patch = (partial: Partial<EditorSettings>) => {
    const next = { ...editor, ...partial };
    setEditor(next);
    save.mutate(next);
  };

  return (
    <Section title="Editor" description="Applied to Monaco in every workspace.">
      <div className="divide-y divide-line">
        <SettingRow
          label="Font size"
          description="10–24 px"
          control={
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={10}
                max={24}
                value={editor.fontSize}
                onChange={(e) => patch({ fontSize: Number(e.target.value) })}
                className="w-36 accent-[#3B82F6]"
                aria-label="Font size"
              />
              <span className="text-[13px] font-mono text-ink w-8 text-right">{editor.fontSize}</span>
            </div>
          }
        />
        <SettingRow
          label="Tab size"
          control={
            <div className="flex gap-1 p-1 rounded-lg bg-surface-raised border border-line">
              {[2, 4, 8].map((n) => (
                <button
                  key={n}
                  onClick={() => patch({ tabSize: n })}
                  className={cn(
                    'px-3 h-6 rounded-md text-[12px] font-mono transition-colors',
                    editor.tabSize === n ? 'bg-surface-overlay text-ink' : 'text-ink-faint hover:text-ink-dim'
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          }
        />
        <SettingRow label="Word wrap" control={<Switch checked={editor.wordWrap} onChange={(v) => patch({ wordWrap: v })} label="Word wrap" />} />
        <SettingRow label="Minimap" control={<Switch checked={editor.minimap} onChange={(v) => patch({ minimap: v })} label="Minimap" />} />
        <SettingRow
          label="Format on save"
          description="Runs the language formatter on ⌘S"
          control={<Switch checked={editor.formatOnSave} onChange={(v) => patch({ formatOnSave: v })} label="Format on save" />}
        />
        <SettingRow
          label="Auto save"
          description="Persists changes about a second after you stop typing"
          control={<Switch checked={editor.autoSave} onChange={(v) => patch({ autoSave: v })} label="Auto save" />}
        />
      </div>
    </Section>
  );
}

// -------------------------------------------------------------- notifications

function NotificationSettings() {
  const user = useAuthStore((s) => s.user)!;
  const [prefs, setPrefs] = useState(user.settings.notifications);

  const save = useMutation({
    mutationFn: async (next: typeof prefs) =>
      (await api.patch<User>('/users/me/settings', { notifications: next })).data,
    onSuccess: (u) => useAuthStore.getState().setUser(u),
    onError: (err) => toast.error('Update failed', apiErrorMessage(err)),
  });

  const patch = (partial: Partial<typeof prefs>) => {
    const next = { ...prefs, ...partial };
    setPrefs(next);
    save.mutate(next);
  };

  return (
    <Section title="Notifications" description="What lands in your in-app inbox.">
      <div className="divide-y divide-line">
        <SettingRow
          label="Mentions"
          description="Someone @mentions you in workspace chat"
          control={<Switch checked={prefs.mentions} onChange={(v) => patch({ mentions: v })} label="Mentions" />}
        />
        <SettingRow
          label="Invites"
          description="You are added to a project"
          control={<Switch checked={prefs.invites} onChange={(v) => patch({ invites: v })} label="Invites" />}
        />
        <SettingRow
          label="Project activity"
          description="Members join or project details change"
          control={<Switch checked={prefs.projectActivity} onChange={(v) => patch({ projectActivity: v })} label="Project activity" />}
        />
      </div>
    </Section>
  );
}

// ------------------------------------------------------------------- security

function SecuritySettings() {
  const qc = useQueryClient();
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwError, setPwError] = useState<string>();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => (await api.get<UserSession[]>('/auth/sessions')).data,
  });

  const changePassword = useMutation({
    mutationFn: async () =>
      api.post('/users/me/password', { currentPassword: pw.currentPassword, newPassword: pw.newPassword }),
    onSuccess: () => {
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
      qc.invalidateQueries({ queryKey: ['sessions'] });
      toast.success('Password changed', 'Other devices were signed out.');
    },
    onError: (err) => toast.error('Change failed', apiErrorMessage(err)),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => api.delete(`/auth/sessions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });

  const submitPassword = (e: FormEvent) => {
    e.preventDefault();
    if (pw.newPassword.length < 8) {
      setPwError('New password must be at least 8 characters');
      return;
    }
    if (pw.newPassword !== pw.confirm) {
      setPwError("Passwords don't match");
      return;
    }
    setPwError(undefined);
    changePassword.mutate();
  };

  const describeAgent = (ua: string) => {
    if (/iPhone|Android/i.test(ua)) return 'Mobile device';
    if (/Macintosh/i.test(ua)) return 'Mac';
    if (/Windows/i.test(ua)) return 'Windows PC';
    if (/Linux/i.test(ua)) return 'Linux';
    return 'Unknown device';
  };

  return (
    <div className="space-y-6">
      <Section title="Change password" description="Changing your password signs out every other device.">
        <form onSubmit={submitPassword} className="space-y-4 max-w-sm" noValidate>
          <Input
            label="Current password"
            type="password"
            autoComplete="current-password"
            value={pw.currentPassword}
            onChange={(e) => setPw((f) => ({ ...f, currentPassword: e.target.value }))}
          />
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            value={pw.newPassword}
            onChange={(e) => setPw((f) => ({ ...f, newPassword: e.target.value }))}
          />
          <Input
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            value={pw.confirm}
            error={pwError}
            onChange={(e) => setPw((f) => ({ ...f, confirm: e.target.value }))}
          />
          <Button type="submit" loading={changePassword.isPending} disabled={!pw.currentPassword || !pw.newPassword}>
            Update password
          </Button>
        </form>
      </Section>

      <Section title="Active sessions" description="Devices currently signed in to your account.">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl2" />
            ))}
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {sessions?.map((s) => (
              <li key={s.id} className="flex items-center gap-3.5 py-3">
                <span className="h-9 w-9 rounded-xl2 bg-surface-raised border border-line flex items-center justify-center text-ink-faint">
                  <MonitorSmartphone size={16} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-ink flex items-center gap-2">
                    {describeAgent(s.userAgent)}
                    {s.current && <Badge tone="green">this device</Badge>}
                  </p>
                  <p className="text-[11px] text-ink-faint mt-0.5">
                    {s.ip || 'unknown IP'} · active {timeAgo(s.lastActiveAt)}
                  </p>
                </div>
                {!s.current && (
                  <Button size="sm" variant="ghost" onClick={() => revoke.mutate(s.id)}>
                    Revoke
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

// ------------------------------------------------------------------- accounts

function ConnectedAccounts() {
  const user = useAuthStore((s) => s.user)!;
  const { data: providers } = useQuery({
    queryKey: ['oauth-providers'],
    queryFn: async () => (await api.get<{ github: boolean; google: boolean }>('/auth/oauth/providers')).data,
    staleTime: Infinity,
  });

  const rows: Array<{ id: 'github' | 'google'; name: string }> = [
    { id: 'github', name: 'GitHub' },
    { id: 'google', name: 'Google' },
  ];

  return (
    <Section title="Connected accounts" description="Sign in with a single click once linked.">
      <div className="divide-y divide-line">
        {rows.map((p) => {
          const linked = user.connected[p.id];
          const available = providers?.[p.id];
          return (
            <SettingRow
              key={p.id}
              label={p.name}
              description={
                linked ? 'Connected' : available ? 'Not connected' : 'Not configured on this server'
              }
              control={
                linked ? (
                  <Badge tone="green">
                    <Link2 size={11} />
                    linked
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!available}
                    onClick={() => {
                      window.location.href = `/api/auth/oauth/${p.id}`;
                    }}
                  >
                    Connect
                  </Button>
                )
              }
            />
          );
        })}
      </div>
    </Section>
  );
}

// ----------------------------------------------------------------------- page

const tabs = [
  { to: 'profile', label: 'Profile', icon: <UserIcon size={15} /> },
  { to: 'editor', label: 'Editor', icon: <Code2 size={15} /> },
  { to: 'notifications', label: 'Notifications', icon: <Bell size={15} /> },
  { to: 'security', label: 'Security', icon: <ShieldCheck size={15} /> },
  { to: 'accounts', label: 'Connected accounts', icon: <Link2 size={15} /> },
];

export default function SettingsPage() {
  // Re-sync local forms if the user object changes identity (e.g. OAuth link return).
  const user = useAuthStore((s) => s.user);
  useEffect(() => {}, [user?.id]);

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-[22px] font-bold tracking-tight text-ink">Settings</h1>
        <div className="mt-6 grid gap-8 md:grid-cols-[200px_1fr] items-start">
          <nav className="flex md:flex-col gap-1 overflow-x-auto">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-xl2 text-[13px] font-medium whitespace-nowrap transition-colors',
                    isActive ? 'bg-surface-raised text-ink border border-line' : 'text-ink-dim hover:text-ink hover:bg-white/[0.04]'
                  )
                }
              >
                {t.icon}
                {t.label}
              </NavLink>
            ))}
          </nav>
          <div>
            <Routes>
              <Route index element={<Navigate to="profile" replace />} />
              <Route path="profile" element={<ProfileSettings />} />
              <Route path="editor" element={<EditorSettingsPane />} />
              <Route path="notifications" element={<NotificationSettings />} />
              <Route path="security" element={<SecuritySettings />} />
              <Route path="accounts" element={<ConnectedAccounts />} />
              <Route path="*" element={<Navigate to="profile" replace />} />
            </Routes>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
