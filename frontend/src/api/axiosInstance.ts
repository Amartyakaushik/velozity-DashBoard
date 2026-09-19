import axios, { type AxiosRequestConfig } from 'axios';
import { getToken, setToken } from './tokenStore';
import type { LoginResponse } from '../types';

// ─── Base instance ────────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  /**
   * withCredentials: true is required so the browser automatically sends the
   * HttpOnly refresh cookie (velozity_refresh) on every request, including the
   * POST /api/auth/refresh rotation call made by the interceptor below.
   */
  withCredentials: true,
});

// ─── Request interceptor — attach Bearer token ────────────────────────────────

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── 401 refresh interceptor ──────────────────────────────────────────────────
//
// Design goals:
//  1. On 401, try POST /api/auth/refresh once, then retry the original request.
//  2. If multiple requests fail with 401 simultaneously, only ONE refresh call
//     is made. All other failing requests are queued and replayed once the
//     single refresh resolves (or rejected if it fails).
//  3. Never retry the /api/auth/refresh endpoint itself — that would loop.

let isRefreshing = false;

// Subscribers waiting for the in-flight refresh to complete.
// Each entry is a pair of [resolve, reject] for a pending request.
type PendingResolver = (token: string) => void;
type PendingRejecter = (err: unknown) => void;
const pendingQueue: Array<[PendingResolver, PendingRejecter]> = [];

function drainQueue(token: string) {
  pendingQueue.splice(0).forEach(([resolve]) => resolve(token));
}

function rejectQueue(err: unknown) {
  pendingQueue.splice(0).forEach(([, reject]) => reject(err));
}

api.interceptors.response.use(
  // Pass-through for successful responses.
  (response) => response,

  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Only intercept 401 errors, and only once per request (guard _retry flag).
    // Skip auth endpoints: refresh would loop, and login/logout 401s are the
    // actual result the UI needs to display ({ error: { message } }).
    const url = originalRequest.url ?? '';
    const isAuthEndpoint =
      url.includes('/api/auth/refresh') ||
      url.includes('/api/auth/login') ||
      url.includes('/api/auth/logout');
    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      isAuthEndpoint
    ) {
      return Promise.reject(error);
    }

    // Mark so this request won't be retried again if the second attempt 401s.
    originalRequest._retry = true;

    if (isRefreshing) {
      // Another refresh is already in flight. Queue this request and wait.
      return new Promise<unknown>((resolve, reject) => {
        pendingQueue.push([
          (newToken) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            resolve(api(originalRequest));
          },
          reject,
        ]);
      });
    }

    // We are the first 401 — kick off the refresh.
    isRefreshing = true;

    try {
      // POST /api/auth/refresh — cookie is sent automatically (withCredentials).
      const { data } = await axios.post<LoginResponse>(
        `${import.meta.env.VITE_API_URL}/api/auth/refresh`,
        undefined,
        { withCredentials: true }
      );

      const newToken = data.accessToken;
      setToken(newToken);

      // Let AuthContext know the token has changed so it can update React state.
      // We fire a custom event rather than importing AuthContext to avoid the
      // circular dependency.
      window.dispatchEvent(
        new CustomEvent('auth:tokenRefreshed', { detail: { token: newToken, user: data.user } })
      );

      // Replay all queued requests with the new token.
      drainQueue(newToken);

      // Retry the original request.
      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
      }
      return api(originalRequest);
    } catch (refreshError) {
      // Refresh failed — session is dead. Signal AuthContext to clear state.
      setToken(null);
      rejectQueue(refreshError);
      window.dispatchEvent(new CustomEvent('auth:sessionExpired'));
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
