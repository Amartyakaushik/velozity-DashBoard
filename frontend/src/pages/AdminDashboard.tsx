import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardShell from '../components/DashboardShell';
import { getAdminDashboard } from '../api/dashboard';
import { getApiErrorMessage } from '../api/errors';
import { useSocket } from '../context/SocketContext';
import type { AdminDashboardData, TaskStatus } from '../types';

const STATUS_ORDER: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

export default function AdminDashboard() {
  const { onlineCount } = useSocket();
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const result = await getAdminDashboard();
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(err, 'Failed to load admin dashboard'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <DashboardShell title="Admin Dashboard" loading={loading} error={error}>
      {data && (
        <div style={styles.grid}>
          <StatCard label="Total projects" value={data.totalProjects} />
          <StatCard label="Overdue tasks" value={data.overdueCount} />
          <StatCard label="Online users" value={onlineCount ?? data.onlineUsers} />

          <section style={styles.section}>
            <h2 style={styles.heading}>Tasks by status</h2>
            {STATUS_ORDER.every((status) => !data.tasksByStatus[status]) ? (
              <p style={styles.empty}>No tasks found.</p>
            ) : (
              <ul style={styles.list}>
                {STATUS_ORDER.map((status) => (
                  <li key={status} style={styles.row}>
                    <Link to={`/tasks?status=${status}`} style={styles.link}>
                      {status}
                    </Link>
                    <strong>{data.tasksByStatus[status] ?? 0}</strong>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </DashboardShell>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <section style={styles.card}>
      <p style={styles.cardLabel}>{label}</p>
      <p style={styles.cardValue}>{value}</p>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '1rem',
  },
  card: {
    padding: '1rem',
    border: '1px solid #e5e5e5',
    borderRadius: '8px',
    background: '#fff',
  },
  cardLabel: {
    margin: 0,
    color: '#555',
    fontSize: '0.85rem',
  },
  cardValue: {
    margin: '0.35rem 0 0',
    fontSize: '1.75rem',
    fontWeight: 700,
  },
  section: {
    gridColumn: '1 / -1',
    padding: '1rem',
    border: '1px solid #e5e5e5',
    borderRadius: '8px',
    background: '#fff',
  },
  heading: {
    margin: '0 0 0.75rem',
    fontSize: '1.1rem',
  },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.4rem 0',
    borderBottom: '1px solid #f0f0f0',
  },
  empty: {
    margin: 0,
    color: '#666',
  },
  link: {
    color: '#4f46e5',
    textDecoration: 'none',
  },
};
