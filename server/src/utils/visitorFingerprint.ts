import { createHash } from "node:crypto";
import type { DeviceType } from "@prisma/client";
import { analyticsSalt } from "@/config/env";

/**
 * Bot user agents, checked before the device patterns below.
 *
 * Order matters: many crawlers advertise themselves as a browser and would
 * otherwise be filed as desktop traffic. Googlebot's mobile crawler even
 * carries "Android", so a mobile check running first would count it as a
 * phone. This list is not exhaustive — no list is — but it removes the bulk
 * of the automated traffic that would otherwise be reported as visitors.
 */
const BOT_PATTERN =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|quora link preview|pinterest|whatsapp|telegram|discord|skype|slack|vkshare|headless|lighthouse|pagespeed|gtmetrix|uptime|monitor|curl|wget|python-requests|axios|node-fetch|postman|go-http-client|java\/|okhttp/i;

/** Tablets, checked before phones: an iPad's UA also matches many phone patterns. */
const TABLET_PATTERN = /ipad|tablet|playbook|silk|(android(?!.*mobile))/i;

const MOBILE_PATTERN =
  /android.*mobile|iphone|ipod|windows phone|blackberry|bb10|opera mini|iemobile|mobile safari/i;

/**
 * Classify a user agent into a device bucket.
 *
 * An empty or missing user agent is `unknown`, not `bot`: a stripped UA is
 * common from privacy tooling and from some in-app browsers, and filing those
 * as crawlers would quietly delete real visitors from the report.
 */
export function classifyDevice(userAgent: string | undefined): DeviceType {
  if (!userAgent || userAgent.trim().length === 0) return "unknown";
  if (BOT_PATTERN.test(userAgent)) return "bot";
  if (TABLET_PATTERN.test(userAgent)) return "tablet";
  if (MOBILE_PATTERN.test(userAgent)) return "mobile";
  // Anything left that names a known engine is a desktop browser. Without this
  // last check an unrecognised string would fall through to `desktop` and make
  // that bucket a dumping ground for everything we failed to parse.
  if (/mozilla|chrome|safari|firefox|edge|opera|msie|trident/i.test(userAgent)) {
    return "desktop";
  }
  return "unknown";
}

/**
 * Daily, salted digest identifying one visitor.
 *
 * The UTC date is part of the input by design: within a day the same visitor
 * produces the same hash, which is what "unique visitors" counts; across days
 * the hashes are unlinkable, so the table never accumulates a profile of
 * anyone. A visitor active on three days therefore counts as three uniques
 * over a 30-day range — the trade we accept for storing no identifier.
 */
export function visitorHash(ip: string, userAgent: string | undefined, at: Date): string {
  const day = at.toISOString().slice(0, 10);
  return createHash("sha256")
    .update(`${analyticsSalt}|${day}|${ip}|${userAgent ?? ""}`)
    .digest("hex")
    // Half a SHA-256 is 128 bits — far beyond collision range for a single
    // day's traffic, and it halves what this column costs on every row.
    .slice(0, 32);
}

/**
 * Host of a referring URL, or null when it is absent, unparseable, or ours.
 *
 * Only the origin is kept. A full referrer can carry search terms, tokens or
 * profile paths from the referring site, none of which the report groups by —
 * so it is dropped at the edge rather than stored and ignored.
 */
export function parseReferrerHost(
  referrer: string | undefined,
  selfHosts: string[]
): string | null {
  if (!referrer) return null;
  try {
    const { hostname } = new URL(referrer);
    // Internal navigation is not a referral. Counting it would bury the real
    // sources under our own most-visited page.
    if (selfHosts.some((host) => host === hostname)) return null;
    return hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Locale prefixes the public site serves. Mirrors `web/i18n/routing.ts`. */
const LOCALES = ["en", "ar"] as const;

export type ParsedPath = {
  /** Normalised path, lowercased, without query, hash or trailing slash. */
  path: string;
  locale: string | null;
};

/**
 * Normalise a reported path so the same page never splits across rows.
 *
 * The beacon reports whatever is in the address bar, which for one page can
 * be "/en/category/weddings", "/en/category/weddings/", or either with a query
 * string appended by an ad campaign. Left as-is those are three rows in the
 * top-pages report that are really one page.
 */
export function parsePath(raw: string): ParsedPath {
  // Query and hash are dropped rather than stored: campaign parameters would
  // fragment the report, and either can carry arbitrary data we have no reason
  // to keep.
  const withoutQuery = raw.split(/[?#]/)[0] ?? "/";
  const lowered = withoutQuery.toLowerCase();
  const trimmed = lowered.length > 1 ? lowered.replace(/\/+$/, "") : lowered;
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;

  const firstSegment = path.split("/")[1] ?? "";
  const locale = LOCALES.find((value) => value === firstSegment) ?? null;

  return { path: path || "/", locale };
}
