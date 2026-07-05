import { FolderTree, Search, GitBranch, MessageSquare, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useIdeStore, type SidebarPanel } from '@/stores/ideStore';
import { Tooltip } from '@/components/ui/misc';
import { useCollab } from '../collab/CollabProvider';

const items: Array<{ id: SidebarPanel; label: string; icon: React.ReactNode }> = [
  { id: 'explorer', label: 'Explorer', icon: <FolderTree size={19} /> },
  { id: 'search', label: 'Search', icon: <Search size={19} /> },
  { id: 'git', label: 'Source control', icon: <GitBranch size={19} /> },
  { id: 'chat', label: 'Team & chat', icon: <MessageSquare size={19} /> },
];

export function ActivityBar() {
  const navigate = useNavigate();
  const { sidebarPanel, sidebarVisible, setSidebarPanel } = useIdeStore();
  const { unreadChat } = useCollab();

  return (
    <nav className="w-11 flex flex-col items-center py-2 gap-1 bg-surface border-r border-line shrink-0" aria-label="Primary panels">
      {items.map((item) => {
        const active = sidebarVisible && sidebarPanel === item.id;
        return (
          <Tooltip key={item.id} label={item.label} side="right">
            <button
              onClick={() => setSidebarPanel(item.id)}
              aria-pressed={active}
              aria-label={item.label}
              className={cn(
                'relative h-9 w-9 rounded-xl2 grid place-items-center transition-colors',
                active ? 'text-primary bg-primary-soft' : 'text-ink-faint hover:text-ink hover:bg-white/[0.06]'
              )}
            >
              {item.icon}
              {item.id === 'chat' && unreadChat > 0 && (
                <span className="absolute top-1 right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-primary text-[8.5px] font-bold text-white grid place-items-center">
                  {unreadChat > 9 ? '9+' : unreadChat}
                </span>
              )}
              {active && <span className="absolute left-[-9px] top-1/2 -translate-y-1/2 h-5 w-[2.5px] rounded-full bg-primary" />}
            </button>
          </Tooltip>
        );
      })}
      <div className="flex-1" />
      <Tooltip label="Settings" side="right">
        <button
          onClick={() => navigate('/settings/editor')}
          aria-label="Settings"
          className="h-9 w-9 rounded-xl2 grid place-items-center text-ink-faint hover:text-ink hover:bg-white/[0.06] transition-colors"
        >
          <Settings size={19} />
        </button>
      </Tooltip>
    </nav>
  );
}
