import { randomUUID } from "node:crypto";

function sanitizeExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex === -1) return "";
  return fileName
    .slice(dotIndex)
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, "");
}

export const storageKeys = {
  media: (sessionId: string, mediaId: string, originalName: string): string =>
    `sessions/${sessionId}/media/${mediaId}${sanitizeExtension(originalName)}`,

  thumbnail: (sessionId: string, mediaId: string): string =>
    `sessions/${sessionId}/thumbnails/${mediaId}.webp`,

  optimized: (sessionId: string, mediaId: string): string =>
    `sessions/${sessionId}/optimized/${mediaId}.webp`,

  sessionCover: (sessionId: string, originalName: string): string =>
    `sessions/${sessionId}/cover/${randomUUID()}${sanitizeExtension(originalName)}`,

  zipArchive: (sessionId: string, contentHash: string): string =>
    `sessions/${sessionId}/archives/${contentHash}.zip`,

  pageAsset: (pageKey: string, originalName: string): string =>
    `pages/${pageKey}/assets/${randomUUID()}${sanitizeExtension(originalName)}`,

  /**
   * Whether a caller-supplied key really is one of this page's own assets.
   * Guards deletion, where an unchecked key would let an admin remove any
   * object in the bucket. Traversal segments are rejected outright so
   * `pages/home/assets/../../sessions/...` cannot escape the prefix.
   */
  isPageAsset: (pageKey: string, key: string): boolean =>
    key.startsWith(`pages/${pageKey}/assets/`) &&
    !key.includes("..") &&
    key.length > `pages/${pageKey}/assets/`.length
};
