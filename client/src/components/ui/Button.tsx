import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gradient';
type Size = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-primary text-white hover:bg-primary-hover active:scale-[0.98] shadow-[0_1px_12px_rgba(59,130,246,0.25)]',
  secondary:
    'bg-surface-raised text-ink border border-line-strong hover:bg-surface-overlay hover:border-line-strong active:scale-[0.98]',
  ghost: 'text-ink-dim hover:text-ink hover:bg-white/[0.05] active:scale-[0.98]',
  danger: 'bg-bad/10 text-bad border border-bad/20 hover:bg-bad/20 active:scale-[0.98]',
  gradient:
    'text-white bg-gradient-to-r from-primary via-accent to-violet bg-[length:150%_100%] bg-left hover:bg-right transition-[background-position] duration-500 shadow-glow-blue active:scale-[0.98]',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] rounded-lg gap-1.5',
  md: 'h-10 px-4 text-sm rounded-xl2 gap-2',
  lg: 'h-12 px-6 text-[15px] rounded-xl2 gap-2',
  icon: 'h-8 w-8 rounded-lg justify-center',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all duration-150 select-none',
        'disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  )
);

Button.displayName = 'Button';
