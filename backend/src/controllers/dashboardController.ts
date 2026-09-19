import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { getOnlineUserCount } from "../sockets/socketServer";

export async function getAdminDashboard(_req: Request, res: Response) {
  const [totalProjects, statusCounts, overdueCount] = await Promise.all([
    prisma.project.count(),
    prisma.task.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.task.count({ where: { isOverdue: true } }),
  ]);

  res.json({
    totalProjects,
    tasksByStatus: Object.fromEntries(statusCounts.map((s) => [s.status, s._count._all])),
    overdueCount,
    // Live count comes from the actual open-socket registry, not a DB
    // "lastSeen" heuristic — it reflects who is connected right now.
    onlineUsers: getOnlineUserCount(),
  });
}

export async function getPmDashboard(req: Request, res: Response) {
  const pmId = req.user!.id;
  const weekFromNow = new Date();
  weekFromNow.setDate(weekFromNow.getDate() + 7);

  const [projects, priorityCounts, upcoming] = await Promise.all([
    prisma.project.findMany({
      where: { pmId },
      include: { _count: { select: { tasks: true } } },
    }),
    prisma.task.groupBy({
      by: ["priority"],
      where: { project: { pmId } },
      _count: { _all: true },
    }),
    prisma.task.findMany({
      where: { project: { pmId }, dueDate: { lte: weekFromNow, gte: new Date() } },
      orderBy: { dueDate: "asc" },
      include: { project: { select: { name: true } } },
    }),
  ]);

  res.json({
    projects,
    tasksByPriority: Object.fromEntries(priorityCounts.map((p) => [p.priority, p._count._all])),
    upcomingDueThisWeek: upcoming,
  });
}

export async function getDeveloperDashboard(req: Request, res: Response) {
  const developerId = req.user!.id;
  const tasks = await prisma.task.findMany({
    where: { assignedDeveloperId: developerId },
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
    include: { project: { select: { name: true } } },
  });
  res.json({ tasks });
}
