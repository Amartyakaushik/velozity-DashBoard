import api from './axiosInstance';
import type { NotificationListResponse } from '../types';

export async function listNotifications(): Promise<NotificationListResponse> {
  const { data } = await api.get<NotificationListResponse>('/api/notifications');
  return data;
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.patch(`/api/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.patch('/api/notifications/read-all');
}
