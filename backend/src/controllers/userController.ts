import { Request, Response } from "express";
import { prisma } from "../config/prisma";

export async function listDevelopers(_req: Request, res: Response) {
  const developers = await prisma.user.findMany({
    where: { role: "DEVELOPER" },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
  res.json({ developers });
}

export async function listAllUsers(_req: Request, res: Response) {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  res.json({ users });
}
