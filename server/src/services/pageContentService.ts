import type { PageContent, Prisma } from "@prisma/client";
import { pageContentRepository } from "@/repositories/pageContentRepository";
import { NotFoundError, ValidationError } from "@/types/errors";
import { storageKeys } from "@/storage/storageKeys";
import { storageProvider } from "./serviceRegistry";
import { revalidatePublicSite } from "./siteRevalidationService";

export type PageContentDto = {
  id: string;
  pageKey: string;
  title: string;
  content: unknown;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PageAssetDto = {
  storageKey: string;
  url: string;
  size: number;
  lastModified: string | null;
  contentType: string;
  /** True when the page currently references this asset. */
  inUse: boolean;
};

/**
 * Best-effort MIME type from the key's extension. Only used to tell the
 * dashboard whether to render an asset as an image or a video — the bytes
 * themselves are served by R2, which stores the real type at upload.
 */
function contentTypeForKey(key: string): string {
  const normalized = key.toLowerCase();
  if (normalized.endsWith(".png")) return "image/png";
  if (normalized.endsWith(".jpg") || normalized.endsWith(".jpeg")) return "image/jpeg";
  if (normalized.endsWith(".webp")) return "image/webp";
  if (normalized.endsWith(".gif")) return "image/gif";
  if (normalized.endsWith(".mp4")) return "video/mp4";
  if (normalized.endsWith(".webm")) return "video/webm";
  if (normalized.endsWith(".ogg") || normalized.endsWith(".ogv")) return "video/ogg";
  if (normalized.endsWith(".mov")) return "video/quicktime";
  return "application/octet-stream";
}

function toDto(page: PageContent): PageContentDto {
  return {
    id: page.id,
    pageKey: page.pageKey,
    title: page.title,
    content: page.content,
    published: page.published,
    createdAt: page.createdAt.toISOString(),
    updatedAt: page.updatedAt.toISOString()
  };
}

export const pageContentService = {
  async list(): Promise<PageContentDto[]> {
    const pages = await pageContentRepository.list();
    return pages.map(toDto);
  },

  async get(pageKey: string): Promise<PageContentDto> {
    const page = await pageContentRepository.findByPageKey(pageKey);
    if (!page) throw new NotFoundError("Page content not found");
    return toDto(page);
  },

  async getPublished(pageKey: string): Promise<PageContentDto | null> {
    const page = await pageContentRepository.findPublishedByPageKey(pageKey);
    return page ? toDto(page) : null;
  },

  async update(
    pageKey: string,
    input: { title: string; content: Prisma.InputJsonValue; published?: boolean }
  ): Promise<PageContentDto> {
    const page = await pageContentRepository.upsert(pageKey, {
      title: input.title,
      content: input.content,
      ...(input.published !== undefined ? { published: input.published } : {})
    });

    // Not awaited: the save is already durable, and the admin should not wait
    // on the public site to answer. Failures are logged inside.
    void revalidatePublicSite(`page:${pageKey}`);

    return toDto(page);
  },

  async uploadAsset(
    pageKey: string,
    file: Express.Multer.File,
    origin: string
  ): Promise<{ assetUrl: string; storageKey: string; mimeType: string }> {
    const storageKey = storageKeys.pageAsset(pageKey, file.originalname);
    await storageProvider.upload(storageKey, file.buffer, file.mimetype);

    return {
      assetUrl: `${origin}/pages/assets/${storageKey}`,
      storageKey,
      mimeType: file.mimetype
    };
  },

  /**
   * A time-limited URL the browser can fetch the asset from directly, so large
   * media never streams through this process.
   */
  async getAssetUrl(storageKey: string, expiresInSeconds?: number): Promise<string> {
    return storageProvider.getDownloadUrl(storageKey, expiresInSeconds);
  },

  /**
   * Every asset stored for a page, newest first, each with a short-lived URL the
   * admin dashboard can preview directly. `inUse` marks the one the page
   * currently references, so an admin can tell at a glance which files are live
   * and which are leftovers safe to delete.
   */
  async listAssets(pageKey: string, origin: string): Promise<PageAssetDto[]> {
    const prefix = `pages/${pageKey}/assets/`;
    const [objects, page] = await Promise.all([
      storageProvider.listObjects(prefix),
      pageContentRepository.findByPageKey(pageKey)
    ]);

    const content = page?.content as { hero?: { mediaUrl?: string; posterUrl?: string } } | null;
    const referenced = new Set(
      [content?.hero?.mediaUrl, content?.hero?.posterUrl]
        .map((url) => pageContentService.toStorageKey(url, pageKey))
        .filter((key): key is string => key !== null)
    );

    return objects.map((object) => ({
      storageKey: object.key,
      // Route the preview through our own endpoint rather than embedding a
      // presigned URL: the redirect refreshes the signature on each request, so
      // a dashboard left open overnight still previews correctly.
      url: `${origin}/pages/assets/${object.key}`,
      size: object.size,
      lastModified: object.lastModified,
      contentType: contentTypeForKey(object.key),
      inUse: referenced.has(object.key)
    }));
  },

  /**
   * Remove one asset from storage.
   *
   * The key arrives from the client, so it is confined to the page's own asset
   * prefix — without this an authenticated admin could delete arbitrary objects
   * (session originals, thumbnails) by passing a crafted key.
   */
  async deleteAsset(pageKey: string, storageKey: string): Promise<void> {
    if (!storageKeys.isPageAsset(pageKey, storageKey)) {
      throw new ValidationError("Asset does not belong to this page");
    }
    await storageProvider.delete(storageKey);
  },

  /**
   * Resolve a stored `mediaUrl` back to its storage key, or null when it points
   * somewhere we do not own (a local `/video/...` path, an external CDN). Used
   * to clean up the previous file when media is replaced or cleared.
   */
  toStorageKey(mediaUrl: string | undefined, pageKey: string): string | null {
    if (!mediaUrl) return null;

    const marker = "/pages/assets/";
    const index = mediaUrl.indexOf(marker);
    if (index === -1) return null;

    const key = decodeURIComponent(mediaUrl.slice(index + marker.length).split("?")[0] ?? "");
    return storageKeys.isPageAsset(pageKey, key) ? key : null;
  }
};
