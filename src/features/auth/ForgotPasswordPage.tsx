import { useState, type FormEvent } from 'react';
import { authErrorMessage, resetPassword } from '../../lib/auth';

interface ForgotPasswordPageProps {
  onSwitchToLogin: () => void;
}

export function ForgotPasswordPage({ onSwitchToLogin }: ForgotPasswordPageProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await resetPassword(email);
      setSent(true);
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
        <h1 className="auth-title">Mot de passe oublié</h1>
        <p className="text-muted">
          Indiquez votre email, nous vous enverrons un lien pour réinitialiser votre mot de passe.
        </p>

        <div className="field">
          <label htmlFor="forgot-email">Email</label>
          <input
            id="forgot-email"
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            required
          />
        </div>

        {error && <p className="auth-error">{error}</p>}
        {sent && <p className="auth-success">Email envoyé — vérifiez votre boîte de réception.</p>}

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Envoi…' : 'Envoyer le lien'}
        </button>

        <div className="auth-links">
          <button type="button" className="btn-ghost" onClick={onSwitchToLogin}>
            Retour à la connexion
          </button>
        </div>
      </form>
    </div>
  );
}
