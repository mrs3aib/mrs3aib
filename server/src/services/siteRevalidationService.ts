import { env } from "@/config/env";
import { logger } from "@/config/logger";

/** A stalled site must not hold up the admin's save response. */
const REVALIDATE_TIMEOUT_MS = 5000;

/**
 * Tell the public site to drop its cached CMS content.
 *
 * The site caches everything an admin can edit for an hour; without that, every
 * visitor paid full backend latency on every page view. This call is what keeps
 * edits from waiting out that hour.
 *
 * Deliberately best-effort: a save that succeeded here must not be reported as
 * failed because the site was briefly unreachable. The worst case is the old
 * content lingering until the hour is up, so failures are logged and swallowed.
 * When the URL or secret is unset the whole mechanism is simply off, which is
 * the correct default for a deployment that has not configured it.
 */
export async function revalidatePublicSite(reason: string): Promise<void> {
  const url = env.WEB_REVALIDATE_URL;
  const secret = env.REVALIDATE_SECRET;
  if (!url || !secret) return;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REVALIDATE_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "x-revalidate-secret": secret },
      signal: controller.signal
    });
    if (!res.ok) {
      logger.warn({ reason, status: res.status }, "Site revalidation rejected");
      return;
    }
    logger.info({ reason }, "Site cache revalidated");
  } catch (error) {
    logger.warn(
      { reason, error: error instanceof Error ? error.message : String(error) },
      "Site revalidation failed"
    );
  } finally {
    clearTimeout(timer);
  }
}
