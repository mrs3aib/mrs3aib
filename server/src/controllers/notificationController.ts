import type { Request, Response } from "express";
import { notificationService } from "@/services/notificationService";

export const notificationController = {
  async list(req: Request, res: Response): Promise<void> {
    const { limit } = req.query as { limit?: string | number };
    const result = await notificationService.list(limit as number | undefined);
    res.status(200).json(result);
  }
};
