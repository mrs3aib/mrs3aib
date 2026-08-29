import type { Request, Response } from "express";
import { gallerySettingsService } from "@/services/gallerySettingsService";

export const gallerySettingsController = {
  async get(req: Request, res: Response): Promise<void> {
    const settings = await gallerySettingsService.get(req.params.sessionId as string);
    res.status(200).json(settings);
  },

  async update(req: Request, res: Response): Promise<void> {
    const settings = await gallerySettingsService.update(
      req.params.sessionId as string,
      req.body
    );
    res.status(200).json(settings);
  }
};
