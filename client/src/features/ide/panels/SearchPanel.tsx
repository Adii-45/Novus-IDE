import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CaseSensitive, ChevronDown, ChevronRight, FileCode2, SearchX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useIdeStore } from '@/stores/ideStore';
import { Spinner } from '@/components/ui/Spinner';
import { fileMeta } from '../lib/languages';
import type { SearchMatch } from '@/types';

export function SearchPanel({ projectId }: { projectId: string }) {
  const openFile = useIdeStore((s) => s.openFile);
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Debounce keystrokes into the actual query.
  useEffect(() => {
    const t = setTimeout(() => setQuery(input.trim()), 350);
    return () => clearTimeout(t);
  }, [input]);

  const { data: results, isFetching } = useQuery({
    queryKey: ['search', projectId, query, caseSensitive],
    queryFn: async () =>
      (await api.get<SearchMatch[]>(`/projects/${projectId}/files/search`, {
        params: { q: query, cs: caseSensitive ? '1' : '0' },
      })).data,
    enabled: query.length >= 2,
    staleTime: 10_000,
  });

  const grouped = useMemo(() => {
    const map = new Map<string, SearchMatch[]>();
    for (const m of results ?? []) {
      if (!map.has(m.path)) map.set(m.path, []);
      map.get(m.path)!.push(m);
    }
    return [...map.entries()];
  }, [results]);

  const toggleFile = (path: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

  const highlight = (preview: string) => {
    const idx = caseSensitive
      ? preview.indexOf(query)
      : preview.toLowerCase().indexOf(query.toLowerCase());
    if (idx < 0) return <span>{preview}</span>;
    return (
      <>
        <span>{preview.slice(0, idx)}</span>
        <span className="bg-warn/25 text-warn rounded-[2px]">{preview.slice(idx, idx + query.length)}</span>
        <span>{preview.slice(idx + query.length)}</span>
      </>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 h-9 flex items-center shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Search</span>
      </div>
      <div className="px-3 pb-2 shrink-0">
        <div className="relative">
          <input
            autoFocus
            type="search"
            placeholder="Search in files…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full h-8 pl-2.5 pr-9 rounded-lg bg-surface-raised border border-line-strong text-[12.5px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-primary/60 transition-colors"
            aria-label="Search in files"
          />
          <button
            title="Match case"
            aria-pressed={caseSensitive}
            onClick={() => setCaseSensitive((v) => !v)}
            className={cn(
              'absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded transition-colors',
              caseSensitive ? 'text-primary bg-primary-soft' : 'text-ink-faint hover:text-ink'
            )}
          >
            <CaseSensitive size={14} />
          </button>
        </div>
        {Boolean(results?.length) && (
          <p className="mt-2 text-[11px] text-ink-faint">
            {results!.length} result{results!.length === 1 ? '' : 's'} in {grouped.length} file
            {grouped.length === 1 ? '' : 's'}
          </p>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-1.5 pb-6">
        {isFetching && (
          <div className="grid place-items-center py-8">
            <Spinner className="h-4 w-4 text-ink-faint" />
          </div>
        )}
        {!isFetching && query.length >= 2 && !results?.length && (
          <div className="flex flex-col items-center gap-2 py-10 text-ink-faint">
            <SearchX size={18} />
            <p className="text-[12px]">No matches for “{query}”</p>
          </div>
        )}
        {!isFetching &&
          grouped.map(([path, matches]) => {
            const meta = fileMeta(path);
            const isCollapsed = collapsed.has(path);
            return (
              <div key={path} className="mb-0.5">
                <button
                  onClick={() => toggleFile(path)}
                  className="w-full flex items-center gap-1.5 px-1.5 py-1 rounded-md text-[12px] text-ink-dim hover:bg-white/[0.04] transition-colors"
                >
                  {isCollapsed ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
                  <FileCode2 size={13} style={{ color: meta.color }} className="shrink-0" />
                  <span className="truncate font-medium">{path.split('/').pop()}</span>
                  <span className="text-ink-faint truncate text-[11px]">{path}</span>
                  <span className="ml-auto text-[10px] text-ink-faint bg-white/[0.06] rounded px-1.5">{matches.length}</span>
                </button>
                {!isCollapsed &&
                  matches.map((m, i) => (
                    <button
                      key={i}
                      onClick={() => openFile(m.path)}
                      className="w-full text-left pl-8 pr-2 py-[3px] text-[12px] font-mono text-ink-dim truncate rounded-md hover:bg-white/[0.04] transition-colors"
                      title={`Line ${m.line}`}
                    >
                      <span className="text-ink-faint mr-2">{m.line}</span>
                      {highlight(m.preview.trim())}
                    </button>
                  ))}
              </div>
            );
          })}
      </div>
    </div>
  );
}
