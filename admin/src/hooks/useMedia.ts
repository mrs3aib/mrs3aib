import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteMedia, listMedia } from "@/services/mediaService";
import { queryKeys } from "@/services/queryKeys";
import type { MediaListParams } from "@/types/media";

/**
 * Listing is no longer gated on `sessionId` — omitting it returns the whole
 * cross-session library, which the studio page relies on. Callers that only
 * make sense scoped to a session (e.g. MediaGrid) pass `enabled` themselves.
 */
export function useMediaQuery(params: MediaListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.media.list(params),
    queryFn: () => listMedia(params),
    // Keeps the previous page visible while the next one loads, so the grid
    // does not collapse to a spinner on every filter change.
    placeholderData: (previous) => previous,
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
