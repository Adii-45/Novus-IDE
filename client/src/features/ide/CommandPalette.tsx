import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import {
  Search,
  FileCode2,
  TerminalSquare,
  PanelLeft,
  PanelBottom,
  Globe,
  GitBranch,
  MessageSquare,
  LayoutGrid,
  FolderTree,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useIdeStore } from '@/stores/ideStore';
import { Kbd } from '@/components/ui/misc';
import { fileMeta } from './lib/languages';
import type { FileNode } from '@/types';

interface Command {
  id: string;
  label: string;
  icon: ReactNode;
  shortcut?: string;
  run: () => void;
}

function flattenFiles(nodes: FileNode[], out: string[] = []): string[] {
  for (const n of nodes) {
    if (n.type === 'file') out.push(n.path);
    if (n.children) flattenFiles(n.children, out);
  }
  return out;
}

/** Fuzzy-ish subsequence match with a naive score (lower = better). */
function fuzzyScore(query: string, target: string): number | null {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  let qi = 0;
  let score = 0;
  let last = -1;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      score += last >= 0 ? ti - last : ti;
      last = ti;
      qi++;
    }
  }
  return qi === q.length ? score + (t.length - q.length) : null;
}

export function CommandPalette({ projectId }: { projectId: string }) {
  const navigate = useNavigate();
  const store = useIdeStore();
  const mode = store.paletteOpen;
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Global shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        store.setPalette('commands');
      } else if (mod && !e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        store.setPalette('files');
      } else if (mod && e.key === 'b' && !e.shiftKey) {
        e.preventDefault();
        store.toggleSidebar();
      } else if (mod && e.key === 'j') {
        e.preventDefault();
        store.toggleDock();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mode) {
      setQuery('');
      setIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [mode]);

  const { data: tree } = useQuery({
    queryKey: ['tree', projectId],
    queryFn: async () => (await api.get<FileNode[]>(`/projects/${projectId}/files/tree`)).data,
    enabled: mode === 'files',
  });

  const commands: Command[] = useMemo(
    () => [
      { id: 'file.new', label: 'New terminal', icon: <TerminalSquare size={15} />, run: () => store.addTerminal() },
      { id: 'view.explorer', label: 'Show explorer', icon: <FolderTree size={15} />, run: () => store.setSidebarPanel('explorer') },
      { id: 'view.search', label: 'Search in files', icon: <Search size={15} />, run: () => store.setSidebarPanel('search') },
      { id: 'view.git', label: 'Show source control', icon: <GitBranch size={15} />, run: () => store.setSidebarPanel('git') },
      { id: 'view.chat', label: 'Show team chat', icon: <MessageSquare size={15} />, run: () => store.setSidebarPanel('chat') },
      { id: 'view.sidebar', label: 'Toggle sidebar', icon: <PanelLeft size={15} />, shortcut: '⌘B', run: store.toggleSidebar },
      { id: 'view.dock', label: 'Toggle bottom panel', icon: <PanelBottom size={15} />, shortcut: '⌘J', run: store.toggleDock },
      { id: 'view.preview', label: 'Toggle live preview', icon: <Globe size={15} />, run: store.togglePreview },
      { id: 'go.dashboard', label: 'Go to dashboard', icon: <LayoutGrid size={15} />, run: () => navigate('/dashboard') },
      { id: 'file.quickopen', label: 'Go to file…', icon: <Plus size={15} />, shortcut: '⌘P', run: () => store.setPalette('files') },
    ],
    [store, navigate]
  );

  const results = useMemo(() => {
    if (mode === 'files') {
      const files = tree ? flattenFiles(tree) : [];
      if (!query.trim()) return files.slice(0, 20).map((path) => ({ type: 'file' as const, path, score: 0 }));
      return files
        .map((path) => ({ type: 'file' as const, path, score: fuzzyScore(query, path) }))
        .filter((r): r is { type: 'file'; path: string; score: number } => r.score !== null)
        .sort((a, b) => a.score - b.score)
        .slice(0, 20);
    }
    if (!query.trim()) return commands.map((c) => ({ type: 'command' as const, command: c }));
    return commands
      .map((c) => ({ type: 'command' as const, command: c, score: fuzzyScore(query, c.label) }))
      .filter((r) => r.score !== null)
      .sort((a, b) => (a.score ?? 0) - (b.score ?? 0));
  }, [mode, query, tree, commands]);

  useEffect(() => setIndex(0), [query]);

  const select = (i: number) => {
    const r = results[i];
    if (!r) return;
    store.setPalette(false);
    if (r.type === 'file') store.openFile(r.path);
    else r.command.run();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      select(index);
    } else if (e.key === 'Escape') {
      store.setPalette(false);
    }
  };

  useEffect(() => {
    listRef.current?.children[index]?.scrollIntoView({ block: 'nearest' });
  }, [index]);

  return createPortal(
    <AnimatePresence>
      {mode && (
        <div className="fixed inset-0 z-[150] flex items-start justify-center pt-[14vh] px-4">
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            onClick={() => store.setPalette(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -6 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-xl rounded-xl3 border border-line-strong bg-surface-overlay shadow-modal overflow-hidden"
            role="dialog"
            aria-label={mode === 'files' ? 'Quick open' : 'Command palette'}
          >
            <div className="flex items-center gap-2.5 px-4 h-12 border-b border-line">
              <Search size={15} className="text-ink-faint shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={mode === 'files' ? 'Go to file…' : 'Type a command…'}
                className="flex-1 bg-transparent text-[14px] text-ink placeholder:text-ink-faint focus:outline-none"
              />
              <Kbd>esc</Kbd>
            </div>
            <div ref={listRef} className="max-h-[320px] overflow-y-auto p-1.5">
              {!results.length && <p className="px-3 py-6 text-center text-[13px] text-ink-faint">No results</p>}
              {results.map((r, i) => (
                <button
                  key={r.type === 'file' ? r.path : r.command.id}
                  onClick={() => select(i)}
                  onMouseEnter={() => setIndex(i)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors',
                    i === index ? 'bg-primary-soft text-ink' : 'text-ink-dim'
                  )}
                >
                  {r.type === 'file' ? (
                    <>
                      <FileCode2 size={15} style={{ color: fileMeta(r.path).color }} className="shrink-0" />
                      <span className="text-[13px] truncate">{r.path.split('/').pop()}</span>
                      <span className="text-[11px] text-ink-faint truncate ml-auto">{r.path}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-ink-faint shrink-0">{r.command.icon}</span>
                      <span className="text-[13px]">{r.command.label}</span>
                      {r.command.shortcut && (
                        <span className="ml-auto text-[11px] text-ink-faint font-mono">{r.command.shortcut}</span>
                      )}
                    </>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
