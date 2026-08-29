import type { Request, Response } from "express";
import { dashboardService } from "@/services/dashboardService";

export const dashboardController = {
  async getStatistics(_req: Request, res: Response): Promise<void> {
    const stats = await dashboardService.getStatistics();
    res.status(200).json(stats);
  }
};
