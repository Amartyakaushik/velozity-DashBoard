import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardShell from '../components/DashboardShell';
import { getPmDashboard } from '../api/dashboard';
import { getApiErrorMessage } from '../api/errors';
import type { PmDashboardData, TaskPriority } from '../types';

const PRIORITY_ORDER: TaskPriority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

export default function PmDashboard() {
  const [data, setData] = useState<PmDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const result = await getPmDashboard();
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(err, 'Failed to load PM dashboard'));
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
    <DashboardShell title="PM Dashboard" loading={loading} error={error}>
      {data && (
        <div style={styles.stack}>
          <section style={styles.section}>
            <h2 style={styles.heading}>Projects</h2>
            {data.projects.length === 0 ? (
              <p style={styles.empty}>No projects assigned.</p>
            ) : (
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Name</th>
                      <th style={styles.th}>Tasks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.projects.map((project) => (
                      <tr key={project.id}>
                        <td style={styles.td}>
                          <Link to={`/tasks?projectId=${project.id}`} style={styles.link}>
                            {project.name}
                          </Link>
                        </td>
                        <td style={styles.td}>{project._count.tasks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section style={styles.section}>
            <h2 style={styles.heading}>Tasks by priority</h2>
            {PRIORITY_ORDER.every((priority) => !data.tasksByPriority[priority]) ? (
              <p style={styles.empty}>No tasks found.</p>
            ) : (
              <ul style={styles.list}>
                {PRIORITY_ORDER.map((priority) => (
                  <li key={priority} style={styles.row}>
                    <span>{priority}</span>
                    <strong>{data.tasksByPriority[priority] ?? 0}</strong>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section style={styles.section}>
            <h2 style={styles.heading}>Upcoming due this week</h2>
            {data.upcomingDueThisWeek.length === 0 ? (
              <p style={styles.empty}>No tasks due this week.</p>
            ) : (
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Task</th>
                      <th style={styles.th}>Project</th>
                      <th style={styles.th}>Priority</th>
                      <th style={styles.th}>Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.upcomingDueThisWeek.map((task) => (
                      <tr key={task.id}>
                        <td style={styles.td}>
                          #{task.number} {task.title}
                        </td>
                        <td style={styles.td}>{task.project.name}</td>
                        <td style={styles.td}>{task.priority}</td>
                        <td style={styles.td}>{formatDate(task.dueDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </DashboardShell>
  );
}

const styles: Record<string, React.CSSProperties> = {
  stack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
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
  tableWrap: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    minWidth: '360px',
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
    color: '#4f46e5',
    textDecoration: 'none',
  },
};
