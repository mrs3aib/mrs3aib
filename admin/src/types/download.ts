import type { PaginatedResult } from "./pagination";

export type DownloadType = "single" | "multiple" | "zip";

export type DownloadSort =
  | "newest"
  | "oldest"
  | "mostFiles"
  | "fewestFiles"
  | "session"
  | "client";

export type DownloadRecord = {
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

export type DownloadListParams = {
  page?: number;
  pageSize?: number;
  sessionId?: string;
  clientId?: string;
  search?: string;
  downloadType?: DownloadType;
  /** Inclusive YYYY-MM-DD bounds on the download timestamp. */
  from?: string;
  to?: string;
  sort?: DownloadSort;
  activityDays?: number;
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

/** Paginated history plus aggregates covering the whole filtered set. */
export type DownloadListResult = PaginatedResult<DownloadRecord> & {
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
