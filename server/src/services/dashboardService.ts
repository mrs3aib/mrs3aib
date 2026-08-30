import { prisma } from "@/config/prisma";
import { logger } from "@/config/logger";
import { mediaRepository } from "@/repositories/mediaRepository";
import { downloadHistoryRepository } from "@/repositories/downloadHistoryRepository";
import { storageProvider } from "./serviceRegistry";

export type DashboardStatisticsDto = {
  totalSessions: number;
  totalClients: number;
  totalImages: number;
  totalVideos: number;
  totalDownloads: number;
  /**
   * Null when the storage bucket could not be reached or listed. The five
   * counts above come from our own database and are always present; this one
   * depends on an outside service, so the dashboard renders it as unavailable
   * rather than the whole page failing.
   */
  storageUsageBytes: number | null;
};

/**
 * Total bytes in the bucket, or null if storage could not answer.
 *
 * Listing the bucket is the only part of this endpoint that leaves our own
 * infrastructure, and it needs a bucket-level list permission that no other
 * call here requires — so it is also the part most likely to fail on its own
 * (wrong endpoint, wrong bucket, key without list access, R2 outage). Inside a
 * `Promise.all` any such failure rejected the whole batch and turned the entire
 * dashboard into a 500, hiding five perfectly good numbers behind one optional
 * one. The error is logged, not swallowed silently: without a log line an
 * unreachable bucket looks identical to an empty one.
 */
async function readStorageUsageBytes(): Promise<number | null> {
  try {
    return await storageProvider.getUsageBytes();
  } catch (err) {
    logger.error({ err }, "Dashboard: storage usage unavailable");
    return null;
  }
}

export const dashboardService = {
  async getStatistics(): Promise<DashboardStatisticsDto> {
    const [totalSessions, totalClients, totalImages, totalVideos, totalDownloads, storageUsageBytes] =
      await Promise.all([
        prisma.photoSession.count(),
        prisma.client.count(),
        mediaRepository.countByType("image"),
        mediaRepository.countByType("video"),
        downloadHistoryRepository.countAll(),
        readStorageUsageBytes()
      ]);

    return {
      totalSessions,
      totalClients,
      totalImages,
      totalVideos,
      totalDownloads,
      storageUsageBytes
    };
  }
};
