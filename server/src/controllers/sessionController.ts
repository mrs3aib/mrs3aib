import type { Request, Response } from "express";
import { sessionService } from "@/services/sessionService";
import type { SessionSort } from "@/repositories/sessionRepository";
import type { SessionCategory, SessionStatus } from "@prisma/client";

export const sessionController = {
  async list(req: Request, res: Response): Promise<void> {
    const { page, pageSize, search, status, category, sort } = req.query as {
      page?: string | number;
      pageSize?: string | number;
      search?: string;
      status?: SessionStatus;
      category?: SessionCategory;
      sort?: SessionSort;
    };
    const result = await sessionService.list({
      page: page as number | undefined,
      pageSize: pageSize as number | undefined,
      search,
      status,
      category,
      sort
    });
    res.status(200).json(result);
  },

  async getById(req: Request, res: Response): Promise<void> {
    const session = await sessionService.getById(req.params.id as string);
    res.status(200).json(session);
  },

  async create(req: Request, res: Response): Promise<void> {
    const session = await sessionService.create(req.body);
    res.status(201).json(session);
  },

  async update(req: Request, res: Response): Promise<void> {
    const session = await sessionService.update(req.params.id as string, req.body);
    res.status(200).json(session);
  },

  async delete(req: Request, res: Response): Promise<void> {
    await sessionService.delete(req.params.id as string);
    res.status(204).send();
  },

  async assignClients(req: Request, res: Response): Promise<void> {
    const { sessionId } = req.params as { sessionId: string };
    const { clientIds } = req.body as { clientIds: string[] };
    await sessionService.assignClients(sessionId, clientIds);
    res.status(200).json({ message: "Clients assigned" });
  }
};
