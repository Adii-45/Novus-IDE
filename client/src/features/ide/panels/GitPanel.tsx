import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DiffEditor } from '@monaco-editor/react';
import '../lib/monacoSetup';
import {
  GitBranch,
  GitCommitHorizontal,
  Plus,
  Minus,
  Undo2,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  History,
  Check,
  FileCode2,
} from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';
import { api, apiErrorMessage } from '@/lib/api';
import { toast } from '@/stores/toastStore';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState, Badge } from '@/components/ui/misc';
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, DropdownSeparator } from '@/components/ui/Dropdown';
import { fileMeta } from '../lib/languages';
import type { GitCommit, GitStatus } from '@/types';

function useGit(projectId: string) {
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['git-status', projectId] });
    qc.invalidateQueries({ queryKey: ['git-log', projectId] });
  };
  const onError = (err: unknown) => toast.error('Git error', apiErrorMessage(err));
  const post = (path: string) => async (body?: unknown) => (await api.post(`/projects/${projectId}/git/${path}`, body)).data;

  return {
    refresh,
    init: useMutation({ mutationFn: () => post('init')(), onSuccess: refresh, onError }),
    stage: useMutation({ mutationFn: (paths: string[]) => post('stage')({ paths }), onSuccess: refresh, onError }),
    unstage: useMutation({ mutationFn: (paths: string[]) => post('unstage')({ paths }), onSuccess: refresh, onError }),
    discard: useMutation({
      mutationFn: (paths: string[]) => post('discard')({ paths }),
      onSuccess: () => {
        refresh();
        qc.invalidateQueries({ queryKey: ['tree', projectId] });
      },
      onError,
    }),
    commit: useMutation({
      mutationFn: (message: string) => post('commit')({ message }),
      onSuccess: (data: { hash?: string }) => {
        refresh();
        toast.success('Committed', data.hash ? `→ ${data.hash.slice(0, 7)}` : undefined);
      },
      onError,
    }),
    push: useMutation({
      mutationFn: () => post('push')(),
      onSuccess: () => {
        refresh();
        toast.success('Pushed to remote');
      },
      onError,
    }),
    pull: useMutation({
      mutationFn: () => post('pull')(),
      onSuccess: () => {
        refresh();
        qc.invalidateQueries({ queryKey: ['tree', projectId] });
        toast.success('Pulled latest changes');
      },
      onError,
    }),
    checkout: useMutation({
      mutationFn: (input: { branch: string; create?: boolean }) => post('checkout')(input),
      onSuccess: () => {
        refresh();
        qc.invalidateQueries({ queryKey: ['tree', projectId] });
      },
      onError,
    }),
  };
}

function DiffModal({
  projectId,
  path,
  staged,
  onClose,
}: {
  projectId: string;
  path: string;
  staged: boolean;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['git-diff', projectId, path, staged],
    queryFn: async () => {
      const [diffRes, currentRes] = await Promise.all([
        api.get<{ diff: string; headContent: string }>(`/projects/${projectId}/git/diff`, {
          params: { path, staged: staged ? '1' : '0' },
        }),
        api
          .get<{ content: string; isBinary: boolean }>(`/projects/${projectId}/files/content`, { params: { path } })
          .catch(() => ({ data: { content: '', isBinary: false } })),
      ]);
      return { head: diffRes.data.headContent, current: currentRes.data.content };
    },
  });

  return (
    <Modal open onClose={onClose} title={path.split('/').pop()} description={path} className="max-w-5xl">
      <div className="h-[60vh] rounded-xl2 overflow-hidden border border-line">
        {isLoading || !data ? (
          <div className="h-full grid place-items-center">
            <Spinner className="h-5 w-5 text-ink-faint" />
          </div>
        ) : (
          <DiffEditor
            theme="novus-dark"
            language={fileMeta(path).lang}
            original={data.head}
            modified={data.current}
            options={{
              readOnly: true,
              renderSideBySide: true,
              minimap: { enabled: false },
              fontSize: 12.5,
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        )}
      </div>
    </Modal>
  );
}

function FileRow({
  path,
  tone,
  actions,
  onOpenDiff,
}: {
  path: string;
  tone: 'green' | 'amber' | 'red' | 'default';
  actions: Array<{ icon: React.ReactNode; label: string; onClick: () => void }>;
  onOpenDiff?: () => void;
}) {
  const meta = fileMeta(path);
  const letter = { green: 'A', amber: 'M', red: 'D', default: 'U' }[tone];
  const letterColor = {
    green: 'text-good',
    amber: 'text-warn',
    red: 'text-bad',
    default: 'text-ink-faint',
  }[tone];
  return (
    <div className="group flex items-center gap-2 px-2 py-1 rounded-md hover:bg-white/[0.04] transition-colors">
      <FileCode2 size={13} style={{ color: meta.color }} className="shrink-0" />
      <button
        onClick={onOpenDiff}
        disabled={!onOpenDiff}
        className="flex-1 min-w-0 text-left text-[12.5px] text-ink-dim hover:text-ink truncate transition-colors disabled:cursor-default"
        title={path}
      >
        {path}
      </button>
      <span className={cn('text-[10px] font-bold font-mono', letterColor)}>{letter}</span>
      <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
        {actions.map((a) => (
          <button
            key={a.label}
            title={a.label}
            aria-label={`${a.label} ${path}`}
            onClick={a.onClick}
            className="p-1 rounded text-ink-faint hover:text-ink hover:bg-white/[0.08] transition-colors"
          >
            {a.icon}
          </button>
        ))}
      </div>
    </div>
  );
}

export function GitPanel({ projectId, readOnly }: { projectId: string; readOnly: boolean }) {
  const git = useGit(projectId);
  const [message, setMessage] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [newBranch, setNewBranch] = useState('');
  const [diffTarget, setDiffTarget] = useState<{ path: string; staged: boolean } | null>(null);

  const { data: status, isLoading, isFetching } = useQuery({
    queryKey: ['git-status', projectId],
    queryFn: async () => (await api.get<GitStatus>(`/projects/${projectId}/git/status`)).data,
    refetchInterval: 20_000,
  });

  const { data: log } = useQuery({
    queryKey: ['git-log', projectId],
    queryFn: async () => (await api.get<GitCommit[]>(`/projects/${projectId}/git/log`, { params: { limit: 30 } })).data,
    enabled: Boolean(status?.initialized) && showHistory,
  });

  const unstaged = useMemo(() => {
    if (!status) return [] as Array<{ path: string; tone: 'green' | 'amber' | 'red' | 'default' }>;
    const staged = new Set(status.staged ?? []);
    const rows: Array<{ path: string; tone: 'green' | 'amber' | 'red' | 'default' }> = [];
    for (const p of status.modified ?? []) if (!staged.has(p)) rows.push({ path: p, tone: 'amber' });
    for (const p of status.deleted ?? []) if (!staged.has(p)) rows.push({ path: p, tone: 'red' });
    for (const p of status.untracked ?? []) rows.push({ path: p, tone: 'default' });
    return rows;
  }, [status]);

  const stagedRows = status?.staged ?? [];

  if (isLoading) {
    return (
      <div className="grid place-items-center h-full">
        <Spinner className="h-4 w-4 text-ink-faint" />
      </div>
    );
  }

  if (!status?.initialized) {
    return (
      <EmptyState
        icon={<GitBranch size={18} />}
        title="Not a git repository"
        description="Initialize git to track changes, commit and push from the IDE."
        action={
          !readOnly ? (
            <Button size="sm" loading={git.init.isPending} onClick={() => git.init.mutate()}>
              Initialize repository
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* ------------------------------------------------------------ header */}
      <div className="flex items-center justify-between px-3 h-9 shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Source control</span>
        <div className="flex items-center">
          <button
            title="Refresh"
            onClick={git.refresh}
            className="p-1.5 rounded-md text-ink-faint hover:text-ink hover:bg-white/[0.06] transition-colors"
          >
            <RefreshCw size={13} className={cn(isFetching && 'animate-spin')} />
          </button>
          <button
            title="History"
            aria-pressed={showHistory}
            onClick={() => setShowHistory((v) => !v)}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              showHistory ? 'text-primary bg-primary-soft' : 'text-ink-faint hover:text-ink hover:bg-white/[0.06]'
            )}
          >
            <History size={13} />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------ branch */}
      <div className="px-3 pb-2 flex items-center gap-2 shrink-0">
        <Dropdown className="flex-1 min-w-0">
          <DropdownTrigger>
            <button className="w-full flex items-center gap-2 h-8 px-2.5 rounded-lg bg-surface-raised border border-line-strong text-[12.5px] text-ink hover:border-primary/40 transition-colors">
              <GitBranch size={13} className="text-primary shrink-0" />
              <span className="truncate">{status.branch}</span>
              {(status.ahead ?? 0) > 0 && (
                <span className="flex items-center text-[10px] text-good">
                  <ArrowUp size={10} />
                  {status.ahead}
                </span>
              )}
              {(status.behind ?? 0) > 0 && (
                <span className="flex items-center text-[10px] text-warn">
                  <ArrowDown size={10} />
                  {status.behind}
                </span>
              )}
            </button>
          </DropdownTrigger>
          <DropdownMenu align="start" className="w-64 max-h-72 overflow-y-auto">
            {status.branches?.map((b) => (
              <DropdownItem
                key={b}
                icon={b === status.branch ? <Check size={13} /> : <GitBranch size={13} />}
                disabled={readOnly}
                onClick={() => b !== status.branch && git.checkout.mutate({ branch: b })}
              >
                {b}
              </DropdownItem>
            ))}
            {!readOnly && (
              <>
                <DropdownSeparator />
                <div className="px-2 py-1.5 flex gap-1.5">
                  <input
                    placeholder="new-branch-name"
                    value={newBranch}
                    onChange={(e) => setNewBranch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newBranch.trim()) {
                        git.checkout.mutate({ branch: newBranch.trim(), create: true });
                        setNewBranch('');
                      }
                    }}
                    className="flex-1 h-7 px-2 rounded-md bg-surface-raised border border-line-strong text-[12px] text-ink focus:outline-none focus:border-primary/60"
                    aria-label="New branch name"
                  />
                </div>
              </>
            )}
          </DropdownMenu>
        </Dropdown>
        {!readOnly && (
          <>
            <button
              title="Pull"
              onClick={() => git.pull.mutate()}
              disabled={git.pull.isPending}
              className="p-1.5 rounded-lg text-ink-faint hover:text-ink hover:bg-white/[0.06] transition-colors disabled:opacity-40"
            >
              {git.pull.isPending ? <Spinner className="h-3.5 w-3.5" /> : <ArrowDown size={14} />}
            </button>
            <button
              title="Push"
              onClick={() => git.push.mutate()}
              disabled={git.push.isPending}
              className="p-1.5 rounded-lg text-ink-faint hover:text-ink hover:bg-white/[0.06] transition-colors disabled:opacity-40"
            >
              {git.push.isPending ? <Spinner className="h-3.5 w-3.5" /> : <ArrowUp size={14} />}
            </button>
          </>
        )}
      </div>

      {showHistory ? (
        /* --------------------------------------------------------- history */
        <div className="flex-1 overflow-y-auto px-1.5 pb-6">
          {!log?.length ? (
            <p className="px-3 py-6 text-[12px] text-ink-faint">No commits yet.</p>
          ) : (
            log.map((c) => (
              <div key={c.hash} className="px-2 py-2 rounded-md hover:bg-white/[0.03] transition-colors">
                <div className="flex items-center gap-2">
                  <GitCommitHorizontal size={13} className="text-primary shrink-0" />
                  <p className="text-[12.5px] text-ink truncate flex-1">{c.message}</p>
                  <Badge className="font-mono">{c.shortHash}</Badge>
                </div>
                <p className="text-[11px] text-ink-faint mt-1 pl-5">
                  {c.author} · {timeAgo(c.date)}
                </p>
              </div>
            ))
          )}
        </div>
      ) : (
        <>
          {/* ---------------------------------------------------------- commit */}
          {!readOnly && (
            <div className="px-3 pb-2 shrink-0">
              <textarea
                placeholder={`Commit message (${status.branch})`}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && message.trim()) {
                    git.commit.mutate(message.trim(), { onSuccess: () => setMessage('') });
                  }
                }}
                rows={2}
                className="w-full p-2.5 rounded-lg bg-surface-raised border border-line-strong text-[12.5px] text-ink placeholder:text-ink-faint resize-none focus:outline-none focus:border-primary/60 transition-colors"
                aria-label="Commit message"
              />
              <Button
                size="sm"
                className="w-full mt-1.5"
                disabled={!message.trim() || !stagedRows.length}
                loading={git.commit.isPending}
                onClick={() => git.commit.mutate(message.trim(), { onSuccess: () => setMessage('') })}
              >
                <Check size={14} />
                Commit {stagedRows.length > 0 && `${stagedRows.length} file${stagedRows.length === 1 ? '' : 's'}`}
              </Button>
            </div>
          )}

          {/* --------------------------------------------------------- changes */}
          <div className="flex-1 overflow-y-auto px-1.5 pb-6">
            {Boolean(stagedRows.length) && (
              <>
                <div className="flex items-center justify-between px-2 pt-2 pb-1">
                  <span className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-faint">
                    Staged ({stagedRows.length})
                  </span>
                  {!readOnly && (
                    <button
                      onClick={() => git.unstage.mutate(stagedRows)}
                      className="text-[10.5px] text-ink-faint hover:text-ink transition-colors"
                    >
                      Unstage all
                    </button>
                  )}
                </div>
                {stagedRows.map((p) => (
                  <FileRow
                    key={p}
                    path={p}
                    tone="green"
                    onOpenDiff={() => setDiffTarget({ path: p, staged: true })}
                    actions={readOnly ? [] : [{ icon: <Minus size={12} />, label: 'Unstage', onClick: () => git.unstage.mutate([p]) }]}
                  />
                ))}
              </>
            )}
            <div className="flex items-center justify-between px-2 pt-3 pb-1">
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-faint">
                Changes ({unstaged.length})
              </span>
              {!readOnly && Boolean(unstaged.length) && (
                <button
                  onClick={() => git.stage.mutate(unstaged.map((r) => r.path))}
                  className="text-[10.5px] text-ink-faint hover:text-ink transition-colors"
                >
                  Stage all
                </button>
              )}
            </div>
            {!unstaged.length && !stagedRows.length && (
              <p className="px-3 py-4 text-[12px] text-ink-faint">Working tree clean ✨</p>
            )}
            {unstaged.map((row) => (
              <FileRow
                key={row.path}
                path={row.path}
                tone={row.tone}
                onOpenDiff={row.tone !== 'default' ? () => setDiffTarget({ path: row.path, staged: false }) : undefined}
                actions={
                  readOnly
                    ? []
                    : [
                        { icon: <Plus size={12} />, label: 'Stage', onClick: () => git.stage.mutate([row.path]) },
                        {
                          icon: <Undo2 size={12} />,
                          label: 'Discard changes',
                          onClick: () => git.discard.mutate([row.path]),
                        },
                      ]
                }
              />
            ))}
          </div>
        </>
      )}

      {diffTarget && (
        <DiffModal
          projectId={projectId}
          path={diffTarget.path}
          staged={diffTarget.staged}
          onClose={() => setDiffTarget(null)}
        />
      )}
    </div>
  );
}
