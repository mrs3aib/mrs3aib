import { apiClient } from "./apiClient";
import type { DownloadListParams, DownloadListResult } from "@/types/download";

export async function listDownloads(
  params: DownloadListParams
): Promise<DownloadListResult> {
  const { data } = await apiClient.get<DownloadListResult>("/admin/downloads", {
    params
  });
  return data;
}
