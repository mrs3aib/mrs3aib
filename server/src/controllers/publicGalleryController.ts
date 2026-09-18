import type { Request, Response } from "express";
import type { SessionCategory } from "@prisma/client";
import { publicGalleryService } from "@/services/publicGalleryService";
import { storageProvider } from "@/services/serviceRegistry";

/**
 * Media type for a stored cover, from its extension.
 *
 * A crawler that cannot tell what it fetched will not render a large card, so
 * this must be right. Only the handful of formats the pipeline actually
 * produces are listed; anything else falls back to a generic image type rather
 * than guessing wrongly.
 */
function contentTypeForKey(key: string): string {
  const ext = key.slice(key.lastIndexOf(".") + 1).toLowerCase();
  if (ext === "webp") return "image/webp";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  return "application/octet-stream";
}

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
   * Serve the session's cover image directly.
   *
   * This is the address `og:image` names, so it is fetched by link-preview
   * crawlers (WhatsApp, Twitter, Facebook) rather than by a browser on our
   * page. Two constraints follow from that, and both rule out the obvious
   * implementations:
   *
   * A signed storage URL cannot be embedded in the metadata — it lives ten
   * minutes, and a crawler asks whenever the link is first shared, which is
   * usually hours later. That returned `ExpiredRequest` and the card rendered
   * with no image at all.
   *
   * Redirecting here to a freshly signed URL fixes the expiry but not the
   * card: WhatsApp is strict about an `og:image` that redirects to another
   * host, and falls back to the small side-thumbnail layout rather than the
   * large one. So the bytes are proxied instead — one address, one host, no
   * redirect, and a `Content-Type` the crawler can trust.
   *
   * Buffered rather than streamed: a cover is a few hundred kilobytes, and a
   * stream that fails midway has already committed a 200 with no way to
   * correct it.
   */
  async getCover(req: Request, res: Response): Promise<void> {
    const source = await publicGalleryService.getCoverSource(
      req.params.sessionId as string
    );
    if (!source) {
      res.status(404).json({ message: "Cover not found" });
      return;
    }

    // An externally hosted cover is someone else's file; we have no bytes of
    // our own to send, so the crawler is pointed at the original.
    if ("externalUrl" in source) {
      res.setHeader("Cache-Control", "public, max-age=300");
      res.redirect(302, source.externalUrl);
      return;
    }

    const body = await storageProvider.download(source.key);
    res.setHeader("Content-Type", contentTypeForKey(source.key));
    res.setHeader("Content-Length", String(body.length));
    // Long-lived: the cover behind a session rarely changes, and a crawler
    // re-scraping a shared link should not re-fetch the bytes each time.
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.status(200).end(body);
  },

  async getGallery(req: Request, res: Response): Promise<void> {
    const { limit, offset } = req.query as unknown as {
      limit?: number;
      offset?: number;
    };
    const gallery = await publicGalleryService.getPublicGallery(
      req.params.sessionId as string,
      undefined,
      limit,
      offset
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
    /**
     * Paged like `getGallery`. Answering an unlock with the whole album meant
     * signing two URLs per item before the visitor saw anything — on a large
     * gated session that is the slowest moment of the whole flow, right after
     * the password was accepted.
     */
    const { limit, offset } = req.query as unknown as {
      limit?: number;
      offset?: number;
    };
    const gallery = await publicGalleryService.getPublicGallery(
      req.params.sessionId as string,
      password,
      limit,
      offset
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
