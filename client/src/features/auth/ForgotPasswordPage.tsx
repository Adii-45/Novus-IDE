import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MailCheck, ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import { api, apiErrorMessage } from '@/lib/api';
import { toast } from '@/stores/toastStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AuthLayout } from './AuthLayout';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devResetLink, setDevResetLink] = useState<string>();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = z.string().email('Enter a valid email address').safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setError(undefined);
    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email: parsed.data });
      setDevResetLink(data.devResetLink);
      setSent(true);
    } catch (err) {
      toast.error('Something went wrong', apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={sent ? 'Check your email' : 'Reset your password'}
      subtitle={
        sent
          ? `If an account exists for ${email}, a reset link is on its way.`
          : "Enter your account's email and we'll send you a link to reset your password."
      }
      footer={
        <Link
          to="/signin"
          className="inline-flex items-center gap-1.5 font-medium text-primary hover:text-primary-hover transition-colors"
        >
          <ArrowLeft size={14} />
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="card p-6 flex flex-col items-center text-center gap-3"
        >
          <span className="h-12 w-12 rounded-xl3 bg-good/10 flex items-center justify-center">
            <MailCheck size={22} className="text-good" />
          </span>
          <p className="text-sm text-ink-dim leading-relaxed">
            The link expires in one hour. Didn&apos;t get it? Check spam, or{' '}
            <button onClick={() => setSent(false)} className="text-primary hover:text-primary-hover transition-colors">
              try again
            </button>
            .
          </p>
          {devResetLink && (
            <Link to={devResetLink} className="text-[13px] font-medium text-primary hover:text-primary-hover transition-colors">
              Open reset link (dev — SMTP not configured)
            </Link>
          )}
        </motion.div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            error={error}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" size="lg" loading={loading} className="w-full">
            Send reset link
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
