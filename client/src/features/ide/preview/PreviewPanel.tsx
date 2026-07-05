import { useMemo, useState } from 'react';
import { RefreshCw, ExternalLink, Monitor, Tablet, Smartphone, X, Globe, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIdeStore } from '@/stores/ideStore';
import { EmptyState } from '@/components/ui/misc';
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@/components/ui/Dropdown';
import type { ContainerStatus } from '@/types';

type Size = 'full' | 'tablet' | 'mobile';

const sizeMeta: Record<Size, { icon: React.ReactNode; width?: number; label: string }> = {
  full: { icon: <Monitor size={13} />, label: 'Responsive' },
  tablet: { icon: <Tablet size={13} />, width: 768, label: 'Tablet · 768px' },
  mobile: { icon: <Smartphone size={13} />, width: 390, label: 'Mobile · 390px' },
};

export function PreviewPanel({ status }: { status: ContainerStatus | undefined }) {
  const togglePreview = useIdeStore((s) => s.togglePreview);
  const [reloadKey, setReloadKey] = useState(0);
  const [size, setSize] = useState<Size>('full');

  const running = status?.state === 'running';
  const ports = useMemo(() => {
    const map = status?.portMap ?? {};
    // container port -> host port, sorted for stable order
    return Object.entries(map)
      .map(([containerPort, hostPort]) => ({ containerPort: Number(containerPort), hostPort: Number(hostPort) }))
      .filter((p) => p.hostPort > 0)
      .sort((a, b) => a.containerPort - b.containerPort);
  }, [status?.portMap]);

  const [selectedPort, setSelectedPort] = useState<number | null>(null);
  const activePort = selectedPort ?? ports[0]?.hostPort ?? null;
  const activeContainerPort = ports.find((p) => p.hostPort === activePort)?.containerPort;
  const url = activePort ? `http://localhost:${activePort}` : null;

  return (
    <div className="flex flex-col h-full bg-[#0A101F] border-l border-line">
      {/* -------------------------------------------------------- toolbar */}
      <div className="flex items-center gap-1 h-9 px-2 border-b border-line shrink-0">
        <Globe size={13} className="text-primary ml-1" />
        <span className="text-[11.5px] font-semibold text-ink mr-1">Preview</span>

        {ports.length > 0 && (
          <Dropdown>
            <DropdownTrigger>
              <button className="flex items-center gap-1 h-6 px-2 rounded-md bg-surface-raised border border-line text-[11px] font-mono text-ink-dim hover:text-ink transition-colors">
                :{activeContainerPort}
                <ChevronDown size={11} />
              </button>
            </DropdownTrigger>
            <DropdownMenu align="start" className="min-w-[150px]">
              {ports.map((p) => (
                <DropdownItem key={p.hostPort} onClick={() => setSelectedPort(p.hostPort)}>
                  <span className="font-mono text-[12px]">
                    :{p.containerPort} → localhost:{p.hostPort}
                  </span>
                </DropdownItem>
              ))}
            </DropdownMenu>
          </Dropdown>
        )}

        <div className="ml-auto flex items-center gap-0.5">
          {(Object.keys(sizeMeta) as Size[]).map((s) => (
            <button
              key={s}
              title={sizeMeta[s].label}
              aria-pressed={size === s}
              onClick={() => setSize(s)}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                size === s ? 'text-primary bg-primary-soft' : 'text-ink-faint hover:text-ink'
              )}
            >
              {sizeMeta[s].icon}
            </button>
          ))}
          <span className="w-px h-4 bg-line mx-1" />
          <button
            title="Reload preview"
            onClick={() => setReloadKey((k) => k + 1)}
            className="p-1.5 rounded-md text-ink-faint hover:text-ink hover:bg-white/[0.06] transition-colors"
          >
            <RefreshCw size={13} />
          </button>
          <button
            title="Open in new tab"
            onClick={() => url && window.open(url, '_blank')}
            disabled={!url}
            className="p-1.5 rounded-md text-ink-faint hover:text-ink hover:bg-white/[0.06] transition-colors disabled:opacity-40"
          >
            <ExternalLink size={13} />
          </button>
          <button
            title="Close preview"
            onClick={togglePreview}
            className="p-1.5 rounded-md text-ink-faint hover:text-ink hover:bg-white/[0.06] transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* --------------------------------------------------------- content */}
      <div className="flex-1 min-h-0 grid place-items-center bg-[#070B16] overflow-hidden">
        {!running || !url ? (
          <EmptyState
            icon={<Globe size={18} />}
            title={running ? 'No exposed ports' : 'Container not running'}
            description={
              running
                ? 'Run a dev server on port 3000, 5173, 8000 or 8080 inside the terminal and it will appear here.'
                : 'Start the container, then run your dev server in the terminal (e.g. npm run dev).'
            }
          />
        ) : (
          <div
            className={cn('h-full transition-all duration-300', size === 'full' ? 'w-full' : 'py-4')}
            style={size !== 'full' ? { width: sizeMeta[size].width } : undefined}
          >
            <iframe
              key={reloadKey}
              src={url}
              title="Live preview"
              className={cn('w-full h-full bg-white', size !== 'full' && 'rounded-xl2 border border-line-strong shadow-card')}
              sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
            />
          </div>
        )}
      </div>
    </div>
  );
}
