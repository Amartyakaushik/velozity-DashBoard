import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../types';
import type { CSSProperties, ReactNode } from 'react';

interface Props {
  /** Which roles may access this route. */
  allowedRoles: Role[];
  children: ReactNode;
}

/**
 * ProtectedRoute
 *
 * Behaviour:
 *  - While the initial silent-refresh check is running (isLoading=true):
 *    show a loading message rather than flashing the login page for returning
 *    users with a valid cookie.
 *  - If not authenticated → redirect to /login.
 *  - If authenticated but wrong role → redirect to the user's correct dashboard.
 *    This handles someone manually typing /dashboard/admin while logged in as PM.
 *  - If authenticated and correct role → render children.
 *
 * NOTE: This is a UX-only guard. The backend enforces RBAC on every request —
 * a user with a forged role claim would get a 403 from the API.
 */
export default function ProtectedRoute({ allowedRoles, children }: Props) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <p style={loadingStyle}>Loading session…</p>;
  }

  // Not authenticated at all.
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Authenticated but not allowed on this route → bounce to the correct dashboard.
  if (!allowedRoles.includes(user.role)) {
    const home =
      user.role === 'ADMIN'
        ? '/dashboard/admin'
        : user.role === 'PM'
        ? '/dashboard/pm'
        : '/dashboard/developer';
    return <Navigate to={home} replace />;
  }

  return <>{children}</>;
}

const loadingStyle: CSSProperties = {
  margin: '1.5rem',
  fontFamily: 'sans-serif',
  color: '#555',
};
