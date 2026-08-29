import { apiClient } from "./apiClient";
import type {
  GallerySettings,
  UpdateGallerySettingsPayload
} from "@/types/gallerySettings";

export async function getGallerySettings(sessionId: string): Promise<GallerySettings> {
  const { data } = await apiClient.get<GallerySettings>(
    `/admin/sessions/${sessionId}/settings`
  );
  return data;
}

export async function updateGallerySettings(
  sessionId: string,
  payload: UpdateGallerySettingsPayload
): Promise<GallerySettings> {
  const { data } = await apiClient.patch<GallerySettings>(
    `/admin/sessions/${sessionId}/settings`,
    payload
  );
  return data;
}
