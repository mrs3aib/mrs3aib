import rateLimit from "express-rate-limit";

// Tight limit on auth endpoints specifically — brute-force/OTP-spam surface —
// rather than a single blanket limiter for the whole API.
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Too many attempts. Try again later." } }
});

// Building a folder ZIP downloads every original into memory, so the public
// (unauthenticated) archive endpoint gets a much tighter budget than normal
// reads to keep it from being used as a resource-exhaustion lever.
export const publicArchiveRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: { code: "RATE_LIMITED", message: "Too many downloads. Try again shortly." }
  }
});

/**
 * Paths that carry their own, larger budget and must not also be counted
 * against the general one — being under both would leave the tighter of the
 * two in charge and make the dedicated limiter decorative.
 */
const UPLOAD_PATHS = [/^\/admin\/media\/upload-url$/, /^\/admin\/media\/[^/]+\/confirm$/];

/**
 * Public read paths, which carry `contentRateLimiter` instead.
 *
 * `/pages/*` and `/public/*` are anonymous GETs serving already-public
 * content, and the site fans out over them hard: one `getCmsCategories` costs
 * nine requests (the category list, then a hidden-flag check per category),
 * and it runs for the homepage and every category page. A production build
 * renders 18 pages at once and blew straight through the 120/min blanket —
 * the CMS fetches came back 429 and every category page was baked with
 * placeholder hero text, so the limiter was corrupting published content
 * rather than protecting anything.
 */
const PUBLIC_READ_PATHS = [/^\/pages\//, /^\/public\//];

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    UPLOAD_PATHS.some((pattern) => pattern.test(req.path)) ||
    PUBLIC_READ_PATHS.some((pattern) => pattern.test(req.path)),
  message: { error: { code: "RATE_LIMITED", message: "Too many requests. Slow down." } }
});

/**
 * Budget for anonymous reads of published content.
 *
 * Still bounded — a scraper is throttled — but sized for how the site actually
 * reads: bursts of a few dozen requests from one build or one visitor moving
 * between pages, not a steady trickle. The archive endpoint keeps its own far
 * tighter limit, since building a ZIP is expensive in a way these are not.
 */
export const contentRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Too many requests. Slow down." } }
});

/**
 * Budget for the two calls that bracket every direct upload.
 *
 * Uploading one file costs a presign (`upload-url`) and a `confirm`; the
 * transfer itself goes straight to storage and never reaches us. Under the
 * general 120/min that caps uploads at 60 files a minute — fine for videos,
 * where a single transfer occupies a lane for minutes, but small images finish
 * in well under a second and a bulk drop of a thousand photos burns the whole
 * budget in seconds. The files that lost the race came back 429 and, having no
 * retry, were reported to the admin as failed.
 *
 * These are authenticated admin-only endpoints, so the blanket limit was
 * buying little here. The budget is still bounded — a runaway client backs off
 * rather than presigning without end — just set where the work actually sits.
 */
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 1200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Too many uploads. Slow down." } }
});

/**
 * Budget for the public analytics beacon.
 *
 * `/public/*` is exempt from the general limiter, so without this the one
 * unauthenticated write endpoint on the API would have no ceiling at all — a
 * loop could add rows to `page_views` indefinitely.
 *
 * Sized against a real visitor rather than a real page: a person browsing
 * quickly opens a few dozen pages a minute at most, while a scripted caller
 * wanting to skew the numbers needs far more than that to move them. Anything
 * over the limit is dropped, which costs an honest visitor nothing but an
 * uncounted view.
 */
export const trackRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Too many requests." } }
});
