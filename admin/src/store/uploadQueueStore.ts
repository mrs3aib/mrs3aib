import { create } from "zustand";

export type UploadItemStatus =
  | "queued"
  | "requesting"
  | "uploading"
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

export const useUploadQueueStore = create<UploadQueueState>((set) => ({
  items: [],
  enqueue: (files) => {
    const newItems: UploadItem[] = files.map((file) => ({
      id: `upload-${Date.now()}-${nextId++}`,
      file,
      status: "queued",
      progress: 0
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
