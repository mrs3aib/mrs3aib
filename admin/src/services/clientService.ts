import { apiClient } from "./apiClient";
import type {
  Client,
  ClientListParams,
  CreateClientPayload,
  UpdateClientPayload
} from "@/types/client";
import type { PaginatedResult } from "@/types/pagination";

export async function listClients(
  params: ClientListParams
): Promise<PaginatedResult<Client>> {
  const { data } = await apiClient.get<PaginatedResult<Client>>("/admin/clients", {
    params
  });
  return data;
}

export async function createClient(payload: CreateClientPayload): Promise<Client> {
  const { data } = await apiClient.post<Client>("/admin/clients", payload);
  return data;
}

export async function updateClient(
  id: string,
  payload: UpdateClientPayload
): Promise<Client> {
  const { data } = await apiClient.patch<Client>(`/admin/clients/${id}`, payload);
  return data;
}

/**
 * Set a client's password on their behalf.
 *
 * Client sign-in has no self-service reset, so this is how a forgotten
 * password is recovered: the admin sets a new one and passes it to the client.
 * It also signs that client out everywhere.
 */
export async function resetClientPassword(id: string, password: string): Promise<void> {
  await apiClient.put(`/admin/clients/${id}/password`, { password });
}

export async function deleteClient(id: string): Promise<void> {
  await apiClient.delete(`/admin/clients/${id}`);
}
