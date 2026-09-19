/**
 * Module-level in-memory token store.
 *
 * Why a separate module (not just React state)?
 * The axios interceptor lives outside React's component tree. It needs to
 * read and write the access token synchronously without importing AuthContext
 * (which would create a circular dependency:
 *   axiosInstance → AuthContext → axiosInstance).
 *
 * AuthContext is the only writer after initialisation; the interceptor is
 * the only other writer (on successful silent refresh). React state in
 * AuthContext mirrors this value for UI re-renders.
 *
 * NEVER write this value to localStorage or sessionStorage.
 */

let _token: string | null = null;

export function getToken(): string | null {
  return _token;
}

export function setToken(token: string | null): void {
  _token = token;
}
