import type { SessionCategory } from "./category";
import type { PaginatedResult } from "./pagination";

export type SessionStatus = "draft" | "active" | "archived";

export type PhotoSession = {
  id: string;
  title: string;
  slug: string;
  category: SessionCategory;
  coverImage: string | null;
  coverImageUrl: string | null;
  eventDate: string;
  location: string;
  description: string | null;
  status: SessionStatus;
  /** Whether the session appears on its public category page. */
  isPublic: boolean;
  visibility: SessionVisibility;
  clientCount: number;
  mediaCount: number;
  createdAt: string;
  updatedAt: string;
};

/**
 * How a published session is reached from the public site.
 *
 * - `public` — listed on its category page, open to anyone.
 * - `private` — hidden from every listing; opens for anyone with the link.
 * - `protected` — listed, but its contents need the gallery password.
 */
export type SessionVisibility = "public" | "private" | "protected";

export type CreateSessionPayload = {
  title: string;
  category: SessionCategory;
  eventDate: string;
  location: string;
  description?: string;
  isPublic?: boolean;
  visibility?: SessionVisibility;
};

export type UpdateSessionPayload = Partial<CreateSessionPayload> & {
  status?: SessionStatus;
  /**
   * Media id to feature as the session's cover — image or video. Null restores
   * the automatic pick (the first ready image).
   */
  coverImage?: string | null;
};

export type SessionSort = "newest" | "oldest" | "eventDate" | "title" | "mediaCount";

export type SessionListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: SessionStatus;
  category?: SessionCategory;
  sort?: SessionSort;
};

/** Paginated sessions plus per-status totals covering the whole table. */
export type SessionListResult = PaginatedResult<PhotoSession> & {
  statusCounts: Record<SessionStatus, number>;
};
