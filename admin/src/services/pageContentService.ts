import { apiClient } from "./apiClient";
import type { PageContent, UpdatePageContentPayload } from "@/types/pageContent";

export type PageAssetUploadResponse = {
  assetUrl: string;
  storageKey: string;
  mimeType: string;
};

export async function getPageContent(pageKey: string): Promise<PageContent | null> {
  try {
    const { data } = await apiClient.get<PageContent>(`/admin/pages/${pageKey}`);
    return data;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "response" in error &&
      (error as { response?: { status?: number } }).response?.status === 404
    ) {
      return null;
    }
    throw error;
  }
}

export async function updatePageContent(
  pageKey: string,
  payload: UpdatePageContentPayload
): Promise<PageContent> {
  const { data } = await apiClient.put<PageContent>(`/admin/pages/${pageKey}`, payload);
  return data;
}

export async function uploadPageAsset(
  pageKey: string,
  file: File
): Promise<PageAssetUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await apiClient.post<PageAssetUploadResponse>(
    `/admin/pages/${pageKey}/assets`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" }
    }
  );
  return data;
}

export type PageAsset = {
  storageKey: string;
  url: string;
  size: number;
  lastModified: string | null;
  contentType: string;
  inUse: boolean;
};

export async function listPageAssets(pageKey: string): Promise<PageAsset[]> {
  const { data } = await apiClient.get<PageAsset[]>(`/admin/pages/${pageKey}/assets`);
  return data;
}

export async function deletePageAsset(
  pageKey: string,
  storageKey: string
): Promise<void> {
  await apiClient.delete(`/admin/pages/${pageKey}/assets`, {
    data: { storageKey }
  });
}

/**
 * Recover the storage key from a saved media URL. Returns null for media we do
 * not host (local `/video/...` paths, external URLs), which must never be
 * deleted from the bucket.
 */
export function storageKeyFromUrl(mediaUrl: string | undefined): string | null {
  if (!mediaUrl) return null;
  const marker = "/pages/assets/";
  const index = mediaUrl.indexOf(marker);
  if (index === -1) return null;
  const key = mediaUrl.slice(index + marker.length).split("?")[0];
  return key ? decodeURIComponent(key) : null;
}
