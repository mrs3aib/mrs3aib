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
 */
export default function middleware(request: NextRequest) {
  if (request.nextUrl.searchParams.get("cmsPreview") === "1") {
    request.headers.set("x-preview-url", request.url);
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)"
};
