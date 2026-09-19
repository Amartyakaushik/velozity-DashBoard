import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { Errors } from "../utils/errors";
import {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  taskFilterSchema,
} from "../validators/taskValidators";
import { recordActivity } from "../services/activityLogService";
import { notifyTaskAssigned, notifyTaskInReview } from "../services/notificationService";

const STATUS_LABEL: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
};

// Builds the Prisma `where` clause for the caller's role. This is the single
// choke point that guarantees a Developer's query can never surface another
// developer's tasks, and a PM's query can never surface another PM's tasks —
// regardless of what projectId/filters are passed in.
function scopedWhere(
  user: { id: string; role: string },
  filters: ReturnType<typeof taskFilterSchema.parse>
): Prisma.TaskWhereInput {
  const base: Prisma.TaskWhereInput = {};

  if (filters.status) base.status = filters.status;
  if (filters.priority) base.priority = filters.priority;
  if (filters.projectId) base.projectId = filters.projectId;
  if (filters.dueBefore || filters.dueAfter) {
    base.dueDate = {
      ...(filters.dueBefore ? { lte: new Date(filters.dueBefore) } : {}),
      ...(filters.dueAfter ? { gte: new Date(filters.dueAfter) } : {}),
    };
  }

  if (user.role === "ADMIN") return base;
  if (user.role === "PM") return { ...base, project: { pmId: user.id } };
  // DEVELOPER
  return { ...base, assignedDeveloperId: user.id };
}

export async function listTasks(req: Request, res: Response) {
  const filters = taskFilterSchema.parse(req.query);
  const where = scopedWhere(req.user!, filters);

  const tasks = await prisma.task.findMany({
    where,
    include: {
      project: { select: { id: true, name: true, pmId: true } },
      assignedDeveloper: { select: { id: true, name: true } },
    },
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
  });
  res.json({ tasks });
}

async function assertTaskAccess(taskId: string, user: { id: string; role: string }) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: true },
  });
  if (!task) throw Errors.notFound("Task not found");

  if (user.role === "PM" && task.project.pmId !== user.id) {
    throw Errors.forbidden("You do not manage this task's project");
  }
  if (user.role === "DEVELOPER" && task.assignedDeveloperId !== user.id) {
    throw Errors.forbidden("This task is not assigned to you");
  }
  return task;
}

export async function getTask(req: Request, res: Response) {
  const task = await assertTaskAccess(req.params.id, req.user!);
  res.json({ task });
}

export async function createTask(req: Request, res: Response) {
  const input = createTaskSchema.parse(req.body);
  const { role, id: userId } = req.user!;
  const projectId = req.params.projectId;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw Errors.notFound("Project not found");
  if (role === "PM" && project.pmId !== userId) {
    throw Errors.forbidden("You do not manage this project");
  }

  const task = await prisma.task.create({
    data: {
      projectId,
      title: input.title,
      description: input.description,
      assignedDeveloperId: input.assignedDeveloperId,
      priority: input.priority ?? "MEDIUM",
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
    },
  });

  const actor = await prisma.user.findUnique({ where: { id: userId } });

  await recordActivity({
    projectId,
    taskId: task.id,
    actorId: userId,
    actorName: actor!.name,
    action: "TASK_CREATED",
    message: `${actor!.name} created Task #${task.number} "${task.title}"`,
  });

  if (task.assignedDeveloperId) {
    await notifyTaskAssigned({
      developerId: task.assignedDeveloperId,
      taskId: task.id,
      taskTitle: task.title,
    });
  }

  res.status(201).json({ task });
}

export async function updateTask(req: Request, res: Response) {
  const input = updateTaskSchema.parse(req.body);
  const existing = await assertTaskAccess(req.params.id, req.user!);
  // Developers may not edit task metadata, only status (enforced by route wiring too).
  if (req.user!.role === "DEVELOPER") {
    throw Errors.forbidden("Developers can only update task status");
  }

  const wasUnassigned = existing.assignedDeveloperId;
  const task = await prisma.task.update({
    where: { id: existing.id },
    data: {
      title: input.title,
      description: input.description,
      assignedDeveloperId: input.assignedDeveloperId ?? undefined,
      priority: input.priority,
      dueDate:
        input.dueDate === null ? null : input.dueDate ? new Date(input.dueDate) : undefined,
    },
  });

  if (task.assignedDeveloperId && task.assignedDeveloperId !== wasUnassigned) {
    await notifyTaskAssigned({
      developerId: task.assignedDeveloperId,
      taskId: task.id,
      taskTitle: task.title,
    });
  }

  res.json({ task });
}

export async function updateTaskStatus(req: Request, res: Response) {
  const { status } = updateTaskStatusSchema.parse(req.body);
  const { id: userId, role } = req.user!;
  const task = await assertTaskAccess(req.params.id, req.user!);

  if (task.status === status) {
    return res.json({ task }); // no-op, nothing to log
  }

  const updated = await prisma.task.update({
    where: { id: task.id },
    data: { status },
  });

  const actor = await prisma.user.findUnique({ where: { id: userId } });

  // Status changes are recorded with a timestamp and the acting user, in the
  // database — this row IS the log entry, never derived after the fact from
  // Task.updatedAt.
  await recordActivity({
    projectId: task.projectId,
    taskId: task.id,
    actorId: userId,
    actorName: actor!.name,
    action: "STATUS_CHANGE",
    fromValue: task.status,
    toValue: status,
    message: `${actor!.name} moved Task #${task.number} from ${STATUS_LABEL[task.status]} \u2192 ${STATUS_LABEL[status]}`,
  });

  if (status === "IN_REVIEW") {
    const project = await prisma.project.findUnique({ where: { id: task.projectId } });
    if (project) {
      await notifyTaskInReview({
        pmId: project.pmId,
        taskId: task.id,
        taskTitle: task.title,
      });
    }
  }

  res.json({ task: updated, previousStatus: task.status, actorRole: role });
}
