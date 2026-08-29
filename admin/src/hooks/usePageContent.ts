import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getPageContent, updatePageContent } from "@/services/pageContentService";
import { queryKeys } from "@/services/queryKeys";
import type { UpdatePageContentPayload } from "@/types/pageContent";

export function usePageContentQuery(pageKey: string) {
  return useQuery({
    queryKey: queryKeys.pageContent.detail(pageKey),
    queryFn: () => getPageContent(pageKey)
  });
}

export function useUpdatePageContent(pageKey: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdatePageContentPayload) =>
      updatePageContent(pageKey, payload),
    onSuccess: (page) => {
      queryClient.setQueryData(queryKeys.pageContent.detail(pageKey), page);
      void queryClient.invalidateQueries({ queryKey: queryKeys.pageContent.all() });
    }
  });
}
