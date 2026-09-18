import { z } from "zod";
import { SESSION_CATEGORIES } from "@/types/categories";

export const categoryParamSchema = z.object({
  params: z.object({ category: z.enum(SESSION_CATEGORIES) })
});

/**
 * Query for the cross-category listing. Both fields are optional: no category
 * means "the whole portfolio", which is what the general gallery picker wants.
 */
export const publicSessionListQuerySchema = z.object({
  query: z.object({
    category: z.enum(SESSION_CATEGORIES).optional(),
    limit: z.coerce.number().int().min(1).max(60).optional()
  })
});

export const publicSessionParamSchema = z.object({
  params: z.object({ sessionId: z.string().min(1) }),
  /**
   * Optional cap on how many media items come back.
   *
   * The homepage shows a few of a session's photos in a preview strip, not the
   * whole album. Without this the server signed a URL for every item — two per
   * item — before the caller threw all but a handful away, which on a session
   * of several hundred photos was the bulk of the homepage's render time.
   * Omitted by the album page, which genuinely needs everything.
   */
  query: z.object({
    limit: z.coerce.number().int().min(1).max(200).optional(),
    /** Where this page starts, so the grid can fetch the rest after paint. */
    offset: z.coerce.number().int().min(0).optional()
  })
});

export const publicMediaParamSchema = z.object({
  params: z.object({
    sessionId: z.string().min(1),
    mediaId: z.string().min(1)
  })
});

/**
 * Body for unlocking a password-protected album.
 *
 * The bound is generous but finite — it exists to stop an unbounded string
 * reaching bcrypt, which costs real CPU per attempt.
 */
export const publicGalleryUnlockSchema = z.object({
  params: z.object({ sessionId: z.string().min(1) }),
  /**
   * Paged exactly like the open gallery above.
   *
   * Unlocking used to answer with the entire album, so a gated session signed
   * two URLs for every item before the visitor saw anything — the same cost the
   * public route was paged to avoid, paid at the worst moment, right after a
   * password was accepted.
   */
  query: z.object({
    limit: z.coerce.number().int().min(1).max(200).optional(),
    offset: z.coerce.number().int().min(0).optional()
  }),
  body: z.object({
    password: z.string().min(1).max(200)
  })
});

/**
 * Body for the public selection ZIP. The upper bound matches the largest
 * gallery the listing endpoints will return, and keeps one anonymous request
 * from naming an unbounded number of ids.
 */
export const publicSelectionDownloadSchema = z.object({
  params: z.object({ sessionId: z.string().min(1) }),
  body: z.object({
    mediaIds: z.array(z.string().min(1)).min(1).max(500)
  })
});
