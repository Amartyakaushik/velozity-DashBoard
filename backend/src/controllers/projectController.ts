import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { createProjectSchema } from "../validators/taskValidators";
import { Errors } from "../utils/errors";

// The core rule this whole controller exists to enforce: "PM can only see or
// edit projects they created." Every query below builds its `where` clause
// from req.user (server-trusted) — never from a client-supplied ownerId —
// so a Developer or a second PM can never read another PM's project by
// guessing an id, even with a validly-signed token for their own account.

export async function listProjects(req: Request, res: Response) {
  const { role, id: userId } = req.user!;

  const where = role === "ADMIN" ? {} : role === "PM" ? { pmId: userId } : undefined;

  if (where === undefined) {
    // Developers don't get a "list all projects" view — only via their tasks.
    throw Errors.forbidden("Developers cannot list projects directly");
  }

  const projects = await prisma.project.findMany({
    where,
    include: {
      client: { select: { name: true } },
      pm: { select: { name: true } },
      _count: { select: { tasks: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json({ projects });
}

export async function getProject(req: Request, res: Response) {
  const { role, id: userId } = req.user!;
  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    include: { client: true, pm: { select: { id: true, name: true } } },
  });
  if (!project) throw Errors.notFound("Project not found");

  if (role === "PM" && project.pmId !== userId) {
    throw Errors.forbidden("You do not manage this project");
  }
  if (role === "DEVELOPER") {
    // A developer may only view a project if they have at least one task in it.
    const hasTask = await prisma.task.findFirst({
      where: { projectId: project.id, assignedDeveloperId: userId },
      select: { id: true },
    });
    if (!hasTask) throw Errors.forbidden("You have no tasks in this project");
  }

  res.json({ project });
}

export async function createProject(req: Request, res: Response) {
  const input = createProjectSchema.parse(req.body);
  const { id: userId } = req.user!;

  // Whoever creates the project becomes its PM of record (Admins can create
  // and manage projects too, per the spec's "Admin: full access" row).
  const pmId = userId;

  const project = await prisma.project.create({
    data: {
      name: input.name,
      description: input.description,
      clientId: input.clientId,
      pmId,
    },
  });
  res.status(201).json({ project });
}
