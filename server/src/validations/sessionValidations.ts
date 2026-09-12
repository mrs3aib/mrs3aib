import { z } from "zod";
import { SESSION_CATEGORIES } from "@/types/categories";

const categorySchema = z.enum(SESSION_CATEGORIES);

/**
 * How a published session is reached. `private` is unlisted-but-link-openable;
 * `protected` is listed but needs the gallery password to open.
 */
const visibilitySchema = z.enum(["public", "private", "protected"]);

export const createSessionSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(120),
    category: categorySchema,
    eventDate: z.string().datetime().or(z.string().date()),
    location: z.string().min(1).max(160),
    description: z.string().max(2000).optional(),
    // A session can be published straight away rather than always landing in
    // draft. `archived` is not offered: creating something already retired is
    // never the intent, and archiving is its own action.
    status: z.enum(["draft", "active"]).optional(),
    isPublic: z.boolean().optional(),
    visibility: visibilitySchema.optional()
  })
});

export const updateSessionSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    title: z.string().min(1).max(120).optional(),
    category: categorySchema.optional(),
    eventDate: z.string().datetime().or(z.string().date()).optional(),
    location: z.string().min(1).max(160).optional(),
    description: z.string().max(2000).optional(),
    status: z.enum(["draft", "active", "archived"]).optional(),
    isPublic: z.boolean().optional(),
    visibility: visibilitySchema.optional(),
    /**
     * Media id to feature as the session's cover, image or video alike. An
     * empty string clears it, which hands the choice back to the automatic
     * "first ready image" pick.
     */
    coverImage: z.string().max(100).nullable().optional()
  })
});

export const sessionIdParamSchema = z.object({
  params: z.object({ id: z.string().min(1) })
});

export const listSessionsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().optional(),
    search: z.string().optional(),
    status: z.enum(["draft", "active", "archived"]).optional(),
    category: categorySchema.optional(),
    sort: z.enum(["newest", "oldest", "eventDate", "title", "mediaCount"]).optional()
  })
});

export const assignClientsSchema = z.object({
  params: z.object({ sessionId: z.string().min(1) }),
  body: z.object({
    clientIds: z.array(z.string().min(1))
  })
});

/** Route params for the session cover upload and removal endpoints. */
export const sessionCoverParamSchema = z.object({
  params: z.object({ sessionId: z.string().min(1) })
});

/**
 * An externally hosted cover image.
 *
 * The scheme is restricted to http(s): the value is rendered straight into an
 * `img src`, where a `javascript:` or `data:` URL would be script injection
 * rather than a picture.
 */
export const setSessionCoverUrlSchema = z.object({
  params: z.object({ sessionId: z.string().min(1) }),
  body: z.object({
    url: z
      .string()
      .trim()
      .min(1)
      .max(2048)
      .url()
      .refine(
        (value) => /^https?:\/\//i.test(value),
        "Cover URL must start with http:// or https://"
      )
  })
});
