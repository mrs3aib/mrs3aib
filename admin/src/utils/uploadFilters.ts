import type { UploadItem } from "@/store/uploadQueueStore";

/**
 * Filters offered over the upload queue.
 *
 * Deliberately coarser than `UploadItemStatus`. `requesting`, `uploading` and
 * `confirming` are internal steps of one upload, and a file moves through all
 * three in seconds — offering them separately would give three filters that
 * are empty most of the time and a row that jumps between them while being
 * read. What an admin actually needs to answer is "what still needs my
 * attention", which is the grouping below.
 */
export type UploadFilter = "all" | "incomplete" | "failed" | "done";

/**
 * Whether an item needs the admin to do something, or is still going.
 *
 * `cancelled` belongs here with `error`: both left the file unstored, and both
 * are resolved the same way — retry it or drop it from the queue. Grouping
 * them keeps "incomplete" meaning "not safely uploaded", which is the question
 * being asked after a large batch.
 */
export function isIncomplete(item: UploadItem): boolean {
  return item.status !== "done";
}

export function matchesUploadFilter(item: UploadItem, filter: UploadFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "incomplete":
      return isIncomplete(item);
    case "failed":
      return item.status === "error" || item.status === "cancelled";
    case "done":
      return item.status === "done";
  }
}

/** Count per filter, so each control can show how much it holds. */
export function countByUploadFilter(items: UploadItem[]): Record<UploadFilter, number> {
  return {
    all: items.length,
    incomplete: items.filter(isIncomplete).length,
    failed: items.filter(
      (item) => item.status === "error" || item.status === "cancelled"
    ).length,
    done: items.filter((item) => item.status === "done").length
  };
}
