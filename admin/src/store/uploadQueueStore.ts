import { create } from "zustand";

export type UploadItemStatus =
  | "queued"
  | "requesting"
  | "uploading"
  /**
   * Every byte has left the browser, but R2 has not acknowledged the object
   * yet. On a large file that wait is long enough to look like a stall, so it
   * is its own state rather than a progress bar sitting at 100% under
   * "Uploading…".
   */
  | "storing"
  | "confirming"
  | "done"
  | "error"
  | "cancelled";

export type UploadItem = {
  id: string;
  file: File;
  status: UploadItemStatus;
  progress: number;
  error?: string;
  /**
   * Position in the selection this file arrived in, fixed at enqueue time.
   *
   * Uploads finish out of order — four lanes, wildly different file sizes, and
   * retries that run long after the first pass — so nothing derived from
   * completion time can reproduce what the admin picked. Captured once here
   * and sent with the presign, it survives any number of retries.
   */
  sortIndex: number;
};

type UploadQueueState = {
  items: UploadItem[];
  enqueue: (files: File[]) => UploadItem[];
  updateItem: (id: string, patch: Partial<UploadItem>) => void;
  removeItem: (id: string) => void;
  clearCompleted: () => void;
  reset: () => void;
};

let nextId = 0;

/**
 * Monotonic across batches, so a second folder dropped into the same session
 * lands after the first instead of interleaving with it.
 */
let nextSortIndex = 0;

export const useUploadQueueStore = create<UploadQueueState>((set) => ({
  items: [],
  enqueue: (files) => {
    const newItems: UploadItem[] = files.map((file) => ({
      id: `upload-${Date.now()}-${nextId++}`,
      file,
      status: "queued",
      progress: 0,
      sortIndex: nextSortIndex++
    }));
    set((state) => ({ items: [...state.items, ...newItems] }));
    return newItems;
  },
  updateItem: (id, patch) =>
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? { ...item, ...patch } : item))
    })),
  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
  clearCompleted: () =>
    set((state) => ({ items: state.items.filter((item) => item.status !== "done") })),
  reset: () => set({ items: [] })
}));
