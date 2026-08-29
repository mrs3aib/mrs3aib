import type { Request, Response } from "express";
import { galleryService } from "@/services/galleryService";
import { UnauthorizedError } from "@/types/errors";
import { requireClientSessionId } from "@/utils/clientSession";

export const clientMediaController = {
  async getPreviewUrl(req: Request, res: Response): Promise<void> {
    if (req.auth?.role !== "client") throw new UnauthorizedError();
    const url = await galleryService.getMediaPreviewUrl(
      requireClientSessionId(req),
      req.params.id as string
    );
    res.status(200).json({ url });
  }
};
