import { useQuery } from "@tanstack/react-query";
import { listDownloads } from "@/services/downloadService";
import { queryKeys } from "@/services/queryKeys";
import type { DownloadListParams } from "@/types/download";

export function useDownloadsQuery(params: DownloadListParams) {
  return useQuery({
    queryKey: queryKeys.downloads.list(params),
    queryFn: () => listDownloads(params),
    // Keeps the previous page on screen while the next one loads, so the table
    // does not collapse to a spinner on every filter change.
    placeholderData: (previous) => previous
  });
}
