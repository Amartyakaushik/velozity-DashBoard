import api from './axiosInstance';
import type { ListedProject } from '../types';

export async function listProjects(): Promise<ListedProject[]> {
  const { data } = await api.get<{ projects: ListedProject[] }>('/api/projects');
  return data.projects;
}
