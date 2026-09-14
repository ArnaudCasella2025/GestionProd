import { useState, type FormEvent } from 'react';
import { authErrorMessage, signup } from '../../lib/auth';

interface SignupPageProps {
  onSwitchToLogin: () => void;
}

export function SignupPage({ onSwitchToLogin }: SignupPageProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setSubmitting(true);
    try {
      await signup(email, password, name);
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
        <h1 className="auth-title">Créer un compte</h1>

        <div className="field">
          <label htmlFor="signup-name">Nom</label>
          <input id="signup-name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
        </div>
        <div className="field">
          <label htmlFor="signup-email">Email</label>
          <input
            id="signup-email"
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="signup-password">Mot de passe</label>
          <input
            id="signup-password"
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="signup-confirm">Confirmer le mot de passe</label>
          <input
            id="signup-confirm"
            type="password"
            className="input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          {mismatch && <span className="auth-hint-warning">Les mots de passe ne correspondent pas.</span>}
        </div>

        {error && <p className="auth-error">{error}</p>}

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting || mismatch}>
          {submitting ? 'Création…' : 'Créer mon compte'}
        </button>

        <div className="auth-links">
          <button type="button" className="btn-ghost" onClick={onSwitchToLogin}>
            J'ai déjà un compte
          </button>
        </div>
      </form>
    </div>
  );
}
