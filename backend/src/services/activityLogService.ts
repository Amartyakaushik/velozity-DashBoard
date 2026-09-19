import { prisma } from "../config/prisma";
import { getIO } from "../sockets/socketServer";

interface RecordActivityInput {
  projectId: string;
  taskId?: string;
  actorId: string;
  actorName: string;
  action: string;
  fromValue?: string;
  toValue?: string;
  message: string;
}

// This is the ONLY place activity events are created. Every caller (task
// status changes, task creation/assignment, etc.) goes through here so the
// DB write and the real-time fan-out can never drift apart, and so the
// role-based filtering logic lives in exactly one place.
export async function recordActivity(input: RecordActivityInput) {
  const event = await prisma.activityLog.create({
    data: {
      projectId: input.projectId,
      taskId: input.taskId,
      actorId: input.actorId,
      action: input.action,
      fromValue: input.fromValue,
      toValue: input.toValue,
      message: input.message,
    },
  });

  // Determine who's allowed to see this event in real time, then deliver it
  // ONLY to those sockets — filtering happens here on the server, not by
  // broadcasting everything and letting the client decide what to show.
  const project = await prisma.project.findUnique({
    where: { id: input.projectId },
    select: { pmId: true },
  });

  const io = getIO();
  const payload = {
    id: event.id,
    projectId: event.projectId,
    taskId: event.taskId,
    actorId: event.actorId,
    actorName: input.actorName,
    action: event.action,
    fromValue: event.fromValue,
    toValue: event.toValue,
    message: event.message,
    createdAt: event.createdAt,
  };

  // 1. Global feed for every admin, regardless of project.
  io.to("role:ADMIN").emit("activity:new", payload);

  // 2. Anyone (PM sockets, verified on subscribe) currently viewing this
  //    specific project's room.
  io.to(`project:${input.projectId}`).emit("activity:new", payload);

  // 3. The PM who owns the project, even if they aren't currently viewing
  //    that project's page (e.g. they're on their dashboard) — delivered to
  //    their personal room.
  if (project) {
    io.to(`user:${project.pmId}`).emit("activity:new", payload);
  }

  // 4. The developer assigned to the task, scoped to just their own tasks.
  if (input.taskId) {
    const task = await prisma.task.findUnique({
      where: { id: input.taskId },
      select: { assignedDeveloperId: true },
    });
    if (task?.assignedDeveloperId) {
      io.to(`user:${task.assignedDeveloperId}`).emit("activity:new", payload);
    }
  }

  return event;
}

// Powers "if a user is offline and comes back, show the last 20 events they
// missed" — always read from the database, never from an in-memory cache
// (which would be lost on server restart and wouldn't scale past one node).
export async function getRecentActivityForUser(userId: string, role: string) {
  if (role === "ADMIN") {
    return prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { actor: { select: { name: true } } },
    });
  }

  if (role === "PM") {
    return prisma.activityLog.findMany({
      where: { project: { pmId: userId } },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { actor: { select: { name: true } } },
    });
  }

  // DEVELOPER: only activity on tasks assigned to them.
  return prisma.activityLog.findMany({
    where: { task: { assignedDeveloperId: userId } },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { actor: { select: { name: true } } },
  });
}
