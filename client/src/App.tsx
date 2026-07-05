import { Suspense, lazy, useEffect, type ReactNode } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { refreshAccessToken } from '@/lib/api';
import { Toaster } from '@/components/ui/Toaster';
import { ContextMenuHost } from '@/components/ui/ContextMenu';
import { LogoMark } from '@/components/ui/Logo';

const LandingPage = lazy(() => import('@/features/landing/LandingPage'));
const SignInPage = lazy(() => import('@/features/auth/SignInPage'));
const SignUpPage = lazy(() => import('@/features/auth/SignUpPage'));
const ForgotPasswordPage = lazy(() => import('@/features/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/features/auth/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('@/features/auth/VerifyEmailPage'));
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'));
const ProjectSettingsPage = lazy(() => import('@/features/projects/ProjectSettingsPage'));
const IDEPage = lazy(() => import('@/features/ide/IDEPage'));

function BootScreen() {
  return (
    <div className="min-h-screen grid place-items-center bg-bg">
      <div className="flex flex-col items-center gap-4 animate-fade-up">
        <LogoMark className="h-12 w-12" />
        <div className="h-1 w-32 rounded-full bg-surface-raised overflow-hidden">
          <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-primary to-violet animate-shimmer" />
        </div>
      </div>
    </div>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, booting } = useAuthStore();
  const location = useLocation();
  if (booting) return <BootScreen />;
  if (!user) return <Navigate to="/signin" state={{ from: location.pathname }} replace />;
  return <>{children}</>;
}

function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { user, booting } = useAuthStore();
  if (booting) return <BootScreen />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  // Silent session restore on first load.
  useEffect(() => {
    refreshAccessToken().finally(() => useAuthStore.getState().setBooted());
  }, []);

  return (
    <>
      <Suspense fallback={<BootScreen />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/signin" element={<RedirectIfAuthed><SignInPage /></RedirectIfAuthed>} />
          <Route path="/signup" element={<RedirectIfAuthed><SignUpPage /></RedirectIfAuthed>} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
          <Route path="/settings/*" element={<RequireAuth><SettingsPage /></RequireAuth>} />
          <Route path="/project/:projectId/settings" element={<RequireAuth><ProjectSettingsPage /></RequireAuth>} />
          <Route path="/ide/:projectId" element={<RequireAuth><IDEPage /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <Toaster />
      <ContextMenuHost />
    </>
  );
}
