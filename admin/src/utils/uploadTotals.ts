import type { UploadItem } from "@/store/uploadQueueStore";

export type UploadTotals = {
  total: number;
  done: number;
  failed: number;
  inFlight: number;
  percent: number;
  uploadedBytes: number;
  totalBytes: number;
  allSettled: boolean;
};

/**
 * Aggregate progress for the whole upload queue.
 *
 * Weighted by file size rather than a plain average of per-file percentages:
 * a 2 KB thumbnail and a 2 GB video are one item each, so an unweighted mean
 * would leap to 50% the moment the small file lands and then crawl. Bytes
 * transferred track the real work and keep the bar moving smoothly.
 */
export function computeUploadTotals(items: UploadItem[]): UploadTotals {
  const totalBytes = items.reduce((sum, item) => sum + item.file.size, 0);

  const uploadedBytes = items.reduce((sum, item) => {
    if (item.status === "done") return sum + item.file.size;
    // A failed/cancelled item has contributed nothing usable, so it counts as zero
    // rather than freezing the bar at whatever fraction it reached.
    if (item.status === "error" || item.status === "cancelled") return sum;
    return sum + (item.file.size * item.progress) / 100;
  }, 0);

  const done = items.filter((item) => item.status === "done").length;
  const failed = items.filter((item) => item.status === "error").length;
  const cancelled = items.filter((item) => item.status === "cancelled").length;

  return {
    total: items.length,
    done,
    failed,
    inFlight: items.length - done - failed - cancelled,
    percent: totalBytes > 0 ? Math.round((uploadedBytes / totalBytes) * 100) : 0,
    uploadedBytes,
    totalBytes,
    allSettled: items.length > 0 && done + failed + cancelled === items.length
  };
}
