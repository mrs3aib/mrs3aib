import { z } from "zod";

export const gallerySettingsParamSchema = z.object({
  params: z.object({ sessionId: z.string().min(1) })
});

export const updateGallerySettingsSchema = z.object({
  params: z.object({ sessionId: z.string().min(1) }),
  body: z.object({
    allowDownloads: z.boolean().optional(),
    watermarkPreviewImages: z.boolean().optional(),
    watermarkUrl: z.string().url().nullable().optional(),
    hideOriginalFileNames: z.boolean().optional(),
    passwordProtected: z.boolean().optional(),
    password: z.string().min(4).max(64).nullable().optional(),
    expiresAt: z.string().nullable().optional()
  })
});
