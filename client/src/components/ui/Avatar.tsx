import { cn, initials } from '@/lib/utils';

interface AvatarProps {
  name: string;
  color?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  /** Show a green presence dot. */
  online?: boolean;
}

const sizes = {
  xs: 'h-5 w-5 text-[9px]',
  sm: 'h-7 w-7 text-[11px]',
  md: 'h-9 w-9 text-[13px]',
  lg: 'h-14 w-14 text-lg',
};

export function Avatar({ name, color = '#3B82F6', size = 'md', className, online }: AvatarProps) {
  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-full font-semibold text-white select-none',
          sizes[size]
        )}
        style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)` }}
        aria-hidden="true"
      >
        {initials(name)}
      </span>
      {online && (
        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-good ring-2 ring-surface" />
      )}
    </span>
  );
}

export function AvatarStack({
  users,
  max = 4,
  size = 'sm',
}: {
  users: Array<{ name: string; avatarColor?: string }>;
  max?: number;
  size?: 'xs' | 'sm' | 'md';
}) {
  const shown = users.slice(0, max);
  const rest = users.length - shown.length;
  return (
    <div className="flex -space-x-2">
      {shown.map((u, i) => (
        <span key={i} className="ring-2 ring-surface rounded-full" title={u.name}>
          <Avatar name={u.name} color={u.avatarColor} size={size} />
        </span>
      ))}
      {rest > 0 && (
        <span
          className={cn(
            'inline-flex items-center justify-center rounded-full bg-surface-overlay text-ink-dim font-medium ring-2 ring-surface',
            sizes[size]
          )}
        >
          +{rest}
        </span>
      )}
    </div>
  );
}
