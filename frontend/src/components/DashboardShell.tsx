import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ActivityFeed from './ActivityFeed';
import NotificationBell from './NotificationBell';

interface Props {
  title: string;
  loading: boolean;
  error: string | null;
  children: ReactNode;
  loadingLabel?: string;
}

function dashboardPath(role: string) {
  if (role === 'ADMIN') return '/dashboard/admin';
  if (role === 'PM') return '/dashboard/pm';
  return '/dashboard/developer';
}

export default function DashboardShell({
  title,
  loading,
  error,
  children,
  loadingLabel = 'Loading…',
}: Props) {
  const { user, logout } = useAuth();

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>{title}</h1>
          {user && (
            <p style={styles.meta}>
              {user.name} · {user.role}
            </p>
          )}
          {user && (
            <nav style={styles.nav}>
              <Link to={dashboardPath(user.role)} style={styles.navLink}>
                Dashboard
              </Link>
              <Link to="/tasks" style={styles.navLink}>
                Tasks
              </Link>
            </nav>
          )}
        </div>
        <div style={styles.actions}>
          <NotificationBell />
          <button type="button" onClick={() => void logout()} style={styles.logout}>
            Sign out
          </button>
        </div>
      </header>

      {loading && <p style={styles.status}>{loadingLabel}</p>}
      {!loading && error && <p style={styles.error}>{error}</p>}
      {!loading && !error && children}
      {user && <ActivityFeed />}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    width: '100%',
    maxWidth: '1100px',
    margin: '0 auto',
    boxSizing: 'border-box',
    padding: '1.5rem 1rem',
    textAlign: 'left',
    fontFamily: 'sans-serif',
    color: '#111',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  title: {
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: 700,
  },
  meta: {
    margin: '0.25rem 0 0',
    color: '#555',
    fontSize: '0.9rem',
  },
  nav: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: '0.6rem',
  },
  navLink: {
    color: '#4f46e5',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: 600,
  },
  actions: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.5rem',
  },
  logout: {
    padding: '0.4rem 0.75rem',
    border: '1px solid #ccc',
    borderRadius: '4px',
    background: '#fff',
    cursor: 'pointer',
  },
  status: {
    margin: 0,
    color: '#555',
  },
  error: {
    margin: 0,
    padding: '0.75rem',
    background: '#fee2e2',
    color: '#b91c1c',
    borderRadius: '4px',
  },
};
