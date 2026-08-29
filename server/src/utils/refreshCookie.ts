import type { Response } from "express";
import { env } from "@/config/env";
import { REFRESH_COOKIE_MAX_AGE_MS } from "@/auth/refreshToken";

const COOKIE_NAME = "refreshToken";

/**
 * Options shared by set and clear.
 *
 * `sameSite` must match between the two: a cookie is only removed when the
 * clearing options match the ones it was set with, so a mismatch here would
 * leave a stale cookie behind on logout.
 *
 * In production the admin panel and the API are separate services on different
 * origins, and a "lax" cookie is not sent on cross-site requests at all — the
 * silent refresh on page load simply never received it, which logged the admin
 * out on every reload no matter how long the token was valid for. "none"
 * permits the cross-site send, and browsers require `secure` alongside it.
 *
 * Locally everything is same-site over plain HTTP, where "none" would be
 * rejected for lacking `secure`, so development keeps "lax".
 */
const isProduction = env.NODE_ENV === "production";

const baseCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? ("none" as const) : ("lax" as const),
  path: "/"
};

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    ...baseCookieOptions,
    maxAge: REFRESH_COOKIE_MAX_AGE_MS
  });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, baseCookieOptions);
}

export function readRefreshCookie(cookies: Record<string, string | undefined>): string | null {
  return cookies[COOKIE_NAME] ?? null;
}
