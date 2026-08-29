import { useQuery } from "@tanstack/react-query";
import { listPublicSessions } from "@/services/publicSessionService";
import { queryKeys } from "@/services/queryKeys";

/**
 * Published sessions available to the CMS pickers.
 *
 * `category` omitted means the whole portfolio — what the general gallery
 * picker offers. Passing one narrows the list, which is how the Latest Weddings
 * picker stays locked to wedding sessions.
 */
export function usePublicSessionsQuery(category?: string) {
  return useQuery({
    queryKey: queryKeys.publicSessions.list(category),
    queryFn: () => listPublicSessions(category ? { category } : {})
  });
}
