import {
  useState,
  useRef,
  useEffect,
  createContext,
  useContext,
  type ReactNode,
  type ButtonHTMLAttributes,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface DropdownCtx {
  open: boolean;
  setOpen: (v: boolean) => void;
}

const Ctx = createContext<DropdownCtx | null>(null);

export function Dropdown({ children, className }: { children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <Ctx.Provider value={{ open, setOpen }}>
      <div ref={ref} className={cn('relative', className)}>
        {children}
      </div>
    </Ctx.Provider>
  );
}

export function DropdownTrigger({ children }: { children: ReactNode }) {
  const ctx = useContext(Ctx)!;
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        ctx.setOpen(!ctx.open);
      }}
    >
      {children}
    </div>
  );
}

export function DropdownMenu({
  children,
  align = 'end',
  className,
}: {
  children: ReactNode;
  align?: 'start' | 'end';
  className?: string;
}) {
  const ctx = useContext(Ctx)!;
  return (
    <AnimatePresence>
      {ctx.open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: -3 }}
          transition={{ duration: 0.13, ease: 'easeOut' }}
          className={cn(
            'absolute z-50 mt-1.5 min-w-[190px] rounded-xl2 border border-line-strong bg-surface-overlay shadow-modal p-1.5',
            align === 'end' ? 'right-0' : 'left-0',
            className
          )}
          role="menu"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface ItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  danger?: boolean;
}

export function DropdownItem({ children, icon, danger, className, onClick, ...props }: ItemProps) {
  const ctx = useContext(Ctx)!;
  return (
    <button
      role="menuitem"
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-lg transition-colors text-left',
        danger ? 'text-bad hover:bg-bad/10' : 'text-ink-dim hover:text-ink hover:bg-white/[0.06]',
        className
      )}
      onClick={(e) => {
        onClick?.(e);
        ctx.setOpen(false);
      }}
      {...props}
    >
      {icon && <span className="shrink-0 opacity-80">{icon}</span>}
      {children}
    </button>
  );
}

export function DropdownSeparator() {
  return <div className="my-1.5 h-px bg-line" />;
}
