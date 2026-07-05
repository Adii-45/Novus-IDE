import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function Badge({
  children,
  tone = 'default',
  className,
}: {
  children: ReactNode;
  tone?: 'default' | 'blue' | 'green' | 'red' | 'amber' | 'violet';
  className?: string;
}) {
  const tones = {
    default: 'bg-white/[0.06] text-ink-dim',
    blue: 'bg-primary-soft text-primary',
    green: 'bg-good/10 text-good',
    red: 'bg-bad/10 text-bad',
    amber: 'bg-warn/10 text-warn',
    violet: 'bg-violet-soft text-violet',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-md bg-white/[0.07] border border-line-strong text-[11px] font-mono text-ink-dim">
      {children}
    </kbd>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-40',
        checked ? 'bg-primary' : 'bg-white/[0.1]'
      )}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        className={cn('inline-block h-[16px] w-[16px] rounded-full bg-white shadow', checked ? 'ml-[19px]' : 'ml-[3px]')}
      />
    </button>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden="true" />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-14 px-6', className)}>
      {icon && (
        <div className="mb-4 h-12 w-12 rounded-xl3 bg-surface-raised border border-line flex items-center justify-center text-ink-faint">
          {icon}
        </div>
      )}
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1.5 text-sm text-ink-dim max-w-sm leading-relaxed">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Tooltip({ label, children, side = 'top' }: { label: string; children: ReactNode; side?: 'top' | 'bottom' | 'right' }) {
  const pos = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
    right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
  };
  return (
    <span className="relative inline-flex group/tt">
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-50 whitespace-nowrap rounded-lg bg-surface-overlay border border-line-strong px-2.5 py-1 text-[11px] font-medium text-ink shadow-soft',
          'opacity-0 scale-95 transition-all duration-100 group-hover/tt:opacity-100 group-hover/tt:scale-100 group-hover/tt:delay-300',
          pos[side]
        )}
      >
        {label}
      </span>
    </span>
  );
}
