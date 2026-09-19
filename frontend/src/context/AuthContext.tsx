import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { AuthUser } from '../types';
import { login as apiLogin, logout as apiLogout, refresh as apiRefresh } from '../api/auth';
import { setToken } from '../api/tokenStore';

// ─── Context shape ────────────────────────────────────────────────────────────

export interface AuthContextValue {
  /** Authenticated user, or null when logged out / not yet resolved. */
  user: AuthUser | null;
  /**
   * Short-lived JWT kept IN MEMORY ONLY.
   * Synced to tokenStore for interceptor use. Never written to storage APIs.
   */
  accessToken: string | null;
  /** True while the initial silent-refresh check is running on mount. */
  isLoading: boolean;
  /** Convenience: true once isLoading is false and user is non-null. */
  isAuthenticated: boolean;
  /**
   * Log in with email + password.
   * POSTs to POST /api/auth/login — exact fields from backend inspection.
   * Throws on failure (caller is responsible for catching and showing errors).
   */
  login: (email: string, password: string) => Promise<void>;
  /**
   * Log out: clears in-memory state and calls POST /api/auth/logout to revoke
   * the HttpOnly refresh cookie on the backend.
   */
  logout: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  // isLoading=true until the silent refresh attempt on mount completes.
  const [isLoading, setIsLoading] = useState(true);

  // ── Internal helper: set both React state and the module-level tokenStore ──
  // tokenStore is what the axios interceptor reads; React state is what the UI reads.
  const persistAuth = useCallback((token: string, u: AuthUser) => {
    setToken(token);
    setAccessToken(token);
    setUser(u);
  }, []);

  const clearAuth = useCallback(() => {
    setToken(null);
    setAccessToken(null);
    setUser(null);
  }, []);

  // ── Silent refresh on mount ───────────────────────────────────────────────
  // Attempt POST /api/auth/refresh. If the HttpOnly cookie is still valid the
  // backend rotates it and returns a fresh access token + user — the user
  // resumes their session without seeing the login page again.
  useEffect(() => {
    let cancelled = false;

    async function attemptSilentRefresh() {
      try {
        const data = await apiRefresh(); // POST /api/auth/refresh, cookie sent automatically
        if (!cancelled) persistAuth(data.accessToken, data.user);
      } catch {
        // No valid cookie or it expired — start logged out. That's fine.
        if (!cancelled) clearAuth();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    attemptSilentRefresh();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Listen for interceptor-driven events ──────────────────────────────────
  // The axios interceptor cannot import AuthContext (circular dep), so it uses
  // CustomEvents to signal token updates and session expiry back here.
  useEffect(() => {
    function onTokenRefreshed(e: Event) {
      const { token, user } = (e as CustomEvent<{ token: string; user: AuthUser }>).detail;
      // Update React state to match what the interceptor already wrote to tokenStore.
      setAccessToken(token);
      setUser(user);
    }

    function onSessionExpired() {
      clearAuth();
      // The ProtectedRoute will detect user===null and redirect to /login.
    }

    window.addEventListener('auth:tokenRefreshed', onTokenRefreshed);
    window.addEventListener('auth:sessionExpired', onSessionExpired);
    return () => {
      window.removeEventListener('auth:tokenRefreshed', onTokenRefreshed);
      window.removeEventListener('auth:sessionExpired', onSessionExpired);
    };
  }, [clearAuth]);

  // ── login ─────────────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    const data = await apiLogin({ email, password }); // POST /api/auth/login
    persistAuth(data.accessToken, data.user);
    // Refresh cookie is set by the backend response automatically.
  }, [persistAuth]);

  // ── logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await apiLogout(); // POST /api/auth/logout — revokes server-side refresh token
    } catch {
      // Even if the server call fails (e.g. already expired), clear local state.
    } finally {
      clearAuth();
    }
  }, [clearAuth]);

  const value: AuthContextValue = {
    user,
    accessToken,
    isLoading,
    isAuthenticated: !isLoading && user !== null,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
