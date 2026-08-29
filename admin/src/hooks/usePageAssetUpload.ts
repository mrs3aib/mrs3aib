import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deletePageAsset,
  listPageAssets,
  uploadPageAsset
} from "@/services/pageContentService";
import { queryKeys } from "@/services/queryKeys";

export function usePageAssetsQuery(pageKey: string) {
  return useQuery({
    queryKey: queryKeys.pageContent.assets(pageKey),
    queryFn: () => listPageAssets(pageKey)
  });
}

export function usePageAssetUpload(pageKey: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadPageAsset(pageKey, file),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.pageContent.assets(pageKey)
      });
    }
  });
}

export function usePageAssetDelete(pageKey: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (storageKey: string) => deletePageAsset(pageKey, storageKey),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.pageContent.assets(pageKey)
      });
    }
  });
}
