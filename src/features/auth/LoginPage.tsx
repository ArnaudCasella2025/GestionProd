import { useState, type FormEvent } from 'react';
import { authErrorMessage, login } from '../../lib/auth';

interface LoginPageProps {
  onSwitchToSignup: () => void;
  onSwitchToForgot: () => void;
}

export function LoginPage({ onSwitchToSignup, onSwitchToForgot }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <div className="nav-brand">GestionProd</div>
        <h1 className="auth-title">Connexion</h1>

        <div className="field">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            required
          />
        </div>
        <div className="field">
          <label htmlFor="login-password">Mot de passe</label>
          <input
            id="login-password"
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <p className="auth-error">{error}</p>}

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Connexion…' : 'Se connecter'}
        </button>

        <div className="auth-links">
          <button type="button" className="btn-ghost" onClick={onSwitchToForgot}>
            Mot de passe oublié ?
          </button>
          <button type="button" className="btn-ghost" onClick={onSwitchToSignup}>
            Créer un compte
          </button>
        </div>
      </form>
    </div>
  );
}
