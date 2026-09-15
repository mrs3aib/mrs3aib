import { useCallback, useEffect, useRef } from "react";
import axios from "axios";
import { useQueryClient } from "@tanstack/react-query";
import { confirmUpload, requestUploadUrl } from "@/services/mediaService";
import {
  useUploadQueueStore,
  type UploadItem,
  type UploadItemStatus
} from "@/store/uploadQueueStore";
import { queryKeys } from "@/services/queryKeys";
import { useLanguage } from "@/i18n/languageContext";

const ACCEPTED_MIME_PREFIXES = ["image/", "video/"];
/**
 * Ceiling for a single upload, checked before anything is queued.
 *
 * Set to R2's own limit for a single PUT, which is what the browser performs —
 * past this the request fails at storage no matter what we allow here. The
 * previous 2 GB predated processing being streamed, when the server loaded the
 * whole file into a Buffer and Node's ~2 GB ceiling made larger files
 * impossible; that constraint is gone.
 */
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 * 1024; // 5GB — R2 single-PUT limit

/** The cap in whole gigabytes, for user-facing copy that must not drift from it. */
export const MAX_FILE_SIZE_GB = MAX_FILE_SIZE_BYTES / (1024 * 1024 * 1024);
const uploadControllers = new Map<string, AbortController>();

/**
 * Items currently owned by a lane, keyed by upload id.
 *
 * `retryIncomplete` and `retryItem` decide what to re-run from the `items`
 * array React rendered with, which is a snapshot: between that render and the
 * click, a lane may have already picked an item up and moved it to
 * `requesting`. The snapshot still says `error`, so the item is started a
 * second time — two presigns, two PUTs, and two media rows for one file, of
 * which only one is ever confirmed. That is the source of the half-uploaded
 * duplicates left behind by repeated retry presses.
 *
 * Store state is not enough on its own: a lane sets `requesting` through a
 * React update, so two clicks in the same tick would both read the pre-update
 * value. This map is written synchronously, before any await, so it is
 * authoritative the instant a lane claims an item.
 */
const inFlight = new Set<string>();

/**
 * Statuses that mean a lane already owns this item. Restarting one of these
 * abandons a transfer that is partway done and races the original request.
 */
/**
 * The single backlog every lane drains, and the number of lanes currently
 * draining it. Module scope, not React state: lanes must see pushes that
 * happen while they are mid-flight, and a re-render must never fork a second
 * set of them.
 */
const pendingQueue: UploadItem[] = [];
let activeLanes = 0;

const RUNNING_STATUSES: UploadItemStatus[] = [
  "requesting",
  "uploading",
  "storing",
  "confirming"
];

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
      // Claimed synchronously: a second caller for the same file — a retry
      // racing a lane, or two retry clicks in one tick — returns here instead
      // of starting a duplicate transfer.
      if (inFlight.has(item.id)) return;
      inFlight.add(item.id);

      const controller = new AbortController();
      uploadControllers.set(item.id, controller);
      updateItem(item.id, { status: "requesting", error: undefined, progress: 0 });

      try {
        const { uploadUrl, mediaId } = await requestUploadUrl({
          sessionId,
          fileName: item.file.name,
          mimeType: item.file.type,
          size: item.file.size,
          sortIndex: item.sortIndex
        });

        updateItem(item.id, { status: "uploading" });
        await axios.put(uploadUrl, item.file, {
          signal: controller.signal,
          headers: { "Content-Type": item.file.type },
          onUploadProgress: (event) => {
            const progress = event.total
              ? Math.round((event.loaded / event.total) * 100)
              : 0;
            /**
             * 100% here means the browser has flushed the last byte, not that
             * R2 has the object — the `await` below is still pending while the
             * upload is received and verified. On a multi-gigabyte file that
             * gap runs to minutes, so it gets its own status instead of leaving
             * a full bar under "Uploading…" looking stalled.
             */
            updateItem(item.id, {
              progress,
              ...(progress >= 100 ? { status: "storing" as const } : {})
            });
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
        inFlight.delete(item.id);
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
   *
   * Work is appended to one shared backlog drained by at most
   * `MAX_CONCURRENT_UPLOADS` lanes, rather than each call starting lanes of
   * its own. Previously a retry pressed mid-upload — or a second folder
   * dropped while the first was still going — spawned a whole new set, so
   * four lanes became eight, then twelve. Concurrency climbed with every
   * press, which is exactly what drove the burst back over the limit and
   * produced the next round of failures the admin then retried again.
   */
  const runQueue = useCallback(
    (queue: UploadItem[]) => {
      // Items already owned by a lane are dropped here rather than queued and
      // skipped later, so the backlog length stays honest.
      for (const item of queue) {
        if (!inFlight.has(item.id) && !pendingQueue.some((q) => q.id === item.id)) {
          pendingQueue.push(item);
        }
      }

      const worker = async () => {
        for (let next = pendingQueue.shift(); next; next = pendingQueue.shift()) {
          await runUpload(next);
        }
        activeLanes -= 1;
      };

      while (activeLanes < MAX_CONCURRENT_UPLOADS && activeLanes < pendingQueue.length) {
        activeLanes += 1;
        void worker();
      }
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

  /**
   * Read the queue as it is now, not as it was when this callback was built.
   *
   * Retry handlers are invoked from a click long after their closure captured
   * `items`, and during a bulk upload that array is stale within milliseconds.
   * Going to the store directly is what makes the status filters below mean
   * anything.
   */
  const currentItems = useCallback(() => useUploadQueueStore.getState().items, []);

  const retryItem = useCallback(
    (id: string) => {
      const item = currentItems().find((i) => i.id === id);
      if (item && !RUNNING_STATUSES.includes(item.status)) void runUpload(item);
    },
    [currentItems, runUpload]
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
      currentItems().filter(
        (item) =>
          item.status === "error" ||
          item.status === "cancelled" ||
          item.status === "queued"
      )
    );
  }, [currentItems, runQueue]);

  const cancelItem = useCallback(
    (id: string) => {
      // A queued item has no controller yet; it must be pulled out of the
      // backlog or a lane would pick it up and upload it after cancellation.
      const queuedAt = pendingQueue.findIndex((item) => item.id === id);
      if (queuedAt !== -1) pendingQueue.splice(queuedAt, 1);

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
    currentItems()
      .filter((item) => !["done", "error", "cancelled"].includes(item.status))
      .forEach((item) => cancelItem(item.id));
  }, [cancelItem, currentItems]);

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


