import api from './axiosInstance';
import type { ActivityEvent, ActivityRecentResponse } from '../types';

export async function getRecentActivity(): Promise<ActivityEvent[]> {
  const { data } = await api.get<ActivityRecentResponse>('/api/activity/recent');
  return data.events;
}
