import { useEffect, useRef, useState } from 'react';
import { getRecentActivity } from '../api/activity';
import { getApiErrorMessage } from '../api/errors';
import { useSocket } from '../context/SocketContext';
import type { ActivityEvent } from '../types';

function sortNewestFirst(events: ActivityEvent[]) {
  return [...events].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function mergeById(existing: ActivityEvent[], incoming: ActivityEvent[]) {
  const map = new Map<string, ActivityEvent>();
  for (const event of existing) map.set(event.id, event);
  for (const event of incoming) map.set(event.id, event);
  return sortNewestFirst([...map.values()]);
}

export default function ActivityFeed() {
  const { socket, connected, socketError } = useSocket();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const idsRef = useRef(new Set<string>());

  useEffect(() => {
    if (!socket) {
      setEvents([]);
      idsRef.current = new Set();
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function catchUp() {
      setLoading(true);
      setError(null);
      try {
        const recent = await getRecentActivity();
        if (cancelled) return;
        setEvents((current) => {
          const next = mergeById(current, recent);
          idsRef.current = new Set(next.map((event) => event.id));
          return next;
        });
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(err, 'Failed to load activity'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    function onActivityNew(payload: ActivityEvent) {
      if (!payload?.id || !payload.message || idsRef.current.has(payload.id)) return;
      idsRef.current.add(payload.id);
      setEvents((current) => mergeById(current, [payload]));
    }

    socket.on('activity:new', onActivityNew);
    socket.on('connect', catchUp);
    if (socket.connected) void catchUp();

    return () => {
      cancelled = true;
      socket.off('activity:new', onActivityNew);
      socket.off('connect', catchUp);
    };
  }, [socket]);

  return (
    <section style={styles.section}>
      <div style={styles.header}>
        <h2 style={styles.heading}>Activity</h2>
        <span style={styles.status}>
          {connected ? 'Live' : socketError ? 'Disconnected' : 'Connecting…'}
        </span>
      </div>
      {socketError && <p style={styles.error}>{socketError}</p>}
      {error && <p style={styles.error}>{error}</p>}
      {loading && <p style={styles.muted}>Loading activity…</p>}
      {!loading && events.length === 0 && !error && (
        <p style={styles.muted}>No recent activity.</p>
      )}
      {!loading && events.length > 0 && (
        <ul style={styles.list}>
          {events.map((event) => (
            <li key={event.id} style={styles.item}>
              <p style={styles.message}>{event.message}</p>
              <p style={styles.time}>{new Date(event.createdAt).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    marginTop: '1rem',
    padding: '1rem',
    border: '1px solid #e5e5e5',
    borderRadius: '8px',
    background: '#fff',
    textAlign: 'left',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.75rem',
  },
  heading: {
    margin: 0,
    fontSize: '1.1rem',
  },
  status: {
    fontSize: '0.8rem',
    color: '#555',
  },
  muted: {
    margin: 0,
    color: '#666',
  },
  error: {
    margin: '0 0 0.5rem',
    padding: '0.5rem 0.75rem',
    background: '#fee2e2',
    color: '#b91c1c',
    borderRadius: '4px',
    fontSize: '0.875rem',
  },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    maxHeight: '280px',
    overflowY: 'auto',
  },
  item: {
    padding: '0.45rem 0',
    borderBottom: '1px solid #f0f0f0',
  },
  message: {
    margin: 0,
    fontSize: '0.95rem',
  },
  time: {
    margin: '0.2rem 0 0',
    fontSize: '0.75rem',
    color: '#777',
  },
};
