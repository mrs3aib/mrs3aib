import { mediaRepository } from "@/repositories/mediaRepository";
import { gallerySettingsRepository } from "@/repositories/gallerySettingsRepository";
import { downloadHistoryService } from "./downloadHistoryService";
import { zipArchiveService } from "./zipArchiveService";
import { storageProvider } from "./serviceRegistry";
import { galleryService } from "./galleryService";
import { ForbiddenError, NotFoundError, ValidationError } from "@/types/errors";

async function assertDownloadsAllowed(sessionId: string): Promise<void> {
  await galleryService.assertGalleryAccessible(sessionId);
  const settings = await gallerySettingsRepository.findBySessionId(sessionId);
  if (settings && !settings.allowDownloads) {
    throw new ForbiddenError("Downloads are disabled for this gallery");
  }
}

export const downloadService = {
  async downloadSingle(input: {
    sessionId: string;
    clientId: string;
    mediaId: string;
    ipAddress: string;
  }): Promise<string> {
    await assertDownloadsAllowed(input.sessionId);

    const media = await mediaRepository.findById(input.mediaId);
    if (!media || media.sessionId !== input.sessionId) {
      throw new NotFoundError("Media not found");
    }
    // A linked video is watched on YouTube, not downloaded — there is no file
    // of ours to sign a URL for.
    if (!media.storageKey) {
      throw new ValidationError("This video is a link and cannot be downloaded");
    }

    const url = await storageProvider.getDownloadUrl(
      media.storageKey,
      undefined,
      media.originalName
    );

    await downloadHistoryService.record({
      clientId: input.clientId,
      sessionId: input.sessionId,
      mediaIds: [media.id],
      downloadType: "single",
      ipAddress: input.ipAddress
    });

    return url;
  },

  async downloadMultiple(input: {
    sessionId: string;
    clientId: string;
    mediaIds: string[];
    ipAddress: string;
  }): Promise<{ mediaId: string; url: string }[]> {
    await assertDownloadsAllowed(input.sessionId);

    if (input.mediaIds.length === 0) {
      throw new ValidationError("Select at least one file");
    }

    const media = await mediaRepository.findManyByIds(input.mediaIds);
    const belongsToSession = media.filter((m) => m.sessionId === input.sessionId);
    if (belongsToSession.length !== input.mediaIds.length) {
      throw new ForbiddenError("One or more files do not belong to this gallery");
    }

    // Linked videos have no file behind them. Dropping them keeps a mixed
    // selection working instead of failing the whole batch over one embed.
    const downloadable = belongsToSession.filter(
      (m): m is typeof m & { storageKey: string } => Boolean(m.storageKey)
    );

    const urls = await Promise.all(
      downloadable.map(async (m) => ({
        mediaId: m.id,
        url: await storageProvider.getDownloadUrl(m.storageKey, undefined, m.originalName)
      }))
    );

    await downloadHistoryService.record({
      clientId: input.clientId,
      sessionId: input.sessionId,
      mediaIds: downloadable.map((m) => m.id),
      downloadType: "multiple",
      ipAddress: input.ipAddress
    });

    return urls;
  },

  /** ZIP of just the selected files — the group-download path. */
  async downloadSelectionZip(input: {
    sessionId: string;
    clientId: string;
    mediaIds: string[];
    ipAddress: string;
  }): Promise<string> {
    await assertDownloadsAllowed(input.sessionId);

    const url = await zipArchiveService.getOrCreateSelectionZipUrl(
      input.sessionId,
      input.mediaIds
    );

    await downloadHistoryService.record({
      clientId: input.clientId,
      sessionId: input.sessionId,
      mediaIds: input.mediaIds,
      downloadType: "zip",
      ipAddress: input.ipAddress
    });

    return url;
  },

  async downloadSession(input: {
    sessionId: string;
    clientId: string;
    ipAddress: string;
  }): Promise<string> {
    await assertDownloadsAllowed(input.sessionId);

    const url = await zipArchiveService.getOrCreateSessionZipUrl(input.sessionId);

    const media = await mediaRepository.findAllForSession(input.sessionId);
    await downloadHistoryService.record({
      clientId: input.clientId,
      sessionId: input.sessionId,
      mediaIds: media.filter((m) => m.processingStatus === "ready").map((m) => m.id),
      downloadType: "zip",
      ipAddress: input.ipAddress
    });

    return url;
  }
};
