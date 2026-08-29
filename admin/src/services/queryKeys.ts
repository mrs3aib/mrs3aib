import type { ClientListParams } from "@/types/client";
import type { DownloadListParams } from "@/types/download";
import type { MediaListParams } from "@/types/media";
import type { SessionListParams } from "@/types/session";

export const queryKeys = {
  dashboard: {
    stats: () => ["dashboard", "stats"] as const
  },
  notifications: {
    all: () => ["notifications"] as const,
    list: (limit: number) => ["notifications", "list", limit] as const
  },
  sessions: {
    all: () => ["sessions"] as const,
    list: (params: SessionListParams) => ["sessions", "list", params] as const,
    detail: (id: string) => ["sessions", "detail", id] as const
  },
  publicSessions: {
    all: () => ["publicSessions"] as const,
    list: (category?: string) => ["publicSessions", "list", category ?? "all"] as const
  },
  clients: {
    all: () => ["clients"] as const,
    list: (params: ClientListParams) => ["clients", "list", params] as const
  },
  media: {
    all: () => ["media"] as const,
    list: (params: MediaListParams) => ["media", "list", params] as const
  },
  downloads: {
    all: () => ["downloads"] as const,
    list: (params: DownloadListParams) => ["downloads", "list", params] as const
  },
  gallerySettings: {
    detail: (sessionId: string) => ["gallerySettings", sessionId] as const
  },
  pageContent: {
    all: () => ["pageContent"] as const,
    detail: (pageKey: string) => ["pageContent", pageKey] as const,
    assets: (pageKey: string) => ["pageContent", pageKey, "assets"] as const
  }
};
