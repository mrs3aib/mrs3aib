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
