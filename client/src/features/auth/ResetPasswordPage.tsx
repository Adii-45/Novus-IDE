import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { api, apiErrorMessage } from '@/lib/api';
import { toast } from '@/stores/toastStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AuthLayout } from './AuthLayout';

const schema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password is too long'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Passwords don't match", path: ['confirm'] });

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';

  const [form, setForm] = useState({ password: '', confirm: '' });
  const [errors, setErrors] = useState<Partial<Record<'password' | 'confirm', string>>>({});
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
      await api.post('/auth/reset-password', { token, password: parsed.data.password });
      toast.success('Password updated', 'You can sign in with your new password now.');
      navigate('/signin', { replace: true });
    } catch (err) {
      toast.error('Reset failed', apiErrorMessage(err));
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout
        title="Invalid reset link"
        subtitle="This link is missing its reset token. Request a fresh one and try again."
        footer={
          <Link to="/forgot-password" className="font-medium text-primary hover:text-primary-hover transition-colors">
            Request a new link
          </Link>
        }
      >
        <div />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="This signs you out of all other devices."
      footer={
        <Link to="/signin" className="font-medium text-primary hover:text-primary-hover transition-colors">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={form.password}
          error={errors.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
        />
        <Input
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          placeholder="Repeat your new password"
          value={form.confirm}
          error={errors.confirm}
          onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
        />
        <Button type="submit" size="lg" loading={loading} className="w-full">
          Update password
        </Button>
      </form>
    </AuthLayout>
  );
}
