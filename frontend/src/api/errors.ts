import axios from 'axios';
import type { NestedApiError } from '../types';

/**
 * Reads the backend errorHandler shape:
 * { error: { code, message, details } }
 */
export function getApiErrorMessage(err: unknown, fallback = 'Request failed'): string {
  if (axios.isAxiosError(err) && err.response?.data) {
    const data = err.response.data as Partial<NestedApiError> & { error?: unknown };
    const error = data.error;
    if (error && typeof error === 'object' && 'message' in error) {
      const message = (error as { message: unknown }).message;
      if (typeof message === 'string' && message.trim()) return message;
    }
  }
  return fallback;
}
