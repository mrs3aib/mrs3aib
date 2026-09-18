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

/**
 * Turn any signed storage URL saved into a page's content into the stable asset
 * URL that proxies it.
 *
 * Uploading through the dashboard stores a `/pages/assets/...` URL, which signs
 * afresh on every request and so never goes stale. But an admin who pointed a
 * section at an image already in a gallery saved that image's *signed* URL
 * verbatim, and a signature is minted for minutes — so the section rendered a
 * broken image from shortly after it was saved until someone noticed and
 * re-saved it.
 *
 * Rewriting on read fixes those saved pages in place, with no migration and no
 * admin having to touch them again.
 */
function withStableAssetUrls(content: unknown, origin: string): unknown {
  if (typeof content === "string") {
    // Only a signed URL needs rewriting; anything else is already stable.
    if (!/^https?:\/\//.test(content) || !content.includes("X-Amz-Signature")) {
      return content;
    }
    try {
      // The path is the storage key. Dropping the query drops the signature
      // with it, which is the point: the proxy signs a new one per request.
      const key = new URL(content).pathname.replace(/^\/+/, "");
      return key ? `${origin}/pages/assets/${key}` : content;
    } catch {
      // Not a URL we can parse; leave it exactly as saved.
      return content;
    }
  }
  if (Array.isArray(content)) {
    return content.map((item) => withStableAssetUrls(item, origin));
  }
  if (content && typeof content === "object") {
    return Object.fromEntries(
      Object.entries(content).map(([key, value]) => [
        key,
        withStableAssetUrls(value, origin)
      ])
    );
  }
  return content;
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

  /**
   * `origin` is where the asset proxy lives, so any signed URL saved into the
   * content can be handed out as a stable link instead.
   */
  async getPublished(
    pageKey: string,
    origin?: string
  ): Promise<PageContentDto | null> {
    const page = await pageContentRepository.findPublishedByPageKey(pageKey);
    if (!page) return null;

    const dto = toDto(page);
    // Without an origin there is nothing to point a proxy URL at, so the
    // content goes out exactly as saved.
    return origin
      ? { ...dto, content: withStableAssetUrls(dto.content, origin) }
      : dto;
  },

  /**
   * `pageHidden` for each requested key, in one round trip.
   *
   * Only the flag is returned, never the page content: the caller is deciding
   * what to show in a menu, and shipping whole records for that would send far
   * more than the question needs. A key with no published record is absent
   * from the map, which callers read as "not hidden" — a page that does not
   * exist yet must not disappear from navigation.
   */
  async getHiddenFlags(pageKeys: string[]): Promise<Record<string, boolean>> {
    const pages = await pageContentRepository.findPublishedByPageKeys(pageKeys);
    const flags: Record<string, boolean> = {};
    for (const page of pages) {
      const content = page.content as { pageHidden?: boolean } | null;
      flags[page.pageKey] = Boolean(content?.pageHidden);
    }
    return flags;
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
