import type {
  Media,
  MediaProcessingStatus,
  MediaSource,
  MediaType
} from "@prisma/client";
import { mediaRepository, type MediaSort } from "@/repositories/mediaRepository";
import { sessionRepository } from "@/repositories/sessionRepository";
import { storageProvider } from "./serviceRegistry";
import { storageKeys } from "@/storage/storageKeys";
import { processImage } from "./imageProcessor";
import { processVideo } from "./videoProcessor";
import { toSkipTake, paginate, type PaginatedResult } from "@/utils/pagination";
import { NotFoundError, ValidationError } from "@/types/errors";
import { parseYouTubeId, youTubeWatchUrl } from "@/utils/youtube";
import { logger } from "@/config/logger";

const ALLOWED_MIME_PREFIXES = ["image/", "video/"];
const MAX_UPLOAD_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2GB

export type MediaDto = {
  id: string;
  sessionId: string;
  type: MediaType;
  originalName: string;
  thumbnail: string | null;
  /** Null for linked videos, which have no file of ours behind them. */
  mimeType: string | null;
  size: number | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  processingStatus: Media["processingStatus"];
  /** "youtube" items are embedded, never downloaded. */
  source: MediaSource;
  externalUrl: string | null;
  externalId: string | null;
  createdAt: string;
};

/**
 * A media item plus a short-lived signed URL for its thumbnail. `thumbnail`
 * alone is a storage key, and the bucket is private, so it cannot be rendered
 * directly — the admin dashboard needs this to show previews.
 */
export type MediaWithPreviewDto = MediaDto & {
  thumbnailUrl: string | null;
  /** Signed URL for the original uploaded file, used by admin previews. */
  sourceUrl: string | null;
  /** Denormalised so the cross-session studio grid can label each item. */
  sessionTitle: string;
};

/**
 * Paginated media plus totals for the whole filtered set. The studio shows
 * library-wide size and per-type counts that the current page cannot supply.
 */
export type MediaListResult = PaginatedResult<MediaWithPreviewDto> & {
  totalSize: number;
  imageCount: number;
  videoCount: number;
};

function toDto(media: Media): MediaDto {
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

export const mediaService = {
  async list(params: {
    sessionId?: string | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    type?: MediaType | undefined;
    search?: string | undefined;
    processingStatus?: MediaProcessingStatus | undefined;
    sort?: MediaSort | undefined;
  }): Promise<MediaListResult> {
    const { skip, take, page, pageSize } = toSkipTake(params);
    const filters = {
      sessionId: params.sessionId,
      type: params.type,
      search: params.search,
      processingStatus: params.processingStatus
    };

    const [items, total, totals, typeCounts] = await Promise.all([
      mediaRepository.list({ skip, take, ...filters, sort: params.sort }),
      mediaRepository.count(filters),
      mediaRepository.aggregate(filters),
      // The type counters describe both tabs, so they ignore the type filter.
      mediaRepository.countByTypes({
        sessionId: params.sessionId,
        search: params.search,
        processingStatus: params.processingStatus
      })
    ]);

    // Sign each thumbnail so the dashboard can render it from the private bucket.
    const withPreviews = await Promise.all(
      items.map(async (item) => ({
        ...toDto(item),
        sessionTitle: item.session.title,
        thumbnailUrl: item.thumbnailKey
          ? await storageProvider.getDownloadUrl(item.thumbnailKey)
          : null,
        sourceUrl: item.storageKey
          ? await storageProvider.getDownloadUrl(item.storageKey)
          : null
      }))
    );

    return {
      ...paginate(withPreviews, total, page, pageSize),
      totalSize: totals._sum.size ?? 0,
      imageCount: typeCounts.image,
      videoCount: typeCounts.video
    };
  },

  async requestUploadUrl(input: {
    sessionId: string;
    fileName: string;
    mimeType: string;
    size: number;
  }): Promise<{ uploadUrl: string; mediaId: string }> {
    const session = await sessionRepository.findById(input.sessionId);
    if (!session) throw new ValidationError("Selected session does not exist");

    if (!ALLOWED_MIME_PREFIXES.some((prefix) => input.mimeType.startsWith(prefix))) {
      throw new ValidationError("Only image and video files are allowed");
    }
    if (input.size <= 0 || input.size > MAX_UPLOAD_SIZE_BYTES) {
      throw new ValidationError("File exceeds the maximum allowed size");
    }

    const type: MediaType = input.mimeType.startsWith("video/") ? "video" : "image";

    const media = await mediaRepository.create({
      session: { connect: { id: input.sessionId } },
      type,
      originalName: input.fileName,
      storageKey: "", // set once the media id is known, right below
      mimeType: input.mimeType,
      size: input.size,
      processingStatus: "processing"
    });

    const storageKey = storageKeys.media(input.sessionId, media.id, input.fileName);
    await mediaRepository.update(media.id, { storageKey });

    const uploadUrl = await storageProvider.getUploadUrl(storageKey, input.mimeType);
    return { uploadUrl, mediaId: media.id };
  },

  /**
   * Attach a YouTube video to a session as a link rather than an upload.
   *
   * Nothing is transferred or transcoded, so the item is `ready` immediately —
   * there is no file to process. It joins the session's media in creation order
   * like any other item, which is what puts it in the gallery grid alongside
   * the photos.
   */
  async addYouTubeLink(input: {
    sessionId: string;
    url: string;
    title?: string | undefined;
  }): Promise<MediaDto> {
    const session = await sessionRepository.findById(input.sessionId);
    if (!session) throw new ValidationError("Selected session does not exist");

    const videoId = parseYouTubeId(input.url);
    if (!videoId) throw new ValidationError("Enter a valid YouTube video link");

    // Same video twice in one session is almost certainly a double submit, and
    // two identical tiles in the gallery would look like a bug.
    const existing = await mediaRepository.findByExternalId(
      input.sessionId,
      videoId
    );
    if (existing) {
      throw new ValidationError("This video is already in the session");
    }

    const media = await mediaRepository.create({
      session: { connect: { id: input.sessionId } },
      type: "video",
      source: "youtube",
      originalName: input.title?.trim() || `YouTube video ${videoId}`,
      externalUrl: youTubeWatchUrl(videoId),
      externalId: videoId,
      // No file, so nothing to process — the item is usable straight away.
      processingStatus: "ready"
    });

    return toDto(media);
  },

  async confirmUpload(mediaId: string): Promise<MediaDto> {
    const media = await mediaRepository.findById(mediaId);
    if (!media) throw new NotFoundError("Media not found");
    // A linked video has no file to fetch or transcode.
    if (media.source !== "upload" || !media.storageKey) {
      throw new ValidationError("This media item is not an upload");
    }

    try {
      const original = await storageProvider.download(media.storageKey);

      if (media.type === "image") {
        const result = await processImage(original);
        const thumbnailKey = storageKeys.thumbnail(media.sessionId, media.id);
        const optimizedKey = storageKeys.optimized(media.sessionId, media.id);

        await Promise.all([
          storageProvider.upload(thumbnailKey, result.thumbnailBuffer, "image/webp"),
          storageProvider.upload(optimizedKey, result.optimizedBuffer, "image/webp")
        ]);

        const updated = await mediaRepository.update(media.id, {
          width: result.width,
          height: result.height,
          thumbnailKey,
          processingStatus: "ready"
        });
        return toDto(updated);
      }

      const result = await processVideo(original);
      const thumbnailKey = storageKeys.thumbnail(media.sessionId, media.id);
      await storageProvider.upload(thumbnailKey, result.thumbnailBuffer, "image/png");

      const updated = await mediaRepository.update(media.id, {
        width: result.width,
        height: result.height,
        duration: result.duration,
        thumbnailKey,
        processingStatus: "ready"
      });
      return toDto(updated);
    } catch (error) {
      logger.error({ err: error, mediaId }, "Media processing failed");
      const updated = await mediaRepository.update(media.id, {
        processingStatus: "failed"
      });
      return toDto(updated);
    }
  },

  async delete(id: string): Promise<void> {
    const media = await mediaRepository.findById(id);
    if (!media) throw new NotFoundError("Media not found");

    // Images also have an optimized derivative, whose key is derived rather
    // than stored — delete it too, or it is orphaned in storage forever. A
    // linked video owns nothing in the bucket, so this list is simply empty.
    const keys: (string | null)[] = [media.storageKey, media.thumbnailKey];
    if (media.source === "upload" && media.type === "image") {
      keys.push(storageKeys.optimized(media.sessionId, media.id));
    }

    await Promise.all(
      keys
        .filter((key): key is string => Boolean(key))
        .map((key) => storageProvider.delete(key))
    );
    await mediaRepository.delete(id);
  }
};
