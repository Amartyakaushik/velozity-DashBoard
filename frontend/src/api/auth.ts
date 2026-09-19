import api from './axiosInstance';
import type { LoginRequest, LoginResponse, AuthUser } from '../types';

/**
 * POST /api/auth/login
 * Request:  { email, password }
 * Response: { accessToken, user: { id, name, email, role } }
 *
 * The HttpOnly refresh cookie is set automatically by the backend response.
 * The caller is responsible for storing accessToken in memory only.
 */
export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/api/auth/login', credentials);
  return data;
}

/**
 * POST /api/auth/refresh
 * No body — the HttpOnly cookie is sent automatically (withCredentials: true).
 * Returns a new accessToken and the current user.
 */
export async function refresh(): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/api/auth/refresh');
  return data;
}

/**
 * POST /api/auth/logout
 * Revokes the refresh token on the server and clears the cookie.
 */
export async function logout(): Promise<void> {
  await api.post('/api/auth/logout');
}

/**
 * GET /api/auth/me
 * Returns the authenticated user. Requires Authorization: Bearer <token> header
 * (set by the AuthContext interceptor once the user is logged in).
 */
export async function getMe(): Promise<AuthUser> {
  const { data } = await api.get<{ user: AuthUser }>('/api/auth/me');
  return data.user;
}
