import { PassThrough } from "node:stream";
import archiver from "archiver";
import { mediaRepository } from "@/repositories/mediaRepository";
import { zipArchiveRepository } from "@/repositories/zipArchiveRepository";
import { sessionRepository } from "@/repositories/sessionRepository";
import { storageProvider } from "./serviceRegistry";
import { storageKeys } from "@/storage/storageKeys";
import { mediaSetContentHash } from "@/utils/contentHash";
import { ForbiddenError, NotFoundError, ValidationError } from "@/types/errors";
import { logger } from "@/config/logger";

/**
 * Stream a ZIP of `files` straight into object storage.
 *
 * Nothing is buffered whole: each original is piped from storage into the
 * archiver, and the archiver's output is piped into a multipart upload. The
 * previous implementation read every original into memory and then read the
 * finished archive back into a second buffer, so a single large gallery could
 * exhaust the container's memory — a multi-gigabyte wedding album is ordinary
 * here, and the request is reachable without authentication.
 */
async function streamZipToStorage(
  key: string,
  files: { key: string; name: string }[]
): Promise<void> {
  const archive = archiver("zip", { zlib: { level: 6 } });
  const passThrough = new PassThrough();

  archive.pipe(passThrough);

  // Start the upload before appending: it consumes `passThrough` as the archive
  // produces bytes, so neither side has to hold the whole archive.
  const uploadPromise = storageProvider.uploadStream(
    key,
    passThrough,
    "application/zip"
  );

  const appendPromise = (async () => {
    for (const file of files) {
      const source = await storageProvider.downloadStream(file.key);
      archive.append(source, { name: file.name });
      // `archive.append` consumes the stream asynchronously. Waiting for the
      // entry to finish keeps exactly one original in flight, which is what
      // bounds memory here; appending them all at once would open every
      // source stream simultaneously and undo the point of streaming.
      await new Promise<void>((resolve, reject) => {
        source.on("end", resolve);
        source.on("error", reject);
      });
    }
    await archive.finalize();
  })();

  try {
    await Promise.all([uploadPromise, appendPromise]);
  } catch (error) {
    // Tear both halves down so a failure cannot leave the upload hanging on a
    // stream that will never end, or vice versa.
    archive.destroy();
    passThrough.destroy();
    throw error as Error;
  }
}

/**
 * Make every entry name unique within one archive.
 *
 * Originals keep the name the camera gave them, so two cards in the same
 * shoot routinely both contain `IMG_0001.jpg`. Duplicate entries are legal in
 * the ZIP format but most extractors silently overwrite, which loses photos.
 * Colliding names get a numeric suffix before the extension.
 */
function uniqueEntryNames(
  files: { key: string; name: string }[]
): { key: string; name: string }[] {
  const seen = new Map<string, number>();

  return files.map((file) => {
    const lower = file.name.toLowerCase();
    const count = seen.get(lower);

    if (count === undefined) {
      seen.set(lower, 1);
      return file;
    }

    seen.set(lower, count + 1);
    const dot = file.name.lastIndexOf(".");
    const stem = dot > 0 ? file.name.slice(0, dot) : file.name;
    const extension = dot > 0 ? file.name.slice(dot) : "";
    return { key: file.key, name: `${stem} (${count})${extension}` };
  });
}

/** A media row that has a real file behind it, and so can go into an archive. */
type ArchivableMedia = {
  id: string;
  size: number;
  storageKey: string;
  originalName: string;
};

/**
 * Keep only the items an archive can actually contain.
 *
 * Linked videos (YouTube) have no file of ours — no storage key, no byte size —
 * so they are dropped here rather than producing a broken ZIP entry. This is
 * the single place that decides it, so every archive path agrees.
 */
function archivableOnly(
  media: { id: string; size: number | null; storageKey: string | null; originalName: string }[]
): ArchivableMedia[] {
  return media.filter(
    (m): m is ArchivableMedia => m.storageKey !== null && m.size !== null
  );
}

/**
 * Return a signed URL for a ZIP of exactly `readyMedia`, building and caching
 * the archive only when this media set has not been archived before.
 */
async function buildOrReuseZip(
  sessionId: string,
  readyMedia: { id: string; size: number; storageKey: string; originalName: string }[]
): Promise<string> {
  const contentHash = mediaSetContentHash(readyMedia);
  const existing = await zipArchiveRepository.findBySessionAndHash(
    sessionId,
    contentHash
  );

  if (existing) {
    logger.info({ sessionId, contentHash }, "Reusing existing ZIP");
    return storageProvider.getDownloadUrl(existing.storageKey, undefined, "gallery.zip");
  }

  logger.info(
    { sessionId, contentHash, mediaCount: readyMedia.length },
    "Building new ZIP"
  );

  const storageKey = storageKeys.zipArchive(sessionId, contentHash);
  await streamZipToStorage(
    storageKey,
    uniqueEntryNames(
      readyMedia.map((m) => ({ key: m.storageKey, name: m.originalName }))
    )
  );

  await zipArchiveRepository.create({
    sessionId,
    storageKey,
    mediaCount: readyMedia.length,
    contentHash
  });

  return storageProvider.getDownloadUrl(storageKey, undefined, "gallery.zip");
}

export const zipArchiveService = {
  /**
   * Returns a signed download URL for a ZIP of the given media subset, reusing
   * a previously built archive when the same selection was requested before.
   *
   * Shares the cache with full-session ZIPs: the hash covers the media set, so
   * selecting every file naturally hits the archive built by
   * `getOrCreateSessionZipUrl` instead of duplicating it.
   */
  async getOrCreateSelectionZipUrl(
    sessionId: string,
    mediaIds: string[]
  ): Promise<string> {
    const session = await sessionRepository.findById(sessionId);
    if (!session) throw new NotFoundError("Session not found");

    if (mediaIds.length === 0) {
      throw new ValidationError("Select at least one file");
    }

    const media = await mediaRepository.findManyByIds(mediaIds);

    // Reject ids from another gallery rather than silently archiving a subset:
    // a mismatch means the caller asked for something they may not own.
    const ownMedia = media.filter((m) => m.sessionId === sessionId);
    if (ownMedia.length !== new Set(mediaIds).size) {
      throw new ForbiddenError("One or more files do not belong to this gallery");
    }

    const readyMedia = archivableOnly(
      ownMedia.filter((m) => m.processingStatus === "ready")
    );
    if (readyMedia.length === 0) {
      throw new ValidationError("The selected files are not ready to download yet");
    }

    return buildOrReuseZip(sessionId, readyMedia);
  },

  /**
   * Returns a signed download URL for the session's full-media ZIP,
   * reusing a previously built archive when the session's media set
   * (fingerprinted by mediaSetContentHash) hasn't changed since.
   */
  async getOrCreateSessionZipUrl(sessionId: string): Promise<string> {
    const session = await sessionRepository.findById(sessionId);
    if (!session) throw new NotFoundError("Session not found");

    const media = await mediaRepository.findAllForSession(sessionId);
    const readyMedia = archivableOnly(
      media.filter((m) => m.processingStatus === "ready")
    );
    if (readyMedia.length === 0) {
      throw new ValidationError("This gallery has no media to download yet");
    }

    return buildOrReuseZip(sessionId, readyMedia);
  }
};
