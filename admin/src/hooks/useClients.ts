import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createClient,
  deleteClient,
  listClients,
  resetClientPassword,
  updateClient
} from "@/services/clientService";
import { queryKeys } from "@/services/queryKeys";
import type {
  ClientListParams,
  ResetClientPasswordPayload,
  UpdateClientPayload
} from "@/types/client";

export function useClientsQuery(params: ClientListParams) {
  return useQuery({
    queryKey: queryKeys.clients.list(params),
    queryFn: () => listClients(params)
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createClient,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clients.all() });
    }
  });
}

type UpdateClientVariables = { id: string; payload: UpdateClientPayload };

export function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: UpdateClientVariables) => updateClient(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clients.all() });
    }
  });
}

export function useResetClientPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, password }: ResetClientPasswordPayload) =>
      resetClientPassword(id, password),
    onSuccess: () => {
      // `hasPassword` changes for this client, so the list is refetched.
      void queryClient.invalidateQueries({ queryKey: queryKeys.clients.all() });
    }
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteClient,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clients.all() });
    }
  });
}
