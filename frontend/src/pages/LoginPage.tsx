import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../api/errors';

function dashboardPath(role: string) {
  if (role === 'ADMIN') return '/dashboard/admin';
  if (role === 'PM') return '/dashboard/pm';
  return '/dashboard/developer';
}

export default function LoginPage() {
  const { login, user, isLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) navigate(dashboardPath(user.role), { replace: true });
  }, [user, navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to reach the server. Is the backend running?'));
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div style={styles.page}>
        <p style={styles.status}>Checking session…</p>
      </div>
    );
  }

  if (user) {
    return (
      <div style={styles.page}>
        <p style={styles.status}>Redirecting…</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Velozity</h1>
        <p style={styles.subtitle}>Sign in to your account</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Email
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={styles.input}
              placeholder="you@example.com"
            />
          </label>

          <label style={styles.label}>
            Password
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={styles.input}
              placeholder="••••••••"
            />
          </label>

          {error && <p style={styles.error}>{error}</p>}

          <button
            id="login-submit"
            type="submit"
            disabled={submitting}
            style={{ ...styles.button, opacity: submitting ? 0.6 : 1 }}
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    fontFamily: 'sans-serif',
    padding: '1rem',
  },
  card: {
    backgroundColor: '#fff',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
    width: '100%',
    maxWidth: '380px',
  },
  title: {
    margin: '0 0 0.25rem',
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#111',
  },
  subtitle: {
    margin: '0 0 1.5rem',
    color: '#666',
    fontSize: '0.9rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#333',
  },
  input: {
    padding: '0.5rem 0.75rem',
    fontSize: '1rem',
    border: '1px solid #ccc',
    borderRadius: '4px',
    outline: 'none',
  },
  button: {
    marginTop: '0.5rem',
    padding: '0.6rem',
    fontSize: '1rem',
    fontWeight: 600,
    backgroundColor: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  error: {
    margin: 0,
    padding: '0.5rem 0.75rem',
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    borderRadius: '4px',
    fontSize: '0.875rem',
  },
  status: {
    margin: 0,
    color: '#555',
    fontFamily: 'sans-serif',
  },
};
