export type GallerySettings = {
  sessionId: string;
  allowDownloads: boolean;
  watermarkPreviewImages: boolean;
  watermarkUrl: string | null;
  hideOriginalFileNames: boolean;
  passwordProtected: boolean;
  password: string | null;
  expiresAt: string | null;
};

export type UpdateGallerySettingsPayload = Partial<
  Omit<GallerySettings, "sessionId">
>;
