import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
  Container,
  GitBranch,
  Users,
  TerminalSquare,
  Zap,
  ShieldCheck,
  Globe,
  ChevronDown,
  Check,
  ArrowRight,
  FolderTree,
  MessageSquare,
  Search,
  Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { Logo, LogoMark } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/misc';

// --------------------------------------------------------------- utilities

const ease = [0.22, 1, 0.36, 1] as const;

function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.55, delay, ease }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function SectionHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: ReactNode; subtitle?: string }) {
  return (
    <Reveal className="text-center max-w-2xl mx-auto">
      <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
      <h2 className="mt-3 text-[32px] sm:text-[38px] font-bold tracking-tight text-ink leading-[1.15]">{title}</h2>
      {subtitle && <p className="mt-4 text-[16px] text-ink-dim leading-relaxed">{subtitle}</p>}
    </Reveal>
  );
}

// --------------------------------------------------------------------- nav

function Nav() {
  const user = useAuthStore((s) => s.user);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { href: '#features', label: 'Features' },
    { href: '#collaboration', label: 'Collaboration' },
    { href: '#runtime', label: 'Runtime' },
    { href: '#pricing', label: 'Pricing' },
    { href: '#faq', label: 'FAQ' },
  ];

  return (
    <header
      className={cn(
        'fixed top-0 inset-x-0 z-50 transition-all duration-300',
        scrolled ? 'bg-bg/75 backdrop-blur-xl border-b border-line' : 'bg-transparent'
      )}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/">
          <Logo />
        </Link>
        <nav className="hidden md:flex items-center gap-7">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-[13.5px] text-ink-dim hover:text-ink transition-colors">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {user ? (
            <Link to="/dashboard">
              <Button size="sm">
                Open dashboard
                <ArrowRight size={14} />
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/signin" className="text-[13.5px] text-ink-dim hover:text-ink transition-colors">
                Sign in
              </Link>
              <Link to="/signup">
                <Button size="sm">Get started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

// -------------------------------------------------------------------- hero

const heroCode = [
  { text: 'import express from "express";', cls: 'text-ink-dim' },
  { text: '', cls: '' },
  { text: 'const app = express();', cls: 'text-ink-dim' },
  { text: '', cls: '' },
  { text: 'app.get("/", (_req, res) => {', cls: 'text-ink-dim' },
  { text: '  res.json({ ship: "it" });   // Maya is typing…', cls: 'text-good' },
  { text: '});', cls: 'text-ink-dim' },
  { text: '', cls: '' },
  { text: 'app.listen(3000);  // live in your container', cls: 'text-primary' },
];

function TypingCode() {
  const [progress, setProgress] = useState(0);
  const total = heroCode.reduce((n, l) => n + l.text.length + 1, 0);

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      i += 2;
      setProgress(i);
      if (i >= total) clearInterval(timer);
    }, 18);
    return () => clearInterval(timer);
  }, [total]);

  let remaining = progress;
  return (
    <div className="font-mono text-[12.5px] sm:text-[13px] leading-[1.75] whitespace-pre">
      {heroCode.map((line, i) => {
        const shown = Math.max(0, Math.min(line.text.length, remaining));
        remaining -= line.text.length + 1;
        return (
          <div key={i} className="flex">
            <span className="w-8 shrink-0 text-right pr-4 text-ink-faint/60 select-none">{i + 1}</span>
            <span className={line.cls}>{line.text.slice(0, shown)}</span>
            {remaining < 0 && shown < line.text.length && shown > 0 && (
              <span className="w-[7px] h-[15px] mt-0.5 bg-primary animate-blink" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function HeroVisual() {
  return (
    <Reveal delay={0.25} className="relative mt-16 max-w-4xl mx-auto">
      <div className="absolute -inset-8 bg-gradient-to-r from-primary/20 via-accent/15 to-violet/20 blur-3xl rounded-full pointer-events-none" />
      <div className="relative card overflow-hidden shadow-modal">
        {/* window chrome */}
        <div className="flex items-center gap-2 px-4 h-9 bg-surface-raised border-b border-line">
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-bad/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-warn/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-good/70" />
          </span>
          <span className="mx-auto text-[11px] text-ink-faint font-mono">novuside — api-server</span>
          <span className="flex -space-x-1.5">
            {['#3B82F6', '#8B5CF6', '#10B981'].map((c) => (
              <span key={c} className="h-4 w-4 rounded-full ring-2 ring-surface-raised" style={{ background: c }} />
            ))}
          </span>
        </div>
        <div className="grid grid-cols-[150px_1fr] max-sm:grid-cols-1">
          {/* explorer mock */}
          <div className="max-sm:hidden border-r border-line bg-surface p-3 text-[11.5px] text-ink-faint space-y-1.5">
            <p className="uppercase tracking-wider text-[9.5px] font-semibold pb-1">Explorer</p>
            {['src/', '  server.ts', '  routes.ts', 'package.json', 'Dockerfile'].map((f) => (
              <p key={f} className={cn('whitespace-pre font-mono', f.includes('server') && 'text-primary')}>
                {f}
              </p>
            ))}
          </div>
          <div className="bg-[#0A101F] p-4 min-h-[230px]">
            <TypingCode />
            <div className="mt-4 pt-3 border-t border-line font-mono text-[11.5px] leading-relaxed">
              <p className="text-ink-faint">
                <span className="text-good">➜</span> <span className="text-primary">/workspace</span> npm run dev
              </p>
              <p className="text-ink-dim">Server listening on :3000 ⚡ container ready in 1.2s</p>
            </div>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const glowY = useTransform(scrollYProgress, [0, 1], [0, 120]);

  return (
    <section ref={ref} className="relative pt-36 pb-24 px-6 overflow-hidden">
      <motion.div
        aria-hidden
        style={{ y: glowY }}
        className="absolute top-[-200px] left-1/2 -translate-x-1/2 h-[560px] w-[900px] rounded-full bg-primary/[0.13] blur-[140px] pointer-events-none"
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(ellipse 70% 55% at 50% 0%, black, transparent)',
        }}
      />
      <div className="relative max-w-3xl mx-auto text-center">
        <Reveal>
          <Badge tone="blue" className="!px-3 !py-1 !text-[12px]">
            <Zap size={12} />
            Real containers · Real terminal · Real time
          </Badge>
        </Reveal>
        <Reveal delay={0.08}>
          <h1 className="mt-6 text-[42px] sm:text-[58px] font-bold tracking-tight text-ink leading-[1.08]">
            Code together in a<br />
            <span className="text-gradient">real cloud workspace</span>
          </h1>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="mt-6 text-[17px] text-ink-dim leading-relaxed max-w-xl mx-auto">
            NovusIDE gives every project an isolated Docker container, a genuine shell, and multiplayer editing with
            live cursors — all in your browser. No setup, no sync scripts, no pretending.
          </p>
        </Reveal>
        <Reveal delay={0.24} className="mt-9 flex items-center justify-center gap-4 flex-wrap">
          <Link to="/signup">
            <Button variant="gradient" size="lg">
              Start building free
              <ArrowRight size={16} />
            </Button>
          </Link>
          <a href="#features">
            <Button variant="secondary" size="lg">
              See how it works
            </Button>
          </a>
        </Reveal>
      </div>
      <HeroVisual />
    </section>
  );
}

// ---------------------------------------------------------------- features

const features = [
  {
    icon: <Container size={19} />,
    color: '#3B82F6',
    title: 'Isolated Docker runtime',
    body: 'Every project gets its own container with Node, Python and build tools. npm install actually installs. Dev servers actually serve.',
  },
  {
    icon: <TerminalSquare size={19} />,
    color: '#8B5CF6',
    title: 'A terminal that is real',
    body: 'A pty attached to your container: arrow keys, Ctrl+C, tab completion, htop. Sessions survive page reloads with full scrollback.',
  },
  {
    icon: <Users size={19} />,
    color: '#10B981',
    title: 'Multiplayer editing',
    body: 'CRDT-backed collaboration keeps everyone consistent — see teammates’ cursors and selections with zero merge conflicts.',
  },
  {
    icon: <Globe size={19} />,
    color: '#22D3EE',
    title: 'Live preview',
    body: 'Ports your dev server opens inside the container are mapped and framed next to your code. Hot reload included.',
  },
  {
    icon: <GitBranch size={19} />,
    color: '#F59E0B',
    title: 'Git built in',
    body: 'Stage, diff, commit, branch, push and pull from a proper source-control panel. Import any public repository in one click.',
  },
  {
    icon: <MessageSquare size={19} />,
    color: '#EC4899',
    title: 'Workspace chat',
    body: 'Talk where the code is. @mention teammates, see who is online and which file they are in — notifications land instantly.',
  },
];

function Features() {
  return (
    <section id="features" className="py-24 px-6">
      <SectionHeading
        eyebrow="Everything included"
        title={
          <>
            Not a toy editor.
            <br />A full development environment.
          </>
        }
        subtitle="The pieces you'd normally stitch together — runtime, terminal, git, preview, collaboration — arrive wired."
      />
      <div className="mt-14 max-w-5xl mx-auto grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <Reveal key={f.title} delay={i * 0.06}>
            <div className="card p-6 h-full transition-all duration-200 hover:border-line-strong hover:-translate-y-1 hover:shadow-card">
              <span
                className="h-10 w-10 rounded-xl2 border border-line flex items-center justify-center"
                style={{ color: f.color, background: `${f.color}14` }}
              >
                {f.icon}
              </span>
              <h3 className="mt-4 text-[15px] font-semibold text-ink">{f.title}</h3>
              <p className="mt-2 text-[13.5px] text-ink-dim leading-relaxed">{f.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// ----------------------------------------------------------- collaboration

function CollabDemo() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % 3), 2200);
    return () => clearInterval(t);
  }, []);

  const cursors = [
    { name: 'Maya', color: '#8B5CF6', positions: ['22%', '58%', '40%'] },
    { name: 'Dev', color: '#10B981', positions: ['66%', '30%', '74%'] },
  ];

  return (
    <section id="collaboration" className="py-24 px-6 bg-surface/40 border-y border-line">
      <div className="max-w-5xl mx-auto grid gap-14 lg:grid-cols-2 items-center">
        <Reveal>
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-primary">Realtime by default</p>
          <h2 className="mt-3 text-[32px] font-bold tracking-tight text-ink leading-tight">
            Pair on the same file,
            <br />
            not the same screen share
          </h2>
          <p className="mt-4 text-[15.5px] text-ink-dim leading-relaxed">
            Edits merge conflict-free through a CRDT, so two people typing on the same line just works. Presence shows
            who is online and where they are; chat and mentions keep the conversation attached to the code.
          </p>
          <ul className="mt-6 space-y-3">
            {['Named cursors and selections', 'Per-file presence indicators', '@mentions that notify instantly'].map(
              (t) => (
                <li key={t} className="flex items-center gap-3 text-[14px] text-ink-dim">
                  <span className="h-5 w-5 rounded-full bg-good/10 flex items-center justify-center shrink-0">
                    <Check size={12} className="text-good" />
                  </span>
                  {t}
                </li>
              )
            )}
          </ul>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="card p-5 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[12px] font-mono text-ink-faint">src/App.tsx</span>
              <span className="flex -space-x-1.5">
                <Avatar name="Maya T" color="#8B5CF6" size="xs" online />
                <Avatar name="Dev R" color="#10B981" size="xs" online />
                <Avatar name="You" color="#3B82F6" size="xs" online />
              </span>
            </div>
            <div className="relative font-mono text-[12.5px] leading-[1.9] text-ink-dim">
              {[
                'function App() {',
                '  const [count, setCount] = useState(0);',
                '  return (',
                '    <button onClick={() => setCount(c => c + 1)}>',
                '      clicks: {count}',
                '    </button>',
                '  );',
                '}',
              ].map((line, i) => (
                <p key={i} className="whitespace-pre">
                  <span className="text-ink-faint/50 select-none mr-4">{i + 1}</span>
                  {line}
                </p>
              ))}
              {cursors.map((c) => (
                <motion.span
                  key={c.name}
                  animate={{ left: c.positions[step], top: `${20 + (step * 27) % 60}%` }}
                  transition={{ duration: 0.8, ease }}
                  className="absolute"
                >
                  <span className="block w-[2px] h-4" style={{ background: c.color }} />
                  <span
                    className="block -mt-8 px-1.5 py-0.5 rounded text-[9.5px] font-sans font-semibold text-white whitespace-nowrap"
                    style={{ background: c.color }}
                  >
                    {c.name}
                  </span>
                </motion.span>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-line flex items-center gap-2.5">
              <Avatar name="Maya T" color="#8B5CF6" size="xs" />
              <p className="text-[12px] text-ink-dim">
                <span className="font-semibold text-ink">Maya</span> ship it? <span className="text-primary">@you</span>
              </p>
              <span className="ml-auto text-[10px] text-ink-faint">just now</span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------- runtime

function Runtime() {
  const lines = [
    { p: '➜ /workspace', cmd: ' npm create vite@latest . -- --template react' },
    { p: '', cmd: 'Scaffolding project in /workspace…' },
    { p: '➜ /workspace', cmd: ' npm install && npm run dev' },
    { p: '', cmd: 'VITE v5.4  ready in 320 ms  →  http://localhost:5173/' },
  ];
  return (
    <section id="runtime" className="py-24 px-6">
      <div className="max-w-5xl mx-auto grid gap-14 lg:grid-cols-2 items-center">
        <Reveal className="order-2 lg:order-1">
          <div className="card overflow-hidden">
            <div className="flex items-center gap-2 px-4 h-9 bg-surface-raised border-b border-line">
              <TerminalSquare size={13} className="text-primary" />
              <span className="text-[11px] font-mono text-ink-faint">zsh — novus-ws-a41f9</span>
              <Badge tone="blue" className="ml-auto">
                <Container size={10} />
                container
              </Badge>
            </div>
            <div className="bg-[#0A101F] p-4 font-mono text-[12.5px] leading-[1.9]">
              {lines.map((l, i) => (
                <motion.p
                  key={i}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 + i * 0.5 }}
                  className={l.p ? 'text-ink-dim' : 'text-ink-faint'}
                >
                  {l.p && <span className="text-good">{l.p}</span>}
                  {l.cmd}
                </motion.p>
              ))}
              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 2.6 }}
                className="text-ink-dim"
              >
                <span className="text-good">➜ /workspace</span> <span className="w-[7px] h-[14px] inline-block bg-primary animate-blink align-middle" />
              </motion.p>
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.1} className="order-1 lg:order-2">
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-primary">The runtime</p>
          <h2 className="mt-3 text-[32px] font-bold tracking-tight text-ink leading-tight">
            Your shell. Your packages.
            <br />
            Someone else&apos;s hardware.
          </h2>
          <p className="mt-4 text-[15.5px] text-ink-dim leading-relaxed">
            Each workspace boots an isolated container with Node 20, Python 3, git and a full build toolchain.
            Whatever port your dev server opens is mapped straight into the live preview panel.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              'Resource-capped, per-project isolation',
              'Terminal sessions persist across reloads',
              'Files shared instantly between editor, git and shell',
            ].map((t) => (
              <li key={t} className="flex items-center gap-3 text-[14px] text-ink-dim">
                <span className="h-5 w-5 rounded-full bg-primary-soft flex items-center justify-center shrink-0">
                  <Check size={12} className="text-primary" />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------- pricing

const plans = [
  {
    name: 'Hobby',
    price: '$0',
    period: 'forever',
    blurb: 'For side projects and learning.',
    features: ['3 active projects', '1 GB RAM per container', 'Unlimited collaborators', 'Community support'],
    cta: 'Start free',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$12',
    period: 'per user / month',
    blurb: 'For teams shipping real products.',
    features: [
      'Unlimited projects',
      '4 GB RAM per container',
      'Always-on containers',
      'Private git credentials',
      'Priority support',
    ],
    cta: 'Start 14-day trial',
    highlight: true,
  },
  {
    name: 'Team',
    price: '$29',
    period: 'per user / month',
    blurb: 'For organizations with guardrails.',
    features: ['Everything in Pro', 'SSO & audit log', 'Custom runtime images', 'Dedicated capacity', 'SLA'],
    cta: 'Contact sales',
    highlight: false,
  },
];

function Pricing() {
  return (
    <section id="pricing" className="py-24 px-6 bg-surface/40 border-y border-line">
      <SectionHeading
        eyebrow="Pricing"
        title="Start free, scale when you ship"
        subtitle="Every plan includes real containers, realtime collaboration and the full IDE. No feature gating on the essentials."
      />
      <div className="mt-14 max-w-5xl mx-auto grid gap-5 lg:grid-cols-3 items-stretch">
        {plans.map((p, i) => (
          <Reveal key={p.name} delay={i * 0.08}>
            <div
              className={cn(
                'relative card p-7 h-full flex flex-col',
                p.highlight && 'border-primary/40 shadow-glow-blue'
              )}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10.5px] font-bold text-white bg-gradient-to-r from-primary to-violet">
                  MOST POPULAR
                </span>
              )}
              <h3 className="text-[15px] font-semibold text-ink">{p.name}</h3>
              <p className="mt-1 text-[13px] text-ink-faint">{p.blurb}</p>
              <p className="mt-5">
                <span className="text-[38px] font-bold tracking-tight text-ink">{p.price}</span>
                <span className="text-[13px] text-ink-faint ml-2">{p.period}</span>
              </p>
              <ul className="mt-6 space-y-2.5 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-[13.5px] text-ink-dim">
                    <Check size={14} className="text-good shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/signup" className="mt-7 block">
                <Button variant={p.highlight ? 'gradient' : 'secondary'} className="w-full">
                  {p.cta}
                </Button>
              </Link>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// ------------------------------------------------------------ testimonials

const testimonials = [
  {
    quote:
      'We stopped maintaining a 40-line "getting started" doc. New engineers open a link and the whole stack is already running.',
    name: 'Maya Torres',
    role: 'Engineering Lead, Fieldnote',
    color: '#8B5CF6',
  },
  {
    quote:
      'The terminal is the thing that sold me. It’s an actual shell in an actual container — I ran a database migration from my iPad.',
    name: 'Dev Raghunathan',
    role: 'Staff Engineer, Loopwire',
    color: '#10B981',
  },
  {
    quote:
      'Pairing with cursors beats screen sharing every time. We debug together in the same file and chat right there.',
    name: 'Anna Kessler',
    role: 'Founder, Parcelbird',
    color: '#F59E0B',
  },
];

function Testimonials() {
  return (
    <section className="py-24 px-6">
      <SectionHeading eyebrow="Loved by builders" title="Teams ship faster on NovusIDE" />
      <div className="mt-14 max-w-5xl mx-auto grid gap-5 md:grid-cols-3">
        {testimonials.map((t, i) => (
          <Reveal key={t.name} delay={i * 0.08}>
            <figure className="card p-6 h-full flex flex-col">
              <blockquote className="text-[14px] text-ink-dim leading-relaxed flex-1">&ldquo;{t.quote}&rdquo;</blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <Avatar name={t.name} color={t.color} size="sm" />
                <div>
                  <p className="text-[13px] font-semibold text-ink">{t.name}</p>
                  <p className="text-[11.5px] text-ink-faint">{t.role}</p>
                </div>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// --------------------------------------------------------------------- FAQ

const faqs = [
  {
    q: 'Is the terminal actually real?',
    a: 'Yes. Each terminal is a server-side pseudo-terminal attached to your project’s Docker container. Interactive programs, signals, colors and tab completion all behave exactly like a local shell, and sessions persist across page reloads.',
  },
  {
    q: 'What runs inside the containers?',
    a: 'The default runtime image ships Node.js 20, Python 3, git, zsh and a full build toolchain (plus pnpm, yarn and bun). Containers are resource-capped and isolated per project.',
  },
  {
    q: 'How does collaborative editing stay consistent?',
    a: 'Documents are CRDTs (Yjs). Every keystroke merges deterministically on all clients and the server, so concurrent edits — even on the same word — never conflict or overwrite each other.',
  },
  {
    q: 'Can I import an existing repository?',
    a: 'Yes — paste any public Git URL and NovusIDE clones it into a fresh workspace. Full git support (branches, diffs, commits, push/pull) is built into the IDE.',
  },
  {
    q: 'What happens to my files if I close the tab?',
    a: 'Everything lives on the server, not in your browser. Files persist in your workspace volume, and your container and terminal sessions keep running until stopped.',
  },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="py-24 px-6 bg-surface/40 border-t border-line">
      <SectionHeading eyebrow="FAQ" title="Questions, answered" />
      <div className="mt-12 max-w-2xl mx-auto space-y-3">
        {faqs.map((f, i) => {
          const isOpen = open === i;
          return (
            <Reveal key={f.q} delay={i * 0.04}>
              <div className="card overflow-hidden">
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="text-[14.5px] font-medium text-ink">{f.q}</span>
                  <ChevronDown
                    size={16}
                    className={cn('text-ink-faint shrink-0 transition-transform duration-200', isOpen && 'rotate-180')}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease }}
                    >
                      <p className="px-5 pb-5 text-[13.5px] text-ink-dim leading-relaxed">{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

// -------------------------------------------------------------- CTA/footer

function FinalCTA() {
  return (
    <section className="py-28 px-6 relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 55% 65% at 50% 100%, rgba(99,102,241,0.16), transparent)',
        }}
      />
      <Reveal className="relative max-w-2xl mx-auto text-center">
        <LogoMark className="h-12 w-12 mx-auto" />
        <h2 className="mt-6 text-[34px] sm:text-[42px] font-bold tracking-tight text-ink leading-tight">
          Your next project starts
          <br />
          <span className="text-gradient">already running</span>
        </h2>
        <p className="mt-4 text-[16px] text-ink-dim">
          Create a workspace, open the terminal, ship something. Free to start.
        </p>
        <div className="mt-9 flex items-center justify-center gap-4">
          <Link to="/signup">
            <Button variant="gradient" size="lg">
              <Play size={15} fill="currentColor" />
              Launch your first workspace
            </Button>
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

function Footer() {
  const cols = [
    {
      title: 'Product',
      links: ['Features', 'Collaboration', 'Runtime', 'Pricing', 'FAQ'],
    },
    { title: 'Resources', links: ['Documentation', 'Templates', 'Changelog', 'Status'] },
    { title: 'Company', links: ['About', 'Blog', 'Careers', 'Contact'] },
    { title: 'Legal', links: ['Privacy', 'Terms', 'Security'] },
  ];
  return (
    <footer className="border-t border-line px-6 py-14">
      <div className="max-w-6xl mx-auto grid gap-10 sm:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <Logo />
          <p className="mt-4 text-[13px] text-ink-faint leading-relaxed max-w-xs">
            The collaborative browser IDE with real containers, a real terminal and realtime everything.
          </p>
        </div>
        {cols.map((col) => (
          <div key={col.title}>
            <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-dim">{col.title}</p>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l}>
                  <a
                    href={['Features', 'Collaboration', 'Runtime', 'Pricing', 'FAQ'].includes(l) ? `#${l.toLowerCase()}` : '#'}
                    className="text-[13px] text-ink-faint hover:text-ink transition-colors"
                  >
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="max-w-6xl mx-auto mt-12 pt-6 border-t border-line flex flex-wrap items-center justify-between gap-4">
        <p className="text-[12px] text-ink-faint">© {new Date().getFullYear()} NovusIDE. Built for people who ship.</p>
        <div className="flex items-center gap-4 text-[12px] text-ink-faint">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-good" />
            Isolated by design
          </span>
          <span className="flex items-center gap-1.5">
            <FolderTree size={13} className="text-primary" />
            Your code stays yours
          </span>
          <span className="flex items-center gap-1.5">
            <Search size={13} className="text-violet" />
            No tracking
          </span>
        </div>
      </div>
    </footer>
  );
}

// -------------------------------------------------------------------- page

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg">
      <Nav />
      <main>
        <Hero />
        <Features />
        <CollabDemo />
        <Runtime />
        <Pricing />
        <Testimonials />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
