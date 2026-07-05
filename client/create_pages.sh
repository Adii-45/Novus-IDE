#!/bin/bash
echo "export default function LandingPage() { return <div>Landing Page</div>; }" > src/features/landing/LandingPage.tsx
echo "export default function SignInPage() { return <div>SignIn Page</div>; }" > src/features/auth/SignInPage.tsx
echo "export default function SignUpPage() { return <div>SignUp Page</div>; }" > src/features/auth/SignUpPage.tsx
echo "export default function ForgotPasswordPage() { return <div>Forgot Password Page</div>; }" > src/features/auth/ForgotPasswordPage.tsx
echo "export default function ResetPasswordPage() { return <div>Reset Password Page</div>; }" > src/features/auth/ResetPasswordPage.tsx
echo "export default function VerifyEmailPage() { return <div>Verify Email Page</div>; }" > src/features/auth/VerifyEmailPage.tsx
echo "export default function DashboardPage() { return <div>Dashboard Page</div>; }" > src/features/dashboard/DashboardPage.tsx
echo "export default function SettingsPage() { return <div>Settings Page</div>; }" > src/features/settings/SettingsPage.tsx
echo "export default function ProjectSettingsPage() { return <div>Project Settings Page</div>; }" > src/features/projects/ProjectSettingsPage.tsx
echo "export default function IDEPage() { return <div>IDE Page</div>; }" > src/features/ide/IDEPage.tsx
chmod +x create_pages.sh
./create_pages.sh
