import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, GitBranch, Search, FolderOpen, Star, Users, Archive, Sparkles } from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useActivity, useProjects } from '@/lib/queries';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState, Skeleton } from '@/components/ui/misc';
import { ProjectCard } from '@/features/projects/ProjectCard';
import { CreateProjectModal } from '@/features/projects/CreateProjectModal';
import { ImportRepoModal } from '@/features/projects/ImportRepoModal';
import type { Project } from '@/types';

type Filter = 'all' | 'starred' | 'shared' | 'archived';

const filters: Array<{ id: Filter; label: string; icon: React.ReactNode }> = [
  { id: 'all', label: 'All', icon: <FolderOpen size={14} /> },
  { id: 'starred', label: 'Starred', icon: <Star size={14} /> },
  { id: 'shared', label: 'Shared', icon: <Users size={14} /> },
  { id: 'archived', label: 'Archived', icon: <Archive size={14} /> },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Burning the midnight oil';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function ActivityFeed() {
  const { data, isLoading } = useActivity();

  const actionLabel: Record<string, string> = {
    'project.created': 'created',
    'project.renamed': 'renamed',
    'project.duplicated': 'duplicated',
    'project.deleted': 'deleted',
    'project.imported': 'imported',
    'member.added': 'added a member to',
    'member.invited': 'invited someone to',
    'git.commit': 'committed to',
  };

  return (
    <aside className="card p-5">
      <h2 className="text-[13px] font-semibold text-ink mb-4 flex items-center gap-2">
        <Sparkles size={14} className="text-primary" />
        Recent activity
      </h2>
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-7 w-7 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-2.5 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : !data?.length ? (
        <p className="text-xs text-ink-faint leading-relaxed">
          Nothing yet. Create a project and your team&apos;s activity will show up here.
        </p>
      ) : (
        <ul className="space-y-4">
          {data.slice(0, 12).map((a) => (
            <li key={a.id} className="flex gap-3">
              <Avatar name={a.actor.name} color={a.actor.avatarColor} size="sm" className="mt-0.5" />
              <div className="min-w-0">
                <p className="text-[13px] text-ink-dim leading-snug">
                  <span className="font-medium text-ink">{a.actor.name}</span>{' '}
                  {actionLabel[a.action] ?? a.action.replace('.', ' ')}{' '}
                  <span className="font-medium text-ink">{a.projectName ?? a.detail}</span>
                </p>
                <p className="text-[11px] text-ink-faint mt-0.5">{timeAgo(a.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data: projects, isLoading } = useProjects();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const visible = useMemo(() => {
    let list: Project[] = projects ?? [];
    if (filter === 'starred') list = list.filter((p) => p.starred);
    else if (filter === 'shared') list = list.filter((p) => p.owner.id !== user?.id);
    else if (filter === 'archived') list = list.filter((p) => p.archived);
    else list = list.filter((p) => !p.archived);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }
    // pinned first, then most recently opened (server already sorts by lastOpenedAt)
    return [...list].sort((a, b) => Number(b.pinned) - Number(a.pinned));
  }, [projects, filter, query, user?.id]);

  return (
    <AppShell>
      {/* ---------------------------------------------------------- header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-ink">
            {greeting()}, {user?.name.split(' ')[0]}
          </h1>
          <p className="mt-1 text-sm text-ink-dim">Your workspaces, containers and collaborators in one place.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setShowImport(true)}>
            <GitBranch size={15} />
            Import repo
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            New project
          </Button>
        </div>
      </motion.div>

      {/* --------------------------------------------------------- toolbar */}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
          <input
            type="search"
            placeholder="Search projects…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3.5 rounded-xl2 bg-surface-raised border border-line-strong text-[13px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-primary/60 transition-colors"
          />
        </div>
        <div className="flex gap-1 p-1 rounded-xl2 bg-surface-raised border border-line">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 h-7 rounded-lg text-[12px] font-medium transition-colors',
                filter === f.id ? 'bg-surface-overlay text-ink shadow-soft' : 'text-ink-faint hover:text-ink-dim'
              )}
            >
              {f.icon}
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ----------------------------------------------------------- body */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px] items-start">
        <div>
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[124px] rounded-xl3" />
              ))}
            </div>
          ) : !visible.length ? (
            <div className="card">
              <EmptyState
                icon={<FolderOpen size={20} />}
                title={query ? 'No matching projects' : filter === 'all' ? 'No projects yet' : `Nothing ${filter} yet`}
                description={
                  query
                    ? 'Try a different search term.'
                    : 'Spin up a template or import a repository — a real container comes with it.'
                }
                action={
                  !query && filter === 'all' ? (
                    <Button onClick={() => setShowCreate(true)}>
                      <Plus size={16} />
                      Create your first project
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {visible.map((p, i) => (
                <ProjectCard key={p.id} project={p} index={i} />
              ))}
            </div>
          )}
        </div>
        <ActivityFeed />
      </div>

      <CreateProjectModal open={showCreate} onClose={() => setShowCreate(false)} />
      <ImportRepoModal open={showImport} onClose={() => setShowImport(false)} />
    </AppShell>
  );
}
