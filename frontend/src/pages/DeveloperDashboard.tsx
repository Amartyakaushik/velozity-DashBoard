import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardShell from '../components/DashboardShell';
import { getDeveloperDashboard } from '../api/dashboard';
import { getApiErrorMessage } from '../api/errors';
import type { DeveloperDashboardData } from '../types';

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

export default function DeveloperDashboard() {
  const [data, setData] = useState<DeveloperDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const result = await getDeveloperDashboard();
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(err, 'Failed to load developer dashboard'));
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
    <DashboardShell title="Developer Dashboard" loading={loading} error={error}>
      {data && (
        <section style={styles.section}>
          <h2 style={styles.heading}>
            Assigned tasks{' '}
            <Link to="/tasks" style={styles.link}>
              Open task list
            </Link>
          </h2>
          {data.tasks.length === 0 ? (
            <p style={styles.empty}>No tasks assigned.</p>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Task</th>
                    <th style={styles.th}>Project</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Priority</th>
                    <th style={styles.th}>Due</th>
                  </tr>
                </thead>
                <tbody>
                  {data.tasks.map((task) => (
                    <tr key={task.id}>
                      <td style={styles.td}>
                        #{task.number} {task.title}
                      </td>
                      <td style={styles.td}>{task.project.name}</td>
                      <td style={styles.td}>{task.status}</td>
                      <td style={styles.td}>{task.priority}</td>
                      <td style={styles.td}>{formatDate(task.dueDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </DashboardShell>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    padding: '1rem',
    border: '1px solid #e5e5e5',
    borderRadius: '8px',
    background: '#fff',
  },
  heading: {
    margin: '0 0 0.75rem',
    fontSize: '1.1rem',
  },
  empty: {
    margin: 0,
    color: '#666',
  },
  tableWrap: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    minWidth: '480px',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '0.4rem 0.5rem 0.4rem 0',
    borderBottom: '1px solid #ddd',
    fontSize: '0.85rem',
    color: '#555',
  },
  td: {
    padding: '0.45rem 0.5rem 0.45rem 0',
    borderBottom: '1px solid #f0f0f0',
  },
  link: {
    marginLeft: '0.75rem',
    color: '#4f46e5',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: 400,
  },
};
