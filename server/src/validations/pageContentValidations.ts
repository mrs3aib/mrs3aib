import { z } from "zod";

/**
 * Uppercase is allowed because category page keys embed the `SessionCategory`
 * enum verbatim — `category-realEstate`, `category-cinematicVideo`. A
 * lowercase-only rule rejected exactly those two with a 422 while every
 * single-word category passed, so the site fell back to placeholders for them
 * and looked like a content problem rather than a validation one.
 */
const pageKey = z.string().min(1).max(80).regex(/^[a-zA-Z0-9-]+$/);

export const pageContentParamSchema = z.object({
  params: z.object({ pageKey })
});

/**
 * `?keys=a,b,c`. Capped so one request cannot ask for an unbounded `IN` list.
 */
export const hiddenFlagsQuerySchema = z.object({
  query: z.object({
    keys: z
      .string()
      .min(1)
      .max(2000)
      .transform((value) => value.split(",").map((key) => key.trim()).filter(Boolean))
      .pipe(z.array(pageKey).min(1).max(50))
  })
});

export const deletePageAssetSchema = z.object({
  params: z.object({ pageKey }),
  body: z.object({
    storageKey: z.string().min(1).max(500)
  })
});

export const updatePageContentSchema = z.object({
  params: z.object({ pageKey }),
  body: z.object({
    title: z.string().min(1).max(160),
    content: z.unknown(),
    published: z.boolean().optional()
  })
});
