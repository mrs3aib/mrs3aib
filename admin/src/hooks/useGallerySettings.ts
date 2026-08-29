import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getGallerySettings,
  updateGallerySettings
} from "@/services/gallerySettingsService";
import { queryKeys } from "@/services/queryKeys";
import type { UpdateGallerySettingsPayload } from "@/types/gallerySettings";

export function useGallerySettingsQuery(sessionId: string) {
  return useQuery({
    queryKey: queryKeys.gallerySettings.detail(sessionId),
    queryFn: () => getGallerySettings(sessionId),
    enabled: Boolean(sessionId)
  });
}

export function useUpdateGallerySettings(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateGallerySettingsPayload) =>
      updateGallerySettings(sessionId, payload),
    onSuccess: (settings) => {
      queryClient.setQueryData(
        queryKeys.gallerySettings.detail(sessionId),
        settings
      );
    }
  });
}
