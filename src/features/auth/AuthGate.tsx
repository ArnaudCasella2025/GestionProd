import { useState, type ReactNode } from 'react';
import { useAuthUser } from '../../lib/auth';
import { ForgotPasswordPage } from './ForgotPasswordPage';
import { LoginPage } from './LoginPage';
import { SignupPage } from './SignupPage';

type Mode = 'login' | 'signup' | 'forgot';

interface AuthGateProps {
  children: ReactNode;
}

/** Shows the login/signup/forgot-password screens until someone is signed
 * in, then renders the app. */
export function AuthGate({ children }: AuthGateProps) {
  const { user, loading } = useAuthUser();
  const [mode, setMode] = useState<Mode>('login');

  if (loading) {
    return (
      <div className="auth-page">
        <p className="text-muted">Chargement…</p>
      </div>
    );
  }

  if (!user) {
    if (mode === 'signup') return <SignupPage onSwitchToLogin={() => setMode('login')} />;
    if (mode === 'forgot') return <ForgotPasswordPage onSwitchToLogin={() => setMode('login')} />;
    return <LoginPage onSwitchToSignup={() => setMode('signup')} onSwitchToForgot={() => setMode('forgot')} />;
  }

  return <>{children}</>;
}
