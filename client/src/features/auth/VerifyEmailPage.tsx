import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { AuthLayout } from './AuthLayout';

type Status = 'verifying' | 'success' | 'error';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const user = useAuthStore((s) => s.user);

  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'error');
  const [message, setMessage] = useState(token ? '' : 'This verification link is missing its token.');
  const ran = useRef(false);

  useEffect(() => {
    if (!token || ran.current) return;
    ran.current = true; // StrictMode double-invoke guard — the token is single-use
    api
      .post('/auth/verify-email', { token })
      .then(() => {
        setStatus('success');
        const u = useAuthStore.getState().user;
        if (u) useAuthStore.getState().setUser({ ...u, emailVerified: true });
      })
      .catch((err) => {
        setStatus('error');
        setMessage(apiErrorMessage(err));
      });
  }, [token]);

  const body = {
    verifying: (
      <div className="card p-8 flex flex-col items-center gap-4 text-center">
        <Spinner className="h-6 w-6 text-primary" />
        <p className="text-sm text-ink-dim">Verifying your email…</p>
      </div>
    ),
    success: (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="card p-8 flex flex-col items-center gap-4 text-center"
      >
        <span className="h-14 w-14 rounded-full bg-good/10 flex items-center justify-center">
          <CheckCircle2 size={26} className="text-good" />
        </span>
        <div>
          <p className="text-[15px] font-semibold text-ink">Email verified</p>
          <p className="mt-1 text-sm text-ink-dim">Your account is fully set up. Happy building!</p>
        </div>
        <Link to={user ? '/dashboard' : '/signin'} className="w-full">
          <Button size="lg" className="w-full">
            {user ? 'Go to dashboard' : 'Sign in'}
          </Button>
        </Link>
      </motion.div>
    ),
    error: (
      <div className="card p-8 flex flex-col items-center gap-4 text-center">
        <span className="h-14 w-14 rounded-full bg-bad/10 flex items-center justify-center">
          <XCircle size={26} className="text-bad" />
        </span>
        <div>
          <p className="text-[15px] font-semibold text-ink">Verification failed</p>
          <p className="mt-1 text-sm text-ink-dim">{message}</p>
        </div>
        <Link to={user ? '/dashboard' : '/signin'} className="w-full">
          <Button variant="secondary" size="lg" className="w-full">
            {user ? 'Back to dashboard' : 'Back to sign in'}
          </Button>
        </Link>
      </div>
    ),
  }[status];

  return (
    <AuthLayout title="Email verification" subtitle="Confirming your address with NovusIDE.">
      {body}
    </AuthLayout>
  );
}
