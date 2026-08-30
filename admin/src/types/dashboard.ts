export type DashboardStatistics = {
  totalSessions: number;
  totalClients: number;
  totalImages: number;
  totalVideos: number;
  totalDownloads: number;
  /**
   * Null when the API could not reach the storage bucket. The counts above
   * come from the database and are always present, so the dashboard shows
   * this one tile as unavailable instead of failing the whole page.
   */
  storageUsageBytes: number | null;
};
