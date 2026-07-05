import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import {
  Plus,
  X,
  TerminalSquare,
  AlertCircle,
  AlertTriangle,
  FileOutput,
  ChevronDown,
  Container,
  Laptop,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { createSocket } from '@/lib/socket';
import { useIdeStore, type DockTab } from '@/stores/ideStore';
import { Badge } from '@/components/ui/misc';
import { monaco } from '../lib/monacoSetup';

// ------------------------------------------------------------ single xterm

function TerminalView({
  projectId,
  terminalId,
  visible,
  containerRunning,
}: {
  projectId: string;
  terminalId: string;
  visible: boolean;
  containerRunning: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [runtime, setRuntime] = useState<'docker' | 'local' | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const term = new Terminal({
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 12.5,
      lineHeight: 1.35,
      cursorBlink: true,
      allowProposedApi: true,
      scrollback: 5000,
      theme: {
        background: '#0A101F',
        foreground: '#D6DDF0',
        cursor: '#60A5FA',
        cursorAccent: '#0A101F',
        selectionBackground: '#25498055',
        black: '#131C30',
        red: '#F87171',
        green: '#34D399',
        yellow: '#FBBF24',
        blue: '#60A5FA',
        magenta: '#A78BFA',
        cyan: '#22D3EE',
        white: '#D6DDF0',
        brightBlack: '#5D6A8A',
        brightRed: '#FCA5A5',
        brightGreen: '#6EE7B7',
        brightYellow: '#FDE68A',
        brightBlue: '#93C5FD',
        brightMagenta: '#C4B5FD',
        brightCyan: '#67E8F9',
        brightWhite: '#F1F5FB',
      },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.loadAddon(new WebLinksAddon());
    term.open(host);
    fit.fit();

    const socket = createSocket('/terminal');
    const attach = () => {
      socket.emit('attach', { projectId, terminalId, cols: term.cols, rows: term.rows });
    };
    socket.on('connect', attach);
    socket.on('attached', ({ runtime: rt }: { runtime: 'docker' | 'local' }) => {
      term.clear();
      setRuntime(rt);
    });
    socket.on('data', (data: string) => term.write(data));
    socket.on('term:error', (msg: string) => term.writeln(`\x1b[31m${msg}\x1b[0m`));
    socket.on('exit', () => term.writeln('\r\n\x1b[33m[process exited]\x1b[0m'));

    const dataSub = term.onData((data) => socket.emit('input', data));
    const resizeSub = term.onResize(({ cols, rows }) => socket.emit('resize', { cols, rows }));

    const observer = new ResizeObserver(() => {
      if (host.clientWidth > 0 && host.clientHeight > 0) fit.fit();
    });
    observer.observe(host);

    return () => {
      observer.disconnect();
      dataSub.dispose();
      resizeSub.dispose();
      socket.disconnect();
      term.dispose();
    };
    // containerRunning is intentionally part of the deps: when the container
    // starts/stops we re-attach so the shell moves into/out of Docker.
  }, [projectId, terminalId, containerRunning]);

  return (
    <div className={cn('absolute inset-0 flex flex-col', !visible && 'invisible')}>
      <div ref={hostRef} className="terminal-host flex-1 min-h-0" />
      {runtime && (
        <div className="absolute top-1.5 right-3 pointer-events-none">
          <Badge tone={runtime === 'docker' ? 'blue' : 'amber'}>
            {runtime === 'docker' ? <Container size={10} /> : <Laptop size={10} />}
            {runtime === 'docker' ? 'container' : 'local shell'}
          </Badge>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- problems

interface Problem {
  path: string;
  message: string;
  severity: number;
  line: number;
  column: number;
}

function ProblemsView() {
  const openFile = useIdeStore((s) => s.openFile);
  const [problems, setProblems] = useState<Problem[]>([]);

  useEffect(() => {
    const collect = () => {
      const markers = monaco.editor.getModelMarkers({});
      setProblems(
        markers
          .filter((m) => m.severity >= monaco.MarkerSeverity.Warning)
          .map((m) => ({
            path: m.resource.path.replace(/^\//, ''),
            message: m.message,
            severity: m.severity,
            line: m.startLineNumber,
            column: m.startColumn,
          }))
      );
    };
    collect();
    const sub = monaco.editor.onDidChangeMarkers(collect);
    return () => sub.dispose();
  }, []);

  if (!problems.length) {
    return <p className="px-4 py-4 text-[12.5px] text-ink-faint">No problems detected in open files 🎉</p>;
  }
  return (
    <div className="overflow-y-auto h-full py-1">
      {problems.map((p, i) => (
        <button
          key={i}
          onClick={() => openFile(p.path)}
          className="w-full flex items-start gap-2.5 px-4 py-1.5 text-left hover:bg-white/[0.03] transition-colors"
        >
          {p.severity === monaco.MarkerSeverity.Error ? (
            <AlertCircle size={13} className="text-bad mt-0.5 shrink-0" />
          ) : (
            <AlertTriangle size={13} className="text-warn mt-0.5 shrink-0" />
          )}
          <span className="text-[12.5px] text-ink-dim leading-snug">
            {p.message}
            <span className="text-ink-faint ml-2 font-mono text-[11px]">
              {p.path}:{p.line}:{p.column}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ output

function OutputView({ projectId, containerRunning }: { projectId: string; containerRunning: boolean }) {
  const { data, refetch, isFetching } = useQuery({
    queryKey: ['container-logs', projectId],
    queryFn: async () => (await api.get<{ logs: string }>(`/projects/${projectId}/container/logs`)).data.logs,
    enabled: containerRunning,
    refetchInterval: containerRunning ? 5000 : false,
  });
  const scrollRef = useRef<HTMLPreElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [data]);

  return (
    <div className="relative h-full">
      <pre
        ref={scrollRef}
        className="h-full overflow-auto px-4 py-3 text-[12px] font-mono text-ink-dim leading-relaxed whitespace-pre-wrap"
      >
        {containerRunning ? data || 'No container output yet.' : 'Start the container to stream its logs here.'}
      </pre>
      {containerRunning && (
        <button
          title="Refresh logs"
          onClick={() => refetch()}
          className="absolute top-2 right-3 p-1.5 rounded-md text-ink-faint hover:text-ink hover:bg-white/[0.06] transition-colors"
        >
          <RefreshCw size={12} className={cn(isFetching && 'animate-spin')} />
        </button>
      )}
    </div>
  );
}

// -------------------------------------------------------------------- dock

export function TerminalDock({
  projectId,
  readOnly,
  containerRunning,
}: {
  projectId: string;
  readOnly: boolean;
  containerRunning: boolean;
}) {
  const { dockTab, setDockTab, toggleDock, terminalIds, activeTerminalId, addTerminal, removeTerminal, setActiveTerminal } =
    useIdeStore();

  const tabs = useMemo(
    () =>
      [
        { id: 'terminal' as DockTab, label: 'Terminal', icon: <TerminalSquare size={13} />, hidden: readOnly },
        { id: 'problems' as DockTab, label: 'Problems', icon: <AlertCircle size={13} /> },
        { id: 'output' as DockTab, label: 'Output', icon: <FileOutput size={13} /> },
      ].filter((t) => !t.hidden),
    [readOnly]
  );

  const activeTab = readOnly && dockTab === 'terminal' ? 'problems' : dockTab;

  return (
    <div className="flex flex-col h-full bg-[#0A101F] border-t border-line">
      <div className="flex items-center h-8 px-2 gap-1 border-b border-line shrink-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setDockTab(t.id)}
            className={cn(
              'flex items-center gap-1.5 h-6 px-2.5 rounded-md text-[11.5px] font-medium transition-colors',
              activeTab === t.id ? 'bg-white/[0.07] text-ink' : 'text-ink-faint hover:text-ink-dim'
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}

        {activeTab === 'terminal' && !readOnly && (
          <div className="flex items-center gap-1 ml-3">
            {terminalIds.map((id, i) => (
              <div
                key={id}
                className={cn(
                  'group flex items-center gap-1 h-6 pl-2 pr-1 rounded-md text-[11px] cursor-pointer transition-colors',
                  id === activeTerminalId ? 'bg-primary-soft text-primary' : 'text-ink-faint hover:text-ink-dim'
                )}
                onClick={() => setActiveTerminal(id)}
              >
                zsh {i + 1}
                {terminalIds.length > 1 && (
                  <button
                    aria-label="Close terminal"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTerminal(id);
                    }}
                    className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-white/[0.1] transition-all"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            ))}
            <button
              title="New terminal"
              onClick={addTerminal}
              className="p-1 rounded-md text-ink-faint hover:text-ink hover:bg-white/[0.06] transition-colors"
            >
              <Plus size={13} />
            </button>
          </div>
        )}

        <button
          title="Hide panel"
          onClick={toggleDock}
          className="ml-auto p-1 rounded-md text-ink-faint hover:text-ink hover:bg-white/[0.06] transition-colors"
        >
          <ChevronDown size={14} />
        </button>
      </div>

      <div className="flex-1 min-h-0 relative">
        {/* Terminals stay mounted so their sessions survive tab switches. */}
        {!readOnly &&
          terminalIds.map((id) => (
            <TerminalView
              key={id}
              projectId={projectId}
              terminalId={id}
              visible={activeTab === 'terminal' && id === activeTerminalId}
              containerRunning={containerRunning}
            />
          ))}
        {activeTab === 'problems' && (
          <div className="absolute inset-0">
            <ProblemsView />
          </div>
        )}
        {activeTab === 'output' && (
          <div className="absolute inset-0">
            <OutputView projectId={projectId} containerRunning={containerRunning} />
          </div>
        )}
      </div>
    </div>
  );
}
