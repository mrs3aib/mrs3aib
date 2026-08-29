import type { Request, Response } from "express";
import type { SessionCategory } from "@prisma/client";
import { publicGalleryService } from "@/services/publicGalleryService";

export const publicGalleryController = {
  async listByCategory(req: Request, res: Response): Promise<void> {
    const category = req.params.category as SessionCategory;
    const albums = await publicGalleryService.listByCategory(category);
    res.status(200).json({ albums });
  },

  async listSessions(req: Request, res: Response): Promise<void> {
    const { category, limit } = req.query as {
      category?: SessionCategory;
      limit?: number;
    };
    const albums = await publicGalleryService.listPublic({ category, limit });
    res.status(200).json({ albums });
  },

  async getGalleryAccess(req: Request, res: Response): Promise<void> {
    const access = await publicGalleryService.getPublicGalleryAccess(
      req.params.sessionId as string
    );
    res.status(200).json(access);
  },

  async getGallery(req: Request, res: Response): Promise<void> {
    const gallery = await publicGalleryService.getPublicGallery(
      req.params.sessionId as string
    );
    res.status(200).json(gallery);
  },

  /**
   * Same payload as `getGallery`, but for a password-gated album.
   *
   * A POST so the password travels in the body: a query string would be
   * written to access logs, proxy caches and browser history.
   */
  async unlockGallery(req: Request, res: Response): Promise<void> {
    const { password } = req.body as { password: string };
    const gallery = await publicGalleryService.getPublicGallery(
      req.params.sessionId as string,
      password
    );
    res.status(200).json(gallery);
  },

  async downloadSingle(req: Request, res: Response): Promise<void> {
    const url = await publicGalleryService.getDownloadUrl(
      req.params.sessionId as string,
      req.params.mediaId as string
    );
    res.status(200).json({ url });
  },

  async downloadFolder(req: Request, res: Response): Promise<void> {
    const url = await publicGalleryService.getFolderZipUrl(
      req.params.sessionId as string
    );
    res.status(200).json({ url });
  },

  async downloadSelection(req: Request, res: Response): Promise<void> {
    const { mediaIds } = req.body as { mediaIds: string[] };
    const url = await publicGalleryService.getSelectionZipUrl(
      req.params.sessionId as string,
      mediaIds
    );
    res.status(200).json({ url });
  }
};
