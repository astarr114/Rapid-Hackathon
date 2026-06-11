import { FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ThemeToggle } from '../components/ThemeToggle';

export function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/';

  const [email, setEmail] = useState('sre@company.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.');
      return;
    }
    if (login(email, password)) {
      navigate(from, { replace: true });
    } else {
      setError('Invalid credentials.');
    }
  }

  return (
    <div className="login-page">
      <div className="login-page__theme">
        <ThemeToggle />
      </div>
      <div className="login-card">
        <div className="login-card__header">
          <img src="/aroa-logo.png" alt="AROA" className="login-card__logo" />
          <h1>Sign in</h1>
          <p>Autonomous Reliability &amp; Operations Agent</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="username"
            />
          </label>
          <label className="form-field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter any password (demo)"
              autoComplete="current-password"
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn btn--primary btn--full">
            Sign in
          </button>
        </form>

        <p className="login-hint">Demo mode: any non-empty email and password will work.</p>
      </div>
    </div>
  );
}
