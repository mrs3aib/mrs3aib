import "server-only";

import { headers } from "next/headers";
import { getPublishedPageContent } from "./api";
import { getPreviewDraft } from "./previewStore";
import type { PageContentPayload } from "./cms";

/**
 * Server-side CMS preview.
 *
 * The public pages are server components: they fetch, localize and resolve
 * sessions on the server, and several of the sections they render are
 * themselves async server components. Rendering a draft on the client would
 * mean pulling all of that across a client boundary, which `getTranslations`
 * does not survive.
 *
 * So the draft is put on the server first — see `previewStore.ts` — and this
 * module hands it back in place of the saved record, before any component
 * renders. Page code is unchanged apart from which function it calls, and the
 * preview shows the real page rather than an approximation of it.
 */

/** Query flag marking a request as a preview render. */
export const PREVIEW_PARAM = "cmsPreview";

/** Query parameter naming which stored draft to render. */
export const PREVIEW_ID_PARAM = "previewId";

/**
 * Cap on a single draft. Generous — the store is memory, not a cookie — but
 * bounded so one oversized post cannot be used to exhaust the process.
 */
export const PREVIEW_MAX_BYTES = 512 * 1024;

/**
 * The preview id on this request, if it is a genuine preview render.
 *
 * Requires the request to be a framed navigation: `sec-fetch-dest` is set by
 * the browser and cannot be forged by page script, so a preview link that
 * escaped into the wild still renders the real site when opened directly.
 */
async function previewIdForRequest(): Promise<string | null> {
  const headerList = await headers();
  if (headerList.get("sec-fetch-dest") !== "iframe") return null;

  /**
   * Next does not hand a server component the full URL, so it is read from the
   * middleware-provided header, falling back to the referer — which, for a
   * subresource of the framed page, is the framed URL itself.
   */
  const url =
    headerList.get("x-preview-url") ??
    headerList.get("x-url") ??
    headerList.get("referer");
  if (!url) return null;

  try {
    const parsed = new URL(url);
    if (parsed.searchParams.get(PREVIEW_PARAM) !== "1") return null;
    return parsed.searchParams.get(PREVIEW_ID_PARAM);
  } catch {
    return null;
  }
}

/**
 * Page content for a server-rendered page, honouring an active preview.
 *
 * Pages call this instead of `getPublishedPageContent` so a CMS preview shows
 * the admin's unsaved draft. Marked `server-only`: it reads request headers,
 * and `lib/api.ts` is imported by client components, so this lookup cannot live
 * there without pulling `next/headers` into the browser bundle.
 */
export async function getPageContentForRender(
  pageKey: string
): Promise<PageContentPayload | null> {
  const id = await previewIdForRequest();
  const draft = id ? getPreviewDraft(id, pageKey) : null;

  if (draft) {
    return {
      pageKey,
      title: pageKey,
      // A draft is previewed as though published — the point is to see the page
      // as visitors would, and `published` is a separate deliberate toggle.
      published: true,
      updatedAt: new Date().toISOString(),
      content: draft as PageContentPayload["content"]
    };
  }

  return getPublishedPageContent(pageKey);
}
