import { prisma } from "@/config/prisma";
import type { ZipArchive } from "@prisma/client";

export const zipArchiveRepository = {
  findBySessionAndHash(sessionId: string, contentHash: string): Promise<ZipArchive | null> {
    return prisma.zipArchive.findFirst({
      where: { sessionId, contentHash },
      orderBy: { createdAt: "desc" }
    });
  },

  create(data: {
    sessionId: string;
    storageKey: string;
    mediaCount: number;
    contentHash: string;
  }): Promise<ZipArchive> {
    return prisma.zipArchive.create({ data });
  }
};
