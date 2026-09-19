// Domain types mirroring the backend Prisma enums and response shapes.
// Field names are taken directly from the backend source-of-truth inspection.

export type Role = 'ADMIN' | 'PM' | 'DEVELOPER';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type NotificationType = 'TASK_ASSIGNED' | 'TASK_IN_REVIEW';

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

// ─── Project ─────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  description?: string;
  clientId: string;
  pmId: string;
  createdAt: string;
}

// ─── Task ────────────────────────────────────────────────────────────────────

export interface Task {
  id: string;
  number: number;
  projectId: string;
  title: string;
  description?: string;
  assignedDeveloperId?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  isOverdue: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Notification ─────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  userId: string;
  taskId?: string | null;
  type: NotificationType;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  unreadCount: number;
}

// ─── Activity ────────────────────────────────────────────────────────────────

export interface ActivityEvent {
  id: string;
  projectId: string;
  taskId?: string | null;
  actorId: string;
  actorName?: string;
  actor?: { name: string };
  action: string;
  fromValue?: string | null;
  toValue?: string | null;
  message: string;
  createdAt: string;
}

export interface ActivityRecentResponse {
  events: ActivityEvent[];
}

// ─── Dashboards (exact fields from dashboardController.ts) ─────────────────────

export interface AdminDashboardData {
  totalProjects: number;
  tasksByStatus: Partial<Record<TaskStatus, number>>;
  overdueCount: number;
  onlineUsers: number;
}

export interface PmProject extends Project {
  _count: { tasks: number };
}

export interface TaskWithProjectName extends Task {
  project: { name: string };
}

export interface PmDashboardData {
  projects: PmProject[];
  tasksByPriority: Partial<Record<TaskPriority, number>>;
  upcomingDueThisWeek: TaskWithProjectName[];
}

export interface DeveloperDashboardData {
  tasks: TaskWithProjectName[];
}

// ─── Task list (GET /api/tasks include shape) ─────────────────────────────────

export interface ListedTask extends Task {
  project: { id: string; name: string; pmId: string };
  assignedDeveloper: { id: string; name: string } | null;
}

export interface TaskListResponse {
  tasks: ListedTask[];
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  assignedDeveloperId?: string;
  priority?: TaskPriority;
  dueDate?: string;
}

export interface UpdateTaskStatusResponse {
  task: Task;
  previousStatus: TaskStatus;
  actorRole: Role;
}

export interface ListedProject extends Project {
  client: { name: string };
  pm: { name: string };
  _count: { tasks: number };
}

export interface DeveloperOption {
  id: string;
  name: string;
  email: string;
}

// ─── API error shape ─────────────────────────────────────────────────────────
// backend/src/middleware/errorHandler.ts — { error: { code, message, details } }

export interface NestedApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
