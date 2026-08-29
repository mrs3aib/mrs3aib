import type { PaginatedResult } from "./pagination";

export type MediaType = "image" | "video";

export type MediaProcessingStatus = "processing" | "ready" | "failed";

/** Where the item's content lives: our bucket, or an external YouTube link. */
export type MediaSource = "upload" | "youtube";

export type MediaSort = "newest" | "oldest" | "largest" | "smallest" | "name";

export type Media = {
  id: string;
  sessionId: string;
  /** Title of the owning session; lets the studio label cross-session items. */
  sessionTitle: string;
  type: MediaType;
  originalName: string;
  /** Storage key only — not renderable directly; use `thumbnailUrl`. */
  thumbnail: string | null;
  /** Short-lived signed URL for the thumbnail, issued by the server. */
  thumbnailUrl: string | null;
  /** Short-lived signed URL for the original uploaded file, issued by the server. */
  sourceUrl: string | null;
  /** Null for linked videos, which have no file behind them. */
  mimeType: string | null;
  size: number | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  processingStatus: MediaProcessingStatus;
  /** "youtube" items are embedded on the site and cannot be downloaded. */
  source: MediaSource;
  externalUrl: string | null;
  externalId: string | null;
  createdAt: string;
};

export type MediaListParams = {
  /** Omit to list media across every session (the studio library view). */
  sessionId?: string;
  page?: number;
  pageSize?: number;
  type?: MediaType;
  search?: string;
  processingStatus?: MediaProcessingStatus;
  sort?: MediaSort;
};

/** Paginated media plus totals covering the whole filtered set. */
export type MediaListResult = PaginatedResult<Media> & {
  totalSize: number;
  imageCount: number;
  videoCount: number;
};

export type PresignedUploadRequest = {
  sessionId: string;
  fileName: string;
  mimeType: string;
  size: number;
};

export type PresignedUploadResponse = {
  uploadUrl: string;
  mediaId: string;
};
