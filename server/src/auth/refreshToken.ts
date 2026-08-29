import { randomBytes, createHash } from "node:crypto";

const REFRESH_TOKEN_BYTES = 48;

/**
 * How long a signed-in session survives without being used.
 *
 * Tokens rotate on every refresh, so an admin who visits at least once inside
 * the window stays signed in indefinitely; the TTL only bounds how long an
 * *idle* session lives before requiring a password again.
 *
 * Admin and client are separate values on purpose: an admin session is a
 * privileged login on a shared studio machine, while a client's is a link to
 * their own gallery that should not expire while they are still choosing
 * photos.
 */
export const ADMIN_REFRESH_TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
export const CLIENT_REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Cookie lifetime, which must cover the longest session either role can have —
 * one cookie carries both, so trimming it to the admin window would expire a
 * client's gallery cookie two weeks early.
 */
export const REFRESH_COOKIE_MAX_AGE_MS = CLIENT_REFRESH_TOKEN_TTL_MS;

export function generateRefreshToken(): string {
  return randomBytes(REFRESH_TOKEN_BYTES).toString("hex");
}

// Refresh tokens are looked up by exact match, so a deterministic hash
// (unlike bcrypt) is required here — the raw token never touches the DB.
export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
