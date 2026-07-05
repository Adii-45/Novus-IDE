import { useRef, useState, type DragEvent, type KeyboardEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronRight,
  FileCode2,
  Folder,
  FolderOpen,
  FilePlus2,
  FolderPlus,
  Upload,
  Download,
  RefreshCw,
  Pencil,
  Trash2,
  Copy,
  FolderInput,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api, apiErrorMessage } from '@/lib/api';
import { toast } from '@/stores/toastStore';
import { useIdeStore } from '@/stores/ideStore';
import { showContextMenu, type ContextMenuEntry } from '@/components/ui/ContextMenu';
import { Spinner } from '@/components/ui/Spinner';
import { fileMeta } from '../lib/languages';
import type { FileNode } from '@/types';

interface EditingState {
  mode: 'create-file' | 'create-folder' | 'rename';
  /** directory the new entry goes into, or the path being renamed */
  path: string;
  initial: string;
}

function useFileOps(projectId: string) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['tree', projectId] });
  const onError = (err: unknown) => toast.error('File operation failed', apiErrorMessage(err));

  const create = useMutation({
    mutationFn: (input: { path: string; type: 'file' | 'folder' }) =>
      api.post(`/projects/${projectId}/files/create`, input),
    onSuccess: invalidate,
    onError,
  });
  const rename = useMutation({
    mutationFn: (input: { from: string; to: string }) => api.post(`/projects/${projectId}/files/rename`, input),
    onSuccess: invalidate,
    onError,
  });
  const copy = useMutation({
    mutationFn: (input: { from: string; to: string }) => api.post(`/projects/${projectId}/files/copy`, input),
    onSuccess: invalidate,
    onError,
  });
  const remove = useMutation({
    mutationFn: (input: { path: string }) => api.post(`/projects/${projectId}/files/delete`, input),
    onSuccess: invalidate,
    onError,
  });
  const upload = useMutation({
    mutationFn: async ({ files, dir }: { files: FileList | File[]; dir: string }) => {
      const form = new FormData();
      form.append('dir', dir);
      for (const f of Array.from(files)) form.append('files', f);
      return api.post(`/projects/${projectId}/files/upload`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: (_res, vars) => {
      invalidate();
      toast.success(`Uploaded ${Array.from(vars.files).length} file(s)`);
    },
    onError,
  });

  return { create, rename, copy, remove, upload };
}

function InlineNameInput({
  depth,
  initial,
  onCommit,
  onCancel,
}: {
  depth: number;
  initial: string;
  onCommit: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value.trim()) onCommit(value.trim());
    if (e.key === 'Escape') onCancel();
  };
  return (
    <div className="flex items-center py-0.5" style={{ paddingLeft: depth * 12 + 26 }}>
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => (value.trim() ? onCommit(value.trim()) : onCancel())}
        onFocus={(e) => {
          const dot = initial.lastIndexOf('.');
          e.target.setSelectionRange(0, dot > 0 ? dot : initial.length);
        }}
        className="w-full h-6 px-1.5 text-[12.5px] rounded bg-surface-raised border border-primary/60 text-ink focus:outline-none"
        aria-label="Entry name"
      />
    </div>
  );
}

function TreeNode({
  node,
  depth,
  projectId,
  readOnly,
  expanded,
  toggle,
  editing,
  setEditing,
  ops,
}: {
  node: FileNode;
  depth: number;
  projectId: string;
  readOnly: boolean;
  expanded: Set<string>;
  toggle: (path: string) => void;
  editing: EditingState | null;
  setEditing: (e: EditingState | null) => void;
  ops: ReturnType<typeof useFileOps>;
}) {
  const { openFile, activePath, remapPath } = useIdeStore();
  const [dragOver, setDragOver] = useState(false);
  const isFolder = node.type === 'folder';
  const isOpen = expanded.has(node.path);
  const meta = fileMeta(node.path);
  const parentDir = node.path.includes('/') ? node.path.slice(0, node.path.lastIndexOf('/')) : '';

  const startCreate = (mode: 'create-file' | 'create-folder') => {
    if (isFolder && !isOpen) toggle(node.path);
    setEditing({ mode, path: isFolder ? node.path : parentDir, initial: '' });
  };

  const menu: ContextMenuEntry[] = readOnly
    ? [{ label: 'Download', icon: <Download size={14} />, onSelect: () => downloadEntry(projectId, node.path) }]
    : [
        ...(isFolder
          ? [
              { label: 'New file', icon: <FilePlus2 size={14} />, onSelect: () => startCreate('create-file') },
              { label: 'New folder', icon: <FolderPlus size={14} />, onSelect: () => startCreate('create-folder') },
              { separator: true as const },
            ]
          : []),
        {
          label: 'Rename',
          icon: <Pencil size={14} />,
          onSelect: () => setEditing({ mode: 'rename', path: node.path, initial: node.name }),
        },
        {
          label: 'Duplicate',
          icon: <Copy size={14} />,
          onSelect: () => {
            const dot = node.name.lastIndexOf('.');
            const copyName =
              dot > 0 ? `${node.name.slice(0, dot)} copy${node.name.slice(dot)}` : `${node.name} copy`;
            ops.copy.mutate({ from: node.path, to: parentDir ? `${parentDir}/${copyName}` : copyName });
          },
        },
        { label: 'Download', icon: <Download size={14} />, onSelect: () => downloadEntry(projectId, node.path) },
        { separator: true as const },
        {
          label: 'Delete',
          icon: <Trash2 size={14} />,
          danger: true,
          onSelect: () => {
            ops.remove.mutate({ path: node.path }, { onSuccess: () => remapPath(node.path, null) });
          },
        },
      ];

  // ------------------------------------------------------------ drag & drop
  const onDragStart = (e: DragEvent) => {
    e.dataTransfer.setData('application/x-novus-path', node.path);
    e.dataTransfer.effectAllowed = 'move';
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (readOnly) return;
    const targetDir = isFolder ? node.path : parentDir;
    const source = e.dataTransfer.getData('application/x-novus-path');
    if (source) {
      if (source === targetDir || targetDir.startsWith(`${source}/`)) return;
      const name = source.split('/').pop()!;
      const to = targetDir ? `${targetDir}/${name}` : name;
      if (to === source) return;
      ops.rename.mutate({ from: source, to }, { onSuccess: () => remapPath(source, to) });
    } else if (e.dataTransfer.files.length) {
      ops.upload.mutate({ files: e.dataTransfer.files, dir: targetDir });
    }
  };

  if (editing?.mode === 'rename' && editing.path === node.path) {
    return (
      <InlineNameInput
        depth={depth}
        initial={editing.initial}
        onCancel={() => setEditing(null)}
        onCommit={(name) => {
          setEditing(null);
          if (name === node.name) return;
          const to = parentDir ? `${parentDir}/${name}` : name;
          ops.rename.mutate({ from: node.path, to }, { onSuccess: () => remapPath(node.path, to) });
        }}
      />
    );
  }

  return (
    <>
      <div
        role="treeitem"
        aria-expanded={isFolder ? isOpen : undefined}
        draggable={!readOnly}
        onDragStart={onDragStart}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => (isFolder ? toggle(node.path) : openFile(node.path))}
        onContextMenu={(e) => showContextMenu(e, menu)}
        className={cn(
          'flex items-center gap-1.5 py-[3px] pr-2 rounded-md cursor-pointer select-none text-[12.5px] transition-colors',
          activePath === node.path ? 'bg-primary-soft text-ink' : 'text-ink-dim hover:bg-white/[0.04] hover:text-ink',
          dragOver && 'bg-primary-soft/70 outline outline-1 outline-primary/50'
        )}
        style={{ paddingLeft: depth * 12 + 6 }}
      >
        {isFolder ? (
          <>
            <ChevronRight size={12} className={cn('shrink-0 transition-transform duration-150', isOpen && 'rotate-90')} />
            {isOpen ? (
              <FolderOpen size={14} className="shrink-0 text-primary/80" />
            ) : (
              <Folder size={14} className="shrink-0 text-primary/60" />
            )}
          </>
        ) : (
          <>
            <span className="w-3 shrink-0" />
            <FileCode2 size={14} className="shrink-0" style={{ color: meta.color }} />
          </>
        )}
        <span className="truncate">{node.name}</span>
      </div>

      {isFolder && isOpen && (
        <div role="group">
          {editing && editing.mode !== 'rename' && editing.path === node.path && (
            <InlineNameInput
              depth={depth + 1}
              initial=""
              onCancel={() => setEditing(null)}
              onCommit={(name) => {
                setEditing(null);
                ops.create.mutate({
                  path: node.path ? `${node.path}/${name}` : name,
                  type: editing.mode === 'create-file' ? 'file' : 'folder',
                });
              }}
            />
          )}
          {node.children?.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              projectId={projectId}
              readOnly={readOnly}
              expanded={expanded}
              toggle={toggle}
              editing={editing}
              setEditing={setEditing}
              ops={ops}
            />
          ))}
        </div>
      )}
    </>
  );
}

async function downloadEntry(projectId: string, path?: string) {
  try {
    const res = await api.get(`/projects/${projectId}/files/download`, {
      params: path ? { path } : {},
      responseType: 'blob',
    });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = path ? path.split('/').pop()! : 'workspace.zip';
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    toast.error('Download failed', apiErrorMessage(err));
  }
}

export function ExplorerPanel({ projectId, readOnly }: { projectId: string; readOnly: boolean }) {
  const qc = useQueryClient();
  const ops = useFileOps(projectId);
  const fileInput = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [rootDragOver, setRootDragOver] = useState(false);

  const { data: tree, isLoading, isFetching } = useQuery({
    queryKey: ['tree', projectId],
    queryFn: async () => (await api.get<FileNode[]>(`/projects/${projectId}/files/tree`)).data,
  });

  const toggle = (path: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

  const actions = [
    {
      label: 'New file',
      icon: <FilePlus2 size={14} />,
      onClick: () => setEditing({ mode: 'create-file', path: '', initial: '' }),
      hidden: readOnly,
    },
    {
      label: 'New folder',
      icon: <FolderPlus size={14} />,
      onClick: () => setEditing({ mode: 'create-folder', path: '', initial: '' }),
      hidden: readOnly,
    },
    { label: 'Upload files', icon: <Upload size={14} />, onClick: () => fileInput.current?.click(), hidden: readOnly },
    { label: 'Download workspace', icon: <Download size={14} />, onClick: () => downloadEntry(projectId) },
    {
      label: 'Refresh',
      icon: <RefreshCw size={14} className={cn(isFetching && 'animate-spin')} />,
      onClick: () => qc.invalidateQueries({ queryKey: ['tree', projectId] }),
    },
  ].filter((a) => !a.hidden);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 h-9 shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Explorer</span>
        <div className="flex items-center">
          {actions.map((a) => (
            <button
              key={a.label}
              title={a.label}
              aria-label={a.label}
              onClick={a.onClick}
              className="p-1.5 rounded-md text-ink-faint hover:text-ink hover:bg-white/[0.06] transition-colors"
            >
              {a.icon}
            </button>
          ))}
        </div>
      </div>
      <input
        ref={fileInput}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length) ops.upload.mutate({ files: e.target.files, dir: '' });
          e.target.value = '';
        }}
      />
      <div
        role="tree"
        aria-label="Project files"
        className={cn('flex-1 overflow-y-auto px-1.5 pb-6', rootDragOver && 'bg-primary-soft/30')}
        onDragOver={(e) => {
          e.preventDefault();
          setRootDragOver(true);
        }}
        onDragLeave={() => setRootDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setRootDragOver(false);
          if (readOnly) return;
          const source = e.dataTransfer.getData('application/x-novus-path');
          if (source) {
            const name = source.split('/').pop()!;
            if (name !== source) {
              ops.rename.mutate(
                { from: source, to: name },
                { onSuccess: () => useIdeStore.getState().remapPath(source, name) }
              );
            }
          } else if (e.dataTransfer.files.length) {
            ops.upload.mutate({ files: e.dataTransfer.files, dir: '' });
          }
        }}
        onContextMenu={(e) => {
          if (readOnly) return;
          showContextMenu(e, [
            { label: 'New file', icon: <FilePlus2 size={14} />, onSelect: () => setEditing({ mode: 'create-file', path: '', initial: '' }) },
            { label: 'New folder', icon: <FolderPlus size={14} />, onSelect: () => setEditing({ mode: 'create-folder', path: '', initial: '' }) },
            { label: 'Upload files', icon: <FolderInput size={14} />, onSelect: () => fileInput.current?.click() },
          ]);
        }}
      >
        {isLoading ? (
          <div className="grid place-items-center py-10">
            <Spinner className="h-4 w-4 text-ink-faint" />
          </div>
        ) : (
          <>
            {editing && editing.mode !== 'rename' && editing.path === '' && (
              <InlineNameInput
                depth={0}
                initial=""
                onCancel={() => setEditing(null)}
                onCommit={(name) => {
                  setEditing(null);
                  ops.create.mutate({ path: name, type: editing.mode === 'create-file' ? 'file' : 'folder' });
                }}
              />
            )}
            {tree?.map((node) => (
              <TreeNode
                key={node.path}
                node={node}
                depth={0}
                projectId={projectId}
                readOnly={readOnly}
                expanded={expanded}
                toggle={toggle}
                editing={editing}
                setEditing={setEditing}
                ops={ops}
              />
            ))}
            {!tree?.length && (
              <p className="px-3 py-6 text-[12px] text-ink-faint leading-relaxed">
                Empty workspace. {readOnly ? '' : 'Create a file or drop some here.'}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
