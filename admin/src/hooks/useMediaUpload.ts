import { useCallback, useEffect, useRef } from "react";
import axios from "axios";
import { useQueryClient } from "@tanstack/react-query";
import { confirmUpload, requestUploadUrl } from "@/services/mediaService";
import { useUploadQueueStore, type UploadItem } from "@/store/uploadQueueStore";
import { queryKeys } from "@/services/queryKeys";
import { useLanguage } from "@/i18n/languageContext";

const ACCEPTED_MIME_PREFIXES = ["image/", "video/"];
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2GB, first line of defense only
const uploadControllers = new Map<string, AbortController>();

/**
 * How many files upload at once.
 *
 * Every file costs two API calls (`upload-url`, then `confirm`) on top of its
 * transfer. Starting a whole selection at once meant a 60-photo drop firing 60
 * presign requests in the same instant, which alone exceeds the API's 120/min
 * budget and comes back as 429s — the upload fails against a healthy server.
 *
 * Four keeps the pipe busy — the transfer itself is the slow part, not the two
 * calls around it — while leaving room for the dashboard's own polling.
 */
const MAX_CONCURRENT_UPLOADS = 4;

/** Trailing delay before refetching after uploads settle. */
const REFRESH_DEBOUNCE_MS = 800;

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

  /**
   * Refetch what an upload changes, once per burst rather than once per file.
   *
   * `sessions.all()` is a key prefix, so it refetches every sessions list
   * currently mounted. Firing that for each of 60 finished uploads produced
   * hundreds of requests whose results were identical — a short trailing
   * delay collapses them into one refresh after the queue settles.
   */
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => {
      refreshTimer.current = null;
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.media.all() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all() });
    }, REFRESH_DEBOUNCE_MS);
  }, [queryClient]);

  // Pending refresh must not outlive the component, or it fires against an
  // unmounted tree after the admin has navigated away.
  useEffect(() => {
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, []);

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
        // Coalesced: invalidating per file made every completion refetch the
        // dashboard, the media list, and every mounted sessions list — the
        // refetches, not the uploads, were most of the request volume.
        scheduleRefresh();
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
    [sessionId, updateItem, scheduleRefresh, t]
  );

  /**
   * Upload a set of items through a fixed number of lanes.
   *
   * Every entry point that can start more than one upload goes through here —
   * a fresh selection and a bulk retry alike. Starting them all at once is
   * what produced 429s from the API's rate limiter, and a retry of fifty
   * failures would burst just as hard as the original fifty files did.
   */
  const runQueue = useCallback(
    (queue: UploadItem[]) => {
      const pending = [...queue];
      const worker = async () => {
        for (let next = pending.shift(); next; next = pending.shift()) {
          await runUpload(next);
        }
      };
      const lanes = Math.min(MAX_CONCURRENT_UPLOADS, pending.length);
      for (let i = 0; i < lanes; i += 1) void worker();
    },
    [runUpload]
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

      runQueue(newItems);

      return { acceptedCount: accepted.length, rejected };
    },
    [enqueue, runQueue]
  );

  const retryItem = useCallback(
    (id: string) => {
      const item = items.find((i) => i.id === id);
      if (item) void runUpload(item);
    },
    [items, runUpload]
  );

  /**
   * Re-run everything that has not finished: failures, cancellations, and
   * anything still sitting `queued`.
   *
   * Items mid-flight (`requesting`/`uploading`/`confirming`) are deliberately
   * excluded. Restarting those would abandon a transfer that is already
   * partway done and race the original request — two presigns and two PUTs
   * for one file. Anything genuinely stuck ends up `error` and is picked up
   * on the next press.
   */
  const retryIncomplete = useCallback(() => {
    runQueue(
      items.filter(
        (item) =>
          item.status === "error" ||
          item.status === "cancelled" ||
          item.status === "queued"
      )
    );
  }, [items, runQueue]);

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

  return {
    items,
    addFiles,
    retryItem,
    retryIncomplete,
    removeItem,
    clearCompleted,
    cancelItem,
    cancelAll
  };
}


