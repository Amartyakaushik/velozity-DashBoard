import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { listProjects } from '../api/projects';

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
  onlineCount: number | null;
  socketError: string | null;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { accessToken, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const [socketError, setSocketError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !user) {
      setSocket(null);
      setConnected(false);
      setOnlineCount(null);
      setSocketError(null);
      return;
    }

    const instance = io(import.meta.env.VITE_API_URL, {
      auth: { token: accessToken },
      withCredentials: true,
    });

    const role = user.role;

    function subscribeAuthorizedProjects() {
      if (role !== 'ADMIN' && role !== 'PM') return;
      void listProjects()
        .then((projects) => {
          for (const project of projects) {
            instance.emit('project:subscribe', project.id);
          }
        })
        .catch(() => {
          // Project list is Admin/PM only; ignore if it fails.
        });
    }

    instance.on('connect', () => {
      setConnected(true);
      setSocketError(null);
      subscribeAuthorizedProjects();
    });

    instance.on('disconnect', () => {
      setConnected(false);
    });

    instance.on('connect_error', (err) => {
      setConnected(false);
      setSocketError(err.message || 'Socket connection failed');
    });

    instance.on('presence:count', (payload: { count?: number }) => {
      if (typeof payload?.count === 'number') {
        setOnlineCount(payload.count);
      }
    });

    setSocket(instance);

    return () => {
      instance.removeAllListeners();
      instance.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [accessToken, user]);

  return (
    <SocketContext.Provider value={{ socket, connected, onlineCount, socketError }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used inside <SocketProvider>');
  return ctx;
}
