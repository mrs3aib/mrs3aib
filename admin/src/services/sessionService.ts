import { apiClient } from "./apiClient";
import type {
  CreateSessionPayload,
  PhotoSession,
  SessionListParams,
  SessionListResult,
  UpdateSessionPayload
} from "@/types/session";

export async function listSessions(
  params: SessionListParams
): Promise<SessionListResult> {
  const { data } = await apiClient.get<SessionListResult>("/admin/sessions", {
    params
  });
  return data;
}

export async function getSession(id: string): Promise<PhotoSession> {
  const { data } = await apiClient.get<PhotoSession>(`/admin/sessions/${id}`);
  return data;
}

export async function createSession(
  payload: CreateSessionPayload
): Promise<PhotoSession> {
  const { data } = await apiClient.post<PhotoSession>("/admin/sessions", payload);
  return data;
}

export async function updateSession(
  id: string,
  payload: UpdateSessionPayload
): Promise<PhotoSession> {
  const { data } = await apiClient.patch<PhotoSession>(
    `/admin/sessions/${id}`,
    payload
  );
  return data;
}

export async function deleteSession(id: string): Promise<void> {
  await apiClient.delete(`/admin/sessions/${id}`);
}

export async function archiveSession(id: string): Promise<PhotoSession> {
  const { data } = await apiClient.patch<PhotoSession>(
    `/admin/sessions/${id}`,
    { status: "archived" }
  );
  return data;
}

export async function assignClientsToSession(
  sessionId: string,
  clientIds: string[]
): Promise<void> {
  await apiClient.post(`/admin/sessions/${sessionId}/clients`, { clientIds });
}

/**
 * Upload a cover image for this session's gallery cards.
 *
 * Independent of the album's media: the home and category galleries show this
 * rather than a frame of whatever the album contains.
 */
export async function uploadSessionCover(
  sessionId: string,
  file: File
): Promise<PhotoSession> {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await apiClient.post<PhotoSession>(
    `/admin/sessions/${sessionId}/cover`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
}

/**
 * Point this session's cover at an externally hosted image.
 *
 * The counterpart to uploading, for a cover that already lives somewhere else
 * and is to hand only as a link. Replaces any uploaded file.
 */
export async function setSessionCoverUrl(
  sessionId: string,
  url: string
): Promise<PhotoSession> {
  const { data } = await apiClient.put<PhotoSession>(
    `/admin/sessions/${sessionId}/cover`,
    { url }
  );
  return data;
}

/** Remove the session's own cover, reverting to the pinned or automatic one. */
export async function removeSessionCover(sessionId: string): Promise<PhotoSession> {
  const { data } = await apiClient.delete<PhotoSession>(
    `/admin/sessions/${sessionId}/cover`
  );
  return data;
}
