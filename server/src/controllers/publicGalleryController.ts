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

  /**
   * Redirect to the session's cover, signing it at request time.
   *
   * Link-preview crawlers (WhatsApp, Twitter, Facebook) fetch an `og:image`
   * minutes to days after the page was rendered. A signed storage URL embedded
   * in the metadata has a ten-minute life, so by the time the crawler asked it
   * answered `ExpiredRequest` and the preview rendered with no image at all.
   * This URL never expires; the signature is minted per request and handed
   * over as a redirect, so the metadata can name a permanent address.
   */
  async getCoverRedirect(req: Request, res: Response): Promise<void> {
    const url = await publicGalleryService.getCoverUrl(
      req.params.sessionId as string
    );
    if (!url) {
      res.status(404).json({ message: "Cover not found" });
      return;
    }
    // Cacheable, but well inside the signature's life so a cached redirect
    // never outlives the URL it points at.
    res.setHeader("Cache-Control", "public, max-age=300");
    res.redirect(302, url);
  },

  async getGallery(req: Request, res: Response): Promise<void> {
    const { limit } = req.query as unknown as { limit?: number };
    const gallery = await publicGalleryService.getPublicGallery(
      req.params.sessionId as string,
      undefined,
      limit
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
