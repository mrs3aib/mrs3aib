import { z } from "zod";

/**
 * Beacon payload from the public site.
 *
 * Everything here is client-supplied and bounded accordingly: this endpoint is
 * unauthenticated by necessity (visitors are anonymous), so the schema is the
 * only thing standing between a scripted caller and unbounded rows.
 */
export const trackVisitSchema = z.object({
  body: z.object({
    /**
     * Path only. A full URL is rejected rather than parsed — the host would be
     * whatever the caller claimed, and the report groups by path.
     */
    path: z
      .string()
      .trim()
      .min(1)
      .max(512)
      .refine((value) => value.startsWith("/"), {
        message: "path must start with /"
      }),
    /**
     * `document.referrer`, which is an absolute URL or empty. Only its host
     * survives ingest; see `parseReferrerHost`.
     */
    referrer: z.string().trim().max(2048).optional(),
    /** Session id when the page is an album. Verified against a published
     *  session before it is stored. */
    sessionId: z.string().trim().max(64).optional()
  })
});

export const analyticsSummarySchema = z.object({
  query: z.object({
    period: z.enum(["today", "7d", "30d", "90d", "12m"]).optional(),
    /**
     * Include recognised crawlers in every figure. Off by default: the page
     * answers "how many people visited", and a crawler is not a person. The
     * switch exists because a sudden gap between the two totals is itself
     * worth being able to see.
     */
    includeBots: z
      .enum(["true", "false"])
      .optional()
      .transform((value) => value === "true")
  })
});
