import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ChevronRight, FileCode2, Circle, Lock } from 'lucide-react';
import { MonacoBinding } from 'y-monaco';
import Editor from '@monaco-editor/react';
import { monaco } from '../lib/monacoSetup';
import { fileMeta, isImagePath } from '../lib/languages';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useIdeStore } from '@/stores/ideStore';
import { showContextMenu } from '@/components/ui/ContextMenu';
import { EmptyState, Kbd } from '@/components/ui/misc';
import { Spinner } from '@/components/ui/Spinner';
import { LogoMark } from '@/components/ui/Logo';
import { useCollab } from '../collab/CollabProvider';
import { useCollabDoc } from '../collab/useCollabDoc';

// ------------------------------------------------------------------ tab bar

function TabBar() {
  const { openTabs, activePath, dirty, setActivePath, closeTab, closeOtherTabs } = useIdeStore();
  if (!openTabs.length) return null;
  return (
    <div className="flex items-stretch h-9 bg-surface border-b border-line overflow-x-auto shrink-0" role="tablist">
      {openTabs.map((path) => {
        const meta = fileMeta(path);
        const name = path.split('/').pop();
        const active = path === activePath;
        const isDirty = dirty.has(path);
        return (
          <div
            key={path}
            role="tab"
            aria-selected={active}
            onClick={() => setActivePath(path)}
            onAuxClick={(e) => {
              if (e.button === 1) closeTab(path);
            }}
            onContextMenu={(e) =>
              showContextMenu(e, [
                { label: 'Close', onSelect: () => closeTab(path) },
                { label: 'Close others', onSelect: () => closeOtherTabs(path) },
              ])
            }
            className={cn(
              'group flex items-center gap-2 px-3 border-r border-line cursor-pointer select-none min-w-0 max-w-[200px]',
              active
                ? 'bg-[#0A101F] text-ink shadow-[inset_0_2px_0_#3B82F6]'
                : 'text-ink-faint hover:text-ink-dim hover:bg-white/[0.03]'
            )}
          >
            <span style={{ color: meta.color }} className="shrink-0">
              <FileCode2 size={13} />
            </span>
            <span className="text-[12px] truncate">{name}</span>
            <button
              aria-label={`Close ${name}`}
              onClick={(e) => {
                e.stopPropagation();
                closeTab(path);
              }}
              className={cn(
                'shrink-0 rounded p-0.5 transition-colors',
                isDirty
                  ? 'text-ink-dim'
                  : 'opacity-0 group-hover:opacity-100 text-ink-faint hover:text-ink hover:bg-white/[0.08]'
              )}
            >
              {isDirty ? <Circle size={8} fill="currentColor" /> : <X size={12} />}
            </button>
          </div>
        );
      })}
    </div>
  );
}

// -------------------------------------------------------------- breadcrumbs

function Breadcrumbs({ path }: { path: string }) {
  const parts = path.split('/');
  return (
    <div className="flex items-center gap-1 h-7 px-3.5 text-[11px] text-ink-faint bg-[#0A101F] border-b border-line shrink-0 overflow-x-auto whitespace-nowrap">
      {parts.map((part, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight size={11} className="opacity-60" />}
          <span className={cn(i === parts.length - 1 && 'text-ink-dim font-medium')}>{part}</span>
        </span>
      ))}
    </div>
  );
}

// ------------------------------------------------------------- image viewer

function ImageView({ projectId, path }: { projectId: string; path: string }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    let objectUrl: string | undefined;
    api
      .get(`/projects/${projectId}/files/download`, { params: { path }, responseType: 'blob' })
      .then((res) => {
        objectUrl = URL.createObjectURL(res.data);
        setUrl(objectUrl);
      })
      .catch(() => undefined);
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [projectId, path]);

  return (
    <div className="flex-1 grid place-items-center bg-[#0A101F] overflow-auto p-8">
      {url ? (
        <img src={url} alt={path} className="max-w-full max-h-full rounded-lg shadow-card" />
      ) : (
        <Spinner className="h-5 w-5 text-ink-faint" />
      )}
    </div>
  );
}

// ------------------------------------------------------------- collab editor

function CollabEditor({ path, readOnly }: { path: string; readOnly: boolean }) {
  const { socket, joined, setActiveFile } = useCollab();
  const session = useCollabDoc(socket, joined, path);
  const settings = useAuthStore((s) => s.user?.settings.editor);
  const { markDirty, clearDirty } = useIdeStore();

  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [editorReady, setEditorReady] = useState(0);

  useEffect(() => {
    setActiveFile(path);
    return () => setActiveFile(null);
  }, [path, setActiveFile]);

  // Bind Yjs <-> Monaco once both are ready. We manage the model ourselves so
  // the binding always attaches to the model for *this* path.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !session) return;

    const uri = monaco.Uri.parse(`novus:/${path}`);
    let model = monaco.editor.getModel(uri);
    if (!model) model = monaco.editor.createModel('', fileMeta(path).lang, uri);
    editor.setModel(model);

    const binding = new MonacoBinding(session.text, model, new Set([editor]), session.awareness);

    // Dirty dot: shown while edits are in flight, cleared shortly after idle
    // (the server persists the doc ~800ms after the last update).
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onLocalUpdate = (_u: Uint8Array, origin: unknown) => {
      if (origin === 'remote') return;
      markDirty(path);
      clearTimeout(timer);
      timer = setTimeout(() => clearDirty(path), 1400);
    };
    session.doc.on('update', onLocalUpdate);

    return () => {
      clearTimeout(timer);
      clearDirty(path);
      session.doc.off('update', onLocalUpdate);
      binding.destroy();
      model?.dispose();
    };
  }, [session, path, editorReady, markDirty, clearDirty]);

  // ⌘S: suppress the browser dialog; optionally format. Persistence is automatic.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (settings?.formatOnSave && !readOnly) {
          editorRef.current?.getAction('editor.action.formatDocument')?.run();
        }
        clearDirty(path);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [settings?.formatOnSave, readOnly, path, clearDirty]);

  const options = useMemo<monaco.editor.IStandaloneEditorConstructionOptions>(
    () => ({
      fontSize: settings?.fontSize ?? 13,
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontLigatures: true,
      tabSize: settings?.tabSize ?? 2,
      wordWrap: settings?.wordWrap ? 'on' : 'off',
      minimap: { enabled: settings?.minimap ?? true },
      readOnly,
      smoothScrolling: true,
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      renderLineHighlight: 'all',
      scrollBeyondLastLine: false,
      padding: { top: 12 },
      automaticLayout: true,
      bracketPairColorization: { enabled: true },
      guides: { bracketPairs: 'active' },
      stickyScroll: { enabled: true },
      inlineSuggest: { enabled: true },
    }),
    [settings, readOnly]
  );

  return (
    <div className="flex-1 min-h-0 relative">
      <Editor
        theme="novus-dark"
        options={options}
        loading={<Spinner className="h-5 w-5 text-ink-faint" />}
        onMount={(editor) => {
          editorRef.current = editor as monaco.editor.IStandaloneCodeEditor;
          setEditorReady((n) => n + 1);
        }}
      />
      <AnimatePresence>
        {!session && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 grid place-items-center bg-[#0A101F]/70 backdrop-blur-[1px]"
          >
            <div className="flex items-center gap-2.5 text-[13px] text-ink-dim">
              <Spinner className="h-4 w-4" />
              Syncing document…
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {readOnly && (
        <div className="absolute bottom-3 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-overlay border border-line-strong text-[11px] text-ink-dim shadow-soft">
          <Lock size={11} />
          Read-only — you have viewer access
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------- empty

function EmptyEditor() {
  return (
    <div className="flex-1 grid place-items-center bg-[#0A101F]">
      <EmptyState
        icon={<LogoMark className="h-8 w-8" />}
        title="No file open"
        description="Pick a file from the explorer, or jump anywhere with quick open."
        action={
          <div className="flex items-center gap-2 text-[12px] text-ink-faint">
            <Kbd>⌘</Kbd>
            <Kbd>P</Kbd>
            <span className="ml-1">Quick open</span>
          </div>
        }
      />
    </div>
  );
}

// -------------------------------------------------------------------- main

export function EditorArea({ projectId, readOnly }: { projectId: string; readOnly: boolean }) {
  const activePath = useIdeStore((s) => s.activePath);

  // Binary sniff for the active file (images render, other binaries get a notice).
  const { data: fileInfo } = useQuery({
    queryKey: ['file-info', projectId, activePath],
    queryFn: async () =>
      (await api.get<{ content: string; isBinary: boolean; size: number }>(`/projects/${projectId}/files/content`, {
        params: { path: activePath },
      })).data,
    enabled: Boolean(activePath) && !isImagePath(activePath ?? ''),
    staleTime: 30_000,
    retry: false,
  });

  return (
    <div className="flex flex-col h-full min-w-0 bg-[#0A101F]">
      <TabBar />
      {!activePath ? (
        <EmptyEditor />
      ) : (
        <>
          <Breadcrumbs path={activePath} />
          {isImagePath(activePath) ? (
            <ImageView projectId={projectId} path={activePath} />
          ) : fileInfo?.isBinary ? (
            <div className="flex-1 grid place-items-center">
              <EmptyState title="Binary file" description="This file can't be opened in the editor." />
            </div>
          ) : (
            <CollabEditor key={activePath} path={activePath} readOnly={readOnly} />
          )}
        </>
      )}
    </div>
  );
}
