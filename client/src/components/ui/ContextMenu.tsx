import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface ContextMenuEntry {
  label?: string;
  icon?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
  shortcut?: string;
  onSelect?: () => void;
}

interface ContextMenuState {
  x: number;
  y: number;
  entries: ContextMenuEntry[];
}

let openMenu: ((state: ContextMenuState) => void) | null = null;

/** Imperative helper — call from any onContextMenu handler. */
export function showContextMenu(e: React.MouseEvent, entries: ContextMenuEntry[]) {
  e.preventDefault();
  e.stopPropagation();
  openMenu?.({ x: e.clientX, y: e.clientY, entries });
}

/** Mounted once at the app root. */
export function ContextMenuHost() {
  const [state, setState] = useState<ContextMenuState | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    openMenu = setState;
    return () => {
      openMenu = null;
    };
  }, []);

  useEffect(() => {
    if (!state) return;
    const close = () => setState(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('mousedown', close);
    window.addEventListener('blur', close);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('blur', close);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', close);
    };
  }, [state]);

  // Clamp inside the viewport after render.
  useEffect(() => {
    if (!state || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    let { x, y } = state;
    if (x + rect.width > window.innerWidth - 8) x = window.innerWidth - rect.width - 8;
    if (y + rect.height > window.innerHeight - 8) y = window.innerHeight - rect.height - 8;
    if (x !== state.x || y !== state.y) setState({ ...state, x, y });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.x, state?.y]);

  return createPortal(
    <AnimatePresence>
      {state && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.1 }}
          className="fixed z-[200] min-w-[200px] rounded-xl2 border border-line-strong bg-surface-overlay shadow-modal p-1.5"
          style={{ left: state.x, top: state.y }}
          onMouseDown={(e) => e.stopPropagation()}
          role="menu"
        >
          {state.entries.map((entry, i) =>
            entry.separator ? (
              <div key={i} className="my-1.5 h-px bg-line" />
            ) : (
              <button
                key={i}
                role="menuitem"
                disabled={entry.disabled}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] rounded-lg transition-colors text-left disabled:opacity-40 disabled:pointer-events-none',
                  entry.danger ? 'text-bad hover:bg-bad/10' : 'text-ink-dim hover:text-ink hover:bg-white/[0.06]'
                )}
                onClick={() => {
                  entry.onSelect?.();
                  setState(null);
                }}
              >
                {entry.icon && <span className="shrink-0 opacity-80">{entry.icon}</span>}
                <span className="flex-1">{entry.label}</span>
                {entry.shortcut && <span className="text-[11px] text-ink-faint font-mono">{entry.shortcut}</span>}
              </button>
            )
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
