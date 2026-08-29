import { prisma } from "@/config/prisma";
import type { DownloadHistory, DownloadType, Prisma } from "@prisma/client";

export type DownloadSort =
  | "newest"
  | "oldest"
  | "mostFiles"
  | "fewestFiles"
  | "session"
  | "client";

export type DownloadFilters = {
  sessionId?: string | undefined;
  clientId?: string | undefined;
  search?: string | undefined;
  downloadType?: DownloadType | undefined;
  from?: Date | undefined;
  to?: Date | undefined;
};

const ORDER_BY: Record<DownloadSort, Prisma.DownloadHistoryOrderByWithRelationInput> = {
  newest: { timestamp: "desc" },
  oldest: { timestamp: "asc" },
  // `mediaIds` is a scalar list, so file count cannot be ordered in SQL —
  // these fall back to recency and are re-sorted in the service layer.
  mostFiles: { timestamp: "desc" },
  fewestFiles: { timestamp: "desc" },
  session: { session: { title: "asc" } },
  client: { client: { name: "asc" } }
};

/** Shared filter shape so list/count/aggregates can never drift apart. */
function buildWhere(args: DownloadFilters): Prisma.DownloadHistoryWhereInput {
  const timestamp =
    args.from || args.to
      ? {
          ...(args.from ? { gte: args.from } : {}),
          ...(args.to ? { lte: args.to } : {})
        }
      : undefined;

  return {
    ...(args.sessionId ? { sessionId: args.sessionId } : {}),
    ...(args.clientId ? { clientId: args.clientId } : {}),
    ...(args.downloadType ? { downloadType: args.downloadType } : {}),
    ...(timestamp ? { timestamp } : {}),
    ...(args.search
      ? {
          OR: [
            { ipAddress: { contains: args.search, mode: "insensitive" as const } },
            { session: { title: { contains: args.search, mode: "insensitive" as const } } },
            { client: { name: { contains: args.search, mode: "insensitive" as const } } }
          ]
        }
      : {})
  };
}

const WITH_RELATIONS = {
  client: { select: { name: true } },
  session: { select: { title: true } }
} as const;

export const downloadHistoryRepository = {
  create(data: {
    clientId: string;
    sessionId: string;
    mediaIds: string[];
    downloadType: DownloadType;
    ipAddress: string;
  }): Promise<DownloadHistory> {
    return prisma.downloadHistory.create({ data });
  },

  list(args: DownloadFilters & { skip: number; take: number; sort?: DownloadSort | undefined }) {
    return prisma.downloadHistory.findMany({
      where: buildWhere(args),
      skip: args.skip,
      take: args.take,
      orderBy: ORDER_BY[args.sort ?? "newest"],
      include: WITH_RELATIONS
    });
  },

  count(args: DownloadFilters): Promise<number> {
    return prisma.downloadHistory.count({ where: buildWhere(args) });
  },

  /**
   * Every matching record, relations included but unpaginated. The dashboard
   * derives per-day activity and file totals from `mediaIds`, which is a scalar
   * list Prisma cannot sum or group by in SQL.
   */
  findAllMatching(args: DownloadFilters) {
    return prisma.downloadHistory.findMany({
      where: buildWhere(args),
      orderBy: { timestamp: "desc" },
      include: WITH_RELATIONS
    });
  },

  countAll(): Promise<number> {
    return prisma.downloadHistory.count();
  }
};
