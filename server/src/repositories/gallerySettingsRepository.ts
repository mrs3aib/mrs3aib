import { prisma } from "@/config/prisma";
import type { GallerySettings } from "@prisma/client";

export type GallerySettingsFields = {
  allowDownloads?: boolean;
  watermarkPreviewImages?: boolean;
  watermarkUrl?: string | null;
  hideOriginalFileNames?: boolean;
  passwordProtected?: boolean;
  passwordHash?: string | null;
  expiresAt?: Date | null;
};

export const gallerySettingsRepository = {
  findBySessionId(sessionId: string): Promise<GallerySettings | null> {
    return prisma.gallerySettings.findUnique({ where: { sessionId } });
  },

  upsert(sessionId: string, data: GallerySettingsFields): Promise<GallerySettings> {
    return prisma.gallerySettings.upsert({
      where: { sessionId },
      create: { sessionId, ...data },
      update: data
    });
  }
};
