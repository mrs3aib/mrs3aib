import type {
  PhotoSession,
  SessionCategory,
  SessionStatus,
  SessionVisibility
} from "@prisma/client";
import { sessionRepository, type SessionSort } from "@/repositories/sessionRepository";
import { clientRepository } from "@/repositories/clientRepository";
import { mediaRepository } from "@/repositories/mediaRepository";
import { slugify } from "@/utils/slugify";
import { toSkipTake, paginate, type PaginatedResult } from "@/utils/pagination";
import { NotFoundError } from "@/types/errors";
import { youTubeThumbnailUrl } from "@/utils/youtube";
import { storageProvider } from "./serviceRegistry";
import { revalidatePublicSite } from "./siteRevalidationService";

type SessionWithCounts = PhotoSession & {
  _count: { clients: number; media: number };
};

export type SessionDto = {
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
  isPublic: boolean;
  visibility: SessionVisibility;
  clientCount: number;
  mediaCount: number;
  createdAt: string;
  updatedAt: string;
};

/**
 * Paginated sessions plus per-status totals for the whole table. The summary
 * panel needs every bucket's count, which the current page cannot supply.
 */
export type SessionListResult = PaginatedResult<SessionDto> & {
  statusCounts: Record<SessionStatus, number>;
};

async function resolveCoverImageUrl(session: Pick<PhotoSession, "id" | "coverImage">) {
  const media = await mediaRepository.findAllForSession(session.id);
  const ready = media.filter((item) => item.processingStatus === "ready");
  const pinned = session.coverImage
    ? ready.find((item) => item.id === session.coverImage)
    : undefined;
  const cover =
    pinned ??
    ready.find((item) => item.type === "image" && item.thumbnailKey) ??
    ready.find((item) => item.thumbnailKey);

  if (!cover) return null;

  if (cover.source === "youtube") {
    return cover.externalId ? youTubeThumbnailUrl(cover.externalId) : null;
  }

  const key = cover.thumbnailKey ?? cover.storageKey;
  return key ? storageProvider.getDownloadUrl(key) : null;
}

async function toDto(session: SessionWithCounts): Promise<SessionDto> {
  return {
    id: session.id,
    title: session.title,
    slug: session.slug,
    category: session.category,
    coverImage: session.coverImage,
    coverImageUrl: await resolveCoverImageUrl(session),
    eventDate: session.eventDate.toISOString(),
    location: session.location,
    description: session.description,
    status: session.status,
    isPublic: session.isPublic,
    visibility: session.visibility,
    clientCount: session._count.clients,
    mediaCount: session._count.media,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString()
  };
}

async function generateUniqueSlug(title: string): Promise<string> {
  const base = slugify(title) || "session";
  let candidate = base;
  let suffix = 1;
  // Collision probability is low, but sessions can share a title
  // (e.g. two "Wedding" sessions), so guarantee uniqueness deterministically.
  while (await sessionRepository.findBySlug(candidate)) {
    candidate = `${base}-${++suffix}`;
  }
  return candidate;
}

export const sessionService = {
  async list(params: {
    page?: number | undefined;
    pageSize?: number | undefined;
    search?: string | undefined;
    status?: SessionStatus | undefined;
    category?: SessionCategory | undefined;
    sort?: SessionSort | undefined;
  }): Promise<SessionListResult> {
    const { skip, take, page, pageSize } = toSkipTake(params);
    const filters = {
      search: params.search,
      status: params.status,
      category: params.category
    };

    const [sessions, total, statusCounts] = await Promise.all([
      sessionRepository.list({ skip, take, ...filters, sort: params.sort }),
      sessionRepository.count(filters),
      sessionRepository.countByStatus({ search: params.search, category: params.category })
    ]);

    return {
      ...paginate(await Promise.all(sessions.map(toDto)), total, page, pageSize),
      statusCounts
    };
  },

  async getById(id: string): Promise<SessionDto> {
    const session = await sessionRepository.findByIdWithCounts(id);
    if (!session) throw new NotFoundError("Session not found");
    return toDto(session);
  },

  async create(input: {
    title: string;
    category: SessionCategory;
    eventDate: string;
    location: string;
    description?: string;
    status?: SessionStatus;
    isPublic?: boolean;
    visibility?: SessionVisibility;
  }): Promise<SessionDto> {
    const slug = await generateUniqueSlug(input.title);
    const session = await sessionRepository.create({
      title: input.title,
      slug,
      category: input.category,
      eventDate: new Date(input.eventDate),
      location: input.location,
      description: input.description ?? null,
      // Defaults to draft, so a half-finished session is never public by
      // accident — publishing is a deliberate step.
      ...(input.status !== undefined ? { status: input.status } : {}),
      isPublic: input.isPublic ?? false,
      ...(input.visibility !== undefined ? { visibility: input.visibility } : {})
    });
    // A session created public belongs on the site straight away.
    if (input.isPublic) void revalidatePublicSite(`session:create:${session.id}`);
    return this.getById(session.id);
  },

  async update(
    id: string,
    input: {
      title?: string;
      category?: SessionCategory;
      eventDate?: string;
      location?: string;
      description?: string;
      status?: SessionStatus;
      isPublic?: boolean;
      visibility?: SessionVisibility;
      coverImage?: string | null;
    }
  ): Promise<SessionDto> {
    await sessionRepository.update(id, {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.eventDate !== undefined ? { eventDate: new Date(input.eventDate) } : {}),
      ...(input.location !== undefined ? { location: input.location } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.isPublic !== undefined ? { isPublic: input.isPublic } : {}),
      ...(input.visibility !== undefined ? { visibility: input.visibility } : {}),
      // An empty string means "unpin", which is stored as null so the automatic
      // cover pick takes over again.
      ...(input.coverImage !== undefined
        ? { coverImage: input.coverImage || null }
        : {})
    });

    // Publishing, unpublishing, archiving, re-titling, or re-pinning a cover
    // all change what the public listings render, so any of them drops the
    // cached copy rather than leaving the site an hour behind.
    void revalidatePublicSite(`session:update:${id}`);

    return this.getById(id);
  },

  async archive(id: string): Promise<SessionDto> {
    await sessionRepository.update(id, { status: "archived" });
    // Archiving removes the album from every public listing.
    void revalidatePublicSite(`session:archive:${id}`);
    return this.getById(id);
  },

  async delete(id: string): Promise<void> {
    await sessionRepository.delete(id);
    void revalidatePublicSite(`session:delete:${id}`);
  },

  async assignClients(sessionId: string, clientIds: string[]): Promise<void> {
    if (clientIds.length === 0) return;
    await clientRepository.reassignMany(clientIds, sessionId);
  }
};
