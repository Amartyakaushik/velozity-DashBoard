import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";

export async function listClients(_req: Request, res: Response) {
  const clients = await prisma.client.findMany({ orderBy: { name: "asc" } });
  res.json({ clients });
}

const createClientSchema = z.object({ name: z.string().min(1).max(200) });

export async function createClient(req: Request, res: Response) {
  const { name } = createClientSchema.parse(req.body);
  const client = await prisma.client.create({ data: { name } });
  res.status(201).json({ client });
}
