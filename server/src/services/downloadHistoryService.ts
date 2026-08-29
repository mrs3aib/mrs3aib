import type { DownloadHistory, DownloadType } from "@prisma/client";
import {
  downloadHistoryRepository,
  type DownloadFilters,
  type DownloadSort
} from "@/repositories/downloadHistoryRepository";
import { toSkipTake, paginate, type PaginatedResult } from "@/utils/pagination";

type DownloadWithRelations = DownloadHistory & {
  client: { name: string };
  session: { title: string };
};

export type DownloadDto = {
  id: string;
  clientId: string;
  clientName: string;
  sessionId: string;
  sessionTitle: string;
  mediaCount: number;
  downloadType: DownloadType;
  ipAddress: string;
  timestamp: string;
};

/** One day of the activity chart. */
export type DownloadActivityPoint = {
  date: string;
  downloads: number;
  files: number;
};

export type DownloadTopSession = {
  sessionId: string;
  sessionTitle: string;
  downloads: number;
  files: number;
};

/**
 * Paginated history plus aggregates covering the whole filtered set: the stat
 * cards, activity chart and top-sessions widget all describe every matching
 * record, not just the current page.
 */
export type DownloadListResult = PaginatedResult<DownloadDto> & {
  stats: {
    totalDownloads: number;
    totalFiles: number;
    uniqueClients: number;
    uniqueSessions: number;
    averageFilesPerSession: number;
  };
  activity: DownloadActivityPoint[];
  topSessions: DownloadTopSession[];
};

/** File count lives in a scalar list, so these two orderings are applied here. */
const FILE_COUNT_SORTS = new Set<DownloadSort>(["mostFiles", "fewestFiles"]);

const TOP_SESSION_COUNT = 5;

function toDto(record: DownloadWithRelations): DownloadDto {
  return {
    id: record.id,
    clientId: record.clientId,
    clientName: record.client.name,
    sessionId: record.sessionId,
    sessionTitle: record.session.title,
    mediaCount: record.mediaIds.length,
    downloadType: record.downloadType,
    ipAddress: record.ipAddress,
    timestamp: record.timestamp.toISOString()
  };
}

function startOfUtcDay(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/** Downloads and files per day across `days`, ending today. */
function buildActivity(records: DownloadWithRelations[], days: number): DownloadActivityPoint[] {
  const buckets = new Map<string, { downloads: number; files: number }>();
  const today = new Date();

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date(today);
    day.setUTCDate(day.getUTCDate() - offset);
    buckets.set(startOfUtcDay(day), { downloads: 0, files: 0 });
  }

  for (const record of records) {
    const bucket = buckets.get(startOfUtcDay(record.timestamp));
    if (!bucket) continue;
    bucket.downloads += 1;
    bucket.files += record.mediaIds.length;
  }

  return [...buckets.entries()].map(([date, value]) => ({ date, ...value }));
}

function buildTopSessions(records: DownloadWithRelations[]): DownloadTopSession[] {
  const grouped = new Map<string, DownloadTopSession>();

  for (const record of records) {
    const existing = grouped.get(record.sessionId);
    if (existing) {
      existing.downloads += 1;
      existing.files += record.mediaIds.length;
    } else {
      grouped.set(record.sessionId, {
        sessionId: record.sessionId,
        sessionTitle: record.session.title,
        downloads: 1,
        files: record.mediaIds.length
      });
    }
  }

  return [...grouped.values()]
    .sort((a, b) => b.files - a.files)
    .slice(0, TOP_SESSION_COUNT);
}

export const downloadHistoryService = {
  async list(
    params: DownloadFilters & {
      page?: number | undefined;
      pageSize?: number | undefined;
      sort?: DownloadSort | undefined;
      activityDays?: number | undefined;
    }
  ): Promise<DownloadListResult> {
    const { skip, take, page, pageSize } = toSkipTake(params);
    const filters: DownloadFilters = {
      sessionId: params.sessionId,
      clientId: params.clientId,
      search: params.search,
      downloadType: params.downloadType,
      from: params.from,
      to: params.to
    };

    // Aggregates need every matching row anyway; when sorting by file count we
    // also page from that same set, since SQL cannot order a scalar list.
    const [all, total] = await Promise.all([
      downloadHistoryRepository.findAllMatching(filters),
      downloadHistoryRepository.count(filters)
    ]);

    let items: DownloadDto[];
    if (params.sort && FILE_COUNT_SORTS.has(params.sort)) {
      const factor = params.sort === "mostFiles" ? -1 : 1;
      items = [...all]
        .sort((a, b) => (a.mediaIds.length - b.mediaIds.length) * factor)
        .slice(skip, skip + take)
        .map(toDto);
    } else {
      const rows = await downloadHistoryRepository.list({
        ...filters,
        skip,
        take,
        sort: params.sort
      });
      items = rows.map(toDto);
    }

    const totalFiles = all.reduce((sum, record) => sum + record.mediaIds.length, 0);
    const uniqueSessions = new Set(all.map((record) => record.sessionId)).size;

    return {
      ...paginate(items, total, page, pageSize),
      stats: {
        totalDownloads: total,
        totalFiles,
        uniqueClients: new Set(all.map((record) => record.clientId)).size,
        uniqueSessions,
        averageFilesPerSession:
          uniqueSessions === 0 ? 0 : Math.round(totalFiles / uniqueSessions)
      },
      activity: buildActivity(all, params.activityDays ?? 30),
      topSessions: buildTopSessions(all)
    };
  },

  async record(input: {
    clientId: string;
    sessionId: string;
    mediaIds: string[];
    downloadType: DownloadType;
    ipAddress: string;
  }): Promise<void> {
    await downloadHistoryRepository.create(input);
  }
};
