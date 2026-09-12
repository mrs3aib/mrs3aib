import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteMedia, listMedia } from "@/services/mediaService";
import { queryKeys } from "@/services/queryKeys";
import type { MediaListParams } from "@/types/media";

/**
 * Listing is no longer gated on `sessionId` — omitting it returns the whole
 * cross-session library, which the studio page relies on. Callers that only
 * make sense scoped to a session (e.g. MediaGrid) pass `enabled` themselves.
 */
/**
 * How often to re-check while something is still being processed.
 *
 * Processing happens on the server after the upload lands, and nothing pushes
 * its completion to the browser. Without this the grid kept showing the
 * "processing" badge until the page was reloaded by hand — on a large video
 * that is minutes of looking like a stuck upload when the file is actually fine.
 */
const PROCESSING_POLL_MS = 5000;

export function useMediaQuery(params: MediaListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.media.list(params),
    queryFn: () => listMedia(params),
    // Keeps the previous page visible while the next one loads, so the grid
    // does not collapse to a spinner on every filter change.
    placeholderData: (previous) => previous,
    /**
     * Polls only while at least one item is mid-processing, and stops as soon
     * as none are — an idle library costs no extra requests.
     */
    refetchInterval: (query) =>
      query.state.data?.items.some((item) => item.processingStatus === "processing")
        ? PROCESSING_POLL_MS
        : false,
    ...(options?.enabled === undefined ? {} : { enabled: options.enabled })
  });
}

export function useDeleteMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteMedia,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.media.all() });
    }
  });
}
