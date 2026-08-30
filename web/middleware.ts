import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

/**
 * Locale routing, plus the request URL forwarded to server components.
 *
 * A server component is not given the URL of the request it is rendering, and
 * the CMS preview needs it: the draft to render is named by a query parameter.
 * Middleware is the one place that sees the full URL, so it is copied onto a
 * request header the preview lookup reads.
 *
 * The header is written onto the incoming request *before* the locale
 * middleware runs, so it survives the rewrite that middleware performs — a
 * header attached to the response instead would be dropped by it.
 *
 * Only preview requests get the header: one that varied per URL would
 * otherwise become part of every cached response's key.
 *
 * The request also has `Accept-Language` stripped before locale routing runs.
 * This is an Arabic studio site: a bare URL should open in Arabic whatever
 * language the visitor's browser happens to advertise, and most browsers here
 * advertise `en-US` by default. `defaultLocale: "ar"` alone does not achieve
 * that — next-intl sniffs the header first and only falls back to the default
 * when nothing matches, so an en-US browser was being sent to /en.
 *
 * Done here rather than with `localeDetection: false`, which would also
 * disable the `NEXT_LOCALE` cookie. That cookie is how a visitor who clicked
 * "EN" gets English again on their next visit, and it is a deliberate choice
 * worth keeping — unlike a header the visitor never set.
 */
export default function middleware(request: NextRequest) {
  if (request.nextUrl.searchParams.get("cmsPreview") === "1") {
    request.headers.set("x-preview-url", request.url);
  }

  // Removed, not overwritten: next-intl matches this against the locale list,
  // and an absent header is the only value that matches nothing at all.
  request.headers.delete("accept-language");

  return intlMiddleware(request);
}

export const config = {
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)"
};
