import { prisma } from "@/config/prisma";
import type { Media, MediaType, MediaProcessingStatus, Prisma } from "@prisma/client";

export type MediaSort =
  | "newest"
  | "oldest"
  | "largest"
  | "smallest"
  | "name"
  /** The order the admin picked the files in. */
  | "picked";

export type MediaWithSession = Media & { session: { title: string } };

/**
 * `sortIndex` leads wherever the admin's chosen order is what matters, with
 * `createdAt` breaking ties — rows predating the column all carry 0, so they
 * fall back to exactly the order they had before.
 */
const ORDER_BY: Record<MediaSort, Prisma.MediaOrderByWithRelationInput[]> = {
  newest: [{ createdAt: "desc" }],
  oldest: [{ createdAt: "asc" }],
  largest: [{ size: "desc" }],
  smallest: [{ size: "asc" }],
  name: [{ originalName: "asc" }],
  picked: [{ sortIndex: "asc" }, { createdAt: "asc" }]
};

/** Shared filter shape so list/count/aggregate can never drift apart. */
function buildWhere(args: {
  sessionId?: string | undefined;
  type?: MediaType | undefined;
  search?: string | undefined;
  processingStatus?: MediaProcessingStatus | undefined;
}): Prisma.MediaWhereInput {
  return {
    ...(args.sessionId ? { sessionId: args.sessionId } : {}),
    ...(args.type ? { type: args.type } : {}),
    ...(args.processingStatus ? { processingStatus: args.processingStatus } : {}),
    ...(args.search
      ? {
          OR: [
            { originalName: { contains: args.search, mode: "insensitive" as const } },
            { session: { title: { contains: args.search, mode: "insensitive" as const } } }
          ]
        }
      : {})
  };
}

export const mediaRepository = {
  findById(id: string): Promise<Media | null> {
    return prisma.media.findUnique({ where: { id } });
  },

  findManyByIds(ids: string[]): Promise<Media[]> {
    return prisma.media.findMany({ where: { id: { in: ids } } });
  },

  findAllForSession(sessionId: string): Promise<Media[]> {
    // The gallery shows a session's media in the order it was picked, which
    // is what the admin arranged on disk — not the order the upload lanes
    // happened to finish scheduling it in.
    return prisma.media.findMany({ where: { sessionId }, orderBy: ORDER_BY.picked });
  },

  /** One session's copy of an external video, used to reject duplicate links. */
  findByExternalId(sessionId: string, externalId: string): Promise<Media | null> {
    return prisma.media.findFirst({ where: { sessionId, externalId } });
  },

  list(args: {
    skip: number;
    take: number;
    sessionId?: string | undefined;
    type?: MediaType | undefined;
    search?: string | undefined;
    processingStatus?: MediaProcessingStatus | undefined;
    sort?: MediaSort | undefined;
  }): Promise<MediaWithSession[]> {
    return prisma.media.findMany({
      where: buildWhere(args),
      skip: args.skip,
      take: args.take,
      orderBy: ORDER_BY[args.sort ?? "newest"],
      // The studio lists media across sessions, so each row needs to name the
      // session it belongs to.
      include: { session: { select: { title: true } } }
    });
  },

  count(args: {
    sessionId?: string | undefined;
    type?: MediaType | undefined;
    search?: string | undefined;
    processingStatus?: MediaProcessingStatus | undefined;
  }): Promise<number> {
    return prisma.media.count({ where: buildWhere(args) });
  },

  /** Totals for the whole filtered set, independent of the current page. */
  aggregate(args: {
    sessionId?: string | undefined;
    type?: MediaType | undefined;
    search?: string | undefined;
    processingStatus?: MediaProcessingStatus | undefined;
  }): Promise<{ _sum: { size: number | null } }> {
    return prisma.media.aggregate({ _sum: { size: true }, where: buildWhere(args) });
  },

  /** Image/video split for the filtered set, used by the studio tab counters. */
  async countByTypes(args: {
    sessionId?: string | undefined;
    search?: string | undefined;
    processingStatus?: MediaProcessingStatus | undefined;
  }): Promise<{ image: number; video: number }> {
    const [image, video] = await Promise.all([
      prisma.media.count({ where: buildWhere({ ...args, type: "image" }) }),
      prisma.media.count({ where: buildWhere({ ...args, type: "video" }) })
    ]);
    return { image, video };
  },

  create(data: Prisma.MediaCreateInput): Promise<Media> {
    return prisma.media.create({ data });
  },

  update(id: string, data: Prisma.MediaUpdateInput): Promise<Media> {
    return prisma.media.update({ where: { id }, data });
  },

  delete(id: string): Promise<Media> {
    return prisma.media.delete({ where: { id } });
  },

  countAll(): Promise<number> {
    return prisma.media.count();
  },

  countByType(type: MediaType): Promise<number> {
    return prisma.media.count({ where: { type } });
  },

  sumSize(): Promise<{ _sum: { size: number | null } }> {
    return prisma.media.aggregate({ _sum: { size: true } });
  }
};
