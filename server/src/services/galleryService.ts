import { sessionRepository } from "@/repositories/sessionRepository";
import { mediaRepository } from "@/repositories/mediaRepository";
import { gallerySettingsRepository } from "@/repositories/gallerySettingsRepository";
import { storageProvider } from "./serviceRegistry";
import { NotFoundError, ForbiddenError } from "@/types/errors";
import { youTubeThumbnailUrl } from "@/utils/youtube";
import type { MediaDto } from "./mediaService";
import type { Media } from "@prisma/client";

function toMediaDto(media: Media): MediaDto {
  return {
    id: media.id,
    sessionId: media.sessionId,
    type: media.type,
    originalName: media.originalName,
    thumbnail: media.thumbnailKey,
    mimeType: media.mimeType,
    size: media.size,
    width: media.width,
    height: media.height,
    duration: media.duration,
    processingStatus: media.processingStatus,
    source: media.source,
    externalUrl: media.externalUrl,
    externalId: media.externalId,
    createdAt: media.createdAt.toISOString()
  };
}

export const galleryService = {
  async assertGalleryAccessible(sessionId: string): Promise<void> {
    const settings = await gallerySettingsRepository.findBySessionId(sessionId);
    if (settings?.expiresAt && settings.expiresAt < new Date()) {
      throw new ForbiddenError("This gallery has expired");
    }
  },

  async getGallery(sessionId: string) {
    /**
     * The three reads do not depend on each other, so they go out together.
     * Run in sequence they cost three round trips to a remote database, which
     * on a gallery of a few dozen items was enough to push the response past
     * the site's fetch timeout and render an empty grid.
     */
    const [session, settings, media] = await Promise.all([
      sessionRepository.findById(sessionId),
      gallerySettingsRepository.findBySessionId(sessionId),
      mediaRepository.findAllForSession(sessionId)
    ]);
    if (!session) throw new NotFoundError("Gallery not found");

    // Expiry is still enforced before any media is handed out; only the lookup
    // moved earlier, not the check.
    if (settings?.expiresAt && settings.expiresAt < new Date()) {
      throw new ForbiddenError("This gallery has expired");
    }

    const readyMedia = media.filter((m) => m.processingStatus === "ready");

    const withUrls = await Promise.all(
      readyMedia.map(async (item) => ({
        ...toMediaDto(item),
        /**
         * A linked video has no file of ours, so its still comes straight from
         * YouTube's CDN and there is no signed source to hand out — the site
         * embeds it by `externalId` instead.
         */
        thumbnailUrl:
          item.source === "youtube"
            ? item.externalId
              ? youTubeThumbnailUrl(item.externalId)
              : null
            : item.thumbnailKey
              ? await storageProvider.getDownloadUrl(item.thumbnailKey)
              : null,
        /**
         * Playable/viewable source for the lightbox. Videos need it to play at
         * all — a thumbnail is a still frame — and images use it for the
         * full-size view rather than blowing up the grid thumbnail.
         */
        sourceUrl: item.storageKey
          ? await storageProvider.getDownloadUrl(item.storageKey)
          : null
      }))
    );

    return {
      session: {
        id: session.id,
        title: session.title,
        eventDate: session.eventDate.toISOString(),
        location: session.location,
        description: session.description,
        /** Media id pinned as the cover, so the site can feature it. */
        coverImage: session.coverImage
      },
      settings: {
        // Sent so the gallery can hide its download controls rather than
        // offering buttons the server will refuse. Defaults to true, matching
        // the column default for a session with no settings row yet.
        allowDownloads: settings?.allowDownloads ?? true,
        watermarkPreviewImages: settings?.watermarkPreviewImages ?? false,
        watermarkUrl: settings?.watermarkUrl ?? null
      },
      media: withUrls
    };
  },

  async getMediaPreviewUrl(sessionId: string, mediaId: string): Promise<string> {
    const media = await mediaRepository.findById(mediaId);
    if (!media || media.sessionId !== sessionId) {
      throw new NotFoundError("Media not found");
    }
    await this.assertGalleryAccessible(sessionId);

    // A linked video's still lives on YouTube's CDN, so it needs no signing.
    if (media.source === "youtube") {
      if (!media.externalId) throw new NotFoundError("Media not found");
      return youTubeThumbnailUrl(media.externalId);
    }

    const key = media.thumbnailKey ?? media.storageKey;
    if (!key) throw new NotFoundError("Media not found");
    return storageProvider.getDownloadUrl(key);
  }
};
