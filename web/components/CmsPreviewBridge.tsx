"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Client-side half of the CMS preview.
 *
 * The draft itself never comes through here — it arrives server-side via
 * `lib/cmsPreview.ts`, before any component renders, so the preview is the
 * real page rather than a client-rendered approximation of it. What is left
 * for the client is presentation: hiding chrome that only makes sense at a
 * real viewport.
 */

/** Query flag the admin frame loads the site with. */
const PREVIEW_PARAM = "cmsPreview";

/**
 * Whether this document is being previewed.
 *
 * Returns false during SSR and on the first client render so the markup
 * matches the server's, then flips on after mount — reading `window` while
 * rendering would cause a hydration mismatch.
 */
export function useIsPreview(): boolean {
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // `window.top !== window.self` keeps this inert outside an iframe, so a
    // shared link carrying the query flag cannot put a visitor into preview.
    const framed = window.top !== window.self;
    const flagged =
      new URLSearchParams(window.location.search).get(PREVIEW_PARAM) === "1";
    setPreview(framed && flagged);
  }, []);

  return preview;
}

/**
 * Hides chrome that would be misleading inside the preview frame.
 *
 * The sticky nav and mobile tab bar are fixed-position and sized for a real
 * viewport; in a scaled-down panel they cover the content being previewed.
 */
export function HideInPreview({ children }: { children: ReactNode }) {
  const isPreview = useIsPreview();
  if (isPreview) return null;
  return <>{children}</>;
}
