import { GitBranch, Cpu, MemoryStick, Users, Wifi, WifiOff, CheckCircle2, CircleDashed } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useIdeStore } from '@/stores/ideStore';
import { fileMeta } from '../lib/languages';
import { useCollab } from '../collab/CollabProvider';
import type { ContainerControls } from '../lib/useContainer';
import type { GitStatus } from '@/types';

export function StatusBar({ projectId, container }: { projectId: string; container: ContainerControls }) {
  const { activePath, dirty, setSidebarPanel } = useIdeStore();
  const { joined, presence } = useCollab();

  const { data: git } = useQuery({
    queryKey: ['git-status', projectId],
    queryFn: async () => (await api.get<GitStatus>(`/projects/${projectId}/git/status`)).data,
    refetchInterval: 20_000,
  });

  const changeCount =
    (git?.modified?.length ?? 0) + (git?.untracked?.length ?? 0) + (git?.deleted?.length ?? 0) + (git?.staged?.length ?? 0);
  const isDirty = activePath ? dirty.has(activePath) : false;

  return (
    <footer className="h-[26px] flex items-center gap-1 px-2 bg-surface border-t border-line text-[11px] text-ink-faint shrink-0 select-none">
      {git?.initialized && (
        <button
          onClick={() => setSidebarPanel('git')}
          className="flex items-center gap-1.5 px-2 h-full hover:bg-white/[0.05] hover:text-ink-dim transition-colors"
          title="Source control"
        >
          <GitBranch size={11} />
          {git.branch}
          {changeCount > 0 && <span className="text-warn">●{changeCount}</span>}
        </button>
      )}

      {container.running && container.stats && (
        <span className="flex items-center gap-3 px-2" title="Container resources">
          <span className="flex items-center gap-1">
            <Cpu size={11} />
            {container.stats.cpuPercent.toFixed(0)}%
          </span>
          <span className="flex items-center gap-1">
            <MemoryStick size={11} />
            {container.stats.memoryUsedMb.toFixed(0)}/{container.stats.memoryLimitMb.toFixed(0)} MB
          </span>
        </span>
      )}

      <div className="flex-1" />

      <span className="flex items-center gap-1.5 px-2" title={isDirty ? 'Saving…' : 'All changes saved'}>
        {isDirty ? <CircleDashed size={11} className="animate-spin" /> : <CheckCircle2 size={11} className="text-good/80" />}
        {isDirty ? 'Saving…' : 'Saved'}
      </span>

      {presence.length > 1 && (
        <button
          onClick={() => setSidebarPanel('chat')}
          className="flex items-center gap-1.5 px-2 h-full hover:bg-white/[0.05] hover:text-ink-dim transition-colors"
          title="Collaborators online"
        >
          <Users size={11} />
          {presence.length}
        </button>
      )}

      {activePath && <span className="px-2">{fileMeta(activePath).label}</span>}

      <span
        className="flex items-center gap-1.5 px-2"
        title={joined ? 'Realtime sync connected' : 'Reconnecting…'}
      >
        {joined ? <Wifi size={11} className="text-good/80" /> : <WifiOff size={11} className="text-warn" />}
      </span>
    </footer>
  );
}
