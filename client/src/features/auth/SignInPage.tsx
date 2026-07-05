import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { api, apiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/stores/toastStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AuthLayout } from './AuthLayout';
import { OAuthButtons } from './OAuthButtons';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

export default function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Partial<Record<'email' | 'password', string>>>({});
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof typeof errors;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', parsed.data);
      useAuthStore.getState().setSession(data.accessToken, data.user);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from && from.startsWith('/') ? from : '/dashboard', { replace: true });
    } catch (err) {
      toast.error('Sign in failed', apiErrorMessage(err));
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to pick up where you left off."
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="font-medium text-primary hover:text-primary-hover transition-colors">
            Sign up for free
          </Link>
        </>
      }
    >
      <OAuthButtons />
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={form.email}
          error={errors.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        />
        <div>
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={form.password}
            error={errors.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          />
          <div className="mt-2 text-right">
            <Link to="/forgot-password" className="text-[13px] text-ink-dim hover:text-primary transition-colors">
              Forgot password?
            </Link>
          </div>
        </div>
        <Button type="submit" size="lg" loading={loading} className="w-full">
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}
