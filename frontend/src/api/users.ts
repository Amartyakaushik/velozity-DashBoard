import api from './axiosInstance';
import type { DeveloperOption } from '../types';

export async function listDevelopers(): Promise<DeveloperOption[]> {
  const { data } = await api.get<{ developers: DeveloperOption[] }>('/api/users/developers');
  return data.developers;
}
