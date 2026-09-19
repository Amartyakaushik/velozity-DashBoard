import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { markNotificationRead, markAllNotificationsRead } from "../services/notificationService";

export async function listNotifications(req: Request, res: Response) {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.id }, // always scoped to the caller — never client-supplied
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const unreadCount = notifications.filter((n) => !n.read).length;
  res.json({ notifications, unreadCount });
}

export async function markRead(req: Request, res: Response) {
  await markNotificationRead(req.user!.id, req.params.id);
  res.json({ success: true });
}

export async function markAllRead(req: Request, res: Response) {
  await markAllNotificationsRead(req.user!.id);
  res.json({ success: true });
}
