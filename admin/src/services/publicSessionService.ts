import { apiClient } from "./apiClient";

/**
 * One published session as offered by the CMS pickers.
 *
 * Deliberately sourced from the public endpoint rather than `/admin/sessions`:
 * the picker must only offer what a visitor can actually see, so a draft or
 * unpublished session can never be selected into a homepage section and then
 * render as a gap.
 */
export type PublicSessionSummary = {
  id: string;
  slug: string;
  title: string;
  category: string;
  eventDate: string;
  location: string;
  description: string | null;
  photoCount: number;
  videoCount: number;
  coverUrl: string | null;
};

export async function listPublicSessions(params: {
  category?: string;
  limit?: number;
} = {}): Promise<PublicSessionSummary[]> {
  const { data } = await apiClient.get<{ albums: PublicSessionSummary[] }>(
    "/public/sessions",
    { params }
  );
  return data.albums;
}
