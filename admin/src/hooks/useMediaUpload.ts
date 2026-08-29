import { useCallback } from "react";
import axios from "axios";
import { useQueryClient } from "@tanstack/react-query";
import { confirmUpload, requestUploadUrl } from "@/services/mediaService";
import { useUploadQueueStore, type UploadItem } from "@/store/uploadQueueStore";
import { queryKeys } from "@/services/queryKeys";
import { useLanguage } from "@/i18n/languageContext";

const ACCEPTED_MIME_PREFIXES = ["image/", "video/"];
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2GB, first line of defense only
const uploadControllers = new Map<string, AbortController>();

export function isAcceptedMediaFile(file: File): boolean {
  return ACCEPTED_MIME_PREFIXES.some((prefix) => file.type.startsWith(prefix));
}

export function isWithinSizeLimit(file: File): boolean {
  return file.size <= MAX_FILE_SIZE_BYTES;
}

/** Why a picked file never made it into the queue. */
export type RejectedUpload = {
  name: string;
  reason: "type" | "size";
};

export type AddFilesResult = {
  /** Files that entered the queue and started uploading. */
  acceptedCount: number;
  /**
   * Files dropped before upload. Folder picks routinely include sidecars,
   * OS metadata, and RAW originals the pipeline cannot decode, so callers
   * must surface this rather than let the files disappear silently.
   */
  rejected: RejectedUpload[];
};

export function useMediaUpload(sessionId: string) {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const items = useUploadQueueStore((s) => s.items);
  const enqueue = useUploadQueueStore((s) => s.enqueue);
  const updateItem = useUploadQueueStore((s) => s.updateItem);
  const removeItem = useUploadQueueStore((s) => s.removeItem);
  const clearCompleted = useUploadQueueStore((s) => s.clearCompleted);

  const runUpload = useCallback(
    async (item: UploadItem) => {
      const controller = new AbortController();
      uploadControllers.set(item.id, controller);
      updateItem(item.id, { status: "requesting", error: undefined, progress: 0 });

      try {
        const { uploadUrl, mediaId } = await requestUploadUrl({
          sessionId,
          fileName: item.file.name,
          mimeType: item.file.type,
          size: item.file.size
        });

        updateItem(item.id, { status: "uploading" });
        await axios.put(uploadUrl, item.file, {
          signal: controller.signal,
          headers: { "Content-Type": item.file.type },
          onUploadProgress: (event) => {
            const progress = event.total
              ? Math.round((event.loaded / event.total) * 100)
              : 0;
            updateItem(item.id, { progress });
          }
        });

        updateItem(item.id, { status: "confirming", progress: 100 });
        await confirmUpload(mediaId);

        updateItem(item.id, { status: "done" });
        void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats() });
        void queryClient.invalidateQueries({ queryKey: queryKeys.media.all() });
        void queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all() });
      } catch (error) {
        if (axios.isCancel(error) || controller.signal.aborted) {
          updateItem(item.id, {
            status: "cancelled",
            error: t("Upload cancelled", "Upload cancelled")
          });
          return;
        }
        updateItem(item.id, {
          status: "error",
          error: error instanceof Error ? error.message : t("Upload failed", "فشل الرفع")
        });
      } finally {
        uploadControllers.delete(item.id);
      }
    },
    [sessionId, updateItem, queryClient, t]
  );

  const addFiles = useCallback(
    (files: File[]): AddFilesResult => {
      const accepted: File[] = [];
      const rejected: RejectedUpload[] = [];

      for (const file of files) {
        if (!isAcceptedMediaFile(file)) {
          rejected.push({ name: file.name, reason: "type" });
        } else if (!isWithinSizeLimit(file)) {
          rejected.push({ name: file.name, reason: "size" });
        } else {
          accepted.push(file);
        }
      }

      const newItems = enqueue(accepted);
      newItems.forEach((item) => void runUpload(item));

      return { acceptedCount: accepted.length, rejected };
    },
    [enqueue, runUpload]
  );

  const retryItem = useCallback(
    (id: string) => {
      const item = items.find((i) => i.id === id);
      if (item) void runUpload(item);
    },
    [items, runUpload]
  );

  const cancelItem = useCallback(
    (id: string) => {
      const controller = uploadControllers.get(id);
      if (controller) {
        controller.abort();
      } else {
        updateItem(id, {
          status: "cancelled",
          error: t("Upload cancelled", "Upload cancelled")
        });
      }
    },
    [t, updateItem]
  );

  const cancelAll = useCallback(() => {
    items
      .filter((item) => !["done", "error", "cancelled"].includes(item.status))
      .forEach((item) => cancelItem(item.id));
  }, [cancelItem, items]);

  return { items, addFiles, retryItem, removeItem, clearCompleted, cancelItem, cancelAll };
}


