import { prisma } from "@/config/prisma";
import { mediaRepository } from "@/repositories/mediaRepository";
import { downloadHistoryRepository } from "@/repositories/downloadHistoryRepository";
import { storageProvider } from "./serviceRegistry";

export type DashboardStatisticsDto = {
  totalSessions: number;
  totalClients: number;
  totalImages: number;
  totalVideos: number;
  totalDownloads: number;
  storageUsageBytes: number;
};

export const dashboardService = {
  async getStatistics(): Promise<DashboardStatisticsDto> {
    const [totalSessions, totalClients, totalImages, totalVideos, totalDownloads, storageUsageBytes] =
      await Promise.all([
        prisma.photoSession.count(),
        prisma.client.count(),
        mediaRepository.countByType("image"),
        mediaRepository.countByType("video"),
        downloadHistoryRepository.countAll(),
        storageProvider.getUsageBytes()
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
