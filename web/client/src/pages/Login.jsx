import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { user, signIn, signInWithMagicLink } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink() {
    if (!email) { setError('Enter your email first'); return; }
    setError('');
    setLoading(true);
    try {
      await signInWithMagicLink(email);
      setMagicLinkSent(true);
    } catch (err) {
      setError(err.message || 'Failed to send magic link');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100dvh', padding: '1.5rem', maxWidth: 420, margin: '0 auto', width: '100%' }}>
        <div className="stack">
          <div className="text-center">
            <img src="/logo.png" alt="VoltPal" style={{ width: 260, marginBottom: '0.5rem', display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />
            <p className="text-secondary">AI field companion for industrial electricians</p>
          </div>

          {error && <div className="error-banner">{error}</div>}

          {magicLinkSent ? (
            <div className="info-box">Check your email for a magic link to sign in.</div>
          ) : (
            <form onSubmit={handleSubmit} className="stack">
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input id="email" type="email" className="input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input id="password" type="password" className="input" placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
              <button type="button" className="btn btn-secondary btn-block" onClick={handleMagicLink} disabled={loading}>
                Send Magic Link
              </button>
            </form>
          )}

          <p className="text-center text-secondary" style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
            Don't have an account? <Link to="/signup">Sign Up</Link>
          </p>
        </div>
    </div>
  );
}
