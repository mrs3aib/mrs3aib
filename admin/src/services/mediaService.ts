import { apiClient } from "./apiClient";
import type {
  Media,
  MediaListParams,
  MediaListResult,
  PresignedUploadRequest,
  PresignedUploadResponse
} from "@/types/media";

export async function listMedia(params: MediaListParams): Promise<MediaListResult> {
  const { data } = await apiClient.get<MediaListResult>("/admin/media", { params });
  return data;
}

export async function requestUploadUrl(
  payload: PresignedUploadRequest
): Promise<PresignedUploadResponse> {
  const { data } = await apiClient.post<PresignedUploadResponse>(
    "/admin/media/upload-url",
    payload
  );
  return data;
}

export async function confirmUpload(mediaId: string): Promise<Media> {
  const { data } = await apiClient.post<Media>(`/admin/media/${mediaId}/confirm`);
  return data;
}

/**
 * Attach a YouTube video to a session as a link.
 *
 * Nothing is uploaded — the server parses the URL, stores the video id, and the
 * item is ready immediately, appearing in the session's assets like any other.
 */
export async function addYouTubeLink(payload: {
  sessionId: string;
  url: string;
  title?: string;
}): Promise<Media> {
  const { data } = await apiClient.post<Media>("/admin/media/youtube", payload);
  return data;
}

export async function deleteMedia(id: string): Promise<void> {
  await apiClient.delete(`/admin/media/${id}`);
}
