import type { Request, Response } from "express";
import { pageContentService } from "@/services/pageContentService";

function requestOrigin(req: Request): string {
  const proto = req.header("x-forwarded-proto") ?? req.protocol;
  const host = req.header("x-forwarded-host") ?? req.header("host");
  return `${proto}://${host}`;
}

/** How long a presigned asset URL stays valid. */
const ASSET_URL_TTL_SECONDS = 60 * 60;

/**
 * How long browsers may cache the redirect itself. Deliberately far shorter
 * than the signature's lifetime: a redirect replayed from cache at the very end
 * of its window must still point at a URL that has time left to run.
 */
const ASSET_REDIRECT_CACHE_SECONDS = 5 * 60;

export const pageContentController = {
  async list(_req: Request, res: Response): Promise<void> {
    const pages = await pageContentService.list();
    res.status(200).json(pages);
  },

  async get(req: Request, res: Response): Promise<void> {
    const page = await pageContentService.get(req.params.pageKey as string);
    res.status(200).json(page);
  },

  async getPublished(req: Request, res: Response): Promise<void> {
    const page = await pageContentService.getPublished(req.params.pageKey as string);
    if (!page) {
      res.status(204).send();
      return;
    }
    res.status(200).json(page);
  },

  async update(req: Request, res: Response): Promise<void> {
    const page = await pageContentService.update(req.params.pageKey as string, req.body);
    res.status(200).json(page);
  },

  async uploadAsset(req: Request, res: Response): Promise<void> {
    if (!req.file) {
      res.status(400).json({ message: "Missing file" });
      return;
    }

    const result = await pageContentService.uploadAsset(
      req.params.pageKey as string,
      req.file,
      requestOrigin(req)
    );
    res.status(201).json(result);
  },

  async listAssets(req: Request, res: Response): Promise<void> {
    const assets = await pageContentService.listAssets(
      req.params.pageKey as string,
      requestOrigin(req)
    );
    res.status(200).json(assets);
  },

  async deleteAsset(req: Request, res: Response): Promise<void> {
    const pageKey = req.params.pageKey as string;
    const storageKey = (req.body as { storageKey?: string }).storageKey;
    if (!storageKey) {
      res.status(400).json({ message: "Missing storageKey" });
      return;
    }

    await pageContentService.deleteAsset(pageKey, storageKey);
    res.status(204).send();
  },

  async downloadAsset(req: Request, res: Response): Promise<void> {
    const storageKey = req.params[0] as string | undefined;
    if (!storageKey) {
      res.status(404).send();
      return;
    }

    // Redirect to a presigned URL rather than proxying the bytes: hero media is
    // routinely hundreds of MB, and buffering that through Node stalls the
    // request and blows up memory. Cloudflare also serves Range requests, which
    // <video> needs in order to seek (and which Safari needs to play at all).
    const url = await pageContentService.getAssetUrl(storageKey, ASSET_URL_TTL_SECONDS);

    // Page assets are public marketing media embedded by the web app, which runs
    // on a different origin. Helmet's global `same-origin` CORP would make the
    // browser discard the response, so relax it for this route alone.
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Cache-Control", `public, max-age=${ASSET_REDIRECT_CACHE_SECONDS}`);
    res.redirect(302, url);
  }
};
