import type { GallerySettings } from "@prisma/client";
import { gallerySettingsRepository } from "@/repositories/gallerySettingsRepository";
import { sessionRepository } from "@/repositories/sessionRepository";
import { hashPassword } from "@/auth/password";
import { NotFoundError } from "@/types/errors";

export type GallerySettingsDto = {
  sessionId: string;
  allowDownloads: boolean;
  watermarkPreviewImages: boolean;
  watermarkUrl: string | null;
  hideOriginalFileNames: boolean;
  passwordProtected: boolean;
  password: null; // never echo the password/hash back to the client
  expiresAt: string | null;
};

function toDto(settings: GallerySettings): GallerySettingsDto {
  return {
    sessionId: settings.sessionId,
    allowDownloads: settings.allowDownloads,
    watermarkPreviewImages: settings.watermarkPreviewImages,
    watermarkUrl: settings.watermarkUrl,
    hideOriginalFileNames: settings.hideOriginalFileNames,
    passwordProtected: settings.passwordProtected,
    password: null,
    expiresAt: settings.expiresAt?.toISOString() ?? null
  };
}

const DEFAULTS: Omit<GallerySettingsDto, "sessionId" | "password"> = {
  allowDownloads: true,
  watermarkPreviewImages: false,
  watermarkUrl: null,
  hideOriginalFileNames: false,
  passwordProtected: false,
  expiresAt: null
};

export const gallerySettingsService = {
  async get(sessionId: string): Promise<GallerySettingsDto> {
    const session = await sessionRepository.findById(sessionId);
    if (!session) throw new NotFoundError("Session not found");

    const settings = await gallerySettingsRepository.findBySessionId(sessionId);
    if (!settings) {
      return { sessionId, password: null, ...DEFAULTS };
    }
    return toDto(settings);
  },

  async update(
    sessionId: string,
    input: {
      allowDownloads?: boolean;
      watermarkPreviewImages?: boolean;
      watermarkUrl?: string | null;
      hideOriginalFileNames?: boolean;
      passwordProtected?: boolean;
      password?: string | null;
      expiresAt?: string | null;
    }
  ): Promise<GallerySettingsDto> {
    const session = await sessionRepository.findById(sessionId);
    if (!session) throw new NotFoundError("Session not found");

    const passwordHash =
      input.passwordProtected && input.password
        ? await hashPassword(input.password)
        : input.passwordProtected === false
          ? null
          : undefined;

    const updated = await gallerySettingsRepository.upsert(sessionId, {
      ...(input.allowDownloads !== undefined ? { allowDownloads: input.allowDownloads } : {}),
      ...(input.watermarkPreviewImages !== undefined
        ? { watermarkPreviewImages: input.watermarkPreviewImages }
        : {}),
      ...(input.watermarkUrl !== undefined ? { watermarkUrl: input.watermarkUrl } : {}),
      ...(input.hideOriginalFileNames !== undefined
        ? { hideOriginalFileNames: input.hideOriginalFileNames }
        : {}),
      ...(input.passwordProtected !== undefined
        ? { passwordProtected: input.passwordProtected }
        : {}),
      ...(passwordHash !== undefined ? { passwordHash } : {}),
      ...(input.expiresAt !== undefined
        ? { expiresAt: input.expiresAt ? new Date(input.expiresAt) : null }
        : {})
    });

    return toDto(updated);
  }
};
