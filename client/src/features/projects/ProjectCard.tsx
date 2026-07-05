import { useState, type MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Star,
  Pin,
  PinOff,
  Copy,
  Archive,
  ArchiveRestore,
  Trash2,
  Settings2,
  MoreHorizontal,
  ExternalLink,
} from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useDeleteProject, useDuplicateProject, useToggleProjectFlag, useUpdateProject } from '@/lib/queries';
import { showContextMenu, type ContextMenuEntry } from '@/components/ui/ContextMenu';
import { AvatarStack } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/misc';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { toast } from '@/stores/toastStore';
import { getTemplateMeta } from './templateMeta';
import type { Project } from '@/types';

function DeleteProjectModal({ project, open, onClose }: { project: Project; open: boolean; onClose: () => void }) {
  const del = useDeleteProject();
  return (
    <Modal open={open} onClose={onClose} title="Delete project" description="This permanently removes the workspace, its files and its container.">
      <p className="text-sm text-ink-dim leading-relaxed">
        You are about to delete <span className="font-semibold text-ink">{project.name}</span>. This cannot be undone.
      </p>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="danger"
          loading={del.isPending}
          onClick={async () => {
            await del.mutateAsync(project.id);
            toast.success('Project deleted', `"${project.name}" is gone.`);
            onClose();
          }}
        >
          <Trash2 size={15} />
          Delete forever
        </Button>
      </div>
    </Modal>
  );
}

export function ProjectCard({ project, index = 0 }: { project: Project; index?: number }) {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id);
  const toggleStar = useToggleProjectFlag('star');
  const togglePin = useToggleProjectFlag('pin');
  const duplicate = useDuplicateProject();
  const update = useUpdateProject(project.id);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const meta = getTemplateMeta(project.template);
  const isOwner = project.role === 'owner';
  const memberUsers = project.members
    .filter((m) => m.name)
    .map((m) => ({ name: m.name!, avatarColor: m.avatarColor }));

  const menuEntries: ContextMenuEntry[] = [
    { label: 'Open', icon: <ExternalLink size={14} />, onSelect: () => navigate(`/ide/${project.id}`) },
    {
      label: project.starred ? 'Unstar' : 'Star',
      icon: <Star size={14} />,
      onSelect: () => toggleStar.mutate(project.id),
    },
    {
      label: project.pinned ? 'Unpin' : 'Pin to top',
      icon: project.pinned ? <PinOff size={14} /> : <Pin size={14} />,
      onSelect: () => togglePin.mutate(project.id),
    },
    ...(project.role !== 'viewer'
      ? [{ label: 'Duplicate', icon: <Copy size={14} />, onSelect: () => duplicate.mutate(project.id) }]
      : []),
    ...(isOwner
      ? [
          { separator: true as const, label: '' },
          {
            label: 'Project settings',
            icon: <Settings2 size={14} />,
            onSelect: () => navigate(`/project/${project.id}/settings`),
          },
          {
            label: project.archived ? 'Unarchive' : 'Archive',
            icon: project.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />,
            onSelect: () => update.mutate({ archived: !project.archived }),
          },
          { separator: true as const, label: '' },
          { label: 'Delete…', icon: <Trash2 size={14} />, danger: true, onSelect: () => setConfirmDelete(true) },
        ]
      : []),
  ];

  const onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    showContextMenu(e, menuEntries);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(index * 0.04, 0.3), duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <Link
          to={`/ide/${project.id}`}
          onContextMenu={onContextMenu}
          className={cn(
            'group card p-4 flex flex-col gap-3 transition-all duration-200 hover:border-line-strong hover:shadow-card hover:-translate-y-0.5 block',
            project.archived && 'opacity-60'
          )}
        >
          <div className="flex items-start gap-3">
            <span
              className="h-10 w-10 rounded-xl2 flex items-center justify-center shrink-0 border border-line"
              style={{ color: meta.color, background: `${meta.color}14` }}
            >
              {meta.icon}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h3 className="text-[14px] font-semibold text-ink truncate">{project.name}</h3>
                {project.pinned && <Pin size={11} className="text-primary shrink-0" />}
              </div>
              <p className="text-xs text-ink-faint truncate mt-0.5">
                {project.description || `${project.template} project`}
              </p>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                aria-label={project.starred ? 'Unstar' : 'Star'}
                onClick={(e) => {
                  e.preventDefault();
                  toggleStar.mutate(project.id);
                }}
                className={cn(
                  'p-1.5 rounded-lg transition-all',
                  project.starred
                    ? 'text-warn'
                    : 'text-ink-faint opacity-0 group-hover:opacity-100 hover:text-warn'
                )}
              >
                <Star size={15} fill={project.starred ? 'currentColor' : 'none'} />
              </button>
              <button
                aria-label="Project menu"
                onClick={(e) => {
                  e.preventDefault();
                  showContextMenu(e, menuEntries);
                }}
                className="p-1.5 rounded-lg text-ink-faint opacity-0 group-hover:opacity-100 hover:text-ink hover:bg-white/[0.06] transition-all"
              >
                <MoreHorizontal size={15} />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between mt-auto pt-1">
            <div className="flex items-center gap-2">
              {memberUsers.length > 1 ? (
                <AvatarStack users={memberUsers} max={3} size="xs" />
              ) : (
                <Badge>{project.role}</Badge>
              )}
              {project.archived && <Badge tone="amber">archived</Badge>}
              {project.owner.id !== userId && <Badge tone="violet">shared</Badge>}
            </div>
            <span className="text-[11px] text-ink-faint">{timeAgo(project.lastOpenedAt)}</span>
          </div>
        </Link>
      </motion.div>
      <DeleteProjectModal project={project} open={confirmDelete} onClose={() => setConfirmDelete(false)} />
    </>
  );
}
