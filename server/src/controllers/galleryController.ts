import type { Request, Response } from "express";
import { galleryService } from "@/services/galleryService";
import { UnauthorizedError } from "@/types/errors";
import { requireClientSessionId } from "@/utils/clientSession";

export const galleryController = {
  async getOwn(req: Request, res: Response): Promise<void> {
    if (req.auth?.role !== "client") throw new UnauthorizedError();
    const gallery = await galleryService.getGallery(requireClientSessionId(req));
    res.status(200).json(gallery);
  },

  async getBySessionId(req: Request, res: Response): Promise<void> {
    const gallery = await galleryService.getGallery(req.params.sessionId as string);
    res.status(200).json(gallery);
  }
};
