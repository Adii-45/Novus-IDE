import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { api, apiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/stores/toastStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AuthLayout } from './AuthLayout';
import { OAuthButtons } from './OAuthButtons';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(60, 'Name is too long'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password is too long'),
});

function passwordStrength(pw: string): { score: 0 | 1 | 2 | 3; label: string } {
  if (!pw) return { score: 0, label: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12 && /[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ['Too short', 'Okay', 'Good', 'Strong'] as const;
  return { score: score as 0 | 1 | 2 | 3, label: labels[score] };
}

export default function SignUpPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState<Partial<Record<'name' | 'email' | 'password', string>>>({});
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => passwordStrength(form.password), [form.password]);

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
      const { data } = await api.post('/auth/register', parsed.data);
      useAuthStore.getState().setSession(data.accessToken, data.user);
      if (data.devVerifyLink) {
        // SMTP not configured — the server returned the link directly (dev only).
        toast.info('Verify your email', 'SMTP is not configured; the verification link was logged to the server console.');
      } else {
        toast.success('Welcome to NovusIDE', 'We sent you a verification email.');
      }
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error('Could not create account', apiErrorMessage(err));
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Free to start. Your first workspace is one click away."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/signin" className="font-medium text-primary hover:text-primary-hover transition-colors">
            Sign in
          </Link>
        </>
      }
    >
      <OAuthButtons />
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Input
          label="Full name"
          autoComplete="name"
          placeholder="Ada Lovelace"
          value={form.name}
          error={errors.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
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
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={form.password}
            error={errors.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          />
          {form.password && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex gap-1 flex-1">
                {[1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={cn(
                      'h-1 flex-1 rounded-full transition-colors duration-300',
                      strength.score >= i
                        ? strength.score === 1
                          ? 'bg-warn'
                          : strength.score === 2
                            ? 'bg-primary'
                            : 'bg-good'
                        : 'bg-white/[0.08]'
                    )}
                  />
                ))}
              </div>
              <span className="text-[11px] text-ink-faint w-16 text-right">{strength.label}</span>
            </div>
          )}
        </div>
        <Button type="submit" size="lg" loading={loading} className="w-full">
          Create account
        </Button>
        <p className="text-[11px] text-ink-faint text-center leading-relaxed">
          By signing up you agree to the Terms of Service and Privacy Policy.
        </p>
      </form>
    </AuthLayout>
  );
}
