import { prisma } from "@/config/prisma";
import type { Prisma, SessionCategory, SessionStatus } from "@prisma/client";

export type SessionSort = "newest" | "oldest" | "eventDate" | "title" | "mediaCount";

const SESSION_ORDER_BY: Record<SessionSort, Prisma.PhotoSessionOrderByWithRelationInput> = {
  newest: { createdAt: "desc" },
  oldest: { createdAt: "asc" },
  eventDate: { eventDate: "desc" },
  title: { title: "asc" },
  mediaCount: { media: { _count: "desc" } }
};

/** Shared filter shape so list/count/countByStatus can never drift apart. */
function buildWhere(args: {
  search?: string | undefined;
  status?: SessionStatus | undefined;
  category?: SessionCategory | undefined;
}): Prisma.PhotoSessionWhereInput {
  return {
    ...(args.status ? { status: args.status } : {}),
    ...(args.category ? { category: args.category } : {}),
    ...(args.search
      ? {
          OR: [
            { title: { contains: args.search, mode: "insensitive" as const } },
            { location: { contains: args.search, mode: "insensitive" as const } }
          ]
        }
      : {})
  };
}

/**
 * What a public album card needs from each session's media, fetched with the
 * session itself.
 *
 * Listing endpoints used to re-read every media row per session just to pick a
 * cover and count photos, which is one extra query per album and grows with the
 * gallery rather than the page. Prisma resolves these grouped counts and the
 * handful of cover candidates in the same round trip.
 */
const PUBLIC_ALBUM_MEDIA_SELECT = {
  _count: {
    select: {
      media: { where: { processingStatus: "ready" as const, type: "image" as const } }
    }
  },
  media: {
    where: { processingStatus: "ready" as const },
    // An image with a thumbnail is the preferred automatic cover, so ordering
    // by those two flags puts the best candidate first and the loop below can
    // stop at the head of the list instead of scanning every row.
    orderBy: [{ createdAt: "asc" as const }],
    select: {
      id: true,
      type: true,
      source: true,
      externalId: true,
      thumbnailKey: true,
      storageKey: true
    }
  }
} satisfies Prisma.PhotoSessionSelect;

/**
 * Video count cannot ride on the same `_count` as the image count — Prisma
 * allows one filter per relation there — so it is aggregated for the whole page
 * in a single grouped query rather than per session.
 */
export async function readyVideoCountsBySession(
  sessionIds: string[]
): Promise<Map<string, number>> {
  if (sessionIds.length === 0) return new Map();

  const rows = await prisma.media.groupBy({
    by: ["sessionId"],
    where: {
      sessionId: { in: sessionIds },
      processingStatus: "ready",
      type: "video"
    },
    _count: { _all: true }
  });

  return new Map(rows.map((row) => [row.sessionId, row._count._all]));
}

export const sessionRepository = {
  findById(id: string) {
    return prisma.photoSession.findUnique({ where: { id } });
  },

  /**
   * Sessions shown on a public category page: published, `active`, and carrying
   * at least one ready media item so no empty album is listed.
   *
   * Only `active` is public. A `draft` session is work in progress and stays
   * hidden even once `isPublic` is set — previously the filter was merely "not
   * archived", which made draft and active mean exactly the same thing.
   */
  listPublicByCategory(category: SessionCategory) {
    return prisma.photoSession.findMany({
      where: {
        category,
        isPublic: true,
        status: "active",
        // `private` albums are reachable by direct link only, so they are
        // absent from every listing. `protected` ones still appear — the
        // password gates opening them, not seeing that they exist.
        visibility: { in: ["public", "protected"] },
        media: { some: { processingStatus: "ready" } }
      },
      orderBy: { eventDate: "desc" },
      select: {
        id: true,
        slug: true,
        title: true,
        category: true,
        eventDate: true,
        location: true,
        description: true,
        coverImage: true,
        ...PUBLIC_ALBUM_MEDIA_SELECT
      }
    });
  },

  /**
   * Published sessions across every category, newest event first.
   *
   * Backs the CMS picker, which chooses homepage feature items from the whole
   * portfolio rather than one category page. Same visibility rules as
   * `listPublicByCategory` — an unpublished, draft, archived, or empty session
   * must not become selectable just because this list is unfiltered.
   */
  listPublic(args: { category?: SessionCategory | undefined; take: number }) {
    return prisma.photoSession.findMany({
      where: {
        ...(args.category ? { category: args.category } : {}),
        isPublic: true,
        status: "active",
        // Unlisted albums stay out of the CMS picker too — featuring one on the
        // homepage would defeat the point of it being link-only.
        visibility: { in: ["public", "protected"] },
        media: { some: { processingStatus: "ready" } }
      },
      orderBy: { eventDate: "desc" },
      take: args.take,
      select: {
        id: true,
        slug: true,
        title: true,
        category: true,
        eventDate: true,
        location: true,
        description: true,
        coverImage: true,
        ...PUBLIC_ALBUM_MEDIA_SELECT
      }
    });
  },

  /**
   * A single published session, or null when it is not publicly reachable.
   *
   * Guards direct-by-id access — the album page and every public download route
   * — so a draft or archived session cannot be reached by guessing its id.
   *
   * Visibility is deliberately *not* filtered here: `private` means unlisted,
   * not unreachable, and holding the link is the whole access mechanism. A
   * `protected` session is returned too, with its password enforced separately
   * by the album endpoint.
   */
  findPublicById(id: string) {
    return prisma.photoSession.findFirst({
      where: { id, isPublic: true, status: "active" }
    });
  },

  findBySlug(slug: string) {
    return prisma.photoSession.findUnique({ where: { slug } });
  },

  findByIdWithCounts(id: string) {
    return prisma.photoSession.findUnique({
      where: { id },
      include: { _count: { select: { clients: true, media: true } } }
    });
  },

  list(args: {
    skip: number;
    take: number;
    search?: string | undefined;
    status?: SessionStatus | undefined;
    category?: SessionCategory | undefined;
    sort?: SessionSort | undefined;
  }) {
    return prisma.photoSession.findMany({
      where: buildWhere(args),
      skip: args.skip,
      take: args.take,
      orderBy: SESSION_ORDER_BY[args.sort ?? "newest"],
      include: { _count: { select: { clients: true, media: true } } }
    });
  },

  count(args: {
    search?: string | undefined;
    status?: SessionStatus | undefined;
    category?: SessionCategory | undefined;
  }): Promise<number> {
    return prisma.photoSession.count({ where: buildWhere(args) });
  },

  /**
   * Per-status totals for the whole table, ignoring any active status filter so
   * the summary panel keeps showing every bucket while one is selected.
   */
  async countByStatus(args: {
    search?: string | undefined;
    category?: SessionCategory | undefined;
  }): Promise<Record<SessionStatus, number>> {
    const base = { search: args.search, category: args.category };
    const [draft, active, archived] = await Promise.all([
      prisma.photoSession.count({ where: buildWhere({ ...base, status: "draft" }) }),
      prisma.photoSession.count({ where: buildWhere({ ...base, status: "active" }) }),
      prisma.photoSession.count({ where: buildWhere({ ...base, status: "archived" }) })
    ]);
    return { draft, active, archived };
  },

  create(data: Prisma.PhotoSessionCreateInput) {
    return prisma.photoSession.create({ data });
  },

  update(id: string, data: Prisma.PhotoSessionUpdateInput) {
    return prisma.photoSession.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.photoSession.delete({ where: { id } });
  }
};
