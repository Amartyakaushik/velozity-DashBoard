import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardShell from '../components/DashboardShell';
import { useAuth } from '../context/AuthContext';
import { createTask, listTasks, updateTaskStatus } from '../api/tasks';
import { listProjects } from '../api/projects';
import { listDevelopers } from '../api/users';
import { getApiErrorMessage } from '../api/errors';
import {
  datetimeLocalToIso,
  formatDate,
  isoToDatetimeLocal,
  isIsoDatetime,
  isUuid,
} from '../utils/datetime';
import type {
  CreateTaskRequest,
  DeveloperOption,
  ListedProject,
  ListedTask,
  TaskPriority,
  TaskStatus,
} from '../types';

const STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
const PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

function isStatus(value: string): value is TaskStatus {
  return (STATUSES as string[]).includes(value);
}

function isPriority(value: string): value is TaskPriority {
  return (PRIORITIES as string[]).includes(value);
}

export default function TaskListPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const canManage = user?.role === 'ADMIN' || user?.role === 'PM';

  const [tasks, setTasks] = useState<ListedTask[]>([]);
  const [projects, setProjects] = useState<ListedProject[]>([]);
  const [developers, setDevelopers] = useState<DeveloperOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const statusParam = searchParams.get('status') ?? '';
  const priorityParam = searchParams.get('priority') ?? '';
  const dueBeforeParam = searchParams.get('dueBefore') ?? '';
  const dueAfterParam = searchParams.get('dueAfter') ?? '';
  const projectIdParam = searchParams.get('projectId') ?? '';

  const queryFilters = useMemo(() => {
    const filters: {
      status?: TaskStatus;
      priority?: TaskPriority;
      dueBefore?: string;
      dueAfter?: string;
      projectId?: string;
    } = {};
    if (isStatus(statusParam)) filters.status = statusParam;
    if (isPriority(priorityParam)) filters.priority = priorityParam;
    if (dueBeforeParam && isIsoDatetime(dueBeforeParam)) filters.dueBefore = dueBeforeParam;
    if (dueAfterParam && isIsoDatetime(dueAfterParam)) filters.dueAfter = dueAfterParam;
    if (projectIdParam && isUuid(projectIdParam)) filters.projectId = projectIdParam;
    return filters;
  }, [statusParam, priorityParam, dueBeforeParam, dueAfterParam, projectIdParam]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setActionError(null);
      try {
        const [taskRows, projectRows, developerRows] = await Promise.all([
          listTasks(queryFilters),
          canManage ? listProjects() : Promise.resolve([]),
          canManage ? listDevelopers() : Promise.resolve([]),
        ]);
        if (cancelled) return;
        setTasks(taskRows);
        setProjects(projectRows);
        setDevelopers(developerRows);
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(err, 'Failed to load tasks'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [canManage, queryFilters]);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  }

  function clearFilters() {
    setSearchParams({}, { replace: true });
  }

  async function handleStatusChange(taskId: string, status: TaskStatus) {
    setUpdatingId(taskId);
    setActionError(null);
    try {
      await updateTaskStatus(taskId, status);
      setTasks(await listTasks(queryFilters));
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Failed to update task status'));
    } finally {
      setUpdatingId(null);
    }
  }

  const hasFilters = Boolean(
    statusParam || priorityParam || dueBeforeParam || dueAfterParam || projectIdParam
  );

  const projectOptions = canManage
    ? projects.map((project) => ({ id: project.id, name: project.name }))
    : uniqueProjectsFromTasks(tasks, projectIdParam);

  return (
    <DashboardShell title="Tasks" loading={loading} error={error} loadingLabel="Loading tasks…">
      <div style={styles.stack}>
        {actionError && <p style={styles.error}>{actionError}</p>}
        <section style={styles.section}>
          <h2 style={styles.heading}>Filters</h2>
          <div style={styles.filters}>
            <label style={styles.label}>
              Status
              <select
                value={isStatus(statusParam) ? statusParam : ''}
                onChange={(e) => setParam('status', e.target.value)}
                style={styles.input}
              >
                <option value="">All</option>
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label style={styles.label}>
              Priority
              <select
                value={isPriority(priorityParam) ? priorityParam : ''}
                onChange={(e) => setParam('priority', e.target.value)}
                style={styles.input}
              >
                <option value="">All</option>
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </label>
            <label style={styles.label}>
              Project
              <select
                value={projectIdParam && isUuid(projectIdParam) ? projectIdParam : ''}
                onChange={(e) => setParam('projectId', e.target.value)}
                style={styles.input}
              >
                <option value="">All</option>
                {projectOptions.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            <label style={styles.label}>
              Due after
              <input
                type="datetime-local"
                value={dueAfterParam ? isoToDatetimeLocal(dueAfterParam) : ''}
                onChange={(e) =>
                  setParam('dueAfter', e.target.value ? datetimeLocalToIso(e.target.value) : '')
                }
                style={styles.input}
              />
            </label>
            <label style={styles.label}>
              Due before
              <input
                type="datetime-local"
                value={dueBeforeParam ? isoToDatetimeLocal(dueBeforeParam) : ''}
                onChange={(e) =>
                  setParam('dueBefore', e.target.value ? datetimeLocalToIso(e.target.value) : '')
                }
                style={styles.input}
              />
            </label>
          </div>
          <button type="button" onClick={clearFilters} style={styles.secondary}>
            Clear filters
          </button>
        </section>

        {canManage && (
          <CreateTaskForm
            projects={projects}
            developers={developers}
            onCreated={async () => {
              const rows = await listTasks(queryFilters);
              setTasks(rows);
            }}
            onError={setActionError}
          />
        )}

        <section style={styles.section}>
          <h2 style={styles.heading}>Task list</h2>
          {tasks.length === 0 ? (
            <p style={styles.empty}>
              {hasFilters ? 'No tasks match these filters.' : 'No tasks found.'}
            </p>
          ) : (
            <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Task</th>
                  <th style={styles.th}>Project</th>
                  <th style={styles.th}>Developer</th>
                  <th style={styles.th}>Priority</th>
                  <th style={styles.th}>Due</th>
                  <th style={styles.th}>Overdue</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id}>
                    <td style={styles.td}>
                      #{task.number} {task.title}
                    </td>
                    <td style={styles.td}>{task.project.name}</td>
                    <td style={styles.td}>{task.assignedDeveloper?.name ?? '—'}</td>
                    <td style={styles.td}>{task.priority}</td>
                    <td style={styles.td}>{formatDate(task.dueDate)}</td>
                    <td style={styles.td}>{task.isOverdue ? 'Yes' : 'No'}</td>
                    <td style={styles.td}>
                      <select
                        value={task.status}
                        disabled={updatingId === task.id}
                        onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                        style={styles.input}
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}

function uniqueProjectsFromTasks(tasks: ListedTask[], selectedId: string) {
  const map = new Map<string, string>();
  for (const task of tasks) {
    map.set(task.project.id, task.project.name);
  }
  if (selectedId && isUuid(selectedId) && !map.has(selectedId)) {
    map.set(selectedId, selectedId);
  }
  return [...map.entries()].map(([id, name]) => ({ id, name }));
}

function CreateTaskForm({
  projects,
  developers,
  onCreated,
  onError,
}: {
  projects: ListedProject[];
  developers: DeveloperOption[];
  onCreated: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedDeveloperId, setAssignedDeveloperId] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [dueLocal, setDueLocal] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!projectId || !title.trim()) return;
    setSaving(true);
    onError('');
    try {
      const body: CreateTaskRequest = { title: title.trim(), priority };
      if (description.trim()) body.description = description.trim();
      if (assignedDeveloperId) body.assignedDeveloperId = assignedDeveloperId;
      if (dueLocal) body.dueDate = datetimeLocalToIso(dueLocal);
      await createTask(projectId, body);
      setTitle('');
      setDescription('');
      setAssignedDeveloperId('');
      setDueLocal('');
      await onCreated();
    } catch (err) {
      onError(getApiErrorMessage(err, 'Failed to create task'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section style={styles.section}>
      <h2 style={styles.heading}>Create task</h2>
      {projects.length === 0 && (
        <p style={styles.empty}>No projects available to create a task.</p>
      )}
      <form onSubmit={handleSubmit} style={styles.form}>
        <label style={styles.label}>
          Project
          <select
            required
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            style={styles.input}
          >
            <option value="">Select a project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        <label style={styles.label}>
          Title
          <input
            required
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={styles.input}
          />
        </label>
        <label style={styles.label}>
          Description
          <textarea
            maxLength={4000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={styles.input}
            rows={3}
          />
        </label>
        <label style={styles.label}>
          Assignee
          <select
            value={assignedDeveloperId}
            onChange={(e) => setAssignedDeveloperId(e.target.value)}
            style={styles.input}
          >
            <option value="">Unassigned</option>
            {developers.map((developer) => (
              <option key={developer.id} value={developer.id}>
                {developer.name}
              </option>
            ))}
          </select>
        </label>
        <label style={styles.label}>
          Priority
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            style={styles.input}
          >
            {PRIORITIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label style={styles.label}>
          Due date
          <input
            type="datetime-local"
            value={dueLocal}
            onChange={(e) => setDueLocal(e.target.value)}
            style={styles.input}
          />
        </label>
        <button type="submit" disabled={saving} style={styles.button}>
          {saving ? 'Creating…' : 'Create task'}
        </button>
      </form>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  stack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  section: {
    padding: '1rem',
    border: '1px solid #e5e5e5',
    borderRadius: '8px',
    background: '#fff',
  },
  heading: {
    margin: '0 0 0.75rem',
    fontSize: '1.1rem',
  },
  empty: {
    margin: 0,
    color: '#666',
  },
  error: {
    margin: 0,
    padding: '0.75rem',
    background: '#fee2e2',
    color: '#b91c1c',
    borderRadius: '4px',
  },
  filters: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '0.75rem',
    marginBottom: '0.75rem',
  },
  form: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '0.75rem',
    alignItems: 'end',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
    fontSize: '0.85rem',
    color: '#333',
  },
  input: {
    padding: '0.4rem 0.5rem',
    fontSize: '0.95rem',
    border: '1px solid #ccc',
    borderRadius: '4px',
  },
  button: {
    padding: '0.5rem 0.75rem',
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontWeight: 600,
    cursor: 'pointer',
    height: '2.25rem',
  },
  secondary: {
    padding: '0.4rem 0.75rem',
    border: '1px solid #ccc',
    borderRadius: '4px',
    background: '#fff',
    cursor: 'pointer',
  },
  tableWrap: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    minWidth: '640px',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '0.4rem 0.5rem 0.4rem 0',
    borderBottom: '1px solid #ddd',
    fontSize: '0.85rem',
    color: '#555',
  },
  td: {
    padding: '0.45rem 0.5rem 0.45rem 0',
    borderBottom: '1px solid #f0f0f0',
    verticalAlign: 'middle',
  },
};
