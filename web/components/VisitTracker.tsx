"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useIsPreview } from "./CmsPreviewBridge";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/+$/, "");

/**
 * Album pages carry the session id as the last path segment, and the backend
 * attributes the view to that album. Matched here rather than server-side so
 * the beacon stays a single endpoint that takes a path.
 */
const ALBUM_PATH = /^\/[^/]+\/category\/[^/]+\/([^/]+)$/;

/**
 * Records one page view per navigation.
 *
 * Mounted once in the layout rather than per page: it reads the pathname from
 * the router, so it fires on client-side navigation too. Next's App Router
 * does not remount the layout between routes, and without this a visitor who
 * browsed five albums from the home page would be recorded as one view.
 *
 * Renders nothing and never blocks: every failure path is swallowed. Analytics
 * that break a gallery are worse than no analytics.
 */
export default function VisitTracker() {
  const pathname = usePathname();
  const isPreview = useIsPreview();
  /**
   * The last path actually reported.
   *
   * Guards against two separate double-counts: React Strict Mode running every
   * effect twice in development, and any re-render that changes `isPreview`
   * without changing the route.
   */
  const reported = useRef<string | null>(null);

  useEffect(() => {
    if (!API_BASE || !pathname) return;
    // The admin's CMS preview frame loads the real site. Counting it would
    // mean every edit the photographer previews shows up as visitor traffic.
    if (isPreview) return;
    if (reported.current === pathname) return;
    reported.current = pathname;

    const albumId = ALBUM_PATH.exec(pathname)?.[1];
    const payload = JSON.stringify({
      path: pathname,
      // Empty on a direct visit, which the backend reads as "direct".
      referrer: document.referrer || undefined,
      ...(albumId ? { sessionId: albumId } : {})
    });

    const url = `${API_BASE}/public/track`;

    // `sendBeacon` is queued by the browser and survives the page being closed
    // mid-navigation, so a visitor who bounces immediately is still counted.
    // It cannot set headers beyond the Blob's type, hence the explicit
    // application/json Blob — without it the body arrives as text/plain and
    // `express.json()` skips parsing, so `path` is missing and the request is
    // rejected as invalid.
    try {
      if (navigator.sendBeacon) {
        const queued = navigator.sendBeacon(
          url,
          new Blob([payload], { type: "application/json" })
        );
        if (queued) return;
        // A full beacon queue returns false rather than throwing. Falling
        // through to fetch keeps the view counted.
      }
    } catch {
      // Some privacy extensions replace sendBeacon with a thrower.
    }

    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      // The response is 202 with no body and nothing reads it; `keepalive`
      // lets the request outlive the page the way a beacon would.
      keepalive: true
    }).catch(() => {
      // An unreachable API must not surface on a page that rendered fine.
    });
  }, [pathname, isPreview]);

  return null;
}
