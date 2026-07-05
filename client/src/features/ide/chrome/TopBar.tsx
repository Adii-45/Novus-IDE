import { Link, useNavigate } from 'react-router-dom';
import { Play, Square, RotateCw, Globe, Settings2, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIdeStore } from '@/stores/ideStore';
import { LogoMark } from '@/components/ui/Logo';
import { AvatarStack } from '@/components/ui/Avatar';
import { Tooltip, Badge } from '@/components/ui/misc';
import { Spinner } from '@/components/ui/Spinner';
import { useCollab } from '../collab/CollabProvider';
import type { ContainerControls } from '../lib/useContainer';
import type { Project } from '@/types';

const stateTone: Record<string, 'green' | 'amber' | 'red' | 'default'> = {
  running: 'green',
  restarting: 'amber',
  paused: 'amber',
  exited: 'default',
  dead: 'red',
  created: 'default',
  none: 'default',
};

export function TopBar({
  project,
  container,
  readOnly,
}: {
  project: Project;
  container: ContainerControls;
  readOnly: boolean;
}) {
  const navigate = useNavigate();
  const { previewVisible, togglePreview } = useIdeStore();
  const { presence } = useCollab();
  const state = container.status?.state ?? 'none';
  const busy = container.start.isPending || container.stop.isPending || container.restart.isPending;
  const dockerMissing = container.status && container.status.dockerAvailable === false;

  return (
    <header className="h-11 flex items-center gap-3 px-3 bg-surface border-b border-line shrink-0">
      <Tooltip label="Back to dashboard" side="bottom">
        <Link
          to="/dashboard"
          className="flex items-center gap-1 group"
          aria-label="Back to dashboard"
        >
          <ChevronLeft size={15} className="text-ink-faint group-hover:text-ink transition-colors" />
          <LogoMark className="h-6 w-6" />
        </Link>
      </Tooltip>

      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[13px] font-semibold text-ink truncate">{project.name}</span>
        {readOnly && <Badge tone="amber">viewer</Badge>}
        {dockerMissing && (
          <Tooltip label="Docker isn't available on the server — terminals run as local shells" side="bottom">
            <span>
              <Badge tone="amber">no docker</Badge>
            </span>
          </Tooltip>
        )}
      </div>

      <div className="flex-1" />

      {/* -------------------------------------------------------- presence */}
      {presence.length > 0 && (
        <AvatarStack users={presence.map((p) => ({ name: p.name, avatarColor: p.avatarColor }))} max={4} size="xs" />
      )}

      {/* ------------------------------------------------------- container */}
      <div className="flex items-center gap-1 pl-2 border-l border-line">
        <Badge tone={stateTone[state] ?? 'default'} className="capitalize mr-1">
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              state === 'running' ? 'bg-good animate-pulse' : state === 'restarting' ? 'bg-warn' : 'bg-ink-faint'
            )}
          />
          {state === 'none' ? 'no container' : state}
        </Badge>
        {!readOnly &&
          (busy ? (
            <span className="p-1.5">
              <Spinner className="h-3.5 w-3.5 text-primary" />
            </span>
          ) : state === 'running' ? (
            <>
              <Tooltip label="Restart container" side="bottom">
                <button
                  onClick={() => container.restart.mutate()}
                  className="p-1.5 rounded-md text-ink-faint hover:text-warn hover:bg-warn/10 transition-colors"
                  aria-label="Restart container"
                >
                  <RotateCw size={14} />
                </button>
              </Tooltip>
              <Tooltip label="Stop container" side="bottom">
                <button
                  onClick={() => container.stop.mutate()}
                  className="p-1.5 rounded-md text-ink-faint hover:text-bad hover:bg-bad/10 transition-colors"
                  aria-label="Stop container"
                >
                  <Square size={13} />
                </button>
              </Tooltip>
            </>
          ) : (
            <Tooltip label={dockerMissing ? 'Docker unavailable' : 'Start container'} side="bottom">
              <button
                onClick={() => container.start.mutate()}
                disabled={Boolean(dockerMissing)}
                className="p-1.5 rounded-md text-good hover:bg-good/10 transition-colors disabled:opacity-40"
                aria-label="Start container"
              >
                <Play size={14} fill="currentColor" />
              </button>
            </Tooltip>
          ))}
      </div>

      <div className="flex items-center gap-0.5 pl-2 border-l border-line">
        <Tooltip label="Toggle live preview" side="bottom">
          <button
            onClick={togglePreview}
            aria-pressed={previewVisible}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              previewVisible ? 'text-primary bg-primary-soft' : 'text-ink-faint hover:text-ink hover:bg-white/[0.06]'
            )}
            aria-label="Toggle preview"
          >
            <Globe size={14} />
          </button>
        </Tooltip>
        <Tooltip label="Project settings" side="bottom">
          <button
            onClick={() => navigate(`/project/${project.id}/settings`)}
            className="p-1.5 rounded-md text-ink-faint hover:text-ink hover:bg-white/[0.06] transition-colors"
            aria-label="Project settings"
          >
            <Settings2 size={14} />
          </button>
        </Tooltip>
      </div>
    </header>
  );
}
