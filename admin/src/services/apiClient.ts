import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/store/authStore";
import type { RefreshResponse } from "@/types/auth";

/**
 * API origin with any trailing slash removed.
 *
 * Every request path here starts with "/", so a base URL ending in one
 * concatenates into "//admin/dashboard/stats". Express treats that as a
 * different route and answers 404 — the whole CMS fails while the API itself
 * is perfectly healthy, and the deploy that causes it is a single invisible
 * character in an environment variable. Normalising here is cheaper than
 * relying on every deploy to get it right.
 */
const rawBaseURL = import.meta.env.VITE_API_BASE_URL as string | undefined;

if (!rawBaseURL) {
  throw new Error(
    "VITE_API_BASE_URL is not set. Copy admin/.env.example to admin/.env and " +
      "restart the dev server — Vite only reads .env files at startup."
  );
}

const baseURL = rawBaseURL.replace(/\/+$/, "");

export const apiClient = axios.create({
  baseURL,
  withCredentials: true
});

apiClient.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().accessToken;
  if (accessToken) {
    config.headers.set("Authorization", `Bearer ${accessToken}`);
  }
  return config;
});

type RetriableConfig = InternalAxiosRequestConfig & {
  _retried?: boolean;
  /** How many times this request has already been retried after a 429. */
  _rateLimitAttempts?: number;
};

/**
 * How many times a rate-limited request is retried before it is allowed to
 * fail. Uploads run in parallel lanes, so a burst that overshoots the budget
 * needs only enough attempts to outlast the current window.
 */
const MAX_RATE_LIMIT_RETRIES = 4;

/** Fallback wait when a 429 arrives without a usable `Retry-After`. */
const RATE_LIMIT_FALLBACK_MS = 2000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * How long to wait before retrying a rate-limited request.
 *
 * `express-rate-limit` runs with `standardHeaders: true`, so it sends
 * `RateLimit-Reset` (seconds until the window rolls over) and `Retry-After`.
 * Honouring the server's own number means the retry lands just after the
 * window opens instead of guessing and hammering a limiter that is still
 * closed. A small random spread keeps parallel upload lanes, which all get
 * throttled at the same instant, from retrying in lockstep and colliding
 * again.
 */
function rateLimitDelay(error: AxiosError, attempt: number): number {
  const header =
    error.response?.headers?.["retry-after"] ?? error.response?.headers?.["ratelimit-reset"];
  const seconds = Number(header);
  const base =
    Number.isFinite(seconds) && seconds > 0
      ? seconds * 1000
      : RATE_LIMIT_FALLBACK_MS * 2 ** (attempt - 1);
  return base + Math.random() * 500;
}

let refreshPromise: Promise<string> | null = null;

async function requestRefresh(timeoutMs?: number): Promise<string> {
  const { data } = await axios.post<RefreshResponse>(
    `${baseURL}/admin/auth/refresh`,
    {},
    { withCredentials: true, ...(timeoutMs ? { timeout: timeoutMs } : {}) }
  );
  useAuthStore.getState().setAccessToken(data.accessToken);
  return data.accessToken;
}

/**
 * When the last refresh finished, so callers that queued behind a 401 can tell
 * a stale token from a genuinely dead session.
 */
let lastRefreshAt = 0;

/**
 * A refresh that just happened is treated as covering any 401 issued before
 * it. The window need only span the time between a request being sent and its
 * response being handled.
 */
const RECENT_REFRESH_MS = 10_000;

/**
 * Refresh the access token, collapsing concurrent callers onto one request.
 *
 * Refresh tokens rotate server-side: the used one is revoked as the new pair
 * is issued. Two refreshes in flight at once therefore means the second
 * arrives holding an already-revoked token and fails, which would sign the
 * admin out mid-session. Every caller — the response interceptor and the
 * startup bootstrap alike — must share this promise.
 *
 * Sharing only covers callers that arrive while the request is still in
 * flight, which is the narrower half of the problem. A CMS save fires several
 * requests at once; they were all issued with the same expired access token,
 * so they all come back 401, but they come back *staggered*. The first
 * refreshes successfully and clears `refreshPromise`; the second arrives a
 * moment later, sees no promise to join, and starts a second refresh — using
 * the cookie value its own request was sent with, which the first refresh has
 * already rotated and revoked. The server correctly answers 401, and the
 * interceptor reads that as a dead session and signs the admin out. Saving
 * and reloading are exactly the two actions that fan out enough parallel
 * requests to hit it.
 */
export function refreshAccessToken(timeoutMs?: number): Promise<string> {
  refreshPromise ??= requestRefresh(timeoutMs).finally(() => {
    lastRefreshAt = Date.now();
    refreshPromise = null;
  });
  return refreshPromise;
}

/**
 * Whether a refresh completed so recently that a 401 in hand was almost
 * certainly issued against the token it replaced.
 */
function refreshedJustNow(): boolean {
  return Date.now() - lastRefreshAt < RECENT_REFRESH_MS;
}

/**
 * Whether a failed refresh means the session is genuinely gone.
 *
 * Only the server rejecting the token (401/403) invalidates a session. A
 * timeout, an offline browser, or a restarting API produces no response at
 * all, and treating that as a logout throws away a session whose cookie is
 * still perfectly valid.
 */
export function isAuthRejection(error: unknown): boolean {
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  return status === 401 || status === 403;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableConfig | undefined;

    /**
     * Back off and retry rather than surfacing the failure.
     *
     * A 429 means "not now", not "this cannot be done" — the request is
     * perfectly valid and succeeds moments later. Rejecting it marked the
     * file as failed in the upload queue, which read to the admin as data
     * loss during a large drop even though nothing was wrong.
     */
    if (error.response?.status === 429 && originalRequest) {
      const attempt = (originalRequest._rateLimitAttempts ?? 0) + 1;
      if (attempt <= MAX_RATE_LIMIT_RETRIES) {
        originalRequest._rateLimitAttempts = attempt;
        await sleep(rateLimitDelay(error, attempt));
        return apiClient(originalRequest);
      }
    }

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retried ||
      originalRequest.url?.includes("/admin/auth/")
    ) {
      return Promise.reject(error);
    }

    originalRequest._retried = true;

    /**
     * A refresh that landed moments ago already fixed this.
     *
     * This request was sent with the previous access token, so its 401 says
     * nothing about the current session — replay it with the token now in the
     * store instead of spending the (already rotated) refresh cookie on a
     * second refresh that can only fail.
     */
    const currentToken = useAuthStore.getState().accessToken;
    if (refreshedJustNow() && currentToken) {
      originalRequest.headers.set("Authorization", `Bearer ${currentToken}`);
      return apiClient(originalRequest);
    }

    try {
      const newAccessToken = await refreshAccessToken();
      originalRequest.headers.set("Authorization", `Bearer ${newAccessToken}`);
      return apiClient(originalRequest);
    } catch (refreshError) {
      // Only a rejected token ends the session. A network failure or a
      // restarting API leaves the refresh cookie valid, so the session is
      // kept and the next request gets to try again.
      //
      // A rejection is trusted only when no refresh has just succeeded. When
      // one has, this is the losing side of the race above — the cookie was
      // rotated out from under this caller — and the session it would clear
      // is the one that refresh just renewed.
      if (isAuthRejection(refreshError) && !refreshedJustNow()) {
        useAuthStore.getState().clearSession();
      }
      return Promise.reject(refreshError);
    }
  }
);
