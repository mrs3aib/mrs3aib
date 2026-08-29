import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  /** Overrides the development log level; production is always `warn`. */
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .optional(),
  /**
   * Browser origins allowed to call this API, comma-separated.
   *
   * The default covers local development only. A production deploy that leaves
   * it unset still boots — the API keeps serving non-browser clients — but
   * every browser request from the real site is blocked by CORS, which shows up
   * as "No 'Access-Control-Allow-Origin' header" in the console rather than as
   * anything visible server-side. `assertProductionCorsConfigured` below turns
   * that into a startup warning so the cause is in the deploy log.
   */
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:5173,http://localhost:3000")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0)
    ),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  /**
   * Direct (non-pooled) connection used by `prisma migrate`, which cannot run
   * through a transaction pooler. Referenced by schema.prisma's `directUrl`,
   * so a deploy that omits it fails at migrate time rather than at boot.
   */
  DIRECT_URL: z.string().min(1, "DIRECT_URL is required"),

  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),

  /**
   * Where to POST when public content changes, so the site can drop its cached
   * copy instead of serving it for the full hour. Both this and the secret are
   * optional: unset simply disables revalidation, which is correct for a
   * deployment that has no site attached (local development, tests).
   */
  WEB_REVALIDATE_URL: z.string().url().optional(),
  REVALIDATE_SECRET: z.string().min(16).optional(),

  R2_ENDPOINT: z.string().min(1, "R2_ENDPOINT is required"),
  R2_BUCKET: z.string().min(1, "R2_BUCKET is required"),
  R2_ACCESS_KEY: z.string().min(1, "R2_ACCESS_KEY is required"),
  R2_SECRET_KEY: z.string().min(1, "R2_SECRET_KEY is required")
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Printed as one obvious block: this exits before the HTTP server binds, so
  // on a host like Railway the only outward symptom is a failing health check
  // with no server ever reachable. The cause has to be unmissable in the log.
  const fieldErrors = parsed.error.flatten().fieldErrors;
  const missing = Object.entries(fieldErrors)
    .map(([key, errors]) => `  ${key}: ${errors?.join(", ")}`)
    .join("\n");

  console.error(
    [
      "",
      "=".repeat(72),
      "STARTUP ABORTED — invalid or missing environment variables",
      "=".repeat(72),
      missing,
      "",
      "The process is exiting before the HTTP server starts, so no port is",
      "bound and any health check will fail. Set these variables and redeploy.",
      "=".repeat(72),
      ""
    ].join("\n")
  );
  process.exit(1);
}

export const env = parsed.data;

/**
 * Warn when a production deploy is about to serve localhost-only CORS.
 *
 * Getting this wrong is invisible from the server's side: requests arrive,
 * handlers run, and a 200 goes back — the browser then discards the response
 * for want of an `Access-Control-Allow-Origin` header. Without this the only
 * symptom is a console error in someone else's browser, so it is worth a loud
 * line in the deploy log.
 *
 * Deliberately a warning, not a fatal error: the API is still perfectly usable
 * by non-browser clients, and refusing to boot would turn a misconfigured
 * front end into a total outage.
 */
function assertProductionCorsConfigured(): void {
  if (env.NODE_ENV !== "production") return;

  const remoteOrigins = env.CORS_ORIGINS.filter(
    (origin) => !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
  );
  if (remoteOrigins.length > 0) return;

  console.warn(
    [
      "",
      "=".repeat(72),
      "WARNING — CORS_ORIGINS lists no non-local origin",
      "=".repeat(72),
      `  current value: ${env.CORS_ORIGINS.join(", ") || "(empty)"}`,
      "",
      "  Every browser request from the deployed site will be blocked with",
      "  \"No 'Access-Control-Allow-Origin' header is present\", even though",
      "  this server answers those requests normally.",
      "",
      "  Set CORS_ORIGINS to the site's origin, comma-separated, e.g.",
      "    CORS_ORIGINS=https://your-site.vercel.app",
      "=".repeat(72),
      ""
    ].join("\n")
  );
}

assertProductionCorsConfigured();
