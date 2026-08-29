import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  archiveSession,
  assignClientsToSession,
  createSession,
  deleteSession,
  getSession,
  listSessions,
  updateSession
} from "@/services/sessionService";
import { queryKeys } from "@/services/queryKeys";
import type { SessionListParams, UpdateSessionPayload } from "@/types/session";

export function useSessionsQuery(params: SessionListParams) {
  return useQuery({
    queryKey: queryKeys.sessions.list(params),
    queryFn: () => listSessions(params),
    // Keeps the previous page on screen while the next one loads, so the table
    // does not collapse to a spinner on every filter change.
    placeholderData: (previous) => previous
  });
}

export function useSessionQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.sessions.detail(id),
    queryFn: () => getSession(id),
    enabled: Boolean(id)
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSession,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all() });
    }
  });
}

type UpdateSessionVariables = { id: string; payload: UpdateSessionPayload };

export function useUpdateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: UpdateSessionVariables) => updateSession(id, payload),
    onSuccess: (session) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all() });
      queryClient.setQueryData(queryKeys.sessions.detail(session.id), session);
    }
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSession,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all() });
    }
  });
}

export function useArchiveSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: archiveSession,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all() });
    }
  });
}

export function useAssignClientsToSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, clientIds }: { sessionId: string; clientIds: string[] }) =>
      assignClientsToSession(sessionId, clientIds),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.sessions.detail(variables.sessionId)
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.clients.all() });
    }
  });
}
