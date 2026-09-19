import { prisma } from "../config/prisma";
import { getIO } from "../sockets/socketServer";
import { NotificationType } from "@prisma/client";

async function pushUnreadCount(userId: string) {
  const count = await prisma.notification.count({
    where: { userId, read: false },
  });
  // Real-time via WebSocket, per the spec — no polling.
  getIO().to(`user:${userId}`).emit("notification:unread_count", { count });
}

export async function notifyTaskAssigned(params: {
  developerId: string;
  taskId: string;
  taskTitle: string;
}) {
  const notification = await prisma.notification.create({
    data: {
      userId: params.developerId,
      taskId: params.taskId,
      type: NotificationType.TASK_ASSIGNED,
      message: `You were assigned to "${params.taskTitle}"`,
    },
  });
  getIO().to(`user:${params.developerId}`).emit("notification:new", notification);
  await pushUnreadCount(params.developerId);
  return notification;
}

export async function notifyTaskInReview(params: {
  pmId: string;
  taskId: string;
  taskTitle: string;
}) {
  const notification = await prisma.notification.create({
    data: {
      userId: params.pmId,
      taskId: params.taskId,
      type: NotificationType.TASK_IN_REVIEW,
      message: `"${params.taskTitle}" was moved to In Review`,
    },
  });
  getIO().to(`user:${params.pmId}`).emit("notification:new", notification);
  await pushUnreadCount(params.pmId);
  return notification;
}

export async function markNotificationRead(userId: string, notificationId: string) {
  await prisma.notification.updateMany({
    where: { id: notificationId, userId }, // scoped to owner — can't mark others' notifications read
    data: { read: true },
  });
  await pushUnreadCount(userId);
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
  await pushUnreadCount(userId);
}
