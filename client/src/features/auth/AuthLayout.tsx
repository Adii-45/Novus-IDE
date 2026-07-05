import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { Logo, LogoMark } from '@/components/ui/Logo';

const highlights = [
  'Real Docker containers per project',
  'Live multiplayer editing with shared cursors',
  'A genuine terminal — not a simulation',
];

/**
 * Split-screen auth shell: form on the left, animated brand panel on the right.
 * The panel collapses away below lg.
 */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-bg">
      {/* ------------------------------------------------------------ form */}
      <div className="flex-1 flex flex-col px-6 sm:px-12 py-8">
        <Link to="/" className="w-fit">
          <Logo />
        </Link>

        <div className="flex-1 flex items-center justify-center py-10">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-[400px]"
          >
            <h1 className="text-[26px] font-bold tracking-tight text-ink">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-ink-dim leading-relaxed">{subtitle}</p>}
            <div className="mt-8">{children}</div>
          </motion.div>
        </div>

        {footer && <div className="text-center text-sm text-ink-dim">{footer}</div>}
      </div>

      {/* ----------------------------------------------------- brand panel */}
      <div className="hidden lg:flex w-[46%] max-w-[640px] relative overflow-hidden border-l border-line">
        {/* animated gradient backdrop */}
        <div className="absolute inset-0 bg-surface" />
        <motion.div
          aria-hidden
          className="absolute -top-32 -right-32 h-[480px] w-[480px] rounded-full bg-primary/25 blur-[120px]"
          animate={{ x: [0, -40, 0], y: [0, 50, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          aria-hidden
          className="absolute -bottom-40 -left-24 h-[440px] w-[440px] rounded-full bg-violet/20 blur-[120px]"
          animate={{ x: [0, 50, 0], y: [0, -40, 0] }}
          transition={{ duration: 17, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          aria-hidden
          className="absolute top-1/3 left-1/4 h-[320px] w-[320px] rounded-full bg-accent/15 blur-[100px]"
          animate={{ x: [0, 30, -20, 0], y: [0, -30, 20, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* faint grid */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />

        <div className="relative z-10 flex flex-col justify-center px-14 py-16 gap-10">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <LogoMark className="h-11 w-11 mb-6" />
            <h2 className="text-[28px] font-bold tracking-tight text-ink leading-snug">
              The IDE that lives
              <br />
              in your <span className="text-gradient">browser</span>.
            </h2>
            <p className="mt-4 text-[15px] text-ink-dim leading-relaxed max-w-sm">
              Spin up an isolated container, invite your team, and ship together — no local setup, no
              &ldquo;works on my machine&rdquo;.
            </p>
          </motion.div>

          <ul className="space-y-3.5">
            {highlights.map((h, i) => (
              <motion.li
                key={h}
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-center gap-3 text-sm text-ink-dim"
              >
                <span className="h-5 w-5 rounded-full bg-primary-soft flex items-center justify-center shrink-0">
                  <Check size={12} className="text-primary" />
                </span>
                {h}
              </motion.li>
            ))}
          </ul>

          <motion.figure
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="card p-5 max-w-md"
          >
            <blockquote className="text-sm text-ink-dim leading-relaxed">
              &ldquo;We onboarded a contractor in four minutes. Shared a link, they were coding in a real
              container with our whole stack running.&rdquo;
            </blockquote>
            <figcaption className="mt-3.5 flex items-center gap-2.5">
              <span className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-violet flex items-center justify-center text-[11px] font-bold text-white">
                MT
              </span>
              <div>
                <p className="text-[13px] font-semibold text-ink">Maya Torres</p>
                <p className="text-[11px] text-ink-faint">Engineering Lead, Fieldnote</p>
              </div>
            </figcaption>
          </motion.figure>
        </div>
      </div>
    </div>
  );
}
