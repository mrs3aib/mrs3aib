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

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Too many requests. Slow down." } }
});
