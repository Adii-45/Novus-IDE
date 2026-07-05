/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#070B16',
        surface: {
          DEFAULT: '#0E1525',
          raised: '#131C30',
          overlay: '#18223A',
        },
        line: {
          DEFAULT: 'rgba(148, 163, 216, 0.09)',
          strong: 'rgba(148, 163, 216, 0.18)',
        },
        primary: {
          DEFAULT: '#3B82F6',
          hover: '#2F74E8',
          soft: 'rgba(59, 130, 246, 0.12)',
        },
        accent: {
          DEFAULT: '#6366F1',
          soft: 'rgba(99, 102, 241, 0.12)',
        },
        violet: {
          DEFAULT: '#8B5CF6',
          soft: 'rgba(139, 92, 246, 0.12)',
        },
        ink: {
          DEFAULT: '#E6EAF4',
          dim: '#9AA5C0',
          faint: '#5D6A8A',
        },
        good: '#34D399',
        warn: '#FBBF24',
        bad: '#F87171',
      },
      borderRadius: {
        'xl2': '14px',
        'xl3': '18px',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        soft: '0 2px 16px rgba(0, 0, 0, 0.25)',
        card: '0 4px 24px rgba(0, 0, 0, 0.35)',
        modal: '0 24px 64px rgba(0, 0, 0, 0.55)',
        'glow-blue': '0 0 48px rgba(59, 130, 246, 0.18)',
        'glow-indigo': '0 0 64px rgba(99, 102, 241, 0.16)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s linear infinite',
        'fade-up': 'fade-up 0.45s cubic-bezier(0.22, 1, 0.36, 1) both',
        blink: 'blink 1.1s step-end infinite',
      },
    },
  },
  plugins: [],
};
