import type { Request, Response } from "express";
import { clientService } from "@/services/clientService";

export const clientController = {
  async list(req: Request, res: Response): Promise<void> {
    const { page, pageSize, search, sessionId } = req.query as {
      page?: string | number;
      pageSize?: string | number;
      search?: string;
      sessionId?: string;
    };
    const result = await clientService.list({
      page: page as number | undefined,
      pageSize: pageSize as number | undefined,
      search,
      sessionId
    });
    res.status(200).json(result);
  },

  async create(req: Request, res: Response): Promise<void> {
    const client = await clientService.create(req.body);
    res.status(201).json(client);
  },

  async update(req: Request, res: Response): Promise<void> {
    const client = await clientService.update(req.params.id as string, req.body);
    res.status(200).json(client);
  },

  async resetPassword(req: Request, res: Response): Promise<void> {
    const { password } = req.body as { password: string };
    await clientService.resetPassword(req.params.id as string, password);
    res.status(204).send();
  },

  async delete(req: Request, res: Response): Promise<void> {
    await clientService.delete(req.params.id as string);
    res.status(204).send();
  }
};
