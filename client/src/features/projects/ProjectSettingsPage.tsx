import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Trash2, UserPlus, X, Archive, ArchiveRestore } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { timeAgo } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useDeleteProject, useProject, useUpdateProject } from '@/lib/queries';
import { toast } from '@/stores/toastStore';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { Badge, Skeleton } from '@/components/ui/misc';
import { Modal } from '@/components/ui/Modal';
import type { ProjectRole } from '@/types';

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="card p-6">
      <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
      {description && <p className="mt-1 text-[13px] text-ink-dim">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function RoleSelect({
  value,
  onChange,
  disabled,
}: {
  value: Exclude<ProjectRole, 'owner'>;
  onChange: (role: 'editor' | 'viewer') => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as 'editor' | 'viewer')}
      className="h-8 px-2.5 rounded-lg bg-surface-raised border border-line-strong text-[12px] text-ink focus:outline-none focus:border-primary/60 disabled:opacity-50"
      aria-label="Member role"
    >
      <option value="editor">Editor</option>
      <option value="viewer">Viewer</option>
    </select>
  );
}

export default function ProjectSettingsPage() {
  const { projectId = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  const { data: project, isLoading } = useProject(projectId);
  const update = useUpdateProject(projectId);
  const del = useDeleteProject();

  const [form, setForm] = useState({ name: '', description: '' });
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteText, setDeleteText] = useState('');

  useEffect(() => {
    if (project) setForm({ name: project.name, description: project.description });
  }, [project]);

  const isOwner = project?.role === 'owner';

  const { data: invitations } = useQuery({
    queryKey: ['invitations', projectId],
    queryFn: async () =>
      (await api.get<Array<{ id: string; email: string; role: string; createdAt: string }>>(
        `/projects/${projectId}/invitations`
      )).data,
    enabled: Boolean(project) && isOwner,
  });

  const invite = useMutation({
    mutationFn: async (input: { email: string; role: 'editor' | 'viewer' }) =>
      (await api.post<{ status: 'added' | 'invited' }>(`/projects/${projectId}/members`, input)).data,
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      qc.invalidateQueries({ queryKey: ['invitations', projectId] });
      setInviteEmail('');
      toast.success(
        data.status === 'added' ? 'Member added' : 'Invitation sent',
        data.status === 'added' ? `${vars.email} can open the project now.` : `${vars.email} will join once they sign up.`
      );
    },
    onError: (err) => toast.error('Invite failed', apiErrorMessage(err)),
  });

  const changeRole = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: 'editor' | 'viewer' }) =>
      api.patch(`/projects/${projectId}/members/${memberId}`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project', projectId] }),
    onError: (err) => toast.error('Could not change role', apiErrorMessage(err)),
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => api.delete(`/projects/${projectId}/members/${memberId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project', projectId] }),
    onError: (err) => toast.error('Could not remove member', apiErrorMessage(err)),
  });

  const revokeInvite = useMutation({
    mutationFn: async (inviteId: string) => api.delete(`/projects/${projectId}/invitations/${inviteId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invitations', projectId] }),
  });

  const saveGeneral = (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    update.mutate(
      { name: form.name.trim(), description: form.description.trim() },
      { onSuccess: () => toast.success('Project updated') }
    );
  };

  if (isLoading || !project) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-64 rounded-xl3" />
          <Skeleton className="h-48 rounded-xl3" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-[13px] text-ink-dim hover:text-ink transition-colors"
        >
          <ArrowLeft size={14} />
          Dashboard
        </Link>
        <h1 className="mt-3 text-[22px] font-bold tracking-tight text-ink">{project.name} — settings</h1>

        <div className="mt-6 space-y-6">
          {/* --------------------------------------------------- general */}
          <Section title="General" description="Name and description are visible to every member.">
            <form onSubmit={saveGeneral} className="space-y-4">
              <Input
                label="Project name"
                value={form.name}
                disabled={!isOwner}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
              <Textarea
                label="Description"
                value={form.description}
                disabled={!isOwner}
                maxLength={300}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
              {isOwner && (
                <div className="flex justify-end">
                  <Button type="submit" loading={update.isPending}>
                    Save changes
                  </Button>
                </div>
              )}
            </form>
          </Section>

          {/* --------------------------------------------------- members */}
          <Section title="Members & permissions" description="Editors can change code and run the container. Viewers can read and chat.">
            {isOwner && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (inviteEmail.trim()) invite.mutate({ email: inviteEmail.trim(), role: inviteRole });
                }}
                className="flex gap-2.5 mb-5"
              >
                <div className="flex-1">
                  <Input
                    type="email"
                    placeholder="teammate@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    aria-label="Invite by email"
                  />
                </div>
                <RoleSelect value={inviteRole} onChange={setInviteRole} />
                <Button type="submit" loading={invite.isPending}>
                  <UserPlus size={15} />
                  Invite
                </Button>
              </form>
            )}

            <ul className="divide-y divide-line">
              {project.members.map((m) => (
                <li key={m.id} className="flex items-center gap-3 py-3">
                  <Avatar name={m.name ?? 'Unknown'} color={m.avatarColor} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-ink truncate">
                      {m.name} {m.id === userId && <span className="text-ink-faint font-normal">(you)</span>}
                    </p>
                    <p className="text-[11px] text-ink-faint truncate">{m.email}</p>
                  </div>
                  {m.role === 'owner' ? (
                    <Badge tone="blue">owner</Badge>
                  ) : isOwner ? (
                    <>
                      <RoleSelect
                        value={m.role as 'editor' | 'viewer'}
                        onChange={(role) => changeRole.mutate({ memberId: m.id, role })}
                      />
                      <button
                        aria-label={`Remove ${m.name}`}
                        onClick={() => removeMember.mutate(m.id)}
                        className="p-1.5 rounded-lg text-ink-faint hover:text-bad hover:bg-bad/10 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <Badge>{m.role}</Badge>
                  )}
                </li>
              ))}
            </ul>

            {Boolean(invitations?.length) && (
              <>
                <p className="mt-4 mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                  Pending invitations
                </p>
                <ul className="divide-y divide-line">
                  {invitations!.map((inv) => (
                    <li key={inv.id} className="flex items-center gap-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-ink-dim truncate">{inv.email}</p>
                        <p className="text-[11px] text-ink-faint">
                          {inv.role} · invited {timeAgo(inv.createdAt)}
                        </p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => revokeInvite.mutate(inv.id)}>
                        Revoke
                      </Button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Section>

          {/* ----------------------------------------------- danger zone */}
          {isOwner && (
            <section className="rounded-xl3 border border-bad/25 bg-bad/[0.04] p-6">
              <h2 className="text-[15px] font-semibold text-bad">Danger zone</h2>
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[13px] font-medium text-ink">{project.archived ? 'Unarchive project' : 'Archive project'}</p>
                    <p className="text-xs text-ink-dim mt-0.5">
                      Archived projects are hidden from the dashboard but keep all files.
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={update.isPending}
                    onClick={() => update.mutate({ archived: !project.archived })}
                  >
                    {project.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                    {project.archived ? 'Unarchive' : 'Archive'}
                  </Button>
                </div>
                <div className="h-px bg-bad/15" />
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[13px] font-medium text-ink">Delete project</p>
                    <p className="text-xs text-ink-dim mt-0.5">Removes the workspace, files and container permanently.</p>
                  </div>
                  <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
                    <Trash2 size={14} />
                    Delete
                  </Button>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete project" description="This action cannot be undone.">
        <p className="text-sm text-ink-dim leading-relaxed">
          Type <span className="font-mono font-semibold text-ink">{project.name}</span> to confirm.
        </p>
        <div className="mt-3">
          <Input value={deleteText} onChange={(e) => setDeleteText(e.target.value)} placeholder={project.name} />
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={deleteText !== project.name}
            loading={del.isPending}
            onClick={async () => {
              await del.mutateAsync(project.id);
              toast.success('Project deleted');
              navigate('/dashboard');
            }}
          >
            Delete forever
          </Button>
        </div>
      </Modal>
    </AppShell>
  );
}
