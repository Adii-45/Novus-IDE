import { cn } from '@/lib/utils';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={cn('h-7 w-7', className)} aria-hidden="true">
      <defs>
        <linearGradient id="lg-mark" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3B82F6" />
          <stop offset="0.55" stopColor="#6366F1" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="42" height="42" rx="12" fill="#0E1525" />
      <rect x="3.75" y="3.75" width="40.5" height="40.5" rx="11.25" stroke="url(#lg-mark)" strokeOpacity="0.5" strokeWidth="1.5" />
      <path d="M15 32V16L24 26.5V16" stroke="url(#lg-mark)" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M29 20l4 4-4 4" stroke="#8B5CF6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ className, textClassName }: { className?: string; textClassName?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5 select-none', className)}>
      <LogoMark />
      <span className={cn('text-[17px] font-bold tracking-tight text-ink', textClassName)}>
        Novus<span className="text-gradient">IDE</span>
      </span>
    </span>
  );
}
