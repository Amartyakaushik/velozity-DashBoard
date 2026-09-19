import { useEffect, useRef, useState } from 'react';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api/notifications';
import { getApiErrorMessage } from '../api/errors';
import { useSocket } from '../context/SocketContext';
import type { Notification } from '../types';

export default function NotificationBell() {
  const { socket } = useSocket();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const idsRef = useRef(new Set<string>());
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await listNotifications();
        if (cancelled) return;
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
        idsRef.current = new Set(data.notifications.map((item) => item.id));
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(err, 'Failed to load notifications'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    function onNew(payload: Notification) {
      if (!payload?.id || idsRef.current.has(payload.id)) return;
      idsRef.current.add(payload.id);
      setNotifications((current) => [payload, ...current]);
    }

    function onUnread(payload: { count?: number }) {
      if (typeof payload?.count === 'number') setUnreadCount(payload.count);
    }

    socket.on('notification:new', onNew);
    socket.on('notification:unread_count', onUnread);
    return () => {
      socket.off('notification:new', onNew);
      socket.off('notification:unread_count', onUnread);
    };
  }, [socket]);

  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocumentClick);
    return () => document.removeEventListener('mousedown', onDocumentClick);
  }, []);

  async function handleReadOne(id: string) {
    try {
      await markNotificationRead(id);
      setError(null);
      setNotifications((current) =>
        current.map((item) => (item.id === id ? { ...item, read: true } : item))
      );
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to mark notification read'));
    }
  }

  async function handleReadAll() {
    try {
      await markAllNotificationsRead();
      setError(null);
      setNotifications((current) => current.map((item) => ({ ...item, read: true })));
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to mark all notifications read'));
    }
  }

  return (
    <div ref={rootRef} style={styles.wrap}>
      <button type="button" onClick={() => setOpen((value) => !value)} style={styles.bell}>
        Notifications
        {unreadCount > 0 && <span style={styles.badge}>{unreadCount}</span>}
      </button>
      {open && (
        <div style={styles.dropdown}>
          <div style={styles.dropdownHeader}>
            <strong>Notifications</strong>
            <button type="button" onClick={() => void handleReadAll()} style={styles.linkBtn}>
              Mark all read
            </button>
          </div>
          {error && <p style={styles.error}>{error}</p>}
          {loading && <p style={styles.muted}>Loading notifications…</p>}
          {!loading && notifications.length === 0 && !error && (
            <p style={styles.muted}>No notifications.</p>
          )}
          {!loading && notifications.length > 0 && (
            <ul style={styles.list}>
              {notifications.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!item.read) void handleReadOne(item.id);
                    }}
                    style={{
                      ...styles.item,
                      fontWeight: item.read ? 400 : 600,
                      background: item.read ? 'transparent' : '#eef2ff',
                    }}
                  >
                    <span>{item.message}</span>
                    <span style={styles.time}>{new Date(item.createdAt).toLocaleString()}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    position: 'relative',
  },
  bell: {
    position: 'relative',
    padding: '0.4rem 0.75rem',
    border: '1px solid #ccc',
    borderRadius: '4px',
    background: '#fff',
    cursor: 'pointer',
  },
  badge: {
    marginLeft: '0.4rem',
    minWidth: '1.25rem',
    padding: '0 0.35rem',
    borderRadius: '999px',
    background: '#dc2626',
    color: '#fff',
    fontSize: '0.75rem',
    fontWeight: 700,
  },
  dropdown: {
    position: 'absolute',
    right: 0,
    top: 'calc(100% + 0.4rem)',
    width: 'min(320px, calc(100vw - 2rem))',
    maxHeight: '360px',
    overflowY: 'auto',
    background: '#fff',
    border: '1px solid #e5e5e5',
    borderRadius: '8px',
    boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
    zIndex: 20,
    padding: '0.75rem',
    textAlign: 'left',
  },
  dropdownHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
    gap: '0.5rem',
  },
  linkBtn: {
    border: 'none',
    background: 'none',
    color: '#4f46e5',
    cursor: 'pointer',
    fontSize: '0.8rem',
    padding: 0,
  },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  item: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem',
    width: '100%',
    textAlign: 'left',
    border: 'none',
    borderRadius: '4px',
    padding: '0.5rem',
    cursor: 'pointer',
    marginBottom: '0.25rem',
  },
  time: {
    fontSize: '0.75rem',
    color: '#777',
    fontWeight: 400,
  },
  muted: {
    margin: 0,
    color: '#666',
    fontSize: '0.875rem',
  },
  error: {
    margin: 0,
    padding: '0.5rem',
    background: '#fee2e2',
    color: '#b91c1c',
    borderRadius: '4px',
    fontSize: '0.8rem',
  },
};
