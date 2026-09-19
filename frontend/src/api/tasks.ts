import api from './axiosInstance';
import type {
  CreateTaskRequest,
  ListedTask,
  Task,
  TaskListResponse,
  TaskStatus,
  UpdateTaskStatusResponse,
} from '../types';

export interface TaskListFilters {
  status?: TaskStatus;
  priority?: string;
  dueBefore?: string;
  dueAfter?: string;
  projectId?: string;
}

export async function listTasks(filters: TaskListFilters): Promise<ListedTask[]> {
  const { data } = await api.get<TaskListResponse>('/api/tasks', { params: filters });
  return data.tasks;
}

export async function updateTaskStatus(
  id: string,
  status: TaskStatus
): Promise<UpdateTaskStatusResponse> {
  const { data } = await api.patch<UpdateTaskStatusResponse>(`/api/tasks/${id}/status`, {
    status,
  });
  return data;
}

export async function createTask(
  projectId: string,
  body: CreateTaskRequest
): Promise<Task> {
  const { data } = await api.post<{ task: Task }>(`/api/projects/${projectId}/tasks`, body);
  return data.task;
}
