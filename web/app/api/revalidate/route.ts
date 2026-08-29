import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { CMS_CACHE_TAG } from "@/lib/api";

/**
 * Drop the cached CMS content so an admin's save shows up immediately.
 *
 * Content the admin edits is cached for an hour — without that, every visitor
 * paid full backend latency on every page view. This endpoint is how the hour
 * gets cut short: the backend calls it after a successful write, and the next
 * request refetches.
 *
 * Authenticated with a shared secret rather than a session, because the caller
 * is the API server, not a logged-in browser. Unset secret means disabled, not
 * open: an unconfigured deployment must not expose a public cache-buster.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const secret = process.env.REVALIDATE_SECRET;

  if (!secret) {
    return NextResponse.json(
      { revalidated: false, reason: "not configured" },
      { status: 503 }
    );
  }

  // Compared against a header rather than a query parameter so the secret does
  // not land in access logs or referrers.
  const provided = request.headers.get("x-revalidate-secret");
  if (provided !== secret) {
    return NextResponse.json(
      { revalidated: false, reason: "unauthorized" },
      { status: 401 }
    );
  }

  revalidateTag(CMS_CACHE_TAG);

  return NextResponse.json({ revalidated: true, tag: CMS_CACHE_TAG });
}
