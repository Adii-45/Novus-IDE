import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { toast } from '@/stores/toastStore';

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-2.15c-3.2.7-3.87-1.36-3.87-1.36-.53-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.75 2.69 1.25 3.34.95.1-.74.4-1.25.72-1.54-2.55-.29-5.23-1.28-5.23-5.68 0-1.25.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 5.74 0c2.18-1.49 3.14-1.18 3.14-1.18.63 1.58.24 2.75.12 3.04.73.81 1.18 1.84 1.18 3.09 0 4.41-2.69 5.38-5.25 5.67.41.35.77 1.05.77 2.12v3.14c0 .3.21.66.8.55A10.52 10.52 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.57 5.57 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29A7.16 7.16 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42A11.98 11.98 0 0 0 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

/** GitHub/Google sign-in buttons; disabled with a hint when the server has no credentials configured. */
export function OAuthButtons() {
  const { data: providers } = useQuery({
    queryKey: ['oauth-providers'],
    queryFn: async () => (await api.get<{ github: boolean; google: boolean }>('/auth/oauth/providers')).data,
    staleTime: Infinity,
  });

  const start = (provider: 'github' | 'google') => {
    if (!providers?.[provider]) {
      toast.info(
        `${provider === 'github' ? 'GitHub' : 'Google'} sign-in isn't configured`,
        'Add OAuth credentials to the server .env to enable it.'
      );
      return;
    }
    window.location.href = `/api/auth/oauth/${provider}`;
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <Button type="button" variant="secondary" onClick={() => start('github')}>
          <GitHubIcon />
          GitHub
        </Button>
        <Button type="button" variant="secondary" onClick={() => start('google')}>
          <GoogleIcon />
          Google
        </Button>
      </div>
      <div className="flex items-center gap-3 my-6">
        <span className="h-px flex-1 bg-line-strong" />
        <span className="text-[11px] font-medium uppercase tracking-wider text-ink-faint">or continue with email</span>
        <span className="h-px flex-1 bg-line-strong" />
      </div>
    </div>
  );
}
